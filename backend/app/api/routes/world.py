import json
import mimetypes
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.core.audio import AUDIO_CONTENT_TYPES
from app.core.config import Settings, get_settings
from app.core.events import queue_world_event
from app.core.file_safety import (
    atomic_write_bytes,
    backup_file,
    iso_datetime,
    modified_at,
    replace_with_retries,
    sha256_hex,
    trash_file,
)
from app.core.index import list_indexed_pages, refresh_index
from app.core.pages import MARKDOWN_EXTENSIONS, PageData, parse_page
from app.core.paths import (
    WorldPathError,
    ensure_no_reserved_path_parts,
    normalize_relative_path,
    resolve_under_root,
)

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]

TEXT_FILE_KINDS = {
    ".md": ("markdown", "text/markdown"),
    ".markdown": ("markdown", "text/markdown"),
    ".csv": ("csv", "text/csv"),
    ".cs": ("card", "application/json"),
    ".dms": ("script", "text/x-dms"),
    ".txt": ("text", "text/plain"),
    ".svg": ("image", "image/svg+xml"),
}
WRITABLE_FILE_KINDS = {
    ".md": ("markdown", "text/markdown"),
    ".markdown": ("markdown", "text/markdown"),
    ".csv": ("csv", "text/csv"),
    ".cs": ("card", "application/json"),
    ".dms": ("script", "text/x-dms"),
}
FILE_TYPE_EXTENSIONS = {
    "markdown": {".md", ".markdown"},
    "csv": {".csv"},
    "card": {".cs"},
    "script": {".dms"},
}
DEFAULT_CONTENT = {
    "markdown": lambda path: f"# {path.stem}\n",
    "csv": lambda path: "result,event\n",
    "card": lambda path: json.dumps(
        {
            "kind": "custom",
            "title": "New Card",
            "tags": [],
            "sections": [
                {
                    "title": "Core",
                    "fields": {},
                }
            ],
        },
        indent=2,
        sort_keys=True,
    )
    + "\n",
    "script": lambda path: "# Write DMS script here\n",
}
MEDIA_FILE_KINDS = {
    **{
        extension: ("audio", content_type)
        for extension, content_type in AUDIO_CONTENT_TYPES.items()
    },
    ".gif": ("image", "image/gif"),
    ".jpeg": ("image", "image/jpeg"),
    ".jpg": ("image", "image/jpeg"),
    ".mp4": ("video", "video/mp4"),
    ".pdf": ("pdf", "application/pdf"),
    ".png": ("image", "image/png"),
    ".svg": ("image", "image/svg+xml"),
    ".webp": ("image", "image/webp"),
}


class WorldInfo(BaseModel):
    root: str
    exists: bool


class WorldEntry(BaseModel):
    name: str
    path: str
    kind: str
    extension: str | None = None
    children: list["WorldEntry"] = Field(default_factory=list)
    title: str | None = None
    page_type: str | None = None
    tags: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)


class WorldFile(BaseModel):
    path: str
    name: str
    extension: str | None
    media_kind: str
    content_type: str
    size: int
    modified_at: datetime
    hash: str
    content: str


class SaveWorldFileRequest(BaseModel):
    content: str
    expected_modified_at: str
    expected_hash: str


class SaveWorldFileResponse(WorldFile):
    backup_path: str


class CreateWorldFileRequest(BaseModel):
    path: str
    file_type: Literal["markdown", "csv", "script", "card"]
    content: str | None = None


class CreateWorldFolderRequest(BaseModel):
    path: str


class RenameWorldFileRequest(BaseModel):
    path: str
    new_path: str
    expected_modified_at: str
    expected_hash: str


class TrashWorldFileRequest(BaseModel):
    path: str
    expected_modified_at: str
    expected_hash: str


class TrashWorldFileResponse(BaseModel):
    path: str
    trashed_path: str


class MoveWorldPathRequest(BaseModel):
    path: str
    new_path: str


class DuplicateWorldPathRequest(BaseModel):
    path: str
    new_path: str | None = None


class TrashWorldPathRequest(BaseModel):
    path: str


class WorldPathOperationResponse(BaseModel):
    path: str
    kind: Literal["file", "directory"]
    affected_paths: list[str]
    deleted_paths: list[str]


