from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.paths import WorldPathError
from app.core.workspace import (
    NamedWorkspaceSummary,
    WorkspaceHpRow,
    WorkspaceHpState,
    WorkspaceLayout,
    WorkspaceNotFoundError,
    WorkspaceState,
    WorkspaceTab,
    activate_workspace,
    create_workspace,
    delete_workspace,
    list_workspaces,
    load_workspace,
    load_workspace_hp,
    record_recent,
    rename_workspace,
    save_favorites,
    save_layout,
    save_recent_files,
    save_tabs,
    save_workspace_hp,
)

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class NamedWorkspaceSummaryResponse(BaseModel):
    id: str
    name: str
    is_active: bool
    updated_at: str


class WorkspaceNamePayload(BaseModel):
    name: str


class WorkspaceTabsPayload(BaseModel):
    tabs: list[WorkspaceTab]
    activePath: str | None


class WorkspaceLayoutPayload(BaseModel):
    layout: WorkspaceLayout


class WorkspaceFavoritesPayload(BaseModel):
    favorites: list[WorkspaceTab]


class WorkspaceRecentPayload(BaseModel):
    tab: WorkspaceTab


class WorkspaceRecentFilesPayload(BaseModel):
    recentFiles: list[WorkspaceTab]


class WorkspaceHpRowModel(BaseModel):
    id: str
    name: str
    current_hp: int
    max_hp: int | None = None
    status: str = ""
    notes: str = ""


class WorkspaceHpPayload(BaseModel):
    rows: list[WorkspaceHpRowModel]


def _hp_row(row: WorkspaceHpRowModel) -> WorkspaceHpRow:
    return WorkspaceHpRow(
        id=row.id,
        name=row.name,
        current_hp=row.current_hp,
        max_hp=row.max_hp,
        status=row.status,
        notes=row.notes,
    )


def _summary_model(summary: NamedWorkspaceSummary) -> NamedWorkspaceSummaryResponse:
    return NamedWorkspaceSummaryResponse(
        id=summary.id,
        name=summary.name,
        is_active=summary.is_active,
        updated_at=summary.updated_at,
    )


def _bad_request(exc: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


@router.get("/workspaces", response_model=list[NamedWorkspaceSummaryResponse])
def workspaces(settings: SettingsDep) -> list[NamedWorkspaceSummaryResponse]:
    return [_summary_model(item) for item in list_workspaces(settings.resolved_world_root)]


@router.post("/workspaces", response_model=WorkspaceState)
def workspace_create(
    payload: WorkspaceNamePayload,
    settings: SettingsDep,
) -> WorkspaceState:
    try:
        return create_workspace(settings.resolved_world_root, payload.name)
    except ValueError as exc:
        raise _bad_request(exc) from exc


@router.put("/workspaces/{workspace_id}", response_model=NamedWorkspaceSummaryResponse)
def workspace_rename(
    workspace_id: str,
    payload: WorkspaceNamePayload,
    settings: SettingsDep,
) -> NamedWorkspaceSummaryResponse:
    try:
        summary = rename_workspace(settings.resolved_world_root, workspace_id, payload.name)
    except WorkspaceNotFoundError as exc:
        raise _not_found(exc) from exc
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _summary_model(summary)


@router.post("/workspaces/{workspace_id}/activate", response_model=WorkspaceState)
def workspace_activate(
    workspace_id: str,
    settings: SettingsDep,
) -> WorkspaceState:
    try:
        return activate_workspace(settings.resolved_world_root, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise _not_found(exc) from exc


@router.delete("/workspaces/{workspace_id}", response_model=list[NamedWorkspaceSummaryResponse])
def workspace_delete(
    workspace_id: str,
    settings: SettingsDep,
) -> list[NamedWorkspaceSummaryResponse]:
    try:
        summaries = delete_workspace(settings.resolved_world_root, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise _not_found(exc) from exc
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return [_summary_model(item) for item in summaries]


@router.get("/workspace", response_model=WorkspaceState)
def workspace(settings: SettingsDep) -> WorkspaceState:
    return load_workspace(settings.resolved_world_root)


@router.get("/workspace/hp", response_model=WorkspaceHpState)
def workspace_hp(settings: SettingsDep) -> WorkspaceHpState:
    return load_workspace_hp(settings.resolved_world_root)


@router.put("/workspace/hp", response_model=WorkspaceHpState)
def workspace_hp_save(
    payload: WorkspaceHpPayload,
    settings: SettingsDep,
) -> WorkspaceHpState:
    try:
        return save_workspace_hp(
            settings.resolved_world_root,
            [_hp_row(row) for row in payload.rows],
        )
    except ValueError as exc:
        raise _bad_request(exc) from exc


@router.put("/workspace/tabs", response_model=WorkspaceState)
def workspace_tabs(
    payload: WorkspaceTabsPayload,
    settings: SettingsDep,
) -> WorkspaceState:
    try:
        return save_tabs(
            settings.resolved_world_root,
            payload.tabs,
            payload.activePath,
        )
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc


@router.put("/workspace/layout", response_model=WorkspaceState)
def workspace_layout(
    payload: WorkspaceLayoutPayload,
    settings: SettingsDep,
) -> WorkspaceState:
    try:
        return save_layout(settings.resolved_world_root, payload.layout)
    except ValueError as exc:
        raise _bad_request(exc) from exc


@router.put("/workspace/favorites", response_model=WorkspaceState)
def workspace_favorites(
    payload: WorkspaceFavoritesPayload,
    settings: SettingsDep,
) -> WorkspaceState:
    try:
        return save_favorites(settings.resolved_world_root, payload.favorites)
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc


@router.post("/workspace/recent", response_model=WorkspaceState)
def workspace_recent(
    payload: WorkspaceRecentPayload,
    settings: SettingsDep,
) -> WorkspaceState:
    try:
        return record_recent(settings.resolved_world_root, payload.tab)
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc


@router.put("/workspace/recent", response_model=WorkspaceState)
def workspace_recent_files(
    payload: WorkspaceRecentFilesPayload,
    settings: SettingsDep,
) -> WorkspaceState:
    try:
        return save_recent_files(settings.resolved_world_root, payload.recentFiles)
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc
