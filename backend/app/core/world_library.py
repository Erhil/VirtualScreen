import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class WorldLibraryEntry:
    id: str
    name: str
    path: str
    modified_at: str


def default_worlds_root() -> Path:
    if os.name == "nt":
        return Path.home() / "Documents" / "VirtualScreen" / "worlds"
    return Path.home() / ".vscreen" / "worlds"


# None means "this library has been looked up and has no active world", which is
# what keeps get_active_world_root off the disk after the first call.
_ACTIVE_WORLDS: dict[str, Path | None] = {}


def _library_key(worlds_root: Path) -> str:
    return str(worlds_root.expanduser().resolve())


def _restore_active_world_root(worlds_root: Path) -> Path | None:
    stored = _read_state(worlds_root).get("active_world")
    if not isinstance(stored, str):
        return None
    try:
        return resolve_library_world(worlds_root, stored)
    except (ValueError, FileNotFoundError, OSError):
        # The state file is ordinary JSON on disk and can be stale, hand-edited,
        # or left over from another machine. It must never be able to widen
        # where the app reads from, so anything that does not resolve to a
        # directory inside this library is discarded in favour of the fallback.
        return None


def get_active_world_root(worlds_root: Path, fallback_root: Path) -> Path:
    key = _library_key(worlds_root)
    if key not in _ACTIVE_WORLDS:
        # The active world used to live only in this process, so every restart -
        # a crash, the appliance watchdog, a reboot after Windows Update - put
        # the DM console and the player screen back on the fallback world
        # without saying so. Reload the choice instead.
        _ACTIVE_WORLDS[key] = _restore_active_world_root(worlds_root)
    active = _ACTIVE_WORLDS[key]
    return active if active is not None else fallback_root.expanduser().resolve()


def set_active_world_root(worlds_root: Path, world_root: Path) -> None:
    resolved = world_root.expanduser().resolve()
    _ACTIVE_WORLDS[_library_key(worlds_root)] = resolved
    try:
        state = _read_state(worlds_root)
        state["active_world"] = resolved.name
        _write_state(worlds_root, state)
    except OSError:
        # Remembering the choice is best-effort. A full disk or a locked file
        # must not stop the world from opening - the switch has already happened
        # in memory above, and the only thing lost is surviving a restart.
        pass


def app_state_path(worlds_root: Path) -> Path:
    return worlds_root.expanduser().resolve().parent / "virtualscreen-state.json"


def _read_state(worlds_root: Path) -> dict[str, object]:
    path = app_state_path(worlds_root)
    if not path.exists():
        return {}
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        # ValueError rather than JSONDecodeError: a file saved as UTF-16 or ANSI
        # raises UnicodeDecodeError, which is a ValueError and not a JSON error.
        # This is read during startup, so letting it escape would turn one
        # mis-encoded file into an appliance that restarts forever.
        return {}
    return loaded if isinstance(loaded, dict) else {}


def _write_state(worlds_root: Path, state: dict[str, object]) -> None:
    path = app_state_path(worlds_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary_path.replace(path)


def validate_world_id(world_id: str) -> str:
    normalized = world_id.strip()
    if (
        not normalized
        or normalized in {".", ".."}
        or "/" in normalized
        or "\\" in normalized
        or normalized.startswith(".")
        or normalized == "__pycache__"
    ):
        raise ValueError("World id is not allowed.")
    return normalized


def world_entry(path: Path) -> WorldLibraryEntry:
    stat = path.stat()
    modified_at = datetime.fromtimestamp(stat.st_mtime, tz=UTC).isoformat().replace("+00:00", "Z")
    return WorldLibraryEntry(
        id=path.name,
        name=path.name,
        path=str(path.resolve()),
        modified_at=modified_at,
    )


def list_worlds(worlds_root: Path) -> list[WorldLibraryEntry]:
    root = worlds_root.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    entries = [
        world_entry(path)
        for path in root.iterdir()
        if path.is_dir() and not path.name.startswith(".") and path.name != "__pycache__"
    ]
    return sorted(entries, key=lambda entry: entry.name.lower())


def resolve_library_world(worlds_root: Path, world_id: str) -> Path:
    safe_id = validate_world_id(world_id)
    root = worlds_root.expanduser().resolve()
    candidate = (root / safe_id).resolve()
    if candidate.parent != root:
        # relative_to alone is not enough: a world is always a direct child, and
        # a drive-relative id like "C:" joins to the library root itself, which
        # is trivially relative to itself and would hand back every world at
        # once as if it were one.
        raise ValueError("World path escapes the world library.")
    if not candidate.exists() or not candidate.is_dir():
        raise FileNotFoundError(safe_id)
    return candidate


def create_library_world(worlds_root: Path, world_id: str) -> Path:
    safe_id = validate_world_id(world_id)
    root = worlds_root.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    candidate = (root / safe_id).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise ValueError("World path escapes the world library.") from exc
    if candidate.exists():
        raise FileExistsError(safe_id)
    candidate.mkdir()
    return candidate


def load_recent_world_ids(worlds_root: Path) -> list[str]:
    state = _read_state(worlds_root)
    recent = state.get("recent_worlds")
    if not isinstance(recent, list):
        return []
    ids: list[str] = []
    for value in recent:
        if not isinstance(value, str):
            continue
        try:
            world_id = validate_world_id(value)
        except ValueError:
            continue
        if world_id not in ids:
            ids.append(world_id)
    return ids


def save_recent_world_ids(worlds_root: Path, world_ids: list[str]) -> list[str]:
    known = {entry.id for entry in list_worlds(worlds_root)}
    recent: list[str] = []
    for value in world_ids:
        world_id = validate_world_id(value)
        if world_id in known and world_id not in recent:
            recent.append(world_id)

    state = _read_state(worlds_root)
    state["recent_worlds"] = recent
    _write_state(worlds_root, state)
    return recent


def recent_worlds(worlds_root: Path) -> list[WorldLibraryEntry]:
    entries = {entry.id: entry for entry in list_worlds(worlds_root)}
    return [
        entries[world_id]
        for world_id in load_recent_world_ids(worlds_root)
        if world_id in entries
    ]