class TrashWorldPathResponse(WorldPathOperationResponse):
    trashed_path: str


class TrashEntry(BaseModel):
    original_path: str
    trashed_path: str
    name: str
    kind: Literal["file", "directory"]
    size: int
    trashed_at: str


class RestoreTrashRequest(BaseModel):
    trashed_path: str
    restore_path: str | None = None


class RestoreTrashResponse(BaseModel):
    path: str
    trashed_path: str


class DeleteTrashRequest(BaseModel):
    trashed_path: str


class DeleteTrashResponse(BaseModel):
    trashed_path: str


def _content_type(path: Path, fallback: str) -> str:
    if path.suffix.lower() in TEXT_FILE_KINDS or path.suffix.lower() in MEDIA_FILE_KINDS:
        return fallback
    guessed_type, _ = mimetypes.guess_type(path.name)
    return guessed_type or fallback


def _metadata_for_path(
    path: Path,
    root: Path,
    media_kind: str,
    content_type: str,
    content_bytes: bytes,
) -> dict[str, object]:
    stat = path.stat()
    relative_path = normalize_relative_path(path.relative_to(root).as_posix())
    extension = path.suffix.lower().lstrip(".") or None
    return {
        "path": relative_path,
        "name": path.name,
        "extension": extension,
        "media_kind": media_kind,
        "content_type": content_type,
        "size": stat.st_size,
        "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=UTC),
        "hash": sha256_hex(content_bytes),
    }


def _resolve_existing_file(root: Path, requested_path: str) -> Path:
    try:
        relative_path = normalize_relative_path(requested_path)
        ensure_no_reserved_path_parts(relative_path, message="World file path is not allowed.")
        path = resolve_under_root(root, relative_path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not path.exists():
        raise HTTPException(status_code=404, detail="World file was not found.")
    if path.is_dir():
        raise HTTPException(status_code=400, detail="World path points to a directory.")

    return path


def _reject_internal_path(relative_path: str) -> None:
    if relative_path == "" or relative_path.split("/")[0] in {".virtualscreen", ".music"}:
        raise HTTPException(status_code=400, detail="World management path is not allowed.")
    try:
        ensure_no_reserved_path_parts(
            relative_path,
            message="World management path is not allowed.",
        )
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _resolve_management_target(root: Path, requested_path: str) -> tuple[str, Path]:
    try:
        relative_path = normalize_relative_path(requested_path)
        _reject_internal_path(relative_path)
        target_path = resolve_under_root(root, relative_path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return relative_path, target_path


def _resolve_existing_management_path(root: Path, requested_path: str) -> tuple[str, Path]:
    relative_path, path = _resolve_management_target(root, requested_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="World path was not found.")
    return relative_path, path


def _file_kind_for_management(path: Path) -> tuple[str, str]:
    file_kind = WRITABLE_FILE_KINDS.get(path.suffix.lower())
    if file_kind is None:
        raise HTTPException(status_code=415, detail="World file type is not manageable.")
    return file_kind


def _validate_managed_tree(path: Path) -> None:
    if _is_link_or_reparse_point(path):
        raise HTTPException(status_code=400, detail="World folder contains unmanaged paths.")
    if path.is_file():
        return
    if not path.is_dir():
        raise HTTPException(status_code=404, detail="World path was not found.")
    for child in path.rglob("*"):
        if _is_link_or_reparse_point(child):
            raise HTTPException(status_code=400, detail="World folder contains unmanaged paths.")
        if child.name in {".virtualscreen", ".music", ".git", "__pycache__"}:
            raise HTTPException(status_code=400, detail="World folder contains unmanaged paths.")


def _check_file_preconditions(
    file_path: Path,
    expected_modified_at: str,
    expected_hash: str,
) -> None:
    current_bytes, _ = _read_text_file(file_path)
    current_hash = sha256_hex(current_bytes)
    current_modified_at = iso_datetime(modified_at(file_path))
    if expected_hash != current_hash or expected_modified_at != current_modified_at:
        raise HTTPException(status_code=409, detail="World file changed on disk.")


def _world_file_response(root: Path, file_path: Path, file_kind: tuple[str, str]) -> WorldFile:
    media_kind, fallback_type = file_kind
    content_type = _content_type(file_path, fallback_type)
    content_bytes, content = _read_text_file(file_path)
    metadata = _metadata_for_path(file_path, root, media_kind, content_type, content_bytes)
    return WorldFile(**metadata, content=content)


def _validate_create_target(
    root: Path,
    payload: CreateWorldFileRequest,
) -> tuple[Path, tuple[str, str]]:
    _, target_path = _resolve_management_target(root, payload.path)
    if target_path.exists():
        raise HTTPException(status_code=409, detail="World file already exists.")
    if not target_path.parent.exists() or not target_path.parent.is_dir():
        raise HTTPException(status_code=400, detail="World file parent folder was not found.")
    if target_path.suffix.lower() not in FILE_TYPE_EXTENSIONS[payload.file_type]:
        raise HTTPException(
            status_code=415,
            detail="World file extension does not match file type.",
        )
    return target_path, _file_kind_for_management(target_path)


def _validate_rename_target(
    root: Path,
    source_path: Path,
    requested_path: str,
) -> tuple[Path, tuple[str, str]]:
    _, target_path = _resolve_management_target(root, requested_path)
    if target_path.exists():
        raise HTTPException(status_code=409, detail="World target file already exists.")
    if not target_path.parent.exists() or not target_path.parent.is_dir():
        raise HTTPException(status_code=400, detail="World target folder was not found.")

    source_kind = _file_kind_for_management(source_path)
    target_kind = _file_kind_for_management(target_path)
    if source_kind[0] != target_kind[0]:
        raise HTTPException(status_code=415, detail="World rename cannot change file type.")
    return target_path, target_kind


def _validate_path_operation_target(
    root: Path,
    source_path: Path,
    requested_path: str,
) -> tuple[str, Path]:
    relative_path, target_path = _resolve_management_target(root, requested_path)
    if target_path.exists():
        raise HTTPException(status_code=409, detail="World target path already exists.")
    if not target_path.parent.exists() or not target_path.parent.is_dir():
        raise HTTPException(status_code=400, detail="World target parent was not found.")
    if source_path.is_file():
        if source_path.suffix.lower() != target_path.suffix.lower():
            raise HTTPException(status_code=415, detail="World move cannot change file type.")
    if source_path.is_dir() and source_path in target_path.parents:
        raise HTTPException(status_code=400, detail="World target cannot be inside source path.")
    return relative_path, target_path


def _replace_management_path(source_path: Path, target_path: Path) -> None:
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="World path was not found.")
    if target_path.exists():
        raise HTTPException(status_code=409, detail="World target path already exists.")
    try:
        replace_with_retries(source_path, target_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="World path was not found.") from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail="World target path already exists.") from exc


