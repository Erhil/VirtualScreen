import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.core.database import initialize_database
from app.core.links import PageLink, build_link_lookups, parse_links, resolve_links
from app.core.pages import INDEX_IGNORED_NAMES, PageData, indexable_files, parse_page, scan_pages
from app.core.paths import (
    WorldPathError,
    is_link_or_reparse_point,
    normalize_relative_path,
    resolve_under_root,
)

IMAGE_EXTENSIONS = {"gif", "jpeg", "jpg", "png", "svg", "webp"}
PDF_EXTENSIONS = {"pdf"}
VIDEO_EXTENSIONS = {"mp4"}
TEXT_EXTENSIONS = {"txt"}
SCRIPT_EXTENSIONS = {"dms"}
MARKDOWN_EXTENSIONS = {"md", "markdown"}
CARD_EXTENSIONS = {"cs"}
LINK_SOURCE_EXTENSIONS = {*MARKDOWN_EXTENSIONS, *CARD_EXTENSIONS, "csv", "txt"}


@dataclass(frozen=True)
class RebuildResult:
    pages_indexed: int
    links_indexed: int
    rebuilt_at: datetime


def media_kind_for_extension(extension: str | None) -> str:
    if extension in MARKDOWN_EXTENSIONS:
        return "markdown"
    if extension == "csv":
        return "csv"
    if extension in IMAGE_EXTENSIONS:
        return "image"
    if extension in PDF_EXTENSIONS:
        return "pdf"
    if extension in VIDEO_EXTENSIONS:
        return "video"
    if extension in TEXT_EXTENSIONS:
        return "text"
    if extension in SCRIPT_EXTENSIONS:
        return "script"
    if extension in CARD_EXTENSIONS:
        return "card"
    return "unsupported"


