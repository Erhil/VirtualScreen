import hashlib
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import frontmatter

from app.core.cards import CARD_EXTENSIONS, parse_card
from app.core.paths import (
    WorldPathError,
    is_link_or_reparse_point,
    normalize_relative_path,
    read_json_or_default,
)

MARKDOWN_EXTENSIONS = {".md", ".markdown"}
TEXT_BODY_EXTENSIONS = {".csv", ".cs", ".dms", ".md", ".markdown", ".svg", ".txt"}
SIDECAR_METADATA_DIR = ".virtualscreen/metadata"
MAX_INDEX_TEXT_BYTES = 1_000_000
MAX_SIDECAR_METADATA_BYTES = 64_000
INDEX_IGNORED_NAMES = {".music", ".virtualscreen", ".git", "__pycache__"}

# Dotless extension -> media kind. The one source of truth for what kind of media a file
# extension is: app.core.index keys it off a page's own extension (already dotless), and
# app.core.links keys it off a resolved link target's suffix (dotted, via _dotless_extension).
# Keeping a single table is load-bearing - the two used to keep separate copies and disagreed
# on ".dms" (a script in one, unsupported in the other), which sent a script link to a dead
# placeholder instead of the script viewer.
MEDIA_KIND_EXTENSIONS: dict[str, str] = {
    "md": "markdown",
    "markdown": "markdown",
    "csv": "csv",
    "gif": "image",
    "jpeg": "image",
    "jpg": "image",
    "png": "image",
    "svg": "image",
    "webp": "image",
    "pdf": "pdf",
    "mp4": "video",
    "txt": "text",
    "dms": "script",
    "cs": "card",
}


def media_kind_for_extension(extension: str | None) -> str:
    """Classify a dotless, lowercase extension (e.g. "md", not ".md" or "MD") into a media kind.

    Returns "unsupported" for None, the empty extension, or anything not in the table.
    """
    if extension is None:
        return "unsupported"
    return MEDIA_KIND_EXTENSIONS.get(extension, "unsupported")


@dataclass(frozen=True)
class PageData:
    path: str
    name: str
    extension: str | None
    title: str
    page_type: str | None
    tags: list[str]
    aliases: list[str]
    size: int
    modified_at: datetime
    hash: str
    metadata: dict[str, Any]
    fields: dict[str, Any]
    body: str = ""


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, tuple):
        return [str(item) for item in value if str(item)]
    return [str(value)] if str(value) else []


def _first_heading(content: str) -> str | None:
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip() or None
    return None


def _metadata_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def metadata_sidecar_path(root: Path, relative_path: str) -> Path:
    return root / SIDECAR_METADATA_DIR / f"{relative_path}.json"


def _read_sidecar_metadata(root: Path, relative_path: str) -> dict[str, Any]:
    sidecar_path = metadata_sidecar_path(root, relative_path)
    if not sidecar_path.exists():
        return {}
    if sidecar_path.stat().st_size > MAX_SIDECAR_METADATA_BYTES:
        return {}
    loaded = read_json_or_default(sidecar_path, {}, catch_os_error=False)
    return loaded if isinstance(loaded, dict) else {}


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_index_text(path: Path, stat_size: int) -> tuple[bytes | None, str]:
    if stat_size > MAX_INDEX_TEXT_BYTES:
        return None, ""
    try:
        body = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None, ""
    return body.encode("utf-8"), body


