import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.core.database import initialize_database
from app.core.links import PageLink, parse_links, resolve_links
from app.core.pages import PageData, parse_page, scan_pages
from app.core.paths import normalize_relative_path

IMAGE_EXTENSIONS = {"gif", "jpeg", "jpg", "png", "svg", "webp"}
PDF_EXTENSIONS = {"pdf"}
VIDEO_EXTENSIONS = {"mp4"}
TEXT_EXTENSIONS = {"txt"}
SCRIPT_EXTENSIONS = {"dms"}
MARKDOWN_EXTENSIONS = {"md", "markdown"}
CARD_EXTENSIONS = {"cs"}


@dataclass(frozen=True)
class RebuildResult:
    pages_indexed: int
    links_indexed: int
    rebuilt_at: datetime


@dataclass(frozen=True)
class IndexedPage:
    page: PageData
    media_kind: str


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


def rebuild_index(root: Path) -> RebuildResult:
    conn = initialize_database(root)
    rebuilt_at = datetime.now(tz=UTC)
    pages = scan_pages(root)
    link_count = 0

    with conn:
        conn.execute("delete from links")
        conn.execute("delete from search_fts")
        conn.execute("delete from pages")

        for page in pages:
            _insert_page(conn, page)

        for page in pages:
            if page.extension not in {*MARKDOWN_EXTENSIONS, *CARD_EXTENSIONS, "csv", "txt"}:
                continue
            links = resolve_links(root, page.path, parse_links(page.path, page.body), pages)
            for link in links:
                _insert_link(conn, link)
            link_count += len(links)

        conn.execute(
            """
            insert into app_meta(key, value)
            values ('index_rebuilt_at', ?)
            on conflict(key) do update set value = excluded.value
            """,
            (rebuilt_at.isoformat().replace("+00:00", "Z"),),
        )

    conn.close()
    return RebuildResult(
        pages_indexed=len(pages),
        links_indexed=link_count,
        rebuilt_at=rebuilt_at,
    )


def ensure_index(root: Path) -> None:
    conn = initialize_database(root)
    page_count = conn.execute("select count(*) from pages").fetchone()[0]
    conn.close()
    if page_count == 0:
        rebuild_index(root)


def ensure_page_indexed(root: Path, file_path: Path) -> PageData:
    current_page = parse_page(root, file_path)
    indexed_page = get_indexed_page(root, current_page.path)
    if (
        indexed_page is None
        or indexed_page.hash != current_page.hash
        or indexed_page.modified_at != current_page.modified_at
    ):
        rebuild_index(root)
        return get_indexed_page(root, current_page.path) or current_page
    return indexed_page


def refresh_index(root: Path) -> None:
    rebuild_index(root)


def list_indexed_pages(root: Path) -> list[PageData]:
    ensure_index(root)
    conn = initialize_database(root)
    rows = conn.execute("select * from pages order by lower(path)").fetchall()
    conn.close()
    return [_page_from_row(row) for row in rows]


def get_indexed_page(root: Path, path: str) -> PageData | None:
    ensure_index(root)
    path = normalize_relative_path(path)
    conn = initialize_database(root)
    row = conn.execute("select * from pages where path = ?", (path,)).fetchone()
    conn.close()
    return _page_from_row(row) if row else None


def list_indexed_links(root: Path, source_path: str | None = None) -> list[PageLink]:
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
