import json
import os
import shutil
import subprocess
import sys
import threading
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from app.core.audio import BUS_FOLDER_TO_BUS, scan_audio_library
from app.core.card_templates import list_card_templates, validate_card_shape
from app.core.dice import (
    DICE_COUNT_MAX,
    DICE_EXPRESSION_PATTERN,
    DICE_SIDES_MAX,
)
from app.core.display import display_item_for_path
from app.core.file_safety import atomic_write_bytes, backup_file
from app.core.index import refresh_index_for_paths
from app.core.map import list_map_presets, map_image_path
from app.core.paths import (
    WorldPathError,
    ensure_no_reserved_path_parts,
    normalize_relative_path,
    resolve_under_root,
)

DMS_PREFIX = "__VIRTUALSCREEN_DMS__"
DMS_WAITING_EXIT_CODE = 42
DMS_TIMEOUT_SECONDS = 10
MAX_DMS_RUNS = 50
MAX_DMS_OUTPUTS_PER_RUN = 20
MAX_DMS_OUTPUT_CONTENT_CHARS = 200_000
MAX_DMS_STDIO_CHARS = 200_000
DMS_TRUST_PATH = ".virtualscreen/dms-trust.json"
DMS_SUBPROCESS_ENV_ALLOWLIST = {
    "APPDATA",
    "COMSPEC",
    "HOME",
    "LOCALAPPDATA",
    "PATH",
    "PATHEXT",
    "PROGRAMDATA",
    "PYTHONHOME",
    "PYTHONPATH",
    "PYTHONUTF8",
    "SYSTEMROOT",
    "SystemRoot",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "VIRTUAL_ENV",
    "WINDIR",
}

DmsRunStatus = Literal[
    "running",
    "waiting_for_form",
    "success",
    "error",
    "timeout",
    "cancelled",
]
DmsOutputKind = Literal["markdown", "csv"]
DmsEffectKind = Literal[
    "screen_fullscreen",
    "screen_popup",
    "audio_play",
    "map_load",
    "map_preset",
    "map_present",
    "map_stop",
    "map_fog",
]
DmsWriteKind = Literal["create_note", "append_note", "create_card"]


@dataclass(frozen=True)
class DmsScriptSummary:
    path: str
    name: str
    title: str
    size: int
    modified_at: str


@dataclass(frozen=True)
class DmsFormRequest:
    request_id: str
    schema: dict[str, object]


@dataclass(frozen=True)
class DmsOutput:
    id: str
    media_kind: DmsOutputKind
    virtual_path: str
    name: str
    content: str


@dataclass(frozen=True)
class DmsEffect:
    id: str
    kind: DmsEffectKind
    path: str | None = None
    preset_id: str | None = None
    present: bool | None = None
    enabled: bool | None = None
    bus: str | None = None
    volume: int | None = None


@dataclass(frozen=True)
class DmsWrite:
    id: str
    kind: DmsWriteKind
    path: str
    content: str


@dataclass
class DmsRunState:
    run_id: str
    path: str
    status: DmsRunStatus
    form_request: DmsFormRequest | None
    outputs: list[DmsOutput]
    effects: list[DmsEffect]
    stdout: str
    stderr: str
    created_at: str
    form_values: list[dict[str, object]] = field(default_factory=list)
    process: subprocess.Popen[str] | None = field(default=None, repr=False)
    cancel_requested: bool = False


_RUNS: dict[str, DmsRunState] = {}
_RUNS_LOCK = threading.Lock()


def _cap_text(value: str, limit: int) -> str:
    return value if len(value) <= limit else value[:limit]


def _cap_outputs(outputs: list[DmsOutput]) -> list[DmsOutput]:
    return [
        DmsOutput(
            id=output.id,
            media_kind=output.media_kind,
            virtual_path=output.virtual_path,
            name=output.name,
            content=_cap_text(output.content, MAX_DMS_OUTPUT_CONTENT_CHARS),
        )
        for output in outputs[:MAX_DMS_OUTPUTS_PER_RUN]
    ]


def _runtime_dir_path(root: Path, run_id: str) -> Path:
    return root / ".virtualscreen" / "dms-runs" / run_id


