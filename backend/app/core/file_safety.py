import hashlib
import shutil
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path


def sha256_hex(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def modified_at(path: Path) -> datetime:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=UTC)


def iso_datetime(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def backup_file(root: Path, path: Path, now: datetime | None = None) -> Path:
    timestamp = (now or datetime.now(tz=UTC)).strftime("%Y%m%d-%H%M%S")
    relative_path = path.relative_to(root)
    backup_path = root / ".virtualscreen" / "backups" / timestamp / relative_path
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup_path)
    return backup_path


def trash_file(root: Path, path: Path, now: datetime | None = None) -> Path:
    timestamp = (now or datetime.now(tz=UTC)).strftime("%Y%m%d-%H%M%S")
    relative_path = path.relative_to(root)
    trash_path = root / ".virtualscreen" / "trash" / timestamp / relative_path
    if trash_path.exists():
        trash_path = (
            root
            / ".virtualscreen"
            / "trash"
            / f"{timestamp}-{uuid.uuid4().hex}"
            / relative_path
        )
    trash_path.parent.mkdir(parents=True, exist_ok=True)
    replace_with_retries(path, trash_path)
    return trash_path


def replace_with_retries(source: Path, target: Path) -> None:
    for attempt in range(8):
        try:
            source.replace(target)
            return
        except PermissionError:
            if attempt == 7:
                raise
            time.sleep(0.05)


def atomic_write_bytes(path: Path, content: bytes) -> None:
    temporary_path = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary_path.write_bytes(content)
        replace_with_retries(temporary_path, path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()
