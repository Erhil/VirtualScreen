import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import frontmatter

from app.core.cards import CARD_EXTENSIONS, parse_card
from app.core.paths import normalize_relative_path

MARKDOWN_EXTENSIONS = {".md", ".markdown"}
TEXT_BODY_EXTENSIONS = {".csv", ".cs", ".dms", ".md", ".markdown", ".svg", ".txt"}
SIDECAR_METADATA_DIR = ".virtualscreen/metadata"
MAX_INDEX_TEXT_BYTES = 1_000_000
MAX_SIDECAR_METADATA_BYTES = 64_000


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
    try:
        loaded = json.loads(sidecar_path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}
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


def _is_link_or_reparse_point(path: Path) -> bool:
    try:
        stat_result = path.lstat()
    except OSError:
        return True
    return path.is_symlink() or bool(getattr(stat_result, "st_file_attributes", 0) & 0x400)


def _has_link_or_reparse_part(root: Path, path: Path) -> bool:
    try:
        relative_parts = path.relative_to(root).parts
    except ValueError:
        return True
    current = root
    for part in relative_parts:
        current = current / part
        if _is_link_or_reparse_point(current):
            return True
    return False


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


def parse_page(root: Path, path: Path) -> PageData:
    stat = path.stat()
    extension = path.suffix.lower().lstrip(".") or None
    relative_path = normalize_relative_path(path.relative_to(root).as_posix())
    metadata: dict[str, Any] = {}
    body = ""
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
        modified_at=datetime.fromtimestamp(stat.st_mtime, tz=UTC),
        hash=content_hash,
        metadata=metadata,
        fields=fields,
        body=body,
    )


def scan_pages(root: Path) -> list[PageData]:
    if not root.exists():
        return []

    pages: list[PageData] = []
    ignored_names = {".music", ".virtualscreen", ".git", "__pycache__"}
    for path in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix().lower()):
        if any(part in ignored_names for part in path.relative_to(root).parts):
            continue
        if _has_link_or_reparse_part(root, path):
            continue
        if path.is_file():
            try:
                pages.append(parse_page(root, path))
            except (FileNotFoundError, OSError, PermissionError):
                continue

    return pages