def _json_dump(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _json_load_list(value: str) -> list[str]:
    loaded = json.loads(value)
    return [str(item) for item in loaded] if isinstance(loaded, list) else []


def _json_load_dict(value: str) -> dict[str, object]:
    loaded = json.loads(value)
    return loaded if isinstance(loaded, dict) else {}


def _modified_at(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _page_from_row(row) -> PageData:
    return PageData(
        path=row["path"],
        name=row["name"],
        extension=row["extension"],
        title=row["title"],
        page_type=row["page_type"],
        tags=_json_load_list(row["tags_json"]),
        aliases=_json_load_list(row["aliases_json"]),
        size=row["size"],
        modified_at=_modified_at(row["modified_at"]),
        metadata=_json_load_dict(row["metadata_json"]),
        fields=_json_load_dict(row["fields_json"]),
        body=row["body"],
        hash=row["content_hash"],
    )


def _link_from_row(row) -> PageLink:
    return PageLink(
        source_path=row["source_path"],
        raw_target=row["raw_target"],
        label=row["label"],
        link_type=row["link_type"],
        target_path=row["target_path"],
        target_title=row["target_title"],
        target_kind=row["target_kind"],
        heading=row["heading"],
        resolved=bool(row["resolved"]),
        order=row["link_order"],
    )


def _insert_page(conn, page: PageData) -> int:
    media_kind = media_kind_for_extension(page.extension)
    modified_at = page.modified_at.isoformat().replace("+00:00", "Z")
    cursor = conn.execute(
        """
        insert into pages (
          path, name, extension, media_kind, title, page_type, tags_json, aliases_json,
          metadata_json, fields_json, body, size, modified_at, content_hash
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            page.path,
            page.name,
            page.extension,
            media_kind,
            page.title,
            page.page_type,
            _json_dump(page.tags),
            _json_dump(page.aliases),
            _json_dump(page.metadata),
            _json_dump(page.fields),
            page.body,
            page.size,
            modified_at,
            page.hash,
        ),
    )
    page_id = int(cursor.lastrowid)
    conn.execute(
        """
        insert into search_fts(rowid, path, title, aliases, tags, metadata, body)
        values (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            page_id,
            page.path,
            page.title,
            " ".join(page.aliases),
            " ".join(page.tags),
            _json_dump({"metadata": page.metadata, "fields": page.fields}),
            page.body,
        ),
    )
    return page_id


def _delete_page(conn, path: str) -> None:
    row = conn.execute("select id from pages where path = ?", (path,)).fetchone()
    if row is not None:
        conn.execute("delete from search_fts where rowid = ?", (row["id"],))
    conn.execute("delete from pages where path = ?", (path,))


def _replace_page(conn, page: PageData) -> None:
    _delete_page(conn, page.path)
    _insert_page(conn, page)


def _insert_link(conn, link: PageLink) -> None:
    conn.execute(
        """
        insert into links (
          source_path, raw_target, label, link_type, target_path, target_title, target_kind,
          heading, resolved, link_order
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            link.source_path,
            link.raw_target,
            link.label,
            link.link_type,
            link.target_path,
            link.target_title,
            link.target_kind,
            link.heading,
            1 if link.resolved else 0,
            link.order,
        ),
    )


def _pages_from_conn(conn) -> list[PageData]:
    rows = conn.execute("select * from pages order by lower(path)").fetchall()
    return [_page_from_row(row) for row in rows]


def _rebuild_links(
    conn, root: Path, pages: list[PageData], sources: list[PageData] | None = None
) -> int:
    """Re-resolve the outgoing links of `sources` (default: every page) against `pages`."""
    if sources is None:
        conn.execute("delete from links")
    lookups = build_link_lookups(pages)
    for page in pages if sources is None else sources:
        conn.execute("delete from links where source_path = ?", (page.path,))
        if page.extension not in LINK_SOURCE_EXTENSIONS:
            continue
        raw_links = parse_links(page.path, page.body)
        for link in resolve_links(root, page.path, raw_links, pages, lookups):
            _insert_link(conn, link)
    return int(conn.execute("select count(*) from links").fetchone()[0])


def _link_identity(page: PageData | None) -> tuple[str, list[str]] | None:
    # What other pages' links resolve against, besides the path: see links._resolve_page.
    if page is None:
        return None
    return page.title.lower(), sorted(alias.lower() for alias in page.aliases)


def _indexed_page(conn, path: str) -> PageData | None:
    row = conn.execute("select * from pages where path = ?", (path,)).fetchone()
    return _page_from_row(row) if row else None


def _write_rebuilt_at(conn, rebuilt_at: datetime) -> None:
    conn.execute(
        """
        insert into app_meta(key, value)
        values ('index_rebuilt_at', ?)
        on conflict(key) do update set value = excluded.value
        """,
        (rebuilt_at.isoformat().replace("+00:00", "Z"),),
    )


def _index_has_rebuilt_marker(conn) -> bool:
    row = conn.execute(
        "select value from app_meta where key = 'index_rebuilt_at'"
    ).fetchone()
    return row is not None


def _normalized_existing_changed_paths(root: Path, paths: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw_path in paths:
        try:
            relative_path = normalize_relative_path(raw_path)
            if any(part in INDEX_IGNORED_NAMES for part in Path(relative_path).parts):
                continue
            file_path = resolve_under_root(root, relative_path)
        except WorldPathError:
            continue
        if _has_link_or_reparse_part(root, file_path):
            continue
        if not file_path.exists():
            continue
        if file_path.is_dir():
            for child in sorted(
                file_path.rglob("*"),
                key=lambda item: item.relative_to(root).as_posix().lower(),
            ):
                if _has_link_or_reparse_part(root, child):
                    continue
                if not child.is_file():
                    continue
                child_relative_path = normalize_relative_path(
                    child.relative_to(root).as_posix()
                )
                if any(part in INDEX_IGNORED_NAMES for part in Path(child_relative_path).parts):
                    continue
                if child_relative_path not in seen:
                    seen.add(child_relative_path)
                    normalized.append(child_relative_path)
            continue
        if file_path.is_file() and relative_path not in seen:
            seen.add(relative_path)
            normalized.append(relative_path)
    return normalized


def _normalized_deleted_paths(paths: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw_path in paths:
        try:
            relative_path = normalize_relative_path(raw_path)
        except WorldPathError:
            continue
        if relative_path not in seen:
            seen.add(relative_path)
            normalized.append(relative_path)
    return normalized


def _has_link_or_reparse_part(root: Path, path: Path) -> bool:
    try:
        relative_parts = path.relative_to(root).parts
    except ValueError:
        return True
    current = root
    for part in relative_parts:
        current = current / part
        if is_link_or_reparse_point(current):
            return True
    return False


def rebuild_index(root: Path) -> RebuildResult:
    root = root.expanduser().resolve()
    conn = initialize_database(root)
    rebuilt_at = datetime.now(tz=UTC)
    pages = scan_pages(root, {page.path: page for page in _pages_from_conn(conn)})

    with conn:
        conn.execute("delete from links")
        conn.execute("delete from search_fts")
        conn.execute("delete from pages")

        for page in pages:
            _insert_page(conn, page)

        link_count = _rebuild_links(conn, root, pages)
        _write_rebuilt_at(conn, rebuilt_at)

    conn.close()
    return RebuildResult(
        pages_indexed=len(pages),
        links_indexed=link_count,
        rebuilt_at=rebuilt_at,
    )


def ensure_index(root: Path) -> None:
    root = root.expanduser().resolve()
    conn = initialize_database(root)
    has_rebuilt_marker = _index_has_rebuilt_marker(conn)
    conn.close()
    if not has_rebuilt_marker:
        rebuild_index(root)


def ensure_page_indexed(root: Path, file_path: Path) -> PageData:
    root = root.expanduser().resolve()
    indexed_page = get_indexed_page(root, file_path.relative_to(root).as_posix())
    current_page = parse_page(root, file_path, indexed_page)
    if (
        indexed_page is None
        or indexed_page.hash != current_page.hash
        or indexed_page.modified_at != current_page.modified_at
        # A CSV or media page keeps its metadata in a sidecar, so editing it
        # changes neither the file's hash nor its mtime. Without this the index
        # can hold a stale copy forever: the freshly parsed metadata is the
        # authority, and _json_dump is the same canonical form the index stores.
        or _json_dump(indexed_page.metadata) != _json_dump(current_page.metadata)
    ):
        refresh_index(root, changed_paths=[current_page.path])
        return get_indexed_page(root, current_page.path) or current_page
    return indexed_page


def refresh_index(
    root: Path,
    *,
    changed_paths: list[str] | None = None,
    deleted_paths: list[str] | None = None,
) -> RebuildResult:
    """Refresh only known changed/deleted paths.

    Passing no path lists intentionally requests a full rebuild. Normal world
    mutations should prefer refresh_index_for_paths so that call sites read as
    targeted updates.
    """
    root = root.expanduser().resolve()
    if changed_paths is None and deleted_paths is None:
        return rebuild_index(root)

    conn = initialize_database(root)
    if not _index_has_rebuilt_marker(conn):
        conn.close()
        return rebuild_index(root)

    rebuilt_at = datetime.now(tz=UTC)
    normalized_changed_paths = _normalized_existing_changed_paths(root, changed_paths or [])
    normalized_deleted_paths = _normalized_deleted_paths(deleted_paths or [])
    if not normalized_changed_paths and not normalized_deleted_paths:
        link_count = int(conn.execute("select count(*) from links").fetchone()[0])
        conn.close()
        return RebuildResult(pages_indexed=0, links_indexed=link_count, rebuilt_at=rebuilt_at)

    with conn:
        # Take the write lock before reading any page id. Two requests can refresh the same
        # page at once (opening it while the watcher refreshes it); reading the id outside
        # the lock let one delete the other's full-text row by a stale id, and the reused
        # id then failed the full-text insert with "constraint failed".
        conn.execute("begin immediate")
        for path in normalized_deleted_paths:
            _delete_page(conn, path)
        # Other pages' links only need re-resolving when a link target appeared, vanished
        # or was renamed; an edit to a page's body changes nothing but its own links.
        targets_changed = bool(normalized_deleted_paths)
        refreshed: list[PageData] = []
        for path in normalized_changed_paths:
            previous = _indexed_page(conn, path)
            try:
                page = parse_page(root, resolve_under_root(root, path), previous)
            except (OSError, ValueError, WorldPathError):
                _delete_page(conn, path)
                targets_changed = True
                continue
            _replace_page(conn, page)
            refreshed.append(page)
            if _link_identity(previous) != _link_identity(page):
                targets_changed = True

        pages = _pages_from_conn(conn)
        link_count = _rebuild_links(conn, root, pages, None if targets_changed else refreshed)
        _write_rebuilt_at(conn, rebuilt_at)

    conn.close()
    return RebuildResult(
        pages_indexed=len(normalized_changed_paths),
        links_indexed=link_count,
        rebuilt_at=rebuilt_at,
    )


def refresh_index_for_paths(
    root: Path,
    *,
    changed_paths: list[str] | None = None,
    deleted_paths: list[str] | None = None,
) -> RebuildResult:
    return refresh_index(root, changed_paths=changed_paths or [], deleted_paths=deleted_paths or [])


def refresh_index_for_disk_changes(root: Path) -> RebuildResult:
    root = root.expanduser().resolve()
    conn = initialize_database(root)
    if not _index_has_rebuilt_marker(conn):
        conn.close()
        return rebuild_index(root)
    indexed = {
        row["path"]: (row["size"], _modified_at(row["modified_at"]))
        for row in conn.execute("select path, size, modified_at from pages")
    }
    conn.close()

    disk_files = indexable_files(root)
    changed_paths: list[str] = []
    for path in sorted(disk_files, key=str.lower):
        try:
            # A file deleted since the listing is simply gone; one gone file must not
            # fail the whole refresh.
            stat = disk_files[path].stat()
        except OSError:
            continue
        if indexed.get(path) != (stat.st_size, datetime.fromtimestamp(stat.st_mtime, tz=UTC)):
            changed_paths.append(path)
    deleted_paths = sorted(set(indexed) - set(disk_files), key=str.lower)
    return refresh_index(root, changed_paths=changed_paths, deleted_paths=deleted_paths)


def list_indexed_pages(root: Path) -> list[PageData]:
    root = root.expanduser().resolve()
    ensure_index(root)
    conn = initialize_database(root)
    pages = _pages_from_conn(conn)
    conn.close()
    return pages


def get_indexed_page(root: Path, path: str) -> PageData | None:
    root = root.expanduser().resolve()
    ensure_index(root)
    path = normalize_relative_path(path)
    conn = initialize_database(root)
    row = conn.execute("select * from pages where path = ?", (path,)).fetchone()
    conn.close()
    return _page_from_row(row) if row else None


def list_indexed_links(root: Path, source_path: str | None = None) -> list[PageLink]:
    root = root.expanduser().resolve()
    ensure_index(root)
    conn = initialize_database(root)
    if source_path is None:
        rows = conn.execute(
            "select * from links order by lower(source_path), link_order"
        ).fetchall()
    else:
        rows = conn.execute(
            "select * from links where source_path = ? order by link_order",
            (source_path,),
        ).fetchall()
    conn.close()
    return [_link_from_row(row) for row in rows]
