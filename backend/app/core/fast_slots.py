import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

from app.core.audio import AUDIO_EXTENSIONS, MUSIC_ROOT
from app.core.database import initialize_database
from app.core.display import DISPLAY_POPUP_PRESETS
from app.core.map import list_map_presets
from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root
from app.core.scenarios import get_scenario
from app.core.scripts import validate_script_path

SlotBus = Literal["ambient", "music", "effect"]
SlotKind = Literal[
    "open_file",
    "screen_fullscreen",
    "screen_popup",
    "audio_track",
    "scenario",
    "script_run",
    "map_preset",
]

VALID_BUSES = {"ambient", "music", "effect"}
SCREEN_ACTIONS = {"screen_fullscreen", "screen_popup"}
MAX_SLOTS = 10


@dataclass(frozen=True)
class FastSlot:
    id: str
    position: int
    label: str
    icon: str | None
    action: dict[str, object]


def _missing(message: str) -> FileNotFoundError:
    return FileNotFoundError(message)


def _validate_existing_file(root: Path, raw_path: object) -> str:
    path_text = normalize_relative_path(str(raw_path or ""))
    target = resolve_under_root(root, path_text)
    if not target.exists():
        raise _missing("Fast slot target was not found.")
    if target.is_dir():
        raise WorldPathError("Fast slot target must be a file.")
    if path_text.split("/")[0] == ".virtualscreen":
        raise WorldPathError("Fast slot target cannot be an internal file.")
    return path_text


def _validate_audio_path(root: Path, raw_path: object) -> str:
    path_text = normalize_relative_path(str(raw_path or ""))
    target = resolve_under_root(root, path_text)
    if not target.exists():
        raise _missing("Fast slot audio track was not found.")
    if target.is_dir():
        raise WorldPathError("Fast slot audio target must be a file.")
    parts = path_text.split("/")
    if parts[0] != MUSIC_ROOT or target.suffix.lower() not in AUDIO_EXTENSIONS:
        raise WorldPathError("Fast slot audio target is not supported.")
    return path_text


def _validate_popup_preset(raw_preset: object) -> str | None:
    if raw_preset is None:
        return None
    preset = str(raw_preset or "").strip()
    if preset not in DISPLAY_POPUP_PRESETS:
        raise ValueError("Fast slot popup preset is invalid.")
    return preset


def _validate_map_preset(root: Path, action: dict[str, object]) -> dict[str, object]:
    preset_id = str(action.get("preset_id") or "").strip()
    if not preset_id:
        raise ValueError("Fast slot map preset id is required.")
    if not any(preset.id == preset_id for preset in list_map_presets(root)):
        raise _missing("Fast slot map preset was not found.")
    return {
        "kind": "map_preset",
        "preset_id": preset_id,
        "present": bool(action.get("present")),
    }


def _validate_action(root: Path, action: object) -> dict[str, object]:
    if not isinstance(action, dict):
        raise ValueError("Fast slot action must be an object.")
    kind = str(action.get("kind") or "")
    if kind == "open_file":
        return {"kind": kind, "path": _validate_existing_file(root, action.get("path"))}
    if kind in SCREEN_ACTIONS:
        raw_path = action.get("path")
        preset = _validate_popup_preset(action.get("preset")) if kind == "screen_popup" else None
        validated: dict[str, object] = {"kind": kind}
        if raw_path is None or str(raw_path).strip() == "":
            if preset:
                validated["preset"] = preset
            return validated
        validated["path"] = _validate_existing_file(root, raw_path)
        if preset:
            validated["preset"] = preset
        return validated
    if kind == "audio_track":
        return {
            "kind": kind,
            "path": _validate_audio_path(root, action.get("path")),
            "bus": "effect",
            "play": True,
        }
    if kind == "scenario":
        scenario_id = str(action.get("scenario_id") or "").strip()
        get_scenario(root, scenario_id)
        inputs = action.get("inputs") or {}
        if not isinstance(inputs, dict):
            raise ValueError("Fast slot scenario inputs must be an object.")
        return {"kind": kind, "scenario_id": scenario_id, "inputs": inputs}
    if kind == "script_run":
        return {"kind": kind, "path": validate_script_path(root, action.get("path"))}
    if kind == "map_preset":
        return _validate_map_preset(root, action)
    raise ValueError("Fast slot action kind is invalid.")


def _slot_from_dict(root: Path, value: object) -> FastSlot:
    if not isinstance(value, dict):
        raise ValueError("Fast slot must be an object.")
    position = int(value.get("position") or 0)
    if position < 1 or position > MAX_SLOTS:
        raise ValueError("Fast slot position is invalid.")
    label = str(value.get("label") or "").strip()
    if not label:
        raise ValueError("Fast slot label is required.")
    icon = value.get("icon")
    return FastSlot(
        id=str(value.get("id") or f"slot-{position}"),
        position=position,
        label=label,
        icon=str(icon) if icon is not None else None,
        action=_validate_action(root, value.get("action")),
    )


def load_fast_slots(root: Path) -> list[FastSlot]:
    conn = initialize_database(root)
    rows = conn.execute("select slot_json from fast_slots order by position").fetchall()
    conn.close()
    slots: list[FastSlot] = []
    for row in rows:
        try:
            slots.append(_slot_from_dict(root, json.loads(row["slot_json"])))
        except (ValueError, FileNotFoundError, WorldPathError, json.JSONDecodeError):
            continue
    return slots


def save_fast_slots(root: Path, values: list[object]) -> list[FastSlot]:
    slots = [_slot_from_dict(root, item) for item in values]
    positions = [slot.position for slot in slots]
    if len(positions) != len(set(positions)):
        raise ValueError("Fast slot positions must be unique.")

    conn = initialize_database(root)
    with conn:
        conn.execute("delete from fast_slots")
        for slot in sorted(slots, key=lambda item: item.position):
            conn.execute(
                "insert into fast_slots(position, slot_json) values (?, ?)",
                (
                    slot.position,
                    json.dumps(asdict(slot), ensure_ascii=False, sort_keys=True),
                ),
            )
    conn.close()
    return load_fast_slots(root)
