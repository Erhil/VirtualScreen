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
    WorkspacePane,
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


class WorkspaceTabModel(BaseModel):
    path: str
    name: str
    title: str | None
    mediaKind: str


class WorkspacePaneModel(BaseModel):
    id: str
    activePath: str | None


class WorkspaceLayoutModel(BaseModel):
    mode: str
    activePaneId: str
    panes: list[WorkspacePaneModel]
    splitRatio: float


class WorkspaceStateResponse(BaseModel):
    workspaceId: str
    workspaceName: str
    tabs: list[WorkspaceTabModel]
    activePath: str | None
    layout: WorkspaceLayoutModel
    favorites: list[WorkspaceTabModel]
    recentFiles: list[WorkspaceTabModel]


class NamedWorkspaceSummaryResponse(BaseModel):
    id: str
    name: str
    is_active: bool
    updated_at: str


class WorkspaceNamePayload(BaseModel):
    name: str


class WorkspaceTabsPayload(BaseModel):
    tabs: list[WorkspaceTabModel]
    activePath: str | None


class WorkspaceLayoutPayload(BaseModel):
    layout: WorkspaceLayoutModel


class WorkspaceFavoritesPayload(BaseModel):
    favorites: list[WorkspaceTabModel]


class WorkspaceRecentPayload(BaseModel):
    tab: WorkspaceTabModel


class WorkspaceRecentFilesPayload(BaseModel):
    recentFiles: list[WorkspaceTabModel]


class WorkspaceHpRowModel(BaseModel):
    id: str
    name: str
    current_hp: int
    max_hp: int | None = None
    status: str = ""
    notes: str = ""


class WorkspaceHpPayload(BaseModel):
    rows: list[WorkspaceHpRowModel]


class WorkspaceHpStateResponse(BaseModel):
    workspace_id: str
    rows: list[WorkspaceHpRowModel]
    updated_at: str


def _tab(tab: WorkspaceTabModel) -> WorkspaceTab:
    return WorkspaceTab(
        path=tab.path,
        name=tab.name,
        title=tab.title,
        mediaKind=tab.mediaKind,
    )


def _tab_model(tab: WorkspaceTab) -> WorkspaceTabModel:
    return WorkspaceTabModel(
        path=tab.path,
        name=tab.name,
        title=tab.title,
        mediaKind=tab.mediaKind,
    )


def _pane(pane: WorkspacePaneModel) -> WorkspacePane:
    return WorkspacePane(id=pane.id, activePath=pane.activePath)


def _layout(layout: WorkspaceLayoutModel) -> WorkspaceLayout:
    return WorkspaceLayout(
        mode=layout.mode,
        activePaneId=layout.activePaneId,
        panes=[_pane(pane) for pane in layout.panes],
        splitRatio=layout.splitRatio,
    )


def _pane_model(pane: WorkspacePane) -> WorkspacePaneModel:
    return WorkspacePaneModel(id=pane.id, activePath=pane.activePath)


def _layout_model(layout: WorkspaceLayout) -> WorkspaceLayoutModel:
    return WorkspaceLayoutModel(
        mode=layout.mode,
        activePaneId=layout.activePaneId,
        panes=[_pane_model(pane) for pane in layout.panes],
        splitRatio=layout.splitRatio,
    )


def _summary_model(summary: NamedWorkspaceSummary) -> NamedWorkspaceSummaryResponse:
    return NamedWorkspaceSummaryResponse(
        id=summary.id,
        name=summary.name,
        is_active=summary.is_active,
        updated_at=summary.updated_at,
    )


def _state_response(state: WorkspaceState) -> WorkspaceStateResponse:
    return WorkspaceStateResponse(
        workspaceId=state.workspaceId,
        workspaceName=state.workspaceName,
        tabs=[_tab_model(tab) for tab in state.tabs],
        activePath=state.activePath,
        layout=_layout_model(state.layout),
        favorites=[_tab_model(tab) for tab in state.favorites],
        recentFiles=[_tab_model(tab) for tab in state.recentFiles],
    )


def _hp_row(row: WorkspaceHpRowModel) -> WorkspaceHpRow:
    return WorkspaceHpRow(
        id=row.id,
        name=row.name,
        current_hp=row.current_hp,
        max_hp=row.max_hp,
        status=row.status,
        notes=row.notes,
    )


