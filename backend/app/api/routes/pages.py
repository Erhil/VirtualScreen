import mimetypes
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings
from app.core.events import queue_world_event
from app.core.file_safety import (
    atomic_write_bytes,
    backup_file,
    iso_datetime,
    modified_at,
    sha256_hex,
)
from app.core.index import (
    ensure_page_indexed,
    list_indexed_links,
    list_indexed_pages,
    media_kind_for_extension,
    rebuild_index,
)
from app.core.links import PageLink
from app.core.pages import (
    MARKDOWN_EXTENSIONS,
    TEXT_BODY_EXTENSIONS,
    PageData,
    metadata_sidecar_path,
    render_markdown_with_metadata,
    render_sidecar_metadata,
)
from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class PageSummary(BaseModel):
    path: str
    name: str
    extension: str | None
    title: str
    page_type: str | None
    tags: list[str]
    aliases: list[str]
    size: int
    modified_at: str
    hash: str


class PageDetail(PageSummary):
    metadata: dict[str, Any]
    fields: dict[str, Any]


class PageWorldFile(BaseModel):
    path: str
    name: str
    extension: str | None
    media_kind: str
    content_type: str
    size: int
    modified_at: datetime
    hash: str
    content: str


class ManagedPageMetadata(BaseModel):
    title: str
    type: str | None = None
    tags: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)
    fields: dict[str, Any] = Field(default_factory=dict)


class UpdatePageMetadataRequest(BaseModel):
    metadata: ManagedPageMetadata
    expected_modified_at: str
    expected_hash: str


class UpdatePageMetadataResponse(BaseModel):
    page: PageDetail
    file: PageWorldFile
    backup_path: str


class PageLinkResponse(BaseModel):
    source_path: str
    raw_target: str
    label: str
    link_type: str
    target_path: str | None
    target_title: str | None
    target_kind: str | None
    heading: str | None
    resolved: bool


def _summary(page: PageData) -> PageSummary:
    return PageSummary(
        path=page.path,
        name=page.name,
        extension=page.extension,
        title=page.title,
        page_type=page.page_type,
        tags=page.tags,
        aliases=page.aliases,
        size=page.size,
        modified_at=page.modified_at.isoformat().replace("+00:00", "Z"),
        hash=page.hash,
    )


def _detail(page: PageData) -> PageDetail:
    return PageDetail(**_summary(page).model_dump(), metadata=page.metadata, fields=page.fields)


def _link_response(link: PageLink) -> PageLinkResponse:
    return PageLinkResponse(
        source_path=link.source_path,
        raw_target=link.raw_target,
        label=link.label,
        link_type=link.link_type,
        target_path=link.target_path,
        target_title=link.target_title,
        target_kind=link.target_kind,
        heading=link.heading,
        resolved=link.resolved,
    )


def _resolve_page(settings: Settings, requested_path: str):
    root = settings.resolved_world_root
    try:
        path = resolve_under_root(root, requested_path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not path.exists():
        raise HTTPException(status_code=404, detail="World file was not found.")
    if path.is_dir():
        raise HTTPException(status_code=400, detail="World path points to a directory.")

    return root, path


def _read_text_file(path: Path) -> tuple[bytes, str]:
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=415, detail="World file is not UTF-8 text.") from exc
    return content.encode("utf-8"), content


def _read_file_bytes(path: Path) -> bytes:
    if path.suffix.lower() in TEXT_BODY_EXTENSIONS:
        try:
            return path.read_text(encoding="utf-8").encode("utf-8")
        except UnicodeDecodeError:
            pass
    return path.read_bytes()


def _check_file_preconditions(
    file_path: Path,
    expected_modified_at: str,
    expected_hash: str,
) -> None:
    current_bytes = _read_file_bytes(file_path)
    current_hash = sha256_hex(current_bytes)
    current_modified_at = iso_datetime(modified_at(file_path))
    if expected_hash != current_hash or expected_modified_at != current_modified_at:
        raise HTTPException(status_code=409, detail="World file changed on disk.")


def _file_response(root: Path, file_path: Path) -> PageWorldFile:
    content_bytes = _read_file_bytes(file_path)
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = ""
    stat = file_path.stat()
    extension = file_path.suffix.lower().lstrip(".") or None
    content_type = (
        "application/json"
        if file_path.suffix.lower() == ".cs"
        else mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    )
    return PageWorldFile(
        path=normalize_relative_path(file_path.relative_to(root).as_posix()),
        name=file_path.name,
        extension=extension,
        media_kind=media_kind_for_extension(extension),
        content_type=content_type,
        size=stat.st_size,
        modified_at=datetime.fromtimestamp(stat.st_mtime, tz=UTC),
        hash=sha256_hex(content_bytes),
        content=content,
    )


