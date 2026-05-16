from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

from app.core.file_safety import atomic_write_bytes, iso_datetime, modified_at, sha256_hex
from app.core.paths import normalize_relative_path

CAPTURE_HEADINGS = {
    "idea": "Ideas",
    "todo": "Todos",
    "npc": "NPCs",
    "player_wish": "Player Wishes",
    "ruling": "Rulings",
    "loot": "Loot",
    "question": "Questions",
    "other": "Other",
}
SESSION_LOGS_FOLDER = "Session Logs"


@dataclass(frozen=True)
class CaptureToday:
    path: str
    exists: bool


@dataclass(frozen=True)
class CaptureResult:
    path: str
    category: str
    heading: str
    entry: str
    created: bool
    modified_at: str
    hash: str


def daily_capture_path(root: Path, today: date | None = None) -> Path:
    current_date = today or date.today()
    return root / SESSION_LOGS_FOLDER / f"{current_date.isoformat()}.md"


def today_capture(root: Path) -> CaptureToday:
    path = daily_capture_path(root)
    return CaptureToday(
        path=normalize_relative_path(path.relative_to(root).as_posix()),
        exists=path.exists(),
    )


def _entry(text: str, captured_at: datetime) -> str:
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    first_line = lines[0]
    continuation = [f"  {line}" for line in lines[1:]]
    return "\n".join([f"- {captured_at.strftime('%H:%M')} - {first_line}", *continuation])


def _new_log_content(log_date: date, heading: str, entry: str) -> str:
    return f"# Session Log {log_date.isoformat()}\n\n## {heading}\n\n{entry}\n"


def _append_to_section(content: str, heading: str, entry: str) -> str:
    marker = f"## {heading}"
    marker_index = content.find(marker)
    if marker_index == -1:
        return f"{content.rstrip()}\n\n{marker}\n\n{entry}\n"

    next_heading = content.find("\n## ", marker_index + len(marker))
    if next_heading == -1:
        section = content[marker_index:].rstrip()
        prefix = content[:marker_index]
        return f"{prefix}{section}\n\n{entry}\n"

    prefix = content[:next_heading].rstrip()
    suffix = content[next_heading:]
    return f"{prefix}\n\n{entry}\n{suffix}"


def append_capture(root: Path, category: str, text: str) -> CaptureResult:
    captured_at = datetime.now()
    path = daily_capture_path(root, captured_at.date())
    relative_path = normalize_relative_path(path.relative_to(root).as_posix())
    created = not path.exists()
    heading = CAPTURE_HEADINGS[category]
    entry = _entry(text, captured_at)

    path.parent.mkdir(parents=True, exist_ok=True)
    if created:
        next_content = _new_log_content(captured_at.date(), heading, entry)
    else:
        current_content = path.read_text(encoding="utf-8")
        next_content = _append_to_section(current_content, heading, entry)

    next_bytes = next_content.encode("utf-8")
    atomic_write_bytes(path, next_bytes)
    return CaptureResult(
        path=relative_path,
        category=category,
        heading=heading,
        entry=entry,
        created=created,
        modified_at=iso_datetime(modified_at(path)),
        hash=sha256_hex(next_bytes),
    )