def _trash_management_path(root: Path, path: Path) -> Path:
    if not path.exists():
        raise HTTPException(status_code=404, detail="World path was not found.")
    try:
        return trash_file(root, path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="World path was not found.") from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail="World trash target already exists.") from exc


def _default_duplicate_path(source_path: Path) -> Path:
    parent = source_path.parent
    stem = source_path.stem if source_path.is_file() else source_path.name
    suffix = source_path.suffix if source_path.is_file() else ""
    target_path = parent / f"{stem} Copy{suffix}"
    index = 2
    while target_path.exists():
        target_path = parent / f"{stem} Copy {index}{suffix}"
        index += 1
    return target_path


def _descendant_file_paths(root: Path, path: Path) -> list[str]:
    if path.is_file():
        return [normalize_relative_path(path.relative_to(root).as_posix())]
    paths = [
        normalize_relative_path(child.relative_to(root).as_posix())
        for child in path.rglob("*")
        if child.is_file() and not _is_link_or_reparse_point(child)
    ]
    return sorted(paths) or [normalize_relative_path(path.relative_to(root).as_posix())]


def _validate_folder_target(root: Path, requested_path: str) -> tuple[str, Path]:
    relative_path, target_path = _resolve_management_target(root, requested_path)
    if target_path.exists():
        raise HTTPException(status_code=409, detail="World folder already exists.")
    if not target_path.parent.exists() or not target_path.parent.is_dir():
        raise HTTPException(status_code=400, detail="World folder parent was not found.")
    return relative_path, target_path


