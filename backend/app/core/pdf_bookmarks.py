import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

from app.core.file_safety import atomic_write_bytes
from app.core.paths import (
    WorldPathError,
    normalize_relative_path,
    read_json_or_default,
    resolve_under_root,
)

PDF_BOOKMARKS_PATH = ".virtualscreen/pdf-bookmarks.json"
BOOKMARK_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$")
MAX_BOOKMARKS_PER_PDF = 500
MAX_LABEL_LENGTH = 160
MAX_NOTE_LENGTH = 1000


@dataclass(frozen=True)
class PdfBookmark:
    id: str
    label: str
    page: int
    note: str | None
    created_at: str
    updated_at: str


def _state_path(root: Path) -> Path:
    return root / PDF_BOOKMARKS_PATH


def validate_pdf_path(root: Path, path: str) -> str:
    relative_path = normalize_relative_path(path)
    target = resolve_under_root(root, relative_path)
    if target.suffix.lower() != ".pdf":
        raise ValueError("PDF bookmarks require a PDF file.")
    if not target.exists():
        raise FileNotFoundError(relative_path)
    if not target.is_file():
        raise ValueError("PDF bookmarks require a PDF file.")
    return relative_path


def _validate_bookmark_id(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("PDF bookmark id is required.")
    bookmark_id = value.strip()
    if not BOOKMARK_ID_RE.fullmatch(bookmark_id):
        raise ValueError("PDF bookmark id is invalid.")
    return bookmark_id


def _validate_label(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("PDF bookmark label is required.")
    label = value.strip()
    if not label or len(label) > MAX_LABEL_LENGTH:
        raise ValueError("PDF bookmark label is invalid.")
    if any(ord(character) < 32 for character in label):
        raise ValueError("PDF bookmark label is invalid.")
    return label


def _validate_page(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError("PDF bookmark page must be a positive integer.")
    return value


def _validate_note(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("PDF bookmark note is invalid.")
    note = value.strip()
    if len(note) > MAX_NOTE_LENGTH:
        raise ValueError("PDF bookmark note is too long.")
    return note or None


def _validate_timestamp(value: object, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"PDF bookmark {label} is required.")
    timestamp = value.strip()
    try:
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"PDF bookmark {label} is invalid.") from exc
    return timestamp


def _bookmark_from_dict(value: object) -> PdfBookmark:
    if not isinstance(value, dict):
        raise ValueError("PDF bookmark must be an object.")
    return PdfBookmark(
        id=_validate_bookmark_id(value.get("id")),
        label=_validate_label(value.get("label")),
        page=_validate_page(value.get("page")),
        note=_validate_note(value.get("note")),
        created_at=_validate_timestamp(value.get("created_at"), "created_at"),
        updated_at=_validate_timestamp(value.get("updated_at"), "updated_at"),
    )


def bookmarks_from_payload(value: object) -> list[PdfBookmark]:
    if not isinstance(value, dict):
        raise ValueError("PDF bookmark payload must be an object.")
    bookmarks = value.get("bookmarks")
    if not isinstance(bookmarks, list):
        raise ValueError("PDF bookmark payload must include a bookmarks list.")
    if len(bookmarks) > MAX_BOOKMARKS_PER_PDF:
        raise ValueError("PDF bookmark list is too long.")
    parsed = [_bookmark_from_dict(bookmark) for bookmark in bookmarks]
    bookmark_ids = [bookmark.id for bookmark in parsed]
    if len(bookmark_ids) != len(set(bookmark_ids)):
        raise ValueError("PDF bookmark ids must be unique.")
    return parsed


def _load_all(root: Path) -> dict[str, list[PdfBookmark]]:
    state_path = _state_path(root)
    if not state_path.is_file():
        return {}
    loaded = read_json_or_default(state_path, {})
    if not isinstance(loaded, dict):
        return {}
    result: dict[str, list[PdfBookmark]] = {}
    for path, value in loaded.items():
        if not isinstance(path, str):
            continue
        try:
            result[normalize_relative_path(path)] = bookmarks_from_payload({"bookmarks": value})
        except (ValueError, WorldPathError):
            continue
    return result


def load_pdf_bookmarks(root: Path, path: str) -> list[PdfBookmark]:
    relative_path = validate_pdf_path(root, path)
    return _load_all(root).get(relative_path, [])


def save_pdf_bookmarks(root: Path, path: str, payload: object) -> list[PdfBookmark]:
    relative_path = validate_pdf_path(root, path)
    bookmarks = bookmarks_from_payload(payload)
    all_bookmarks = _load_all(root)
    if bookmarks:
        all_bookmarks[relative_path] = bookmarks
    else:
        all_bookmarks.pop(relative_path, None)
    state_path = _state_path(root)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    serializable = {
        stored_path: [asdict(bookmark) for bookmark in stored_bookmarks]
        for stored_path, stored_bookmarks in sorted(all_bookmarks.items())
    }
    state_json = json.dumps(serializable, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    atomic_write_bytes(state_path, state_json.encode("utf-8"))
    return bookmarks
