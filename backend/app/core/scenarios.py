import json
import subprocess
import sys
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from app.core.database import initialize_database
from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root

ScenarioInputType = Literal["text", "number", "boolean", "select"]
ScenarioRunStatus = Literal["success", "error", "timeout"]
ScenarioOutputKind = Literal["markdown", "json", "text"]

SCENARIOS_ROOT = ".virtualscreen/scenarios"
VALID_INPUT_TYPES = {"text", "number", "boolean", "select"}
VALID_OUTPUT_KINDS = {"markdown", "json", "text"}
MAX_TIMEOUT_SECONDS = 10
RUN_HISTORY_LIMIT = 20


@dataclass(frozen=True)
class ScenarioInput:
    name: str
    label: str
    input_type: ScenarioInputType
    required: bool
    default: str | int | float | bool | None
    options: list[str]


@dataclass(frozen=True)
class ScenarioSummary:
    id: str
    name: str
    description: str | None
    inputs: list[ScenarioInput]
    script: str
    timeout_seconds: int
    output_kind: ScenarioOutputKind


@dataclass(frozen=True)
class ScenarioRunResult:
    run_id: str
    scenario_id: str
    status: ScenarioRunStatus
    output_kind: ScenarioOutputKind
    output: str
    stderr: str
    created_at: str


def _scenario_root(root: Path) -> Path:
    return root / ".virtualscreen" / "scenarios"


def _valid_id(value: object) -> str:
    scenario_id = str(value or "").strip()
    if (
        not scenario_id
        or "/" in scenario_id
        or "\\" in scenario_id
        or scenario_id in {".", ".."}
        or scenario_id.startswith(".")
    ):
        raise ValueError("Scenario id is invalid.")
    return scenario_id


def _input_from_dict(value: object) -> ScenarioInput:
    if not isinstance(value, dict):
        raise ValueError("Scenario input must be an object.")
    input_type = str(value.get("input_type") or "text")
    if input_type not in VALID_INPUT_TYPES:
        raise ValueError("Scenario input type is invalid.")
    default = value.get("default")
    if default is not None and not isinstance(default, str | int | float | bool):
        raise ValueError("Scenario input default is invalid.")
    options = value.get("options") or []
    if not isinstance(options, list) or not all(isinstance(item, str) for item in options):
        raise ValueError("Scenario input options are invalid.")
    return ScenarioInput(
        name=str(value.get("name") or "").strip(),
        label=str(value.get("label") or value.get("name") or "").strip(),
        input_type=input_type,  # type: ignore[arg-type]
        required=bool(value.get("required", False)),
        default=default,
        options=options,
    )


def _summary_from_manifest(root: Path, folder: Path, manifest_path: Path) -> ScenarioSummary:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Scenario manifest must be an object.")
    scenario_id = _valid_id(data.get("id"))
    if scenario_id != folder.name:
        raise ValueError("Scenario id must match folder name.")

    script = normalize_relative_path(str(data.get("script") or ""))
    if not script or script.startswith("../") or script.startswith(".virtualscreen"):
        raise ValueError("Scenario script path is invalid.")
    script_path = resolve_under_root(folder, script)
    script_path.relative_to(folder.resolve())
    if script_path.suffix.lower() != ".py" or not script_path.is_file():
        raise ValueError("Scenario script must be a local Python file.")

    output_kind = str(data.get("output_kind") or "text")
    if output_kind not in VALID_OUTPUT_KINDS:
        raise ValueError("Scenario output kind is invalid.")
    timeout_seconds = int(data.get("timeout_seconds") or 5)
    timeout_seconds = max(1, min(timeout_seconds, MAX_TIMEOUT_SECONDS))
    inputs = [_input_from_dict(item) for item in data.get("inputs") or []]
    return ScenarioSummary(
        id=scenario_id,
        name=str(data.get("name") or scenario_id),
        description=(
            str(data["description"]) if data.get("description") is not None else None
        ),
        inputs=inputs,
        script=script,
        timeout_seconds=timeout_seconds,
        output_kind=output_kind,  # type: ignore[arg-type]
    )