def _normalized_metadata(metadata: ManagedPageMetadata) -> dict[str, object]:
    normalized_fields: dict[str, str] = {}
    for raw_key, value in metadata.fields.items():
        key = str(raw_key).strip()
        if not key:
            raise HTTPException(status_code=400, detail="Metadata field key is required.")
        if key in normalized_fields:
            raise HTTPException(status_code=400, detail="Metadata field keys must be unique.")
        if not isinstance(value, str):
            raise HTTPException(status_code=400, detail="Metadata field values must be strings.")
        normalized_fields[key] = value

    page_type = metadata.type.strip() if metadata.type else None
    return {
        "title": metadata.title,
        "page_type": page_type or None,
        "tags": [tag.strip() for tag in metadata.tags if tag.strip()],
        "aliases": [alias.strip() for alias in metadata.aliases if alias.strip()],
        "fields": normalized_fields,
    }


def _backup_missing_sidecar(root: Path, sidecar_path: Path) -> Path:
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%d-%H%M%S")
    backup_path = root / ".virtualscreen" / "backups" / timestamp / sidecar_path.relative_to(root)
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    backup_path.write_text("{}\n", encoding="utf-8")
    return backup_path


@router.get("/pages", response_model=list[PageSummary])
def pages(settings: SettingsDep) -> list[PageSummary]:
    return [_summary(page) for page in list_indexed_pages(settings.resolved_world_root)]


@router.get("/page", response_model=PageDetail)
def page(path: str, settings: SettingsDep) -> PageDetail:
    root, file_path = _resolve_page(settings, path)
    return _detail(ensure_page_indexed(root, file_path))


@router.put("/page/metadata", response_model=UpdatePageMetadataResponse)
def update_page_metadata(
    path: str,
    payload: UpdatePageMetadataRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> UpdatePageMetadataResponse:
    root, file_path = _resolve_page(settings, path)

    _check_file_preconditions(
        file_path,
        payload.expected_modified_at,
        payload.expected_hash,
    )
    normalized_metadata = _normalized_metadata(payload.metadata)
    if file_path.suffix.lower() in MARKDOWN_EXTENSIONS:
        _, content = _read_text_file(file_path)
        next_content = render_markdown_with_metadata(
            content,
            title=str(normalized_metadata["title"]),
            page_type=normalized_metadata["page_type"],
            tags=normalized_metadata["tags"],
            aliases=normalized_metadata["aliases"],
            fields=normalized_metadata["fields"],
        )
        backup_path = backup_file(root, file_path)
        atomic_write_bytes(file_path, next_content.encode("utf-8"))
    else:
        relative_path = normalize_relative_path(file_path.relative_to(root).as_posix())
        sidecar_path = metadata_sidecar_path(root, relative_path)
        if sidecar_path.exists():
            backup_path = backup_file(root, sidecar_path)
        else:
            backup_path = _backup_missing_sidecar(root, sidecar_path)
        sidecar_path.parent.mkdir(parents=True, exist_ok=True)
        atomic_write_bytes(
            sidecar_path,
            render_sidecar_metadata(
                title=str(normalized_metadata["title"]),
                page_type=normalized_metadata["page_type"],
                tags=normalized_metadata["tags"],
                aliases=normalized_metadata["aliases"],
                fields=normalized_metadata["fields"],
            ).encode("utf-8"),
        )
    result = rebuild_index(root)
    queue_world_event(
        background_tasks,
        result,
        paths=[file_path.relative_to(root).as_posix()],
        deleted_paths=[],
        reason="modified",
    )

    indexed_page = ensure_page_indexed(root, file_path)
    return UpdatePageMetadataResponse(
        page=_detail(indexed_page),
        file=_file_response(root, file_path),
        backup_path=normalize_relative_path(backup_path.relative_to(root).as_posix()),
    )


@router.get("/page/links", response_model=list[PageLinkResponse])
def page_links(path: str, settings: SettingsDep) -> list[PageLinkResponse]:
    root, file_path = _resolve_page(settings, path)
    if file_path.suffix.lower() not in {".csv", ".cs", ".md", ".markdown", ".txt"}:
        return []

    ensure_page_indexed(root, file_path)
    rebuild_index(root)
    source_path = file_path.relative_to(root).as_posix()
    return [_link_response(link) for link in list_indexed_links(root, source_path)]


@router.get("/page/backlinks", response_model=list[PageLinkResponse])
def page_backlinks(path: str, settings: SettingsDep) -> list[PageLinkResponse]:
    root, file_path = _resolve_page(settings, path)
    rebuild_index(root)
    target_path = file_path.relative_to(root).as_posix()
    backlinks = [link for link in list_indexed_links(root) if link.target_path == target_path]
    backlinks.sort(key=lambda link: (link.source_path.lower(), link.order))
    return [_link_response(link) for link in backlinks]