def render_sidecar_metadata(
    *,
    title: str,
    page_type: str | None,
    tags: list[str],
    aliases: list[str],
    fields: dict[str, str],
) -> str:
    metadata = {
        "title": title,
        "tags": tags,
        "aliases": aliases,
        "fields": fields,
    }
    if page_type:
        metadata["type"] = page_type
    return json.dumps(metadata, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def render_markdown_with_metadata(
    markdown: str,
    *,
    title: str,
    page_type: str | None,
    tags: list[str],
    aliases: list[str],
    fields: dict[str, str],
) -> str:
    post = frontmatter.loads(markdown)
    metadata = dict(post.metadata)
    metadata["title"] = title
    if page_type:
        metadata["type"] = page_type
    else:
        metadata.pop("type", None)
    metadata["tags"] = tags
    metadata["aliases"] = aliases
    metadata["fields"] = fields
    post.metadata = metadata
    return frontmatter.dumps(post)


def parse_page(root: Path, path: Path, previous: PageData | None = None) -> PageData:
    """Read one world file into a PageData.

    `previous` is the page as the index last saw it. When the file's size and mtime still
    match it, its content hash is reused instead of re-reading the file: hashing is the one
    cost here that grows with bytes, and a world holds videos of hundreds of megabytes.
    """
    stat = path.stat()
    modified_at = datetime.fromtimestamp(stat.st_mtime, tz=UTC)
    extension = path.suffix.lower().lstrip(".") or None
    relative_path = normalize_relative_path(path.relative_to(root).as_posix())
    metadata: dict[str, Any] = {}
    body = ""
    if (
        previous is not None
        and previous.size == stat.st_size
        and previous.modified_at == modified_at
    ):
        content_hash = previous.hash
    else:
        content_hash = _sha256_file(path)

    if path.suffix.lower() in MARKDOWN_EXTENSIONS:
        content_bytes, raw_content = _read_index_text(path, stat.st_size)
        if content_bytes is not None:
            post = frontmatter.loads(raw_content)
            metadata = dict(post.metadata)
            body = post.content
    elif path.suffix.lower() in CARD_EXTENSIONS:
        content_bytes, raw_content = _read_index_text(path, stat.st_size)
        if content_bytes is not None:
            metadata, body = parse_card(raw_content)
    elif path.suffix.lower() in TEXT_BODY_EXTENSIONS:
        _, body = _read_index_text(path, stat.st_size)
        metadata = _read_sidecar_metadata(root, relative_path)
    else:
        metadata = _read_sidecar_metadata(root, relative_path)

    title = str(metadata.get("title") or _first_heading(body) or path.stem)
    page_type_value = metadata.get("type")
    fields = _metadata_dict(metadata.get("fields"))

    return PageData(
        path=relative_path,
        name=path.name,
        extension=extension,
        title=title,
        page_type=str(page_type_value) if page_type_value else None,
        tags=_string_list(metadata.get("tags")),
        aliases=_string_list(metadata.get("aliases")),
        size=stat.st_size,
        modified_at=modified_at,
        hash=content_hash,
        metadata=metadata,
        fields=fields,
        body=body,
    )


def indexable_files(root: Path) -> dict[str, Path]:
    """Every indexable file in the world, keyed by its normalized relative path.

    One scandir pass that never descends into an ignored folder or a link/reparse point,
    so nothing below one is ever visited. A world folder is live: a directory can vanish
    between being listed and being read (external edits, folder sync, a world being
    replaced), and an unreadable one is skipped rather than failing the whole scan.
    """
    files: dict[str, Path] = {}
    pending = [root]
    while pending:
        directory = pending.pop()
        try:
            entries = list(os.scandir(directory))
        except OSError:
            continue
        for entry in entries:
            path = Path(entry.path)
            if entry.name in INDEX_IGNORED_NAMES or is_link_or_reparse_point(path):
                continue
            try:
                if entry.is_dir(follow_symlinks=False):
                    pending.append(path)
                elif entry.is_file(follow_symlinks=False):
                    files[normalize_relative_path(path.relative_to(root).as_posix())] = path
            except (OSError, ValueError, WorldPathError):
                continue
    return files


def scan_pages(root: Path, previous: dict[str, PageData] | None = None) -> list[PageData]:
    previous = previous or {}
    pages: list[PageData] = []
    files = indexable_files(root)
    for relative_path in sorted(files, key=str.lower):
        try:
            pages.append(parse_page(root, files[relative_path], previous.get(relative_path)))
        except OSError:
            continue
    return pages