def discover_scenarios(root: Path) -> list[ScenarioSummary]:
    scenario_root = _scenario_root(root)
    if not scenario_root.exists():
        return []
    scenarios: list[ScenarioSummary] = []
    folders = (item for item in scenario_root.iterdir() if item.is_dir())
    for folder in sorted(folders, key=lambda path: path.name.lower()):
        manifest = folder / "scenario.json"
        if not manifest.is_file():
            continue
        try:
            scenarios.append(_summary_from_manifest(root, folder, manifest))
        except (OSError, ValueError, json.JSONDecodeError, WorldPathError):
            continue
    return scenarios


def get_scenario(root: Path, scenario_id: str) -> ScenarioSummary:
    wanted = _valid_id(scenario_id)
    for scenario in discover_scenarios(root):
        if scenario.id == wanted:
            return scenario
    raise FileNotFoundError("Scenario was not found.")


def _store_run(root: Path, result: ScenarioRunResult) -> None:
    conn = initialize_database(root)
    with conn:
        conn.execute(
            """
            insert into scenario_runs(
              run_id, scenario_id, status, output_kind, output, stderr, created_at
            )
            values (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.run_id,
                result.scenario_id,
                result.status,
                result.output_kind,
                result.output,
                result.stderr,
                result.created_at,
            ),
        )
        stale = conn.execute(
            """
            select run_id from scenario_runs
            order by created_at desc
            limit -1 offset ?
            """,
            (RUN_HISTORY_LIMIT,),
        ).fetchall()
        for row in stale:
            conn.execute("delete from scenario_runs where run_id = ?", (row["run_id"],))
    conn.close()


def run_scenario(root: Path, scenario_id: str, inputs: dict[str, object]) -> ScenarioRunResult:
    scenario = get_scenario(root, scenario_id)
    scenario_folder = _scenario_root(root) / scenario.id
    script_path = resolve_under_root(scenario_folder, scenario.script)
    created_at = datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")
    run_id = uuid.uuid4().hex
    payload = json.dumps(inputs, ensure_ascii=False)

    try:
        completed = subprocess.run(
            [sys.executable, str(script_path)],
            input=payload,
            capture_output=True,
            check=False,
            cwd=scenario_folder,
            encoding="utf-8",
            timeout=scenario.timeout_seconds,
        )
        status: ScenarioRunStatus = "success" if completed.returncode == 0 else "error"
        result = ScenarioRunResult(
            run_id=run_id,
            scenario_id=scenario.id,
            status=status,
            output_kind=scenario.output_kind,
            output=completed.stdout,
            stderr=completed.stderr,
            created_at=created_at,
        )
    except subprocess.TimeoutExpired as exc:
        result = ScenarioRunResult(
            run_id=run_id,
            scenario_id=scenario.id,
            status="timeout",
            output_kind=scenario.output_kind,
            output=exc.stdout or "",
            stderr=exc.stderr or "Scenario timed out.",
            created_at=created_at,
        )

    _store_run(root, result)
    return result


def load_scenario_runs(root: Path) -> list[ScenarioRunResult]:
    conn = initialize_database(root)
    rows = conn.execute(
        """
        select run_id, scenario_id, status, output_kind, output, stderr, created_at
        from scenario_runs
        order by created_at desc
        limit ?
        """,
        (RUN_HISTORY_LIMIT,),
    ).fetchall()
    conn.close()
    return [
        ScenarioRunResult(
            run_id=row["run_id"],
            scenario_id=row["scenario_id"],
            status=row["status"],
            output_kind=row["output_kind"],
            output=row["output"],
            stderr=row["stderr"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


def scenario_payload(summary: ScenarioSummary) -> dict[str, object]:
    data = asdict(summary)
    data.pop("script")
    data.pop("timeout_seconds")
    data.pop("output_kind")
    return data
