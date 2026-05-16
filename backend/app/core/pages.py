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
    try:
        loaded = json.loads(sidecar_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return loaded if isinstance(loaded, dict) else {}


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
    content_bytes = path.read_bytes()

    if path.suffix.lower() in MARKDOWN_EXTENSIONS:
        raw_content = path.read_text(encoding="utf-8")
        content_bytes = raw_content.encode("utf-8")
        post = frontmatter.loads(raw_content)
        metadata = dict(post.metadata)
        body = post.content
    elif path.suffix.lower() in CARD_EXTENSIONS:
        try:
            raw_content = path.read_text(encoding="utf-8")
            content_bytes = raw_content.encode("utf-8")
            metadata, body = parse_card(raw_content)
        except UnicodeDecodeError:
            body = ""
    elif path.suffix.lower() in TEXT_BODY_EXTENSIONS:
        try:
            body = path.read_text(encoding="utf-8")
            content_bytes = body.encode("utf-8")
        except UnicodeDecodeError:
            body = ""
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
        hash=hashlib.sha256(content_bytes).hexdigest(),
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
        if path.is_file():
            try:
                pages.append(parse_page(root, path))
            except (FileNotFoundError, PermissionError):
                continue

    return pages