def _read_text_file(path: Path) -> tuple[bytes, str]:
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=415, detail="World file is not UTF-8 text.") from exc
    return content.encode("utf-8"), content


def _fresh_indexed_page(
    path: Path,
    relative_path: str,
    indexed_pages: dict[str, PageData] | None,
) -> PageData | None:
    if indexed_pages is None:
        return None
    page = indexed_pages.get(relative_path)
    if page is None:
        return None
    try:
        stat = path.stat()
    except OSError:
        return None
    if page.size != stat.st_size:
        return None
    if page.modified_at != datetime.fromtimestamp(stat.st_mtime, tz=UTC):
        return None
    return page


def _entry_for_path(
    path: Path,
    root: Path,
    indexed_pages: dict[str, PageData] | None = None,
) -> WorldEntry:
    relative_path = "" if path == root else path.relative_to(root).as_posix()
    if path.is_dir():
        sorted_children = sorted(
            path.iterdir(),
            key=lambda item: (not item.is_dir(), item.name.lower()),
        )
        children: list[WorldEntry] = []
        for child in sorted_children:
            if child.name in {".music", ".virtualscreen", ".git", "__pycache__"}:
                continue
            if _is_link_or_reparse_point(child):
                continue
            try:
                children.append(_entry_for_path(child, root, indexed_pages))
            except OSError:
                continue
        return WorldEntry(name=path.name, path=relative_path, kind="directory", children=children)

    extension = path.suffix.lower().lstrip(".") or None
    page = _fresh_indexed_page(path, relative_path, indexed_pages) or parse_page(root, path)
    if path.suffix.lower() in MARKDOWN_EXTENSIONS or page.metadata:
        return WorldEntry(
            name=path.name,
            path=relative_path,
            kind="file",
            extension=extension,
            title=page.title,
            page_type=page.page_type,
            tags=page.tags,
            aliases=page.aliases,
        )

    return WorldEntry(name=path.name, path=relative_path, kind="file", extension=extension)


def _trash_root(root: Path) -> Path:
    return root / ".virtualscreen" / "trash"


def _path_size(path: Path) -> int:
    if path.is_file():
        return path.stat().st_size
    return sum(
        child.stat().st_size
        for child in path.rglob("*")
        if child.is_file() and not _is_link_or_reparse_point(child)
    )


def _is_link_or_reparse_point(path: Path) -> bool:
    try:
        stat_result = path.lstat()
    except OSError:
        return True
    return path.is_symlink() or bool(getattr(stat_result, "st_file_attributes", 0) & 0x400)


def _cleanup_empty_trash_dirs(root: Path, path: Path) -> None:
    trash_root = _trash_root(root)
    current = path.parent
    while current != trash_root and trash_root in current.parents:
        try:
            current.rmdir()
        except OSError:
            break
        current = current.parent


