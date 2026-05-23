from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.scenarios import (
    ScenarioInputType,
    ScenarioOutputKind,
    ScenarioRunStatus,
    discover_scenarios,
    load_scenario_runs,
    run_scenario,
)

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class ScenarioInputModel(BaseModel):
    name: str
    label: str
    input_type: ScenarioInputType
    required: bool
    default: str | int | float | bool | None
    options: list[str]


class ScenarioSummaryModel(BaseModel):
    id: str
    name: str
    description: str | None
    inputs: list[ScenarioInputModel]


class ScenarioRunPayload(BaseModel):
    inputs: dict[str, str | int | float | bool]


class ScenarioRunResultModel(BaseModel):
    run_id: str
    scenario_id: str
    status: ScenarioRunStatus
    output_kind: ScenarioOutputKind
    output: str
    stderr: str
    created_at: str


def _require_legacy_scenarios(settings: Settings) -> None:
    if not settings.enable_legacy_scenarios:
        raise HTTPException(status_code=404, detail="Legacy scenario routes are disabled.")


@router.get("/scenarios", response_model=list[ScenarioSummaryModel])
def scenarios(settings: SettingsDep) -> list[ScenarioSummaryModel]:
    _require_legacy_scenarios(settings)
    return [
        ScenarioSummaryModel(
            id=scenario.id,
            name=scenario.name,
            description=scenario.description,
            inputs=[
                ScenarioInputModel(
                    name=item.name,
                    label=item.label,
                    input_type=item.input_type,
                    required=item.required,
                    default=item.default,
                    options=item.options,
                )
                for item in scenario.inputs
            ],
        )
        for scenario in discover_scenarios(settings.resolved_world_root)
    ]


@router.post("/scenarios/{scenario_id}/run", response_model=ScenarioRunResultModel)
def scenario_run(
    scenario_id: str,
    payload: ScenarioRunPayload,
    settings: SettingsDep,
) -> ScenarioRunResultModel:
    _require_legacy_scenarios(settings)
    try:
        result = run_scenario(settings.resolved_world_root, scenario_id, payload.inputs)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ScenarioRunResultModel(**result.__dict__)


@router.get("/scenarios/runs", response_model=list[ScenarioRunResultModel])
def scenario_runs(settings: SettingsDep) -> list[ScenarioRunResultModel]:
    _require_legacy_scenarios(settings)
    return [
        ScenarioRunResultModel(**result.__dict__)
        for result in load_scenario_runs(settings.resolved_world_root)
    ]