def _prune_old_runs(root: Path) -> None:
    removed: list[str] = []
    with _RUNS_LOCK:
        removable = sorted(
            (
                (run_id, state)
                for run_id, state in _RUNS.items()
                if state.status not in {"running", "waiting_for_form"}
            ),
            key=lambda item: item[1].created_at,
        )
        while len(_RUNS) > MAX_DMS_RUNS and removable:
            run_id, _ = removable.pop(0)
            if _RUNS.pop(run_id, None) is not None:
                removed.append(run_id)
    for run_id in removed:
        shutil.rmtree(_runtime_dir_path(root, run_id), ignore_errors=True)


def _utc_now() -> str:
    return datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")


def _dms_trust_path(root: Path) -> Path:
    return root / DMS_TRUST_PATH


def is_dms_trusted(root: Path) -> bool:
    try:
        loaded = json.loads(_dms_trust_path(root).read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return False
    return isinstance(loaded, dict) and loaded.get("trusted") is True


def trust_dms_world(root: Path) -> None:
    trust_path = _dms_trust_path(root)
    trust_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_bytes(
        trust_path,
        (
            json.dumps(
                {"trusted": True, "trusted_at": _utc_now()},
                ensure_ascii=False,
                sort_keys=True,
            )
            + "\n"
        ).encode("utf-8"),
    )


def _script_title(path: Path) -> str:
    return path.stem.replace("_", " ").replace("-", " ").strip().title() or path.stem


def validate_script_path(root: Path, raw_path: object) -> str:
    path = normalize_relative_path(str(raw_path or ""))
    target = resolve_under_root(root, path)
    if not target.exists():
        raise FileNotFoundError("DMS script was not found.")
    if target.is_dir():
        raise IsADirectoryError("DMS script path points to a directory.")
    if path.split("/")[0] == ".virtualscreen":
        raise WorldPathError("DMS script cannot be an internal file.")
    ensure_no_reserved_path_parts(path, message="DMS script path is not allowed.")
    if target.suffix.lower() != ".dms":
        raise ValueError("DMS script must use the .dms extension.")
    return path


def list_dms_scripts(root: Path) -> list[DmsScriptSummary]:
    scripts: list[DmsScriptSummary] = []
    for path in root.rglob("*.dms"):
        relative = path.relative_to(root).as_posix()
        if relative.split("/")[0] in {".virtualscreen", ".music"}:
            continue
        try:
            ensure_no_reserved_path_parts(relative)
        except WorldPathError:
            continue
        stat = path.stat()
        scripts.append(
            DmsScriptSummary(
                path=relative,
                name=path.name,
                title=_script_title(path),
                size=stat.st_size,
                modified_at=datetime.fromtimestamp(stat.st_mtime, tz=UTC)
                .isoformat()
                .replace("+00:00", "Z"),
            )
        )
    return sorted(scripts, key=lambda script: script.path.lower())


def _runtime_source(card_templates: dict[str, dict[str, object]]) -> str:
    return f'''
import csv
import json
import os
from pathlib import Path
import random
import re
import sys

DMS_PREFIX = {DMS_PREFIX!r}
DMS_WAITING_EXIT_CODE = {DMS_WAITING_EXIT_CODE}
_run_id = os.environ.get("VIRTUALSCREEN_DMS_RUN_ID", "run")
_world_root = Path(os.environ.get("VIRTUALSCREEN_WORLD_ROOT", ".")).resolve()
_form_values = json.loads(os.environ.get("VIRTUALSCREEN_DMS_FORM_VALUES", "[]"))
_form_index = 0
_output_index = 0
_effect_index = 0
_write_index = 0
_card_templates = json.loads({json.dumps(json.dumps(card_templates, ensure_ascii=False))})
_dice_expression_pattern = {DICE_EXPRESSION_PATTERN!r}
_dice_count_max = {DICE_COUNT_MAX}
_dice_sides_max = {DICE_SIDES_MAX}


def _emit(payload):
    print(DMS_PREFIX + json.dumps(payload, ensure_ascii=False), flush=True)


def _safe_world_path(path, message="World path is not allowed."):
    raw_path = str(path or "").replace("\\\\", "/").strip("/")
    target = (_world_root / raw_path).resolve()
    if target != _world_root and _world_root not in target.parents:
        raise ValueError("World path escapes the active world.")
    parts = [part for part in raw_path.split("/") if part]
    if raw_path == "" or any(
        part in {{".virtualscreen", ".git", "__pycache__"}} for part in parts
    ):
        raise ValueError(message)
    return raw_path, target


def _safe_write_path(path):
    raw_path, target = _safe_world_path(path, "DMS write path is not allowed.")
    if raw_path.split("/")[0] == ".music":
        raise ValueError("DMS write path is not allowed.")
    return raw_path, target


def form(schema):
    global _form_index
    index = _form_index
    _form_index += 1
    if index < len(_form_values):
        return _form_values[index]
    _emit({{"type": "form", "request_id": f"form-{{index}}", "schema": schema}})
    raise SystemExit(DMS_WAITING_EXIT_CODE)


def choose_file(label="File", kind="any", folder=None):
    schema = {{
        "path": {{
            "type": "file",
            "label": str(label or "File"),
            "kind": str(kind or "any"),
            "folder": "" if folder is None else str(folder),
            "default": "",
        }}
    }}
    return str(form(schema).get("path") or "")


def roll(expr):
    match = re.fullmatch(_dice_expression_pattern, str(expr).strip())
    if not match:
        raise ValueError("Dice expression must look like 1d20+3.")
    count = int(match.group(1) or "1")
    sides = int(match.group(2))
    sign = match.group(3)
    modifier = int(match.group(4) or "0")
    if count < 1 or count > _dice_count_max or sides < 1 or sides > _dice_sides_max:
        raise ValueError("Dice expression is out of supported range.")
    total = sum(random.randint(1, sides) for _ in range(count))
    return total - modifier if sign == "-" else total + modifier


def table(path):
    raw_path, target = _safe_world_path(path)
    if not raw_path.lower().endswith(".csv"):
        raise ValueError("table() supports CSV files only.")
    if not target.exists() or not target.is_file():
        raise FileNotFoundError("Table CSV was not found.")
    with target.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError("Table CSV does not contain rows.")
    return dict(random.choice(rows))


def render_md(text):
    global _output_index
    _output_index += 1
    output_id = f"output-{{_output_index}}"
    virtual_path = f"dms://{{_run_id}}/{{output_id}}.md"
    _emit({{
        "type": "output",
        "id": output_id,
        "media_kind": "markdown",
        "virtual_path": virtual_path,
        "name": f"{{output_id}}.md",
        "content": str(text),
    }})
    return virtual_path


def render_csv(text):
    global _output_index
    _output_index += 1
    output_id = f"output-{{_output_index}}"
    virtual_path = f"dms://{{_run_id}}/{{output_id}}.csv"
    _emit({{
        "type": "output",
        "id": output_id,
        "media_kind": "csv",
        "virtual_path": virtual_path,
        "name": f"{{output_id}}.csv",
        "content": str(text),
    }})
    return virtual_path


def screen_fs(path):
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "screen_fullscreen",
        "path": str(path),
    }})


def screen_pu(path):
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "screen_popup",
        "path": str(path),
    }})


def audio_play(path_in_world, bus="effect", volume=100):
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "audio_play",
        "path": str(path_in_world),
        "bus": str(bus or "effect"),
        "volume": volume,
    }})


def map_load(path, present=False):
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "map_load",
        "path": str(path),
        "present": bool(present),
    }})


def map_preset(name_or_id, present=True):
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "map_preset",
        "name_or_id": str(name_or_id),
        "present": bool(present),
    }})


def map_present():
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "map_present",
    }})


def map_stop():
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "map_stop",
    }})


def map_fog(enabled):
    global _effect_index
    _effect_index += 1
    _emit({{
        "type": "effect",
        "id": f"effect-{{_effect_index}}",
        "kind": "map_fog",
        "enabled": bool(enabled),
    }})


def create_note(path, text):
    global _write_index
    _write_index += 1
    raw_path, _ = _safe_write_path(path)
    _emit({{
        "type": "write",
        "id": f"write-{{_write_index}}",
        "kind": "create_note",
        "path": raw_path,
        "content": str(text),
    }})
    return raw_path


def append_note(path, text):
    global _write_index
    _write_index += 1
    raw_path, _ = _safe_write_path(path)
    _emit({{
        "type": "write",
        "id": f"write-{{_write_index}}",
        "kind": "append_note",
        "path": raw_path,
        "content": str(text),
    }})
    return raw_path


_supported_card_field_types = {{"text", "number", "boolean", "select", "long_text", "world_link"}}
_computed_card_formats = {{"plain", "signed"}}


def _validate_card_typed_field(value, path, allow_computed=True):
    field_type = value.get("type")
    if field_type == "computed" and allow_computed:
        if set(value.keys()) - {{"type", "formula", "format"}}:
            raise ValueError(f"{{path}} may only contain type, formula, and format.")
        formula = value.get("formula")
        if not isinstance(formula, str) or not formula.strip():
            raise ValueError(f"{{path}}.formula must be a non-empty string.")
        card_format = value.get("format")
        if card_format is not None and card_format not in _computed_card_formats:
            raise ValueError(f"{{path}}.format must be plain or signed.")
        return
    if field_type not in _supported_card_field_types:
        raise ValueError(f"{{path}}.type must be supported.")
    if "value" not in value:
        raise ValueError(f"{{path}}.value is required.")
    field_value = value.get("value")
    if field_type == "number" and (
        not isinstance(field_value, (int, float)) or isinstance(field_value, bool)
    ):
        raise ValueError(f"{{path}}.value must be a number.")
    if field_type == "boolean" and not isinstance(field_value, bool):
        raise ValueError(f"{{path}}.value must be a boolean.")
    if field_type in {{"text", "long_text", "select", "world_link"}} and not isinstance(
        field_value,
        str,
    ):
        raise ValueError(f"{{path}}.value must be a string.")
    if value.get("label") is not None and not isinstance(value.get("label"), str):
        raise ValueError(f"{{path}}.label must be a string.")
    options = value.get("options")
    if options is not None and (
        not isinstance(options, list) or any(not isinstance(option, str) for option in options)
    ):
        raise ValueError(f"{{path}}.options must be a list of strings.")


def _validate_card_field_value(value, path):
    if isinstance(value, str):
        return
    if isinstance(value, dict):
        _validate_card_typed_field(value, path)
        return
    raise ValueError(f"{{path}} must be a string.")


def _validate_card_row_value(value, path):
    if value is None or isinstance(value, (str, int, float, bool)):
        return
    if isinstance(value, dict):
        _validate_card_typed_field(value, path, allow_computed=False)
        return
    raise ValueError(f"{{path}} must be a string, number, boolean, or null.")


def _validate_card_payload(card):
    if not isinstance(card, dict):
        raise ValueError("Card payload must be an object.")
    if set(card.keys()) != {{"kind", "title", "tags", "sections"}}:
        raise ValueError("Card payload must contain kind, title, tags, and sections.")
    if not isinstance(card["kind"], str) or not card["kind"].strip():
        raise ValueError("Card kind must be a non-empty string.")
    if not isinstance(card["title"], str) or not card["title"].strip():
        raise ValueError("Card title must be a non-empty string.")
    if not isinstance(card["tags"], list) or not all(isinstance(tag, str) for tag in card["tags"]):
        raise ValueError("Card tags must be a list of strings.")
    if not isinstance(card["sections"], list):
        raise ValueError("Card sections must be a list.")
    for section_index, section in enumerate(card["sections"]):
        section_path = f"Card sections[{{section_index}}]"
        if not isinstance(section, dict):
            raise ValueError(f"{{section_path}} must be an object.")
        if not set(section.keys()).issubset({{"title", "layout", "fields", "columns", "rows"}}):
            raise ValueError(
                f"{{section_path}} may only contain title, layout, fields, columns, and rows."
            )
        if not isinstance(section["title"], str):
            raise ValueError("Card section title must be a string.")
        if "layout" in section and not isinstance(section["layout"], str):
            raise ValueError(f"{{section_path}}.layout must be a string.")
        fields = section.get("fields")
        columns = section.get("columns")
        rows = section.get("rows")
        if fields is None and rows is None:
            raise ValueError(f"{{section_path}} must contain fields or rows.")
        if columns is not None and (
            not isinstance(columns, list) or any(not isinstance(column, str) for column in columns)
        ):
            raise ValueError(f"{{section_path}}.columns must be a list of strings.")
        if fields is not None:
            if not isinstance(fields, dict):
                raise ValueError("Card section fields must be an object.")
            for key, field_value in fields.items():
                if not isinstance(key, str):
                    raise ValueError("Card section field keys must be strings.")
                _validate_card_field_value(field_value, f"{{section_path}}.fields.{{key}}")
        if rows is not None:
            if not isinstance(rows, list):
                raise ValueError(f"{{section_path}}.rows must be a list.")
            for row_index, row in enumerate(rows):
                row_path = f"{{section_path}}.rows[{{row_index}}]"
                if not isinstance(row, dict):
                    raise ValueError(f"{{row_path}} must be an object.")
                for key, row_value in row.items():
                    if not isinstance(key, str):
                        raise ValueError(f"{{row_path}} keys must be strings.")
                    _validate_card_row_value(row_value, f"{{row_path}}.{{key}}")


def _render_card_json(card):
    _validate_card_payload(card)
    return json.dumps(card, ensure_ascii=False, indent=2, sort_keys=True) + "\\n"


def _render_template_value(value, title):
    if isinstance(value, str):
        return value.replace("{{{{title}}}}", title)
    if isinstance(value, list):
        return [_render_template_value(item, title) for item in value]
    if isinstance(value, dict):
        return {{
            key: _render_template_value(inner_value, title)
            for key, inner_value in value.items()
        }}
    return value


def card_template(kind="custom", title=None):
    card_title = str(title or "New Card")
    template_id = str(kind or "custom")
    template = _card_templates.get(template_id)
    if template is None:
        raise ValueError(f"Card template '{{template_id}}' was not found.")
    rendered = _render_template_value(template, card_title)
    _render_card_json(rendered)
    return rendered


def create_card(path, card):
    global _write_index
    _write_index += 1
    raw_path, _ = _safe_write_path(path)
    content = _render_card_json(card)
    _emit({{
        "type": "write",
        "id": f"write-{{_write_index}}",
        "kind": "create_card",
        "path": raw_path,
        "content": content,
    }})
    return raw_path
'''


def _runner_source(script_path: Path) -> str:
    return f'''
from dms import *

script_path = {str(script_path)!r}
with open(script_path, "r", encoding="utf-8") as handle:
    source = handle.read()
globals_dict = globals().copy()
globals_dict.update({{"__name__": "__main__", "__file__": script_path}})
exec(compile(source, script_path, "exec"), globals_dict)
'''


def _runtime_dir(root: Path, run_id: str) -> Path:
    path = _runtime_dir_path(root, run_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _dms_card_templates(root: Path) -> dict[str, dict[str, object]]:
    catalog = list_card_templates(root)
    return {
        template.id: template.card
        for template in catalog.templates
    }


def _write_runtime(root: Path, run_id: str, script_path: Path) -> Path:
    folder = _runtime_dir(root, run_id)
    (folder / "dms.py").write_text(
        _runtime_source(_dms_card_templates(root)),
        encoding="utf-8",
    )
    runner = folder / "runner.py"
    runner.write_text(_runner_source(script_path), encoding="utf-8")
    return runner


def _parse_output(stdout: str) -> tuple[list[dict[str, object]], str]:
    commands: list[dict[str, object]] = []
    visible_lines: list[str] = []
    for line in stdout.splitlines():
        if line.startswith(DMS_PREFIX):
            try:
                command = json.loads(line[len(DMS_PREFIX) :])
            except json.JSONDecodeError:
                visible_lines.append(line)
                continue
            if isinstance(command, dict):
                commands.append(command)
        else:
            visible_lines.append(line)
    visible_stdout = "\n".join(visible_lines)
    if visible_stdout:
        visible_stdout += "\n"
    return commands, visible_stdout


def _validate_effect(root: Path, command: dict[str, object]) -> DmsEffect:
    kind = str(command.get("kind") or "")
    effect_id = str(command.get("id") or uuid.uuid4().hex)
    if kind in {"screen_fullscreen", "screen_popup"}:
        path = normalize_relative_path(str(command.get("path") or ""))
        display_item_for_path(root, path)
        return DmsEffect(id=effect_id, kind=kind, path=path)  # type: ignore[arg-type]
    if kind == "audio_play":
        path = normalize_relative_path(str(command.get("path") or ""))
        bus = str(command.get("bus") or "effect")
        if bus not in set(BUS_FOLDER_TO_BUS.values()):
            raise WorldPathError("Audio bus is not supported.")
        tracks = scan_audio_library(root)
        if not any(track.path == path for track in tracks):
            raise FileNotFoundError("Audio track was not found.")
        try:
            volume = int(command.get("volume") or 100)
        except (TypeError, ValueError):
            volume = 100
        return DmsEffect(
            id=effect_id,
            kind="audio_play",
            path=path,
            bus=bus,
            volume=max(0, min(100, volume)),
        )
    if kind == "map_load":
        path, _ = map_image_path(root, str(command.get("path") or ""))
        return DmsEffect(
            id=effect_id,
            kind="map_load",
            path=path,
            present=bool(command.get("present")),
        )
    if kind == "map_preset":
        name_or_id = str(command.get("name_or_id") or command.get("preset_id") or "").strip()
        presets = list_map_presets(root)
        by_id = [preset for preset in presets if preset.id == name_or_id]
        if by_id:
            preset = by_id[0]
        else:
            by_name = [preset for preset in presets if preset.name == name_or_id]
            if not by_name:
                raise FileNotFoundError("Map preset was not found.")
            if len(by_name) > 1:
                raise ValueError("Map preset name is not unique.")
            preset = by_name[0]
        return DmsEffect(
            id=effect_id,
            kind="map_preset",
            preset_id=preset.id,
            present=bool(command.get("present", True)),
        )
    if kind in {"map_present", "map_stop"}:
        return DmsEffect(id=effect_id, kind=kind)  # type: ignore[arg-type]
    if kind == "map_fog":
        return DmsEffect(id=effect_id, kind="map_fog", enabled=bool(command.get("enabled")))
    raise WorldPathError("DMS effect is not supported.")


def _validate_write(root: Path, command: dict[str, object]) -> DmsWrite:
    kind = str(command.get("kind") or "")
    if kind not in {"create_note", "append_note", "create_card"}:
        raise WorldPathError("DMS write command is not supported.")
    write_id = str(command.get("id") or uuid.uuid4().hex)
    path = normalize_relative_path(str(command.get("path") or ""))
    target = resolve_under_root(root, path)
    if path == "" or path.split("/")[0] == ".virtualscreen":
        raise WorldPathError("DMS write path is not allowed.")
    ensure_no_reserved_path_parts(path, message="DMS write path is not allowed.")
    if path.split("/")[0] == ".music":
        raise WorldPathError("DMS write path is not allowed.")
    if kind == "create_card" and target.suffix.lower() != ".cs":
        raise WorldPathError("DMS card writes support .cs files only.")
    if kind in {"create_note", "append_note"} and target.suffix.lower() not in {
        ".md",
        ".markdown",
    }:
        raise WorldPathError("DMS note writes support Markdown files only.")
    if not target.parent.exists() or not target.parent.is_dir():
        raise FileNotFoundError("DMS write parent folder was not found.")
    if kind in {"create_note", "create_card"} and target.exists():
        raise FileExistsError("DMS write target already exists.")
    if kind == "append_note" and (not target.exists() or not target.is_file()):
        raise FileNotFoundError("DMS note to append was not found.")
    if kind == "create_card":
        _validate_card_content(str(command.get("content") or ""))
    return DmsWrite(
        id=write_id,
        kind=kind,  # type: ignore[arg-type]
        path=path,
        content=str(command.get("content") or ""),
    )


def _validate_card_content(content: str) -> None:
    try:
        card = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError("DMS card payload must be valid JSON.") from exc
    warning = validate_card_shape(card, path="DMS card payload")
    if warning:
        raise ValueError(warning)


def _commands_to_outputs_effects_writes(
    root: Path,
    run_id: str,
    commands: list[dict[str, object]],
) -> tuple[DmsFormRequest | None, list[DmsOutput], list[DmsEffect], list[DmsWrite]]:
    form_request: DmsFormRequest | None = None
    outputs: list[DmsOutput] = []
    effects: list[DmsEffect] = []
    writes: list[DmsWrite] = []
    for command in commands:
        command_type = command.get("type")
        if command_type == "form":
            schema = command.get("schema") if isinstance(command.get("schema"), dict) else {}
            form_request = DmsFormRequest(
                request_id=str(command.get("request_id") or "form-0"),
                schema=schema,
            )
        elif command_type == "output":
            media_kind = command.get("media_kind")
            if media_kind not in {"markdown", "csv"}:
                continue
            output_id = str(command.get("id") or f"output-{len(outputs) + 1}")
            suffix = "md" if media_kind == "markdown" else "csv"
            outputs.append(
                DmsOutput(
                    id=output_id,
                    media_kind=media_kind,  # type: ignore[arg-type]
                    virtual_path=str(
                        command.get("virtual_path") or f"dms://{run_id}/{output_id}.{suffix}"
                    ),
                    name=str(command.get("name") or f"{output_id}.{suffix}"),
                    content=str(command.get("content") or ""),
                )
            )
        elif command_type == "effect":
            effects.append(_validate_effect(root, command))
        elif command_type == "write":
            writes.append(_validate_write(root, command))
    return form_request, outputs, effects, writes


def _apply_writes(root: Path, writes: list[DmsWrite]) -> None:
    if not writes:
        return
    changed_paths = [write.path for write in writes]
    for write in writes:
        _validate_write(
            root,
            {
                "id": write.id,
                "kind": write.kind,
                "path": write.path,
                "content": write.content,
            },
        )
    for write in writes:
        target = resolve_under_root(root, write.path)
        if write.kind in {"create_note", "create_card"}:
            atomic_write_bytes(target, write.content.encode("utf-8"))
        else:
            backup_file(root, target)
            current = target.read_text(encoding="utf-8")
            atomic_write_bytes(target, f"{current}{write.content}".encode())
    refresh_index_for_paths(root, changed_paths=changed_paths)


def _set_run(run_id: str, **updates: object) -> DmsRunState:
    with _RUNS_LOCK:
        state = _RUNS[run_id]
        for key, value in updates.items():
            if key in {"stdout", "stderr"}:
                value = _cap_text(str(value), MAX_DMS_STDIO_CHARS)
            elif key == "outputs" and isinstance(value, list):
                value = _cap_outputs(value)
            setattr(state, key, value)
        return state


def _script_stderr(path: str, stderr: str) -> str:
    if path in stderr:
        return stderr
    suffix = f"DMS script: {path}"
    return f"{stderr.rstrip()}\n{suffix}\n" if stderr else f"{suffix}\n"


def _dms_subprocess_env(
    root: Path,
    run_id: str,
    form_values: list[dict[str, object]],
) -> dict[str, str]:
    env = {
        key: os.environ[key]
        for key in DMS_SUBPROCESS_ENV_ALLOWLIST
        if key in os.environ
    }
    env.update(
        {
            "PYTHONIOENCODING": "utf-8",
            "VIRTUALSCREEN_DMS_FORM_VALUES": json.dumps(form_values, ensure_ascii=False),
            "VIRTUALSCREEN_DMS_RUN_ID": run_id,
            "VIRTUALSCREEN_WORLD_ROOT": str(root),
        }
    )
    return env


def _execute_script(
    root: Path,
    run_id: str,
    path: str,
    form_values: list[dict[str, object]],
    created_at: str,
) -> None:
    script_path = resolve_under_root(root, path)
    runner = _write_runtime(root, run_id, script_path)
    env = _dms_subprocess_env(root, run_id, form_values)
    try:
        process = subprocess.Popen(
            [sys.executable, str(runner)],
            cwd=script_path.parent,
            encoding="utf-8",
            env=env,
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
        )
        _set_run(run_id, process=process)
        with _RUNS_LOCK:
            cancel_requested = _RUNS[run_id].cancel_requested
        if cancel_requested and process.poll() is None:
            process.kill()
        stdout, stderr = process.communicate(timeout=DMS_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired as exc:
        process.kill()
        stdout, stderr = process.communicate()
        _set_run(
            run_id,
            status="timeout",
            process=None,
            form_request=None,
            outputs=[],
            effects=[],
            stdout=stdout or exc.stdout or "",
            stderr=_script_stderr(path, stderr or exc.stderr or "DMS script timed out."),
        )
        return
    except Exception as exc:  # pragma: no cover - defensive process-start failure
        _set_run(
            run_id,
            status="error",
            process=None,
            form_request=None,
            outputs=[],
            effects=[],
            stdout="",
            stderr=str(exc),
        )
        return

    with _RUNS_LOCK:
        cancelled = _RUNS[run_id].cancel_requested
    if cancelled:
        _set_run(
            run_id,
            status="cancelled",
            process=None,
            form_request=None,
            outputs=[],
            effects=[],
            stdout=stdout or "",
            stderr=stderr or "DMS script cancelled.",
        )
        return

    commands, visible_stdout = _parse_output(stdout or "")
    try:
        form_request, outputs, effects, writes = _commands_to_outputs_effects_writes(
            root,
            run_id,
            commands,
        )
        if process.returncode == DMS_WAITING_EXIT_CODE and form_request is not None:
            _set_run(
                run_id,
                status="waiting_for_form",
                process=None,
                form_request=form_request,
                outputs=[],
                effects=[],
                stdout=visible_stdout,
                stderr=stderr or "",
                form_values=form_values,
            )
            return
        if process.returncode == 0:
            _apply_writes(root, writes)
            _set_run(
                run_id,
                status="success",
                process=None,
                form_request=None,
                outputs=outputs,
                effects=effects,
                stdout=visible_stdout,
                stderr=stderr or "",
                form_values=form_values,
            )
            return
        _set_run(
            run_id,
            status="error",
            process=None,
            form_request=None,
            outputs=[],
            effects=[],
            stdout=visible_stdout,
            stderr=_script_stderr(path, stderr or ""),
            form_values=form_values,
        )
    except Exception as exc:
        _set_run(
            run_id,
            status="error",
            process=None,
            form_request=None,
            outputs=[],
            effects=[],
            stdout=visible_stdout,
            stderr=f"{stderr or ''}{exc}",
            form_values=form_values,
        )


def _start_worker(
    root: Path,
    run_id: str,
    path: str,
    form_values: list[dict[str, object]],
    created_at: str,
) -> None:
    thread = threading.Thread(
        target=_execute_script,
        args=(root, run_id, path, form_values, created_at),
        daemon=True,
    )
    thread.start()


def run_dms_script(root: Path, raw_path: object) -> DmsRunState:
    path = validate_script_path(root, raw_path)
    run_id = uuid.uuid4().hex
    created_at = _utc_now()
    state = DmsRunState(
        run_id=run_id,
        path=path,
        status="running",
        form_request=None,
        outputs=[],
        effects=[],
        stdout="",
        stderr="",
        created_at=created_at,
    )
    with _RUNS_LOCK:
        _RUNS[run_id] = state
    _prune_old_runs(root)
    _start_worker(root, run_id, path, [], created_at)
    return state


def resume_dms_form(root: Path, run_id: str, values: dict[str, object]) -> DmsRunState:
    with _RUNS_LOCK:
        current = _RUNS.get(run_id)
        if current is None:
            raise FileNotFoundError("DMS run was not found.")
        if current.status != "waiting_for_form":
            raise ValueError("DMS run is not waiting for a form.")
        next_values = [*current.form_values, values]
        current.status = "running"
        current.form_request = None
        current.outputs = []
        current.effects = []
        current.stdout = ""
        current.stderr = ""
        current.cancel_requested = False
    _start_worker(root, run_id, current.path, next_values, current.created_at)
    return current


def cancel_dms_run(run_id: str) -> DmsRunState:
    with _RUNS_LOCK:
        state = _RUNS.get(run_id)
        if state is None:
            raise FileNotFoundError("DMS run was not found.")
        if state.status != "running":
            return state
        state.cancel_requested = True
        process = state.process
        state.status = "cancelled"
        state.process = None
        state.form_request = None
        state.outputs = []
        state.effects = []
        state.stderr = state.stderr or "DMS script cancelled."
    if process is not None and process.poll() is None:
        process.kill()
    return state


def get_dms_run(run_id: str) -> DmsRunState:
    with _RUNS_LOCK:
        state = _RUNS.get(run_id)
    if state is None:
        raise FileNotFoundError("DMS run was not found.")
    return state


def run_payload(state: DmsRunState) -> dict[str, object]:
    return {
        "run_id": state.run_id,
        "path": state.path,
        "status": state.status,
        "form_request": None
        if state.form_request is None
        else {
            "request_id": state.form_request.request_id,
            "schema": state.form_request.schema,
        },
        "outputs": [
            {
                "id": output.id,
                "media_kind": output.media_kind,
                "virtual_path": output.virtual_path,
                "name": output.name,
                "content": output.content,
            }
            for output in state.outputs
        ],
        "effects": [
            {
                key: value
                for key, value in {
                    "id": effect.id,
                    "kind": effect.kind,
                    "path": effect.path,
                    "preset_id": effect.preset_id,
                    "present": effect.present,
                    "enabled": effect.enabled,
                    "bus": effect.bus,
                    "volume": effect.volume,
                }.items()
                if value is not None
            }
            for effect in state.effects
        ],
        "stdout": state.stdout,
        "stderr": state.stderr,
        "created_at": state.created_at,
    }