def _hp_row_model(row: WorkspaceHpRow) -> WorkspaceHpRowModel:
    return WorkspaceHpRowModel(
        id=row.id,
        name=row.name,
        current_hp=row.current_hp,
        max_hp=row.max_hp,
        status=row.status,
        notes=row.notes,
    )


def _hp_state_response(state: WorkspaceHpState) -> WorkspaceHpStateResponse:
    return WorkspaceHpStateResponse(
        workspace_id=state.workspace_id,
        rows=[_hp_row_model(row) for row in state.rows],
        updated_at=state.updated_at,
    )


def _bad_request(exc: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


@router.get("/workspaces", response_model=list[NamedWorkspaceSummaryResponse])
def workspaces(settings: SettingsDep) -> list[NamedWorkspaceSummaryResponse]:
    return [_summary_model(item) for item in list_workspaces(settings.resolved_world_root)]


@router.post("/workspaces", response_model=WorkspaceStateResponse)
def workspace_create(
    payload: WorkspaceNamePayload,
    settings: SettingsDep,
) -> WorkspaceStateResponse:
    try:
        state = create_workspace(settings.resolved_world_root, payload.name)
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _state_response(state)


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


@router.post("/workspaces/{workspace_id}/activate", response_model=WorkspaceStateResponse)
def workspace_activate(
    workspace_id: str,
    settings: SettingsDep,
) -> WorkspaceStateResponse:
    try:
        state = activate_workspace(settings.resolved_world_root, workspace_id)
    except WorkspaceNotFoundError as exc:
        raise _not_found(exc) from exc
    return _state_response(state)


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


@router.get("/workspace", response_model=WorkspaceStateResponse)
def workspace(settings: SettingsDep) -> WorkspaceStateResponse:
    return _state_response(load_workspace(settings.resolved_world_root))


@router.get("/workspace/hp", response_model=WorkspaceHpStateResponse)
def workspace_hp(settings: SettingsDep) -> WorkspaceHpStateResponse:
    return _hp_state_response(load_workspace_hp(settings.resolved_world_root))


@router.put("/workspace/hp", response_model=WorkspaceHpStateResponse)
def workspace_hp_save(
    payload: WorkspaceHpPayload,
    settings: SettingsDep,
) -> WorkspaceHpStateResponse:
    try:
        state = save_workspace_hp(
            settings.resolved_world_root,
            [_hp_row(row) for row in payload.rows],
        )
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _hp_state_response(state)


@router.put("/workspace/tabs", response_model=WorkspaceStateResponse)
def workspace_tabs(
    payload: WorkspaceTabsPayload,
    settings: SettingsDep,
) -> WorkspaceStateResponse:
    try:
        state = save_tabs(
            settings.resolved_world_root,
            [_tab(tab) for tab in payload.tabs],
            payload.activePath,
        )
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc
    return _state_response(state)


@router.put("/workspace/layout", response_model=WorkspaceStateResponse)
def workspace_layout(
    payload: WorkspaceLayoutPayload,
    settings: SettingsDep,
) -> WorkspaceStateResponse:
    try:
        state = save_layout(settings.resolved_world_root, _layout(payload.layout))
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _state_response(state)


@router.put("/workspace/favorites", response_model=WorkspaceStateResponse)
def workspace_favorites(
    payload: WorkspaceFavoritesPayload,
    settings: SettingsDep,
) -> WorkspaceStateResponse:
    try:
        state = save_favorites(
            settings.resolved_world_root,
            [_tab(tab) for tab in payload.favorites],
        )
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc
    return _state_response(state)


@router.post("/workspace/recent", response_model=WorkspaceStateResponse)
def workspace_recent(
    payload: WorkspaceRecentPayload,
    settings: SettingsDep,
) -> WorkspaceStateResponse:
    try:
        state = record_recent(settings.resolved_world_root, _tab(payload.tab))
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc
    return _state_response(state)


@router.put("/workspace/recent", response_model=WorkspaceStateResponse)
def workspace_recent_files(
    payload: WorkspaceRecentFilesPayload,
    settings: SettingsDep,
) -> WorkspaceStateResponse:
    try:
        state = save_recent_files(
            settings.resolved_world_root,
            [_tab(tab) for tab in payload.recentFiles],
        )
    except (WorldPathError, ValueError) as exc:
        raise _bad_request(exc) from exc
    return _state_response(state)