def _resolve_trash_entry(root: Path, requested_path: str) -> tuple[str, str, Path]:
    try:
        relative_path = normalize_relative_path(requested_path)
        parts = relative_path.split("/")
        if len(parts) < 4 or parts[0] != ".virtualscreen" or parts[1] != "trash":
            raise WorldPathError("Trash path is not allowed.")
        trashed_path = resolve_under_root(root, relative_path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not trashed_path.exists():
        raise HTTPException(status_code=404, detail="Trash entry was not found.")
    original_path = normalize_relative_path("/".join(parts[3:]))
    return relative_path, original_path, trashed_path


def _trash_entry(root: Path, path: Path) -> TrashEntry:
    relative_path = normalize_relative_path(path.relative_to(root).as_posix())
    parts = relative_path.split("/")
    original_path = normalize_relative_path("/".join(parts[3:]))
    timestamp = parts[2]
    return TrashEntry(
        original_path=original_path,
        trashed_path=relative_path,
        name=path.name,
        kind="directory" if path.is_dir() else "file",
        size=_path_size(path),
        trashed_at=timestamp,
    )


@router.get("/info", response_model=WorldInfo)
def world_info(settings: SettingsDep) -> WorldInfo:
    root = settings.resolved_world_root
    return WorldInfo(root=str(root), exists=root.exists())


@router.get("/tree", response_model=WorldEntry)
def world_tree(settings: SettingsDep) -> WorldEntry:
    root = settings.resolved_world_root
    if not root.exists():
        return WorldEntry(name=root.name, path="", kind="directory", children=[])

    indexed_pages = {page.path: page for page in list_indexed_pages(root)}
    return _entry_for_path(root, root, indexed_pages)


@router.get("/file", response_model=WorldFile)
def world_file(path: str, settings: SettingsDep) -> WorldFile:
    root = settings.resolved_world_root
    file_path = _resolve_existing_file(root, path)
    extension = file_path.suffix.lower()

    file_kind = TEXT_FILE_KINDS.get(extension)
    if file_kind is None:
        raise HTTPException(status_code=415, detail="World file type is not readable as text.")

    media_kind, fallback_type = file_kind
    content_type = _content_type(file_path, fallback_type)

    content_bytes, content = _read_text_file(file_path)

    metadata = _metadata_for_path(file_path, root, media_kind, content_type, content_bytes)
    return WorldFile(**metadata, content=content)


@router.post("/file", response_model=WorldFile)
def create_world_file(
    payload: CreateWorldFileRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> WorldFile:
    root = settings.resolved_world_root
    target_path, file_kind = _validate_create_target(root, payload)
    content = (
        payload.content
        if payload.content is not None
        else DEFAULT_CONTENT[payload.file_type](target_path)
    )

    try:
        next_bytes = content.encode("utf-8")
    except UnicodeEncodeError as exc:
        raise HTTPException(
            status_code=415,
            detail="World file content must be UTF-8 text.",
        ) from exc

    atomic_write_bytes(target_path, next_bytes)
    result = refresh_index(root, changed_paths=[target_path.relative_to(root).as_posix()])
    queue_world_event(
        background_tasks,
        result,
        paths=[target_path.relative_to(root).as_posix()],
        deleted_paths=[],
        reason="created",
    )
    return _world_file_response(root, target_path, file_kind)


@router.post("/folder", response_model=WorldEntry)
def create_world_folder(
    payload: CreateWorldFolderRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> WorldEntry:
    root = settings.resolved_world_root
    relative_path, target_path = _validate_folder_target(root, payload.path)
    target_path.mkdir()
    result = refresh_index(root, changed_paths=[])
    queue_world_event(
        background_tasks,
        result,
        paths=[relative_path],
        deleted_paths=[],
        reason="created",
    )
    return _entry_for_path(target_path, root)


@router.post("/path/move", response_model=WorldPathOperationResponse)
def move_world_path(
    payload: MoveWorldPathRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> WorldPathOperationResponse:
    root = settings.resolved_world_root
    source_relative_path, source_path = _resolve_existing_management_path(root, payload.path)
    _validate_managed_tree(source_path)
    source_paths = _descendant_file_paths(root, source_path)
    target_relative_path, target_path = _validate_path_operation_target(
        root,
        source_path,
        payload.new_path,
    )

    _replace_management_path(source_path, target_path)
    affected_paths = _descendant_file_paths(root, target_path)
    result = refresh_index(root, changed_paths=affected_paths, deleted_paths=source_paths)
    queue_world_event(
        background_tasks,
        result,
        paths=affected_paths,
        deleted_paths=source_paths,
        reason="mixed",
    )
    return WorldPathOperationResponse(
        path=target_relative_path,
        kind="directory" if target_path.is_dir() else "file",
        affected_paths=affected_paths,
        deleted_paths=source_paths,
    )


@router.post("/path/duplicate", response_model=WorldPathOperationResponse)
def duplicate_world_path(
    payload: DuplicateWorldPathRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> WorldPathOperationResponse:
    root = settings.resolved_world_root
    _, source_path = _resolve_existing_management_path(root, payload.path)
    _validate_managed_tree(source_path)
    default_target_path = _default_duplicate_path(source_path) if payload.new_path is None else None
    target_relative_path, target_path = _validate_path_operation_target(
        root,
        source_path,
        default_target_path.relative_to(root).as_posix()
        if default_target_path
        else payload.new_path,
    )

    if source_path.is_dir():
        shutil.copytree(source_path, target_path)
    else:
        shutil.copy2(source_path, target_path)
    affected_paths = _descendant_file_paths(root, target_path)
    result = refresh_index(root, changed_paths=affected_paths)
    queue_world_event(
        background_tasks,
        result,
        paths=affected_paths,
        deleted_paths=[],
        reason="created",
    )
    return WorldPathOperationResponse(
        path=target_relative_path,
        kind="directory" if target_path.is_dir() else "file",
        affected_paths=affected_paths,
        deleted_paths=[],
    )


@router.post("/path/trash", response_model=TrashWorldPathResponse)
def trash_world_path(
    payload: TrashWorldPathRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> TrashWorldPathResponse:
    root = settings.resolved_world_root
    relative_path, path = _resolve_existing_management_path(root, payload.path)
    _validate_managed_tree(path)
    deleted_paths = _descendant_file_paths(root, path)
    kind: Literal["file", "directory"] = "directory" if path.is_dir() else "file"

    trashed_path = _trash_management_path(root, path)
    result = refresh_index(root, deleted_paths=deleted_paths)
    queue_world_event(
        background_tasks,
        result,
        paths=[],
        deleted_paths=deleted_paths,
        reason="deleted",
    )
    return TrashWorldPathResponse(
        path=relative_path,
        kind=kind,
        affected_paths=[],
        deleted_paths=deleted_paths,
        trashed_path=normalize_relative_path(trashed_path.relative_to(root).as_posix()),
    )


@router.put("/file", response_model=SaveWorldFileResponse)
def save_world_file(
    path: str,
    payload: SaveWorldFileRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> SaveWorldFileResponse:
    root = settings.resolved_world_root
    file_path = _resolve_existing_file(root, path)
    extension = file_path.suffix.lower()

    file_kind = WRITABLE_FILE_KINDS.get(extension)
    if file_kind is None:
        raise HTTPException(status_code=415, detail="World file type is not writable.")

    current_bytes, _ = _read_text_file(file_path)
    current_hash = sha256_hex(current_bytes)
    current_modified_at = iso_datetime(modified_at(file_path))
    if (
        payload.expected_hash != current_hash
        or payload.expected_modified_at != current_modified_at
    ):
        raise HTTPException(status_code=409, detail="World file changed on disk.")

    try:
        next_bytes = payload.content.encode("utf-8")
    except UnicodeEncodeError as exc:
        raise HTTPException(
            status_code=415,
            detail="World file content must be UTF-8 text.",
        ) from exc

    backup_path = backup_file(root, file_path)
    atomic_write_bytes(file_path, next_bytes)
    result = refresh_index(root, changed_paths=[file_path.relative_to(root).as_posix()])
    queue_world_event(
        background_tasks,
        result,
        paths=[file_path.relative_to(root).as_posix()],
        deleted_paths=[],
        reason="modified",
    )

    media_kind, fallback_type = file_kind
    content_type = _content_type(file_path, fallback_type)
    fresh_bytes, fresh_content = _read_text_file(file_path)
    metadata = _metadata_for_path(file_path, root, media_kind, content_type, fresh_bytes)
    return SaveWorldFileResponse(
        **metadata,
        content=fresh_content,
        backup_path=normalize_relative_path(backup_path.relative_to(root).as_posix()),
    )


@router.post("/file/rename", response_model=WorldFile)
def rename_world_file(
    payload: RenameWorldFileRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> WorldFile:
    root = settings.resolved_world_root
    file_path = _resolve_existing_file(root, payload.path)
    relative_path = normalize_relative_path(file_path.relative_to(root).as_posix())
    _reject_internal_path(relative_path)
    _file_kind_for_management(file_path)
    _check_file_preconditions(
        file_path,
        payload.expected_modified_at,
        payload.expected_hash,
    )

    target_path, target_kind = _validate_rename_target(
        root,
        file_path,
        payload.new_path,
    )
    _replace_management_path(file_path, target_path)
    result = refresh_index(
        root,
        changed_paths=[target_path.relative_to(root).as_posix()],
        deleted_paths=[relative_path],
    )
    queue_world_event(
        background_tasks,
        result,
        paths=[target_path.relative_to(root).as_posix()],
        deleted_paths=[relative_path],
        reason="mixed",
    )
    return _world_file_response(root, target_path, target_kind)


@router.post("/file/trash", response_model=TrashWorldFileResponse)
def trash_world_file(
    payload: TrashWorldFileRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> TrashWorldFileResponse:
    root = settings.resolved_world_root
    file_path = _resolve_existing_file(root, payload.path)
    relative_path = normalize_relative_path(file_path.relative_to(root).as_posix())
    _reject_internal_path(relative_path)
    _file_kind_for_management(file_path)
    _check_file_preconditions(
        file_path,
        payload.expected_modified_at,
        payload.expected_hash,
    )

    trashed_path = _trash_management_path(root, file_path)
    result = refresh_index(root, deleted_paths=[relative_path])
    queue_world_event(
        background_tasks,
        result,
        paths=[],
        deleted_paths=[relative_path],
        reason="deleted",
    )
    return TrashWorldFileResponse(
        path=relative_path,
        trashed_path=normalize_relative_path(trashed_path.relative_to(root).as_posix()),
    )


@router.get("/trash", response_model=list[TrashEntry])
def world_trash(settings: SettingsDep) -> list[TrashEntry]:
    root = settings.resolved_world_root
    trash_root = _trash_root(root)
    if not trash_root.exists():
        return []

    entries: list[TrashEntry] = []
    for timestamp_dir in sorted(trash_root.iterdir(), key=lambda item: item.name, reverse=True):
        if not timestamp_dir.is_dir():
            continue
        for item in sorted(
            (path for path in timestamp_dir.rglob("*") if path.is_file()),
            key=lambda path: path.relative_to(timestamp_dir).as_posix().lower(),
        ):
            entries.append(_trash_entry(root, item))
    return entries


@router.post("/trash/restore", response_model=RestoreTrashResponse)
def restore_world_trash(
    payload: RestoreTrashRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> RestoreTrashResponse:
    root = settings.resolved_world_root
    trashed_relative_path, original_path, trashed_path = _resolve_trash_entry(
        root,
        payload.trashed_path,
    )
    try:
        restore_relative_path = normalize_relative_path(payload.restore_path or original_path)
        _reject_internal_path(restore_relative_path)
        restore_path = resolve_under_root(root, restore_relative_path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if restore_path.exists():
        raise HTTPException(status_code=409, detail="World restore target already exists.")
    if not restore_path.parent.exists() or not restore_path.parent.is_dir():
        raise HTTPException(status_code=400, detail="World restore parent was not found.")

    restore_path.parent.mkdir(parents=True, exist_ok=True)
    _replace_management_path(trashed_path, restore_path)
    _cleanup_empty_trash_dirs(root, trashed_path)
    result = refresh_index(root, changed_paths=[restore_relative_path])
    queue_world_event(
        background_tasks,
        result,
        paths=[restore_relative_path],
        deleted_paths=[],
        reason="created",
    )
    return RestoreTrashResponse(path=restore_relative_path, trashed_path=trashed_relative_path)


@router.delete("/trash", response_model=DeleteTrashResponse)
def delete_world_trash(
    payload: DeleteTrashRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> DeleteTrashResponse:
    root = settings.resolved_world_root
    trashed_relative_path, _, trashed_path = _resolve_trash_entry(root, payload.trashed_path)
    if trashed_path.is_dir():
        shutil.rmtree(trashed_path)
    else:
        trashed_path.unlink()
    _cleanup_empty_trash_dirs(root, trashed_path)
    result = refresh_index(root, changed_paths=[], deleted_paths=[])
    queue_world_event(
        background_tasks,
        result,
        paths=[],
        deleted_paths=[],
        reason="deleted",
    )
    return DeleteTrashResponse(trashed_path=trashed_relative_path)


@router.get("/media")
def world_media(path: str, settings: SettingsDep) -> FileResponse:
    root = settings.resolved_world_root
    file_path = _resolve_existing_file(root, path)
    extension = file_path.suffix.lower()

    file_kind = MEDIA_FILE_KINDS.get(extension)
    if file_kind is None:
        raise HTTPException(status_code=415, detail="World file type is not supported media.")

    _, fallback_type = file_kind
    content_type = _content_type(file_path, fallback_type)
    headers = {"X-Content-Type-Options": "nosniff"}
    if extension == ".svg":
        headers["Content-Security-Policy"] = (
            "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'"
        )
    return FileResponse(
        file_path,
        media_type=content_type,
        filename=file_path.name,
        content_disposition_type="inline",
        headers=headers,
    )
