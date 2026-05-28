from dataclasses import dataclass
from pathlib import Path

from app.core.file_safety import replace_with_retries, trash_file


@dataclass(frozen=True)
class WorldOperationError(Exception):
    status_code: int
    detail: str


def replace_management_path(source_path: Path, target_path: Path) -> None:
    if not source_path.exists():
        raise WorldOperationError(404, "World path was not found.")
    if target_path.exists():
        raise WorldOperationError(409, "World target path already exists.")
    try:
        replace_with_retries(source_path, target_path)
    except FileNotFoundError as exc:
        raise WorldOperationError(404, "World path was not found.") from exc
    except FileExistsError as exc:
        raise WorldOperationError(409, "World target path already exists.") from exc


def trash_management_path(root: Path, path: Path) -> Path:
    if not path.exists():
        raise WorldOperationError(404, "World path was not found.")
    try:
        return trash_file(root, path)
    except FileNotFoundError as exc:
        raise WorldOperationError(404, "World path was not found.") from exc
    except FileExistsError as exc:
        raise WorldOperationError(409, "World trash target already exists.") from exc
