from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import Settings, get_settings
from app.core.paths import WorldPathError
from app.core.scripts import (
    DmsRunStatus,
    cancel_dms_run,
    get_dms_run,
    list_dms_scripts,
    resume_dms_form,
    run_dms_script,
    run_payload,
)

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class DmsScriptSummaryModel(BaseModel):
    path: str
    name: str
    title: str
    size: int
    modified_at: str


class DmsRunPayload(BaseModel):
    path: str


class DmsFormPayload(BaseModel):
    values: dict[str, Any]


class DmsFormRequestModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    request_id: str
    schema_: dict[str, Any] = Field(alias="schema")


class DmsOutputModel(BaseModel):
    id: str
    media_kind: Literal["markdown", "csv"]
    virtual_path: str
    name: str
    content: str


class DmsEffectModel(BaseModel):
    id: str
    kind: Literal[
        "screen_fullscreen",
        "screen_popup",
        "audio_play",
        "map_load",
        "map_preset",
        "map_present",
        "map_stop",
        "map_fog",
    ]
    path: str | None = None
    preset_id: str | None = None
    present: bool | None = None
    enabled: bool | None = None
    bus: Literal["ambient", "music", "effect"] | None = None
    volume: int | None = None


class DmsRunStateModel(BaseModel):
    run_id: str
    path: str
    status: DmsRunStatus
    form_request: DmsFormRequestModel | None
    outputs: list[DmsOutputModel]
    effects: list[DmsEffectModel]
    stdout: str
    stderr: str
    created_at: str


@router.get("/scripts", response_model=list[DmsScriptSummaryModel])
def scripts(settings: SettingsDep) -> list[DmsScriptSummaryModel]:
    return [
        DmsScriptSummaryModel(**script.__dict__)
        for script in list_dms_scripts(settings.resolved_world_root)
    ]


@router.post(
    "/scripts/run",
    response_model=DmsRunStateModel,
    response_model_exclude_none=True,
)
def script_run(payload: DmsRunPayload, settings: SettingsDep) -> DmsRunStateModel:
    try:
        run = run_dms_script(settings.resolved_world_root, payload.path)
        return DmsRunStateModel(**run_payload(run))
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except IsADirectoryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc


@router.post(
    "/scripts/runs/{run_id}/form",
    response_model=DmsRunStateModel,
    response_model_exclude_none=True,
)
def script_form(
    run_id: str,
    payload: DmsFormPayload,
    settings: SettingsDep,
) -> DmsRunStateModel:
    try:
        run = resume_dms_form(
            settings.resolved_world_root,
            run_id,
            payload.values,
        )
        return DmsRunStateModel(
            **run_payload(run)
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (ValueError, WorldPathError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get(
    "/scripts/runs/{run_id}",
    response_model=DmsRunStateModel,
    response_model_exclude_none=True,
)
def script_run_state(run_id: str) -> DmsRunStateModel:
    try:
        return DmsRunStateModel(**run_payload(get_dms_run(run_id)))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/scripts/runs/{run_id}/cancel",
    response_model=DmsRunStateModel,
    response_model_exclude_none=True,
)
def script_run_cancel(run_id: str) -> DmsRunStateModel:
    try:
        return DmsRunStateModel(**run_payload(cancel_dms_run(run_id)))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
