import mimetypes
from typing import Annotated, Literal

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.routes.pages import PageLinkResponse, page_links
from app.api.routes.world import WorldFile, world_file, world_media
from app.core.config import Settings, get_settings
from app.core.display import (
    DisplayPopupPreset,
    DisplayState,
    add_popup,
    blank_fullscreen,
    clear_popups,
    close_popup,
    display_background_path,
    display_event_hub,
    display_item_for_path,
    display_state_payload,
    load_display_state,
    queue_display_event,
    screen_display_event_hub,
    screen_display_state_payload,
    set_fullscreen,
    set_popup_visible,
    show_active,
)
from app.core.paths import WorldPathError, normalize_relative_path

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class DisplayPathRequest(BaseModel):
    path: str


class DisplayPopupRequest(DisplayPathRequest):
    preset: DisplayPopupPreset = "plain"
    visible: bool = True


class DisplayPopupVisibilityRequest(BaseModel):
    visible: bool


class DisplayShowActiveRequest(DisplayPathRequest):
    mode: Literal["fullscreen", "popup"]
    preset: DisplayPopupPreset = "plain"
    clear_existing: bool = False


def _display_response(state: DisplayState) -> dict[str, object]:
    return display_state_payload(state)


def _resolve_item(settings: Settings, requested_path: str):
    try:
        return display_item_for_path(settings.resolved_world_root, requested_path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="World file was not found.") from exc
    except IsADirectoryError as exc:
        raise HTTPException(status_code=400, detail="World path points to a directory.") from exc


def _display_items(state: DisplayState):
    if state.fullscreen is not None:
        yield state.fullscreen
    yield from [popup for popup in state.popups if popup.visible]


def _screen_display_paths(settings: Settings) -> set[str]:
    state = load_display_state(settings.resolved_world_root)
    return {item.path for item in _display_items(state)}


def _screen_text_paths(settings: Settings) -> set[str]:
    state = load_display_state(settings.resolved_world_root)
    return {
        item.path
        for item in _display_items(state)
        if item.media_kind in {"markdown", "csv", "text", "card"}
    }


def _screen_media_paths(settings: Settings) -> set[str]:
    state = load_display_state(settings.resolved_world_root)
    allowed = {
        item.path
        for item in _display_items(state)
        if item.media_kind in {"image", "pdf", "video"}
    }
    for source_path in _screen_text_paths(settings):
        try:
            links = page_links(source_path, settings)
        except HTTPException:
            continue
        for link in links:
            if (
                link.resolved
                and link.target_path
                and link.target_kind in {"image", "video"}
            ):
                allowed.add(link.target_path)
    return allowed


def _normalize_screen_path(path: str) -> str:
    try:
        return normalize_relative_path(path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _require_screen_path(path: str, allowed_paths: set[str]) -> str:
    relative_path = _normalize_screen_path(path)
    if relative_path not in allowed_paths:
        raise HTTPException(status_code=403, detail="Screen content is not currently displayed.")
    return relative_path


@router.get("/api/display/background")
def display_background(settings: SettingsDep) -> FileResponse:
    path = display_background_path(settings.resolved_world_root)
    if path is None:
        raise HTTPException(
            status_code=404,
            detail="Display background was not found.",
            headers={"Cache-Control": "no-store"},
        )
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path, media_type=content_type, headers={"Cache-Control": "no-store"})


@router.get("/api/screen/display/background")
def screen_display_background(settings: SettingsDep) -> FileResponse:
    return display_background(settings)


@router.get("/api/display/state")
def display_state(settings: SettingsDep) -> dict[str, object]:
    return _display_response(load_display_state(settings.resolved_world_root))


@router.get("/api/screen/display/state")
def screen_display_state(settings: SettingsDep) -> dict[str, object]:
    return screen_display_state_payload(load_display_state(settings.resolved_world_root))


@router.get("/api/screen/world/file", response_model=WorldFile)
def screen_world_file(path: str, settings: SettingsDep) -> WorldFile:
    relative_path = _require_screen_path(path, _screen_display_paths(settings))
    return world_file(relative_path, settings)


@router.get("/api/screen/world/media")
def screen_world_media(path: str, settings: SettingsDep) -> FileResponse:
    relative_path = _require_screen_path(path, _screen_media_paths(settings))
    return world_media(relative_path, settings)


@router.get("/api/screen/page/links", response_model=list[PageLinkResponse])
def screen_page_links(path: str, settings: SettingsDep) -> list[PageLinkResponse]:
    relative_path = _require_screen_path(path, _screen_text_paths(settings))
    return page_links(relative_path, settings)


@router.put("/api/display/fullscreen")
def display_fullscreen(
    payload: DisplayPathRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    item = _resolve_item(settings, payload.path)
    state = set_fullscreen(settings.resolved_world_root, item)
    queue_display_event(background_tasks, state)
    return _display_response(state)


@router.post("/api/display/popup")
def display_popup(
    payload: DisplayPopupRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    item = _resolve_item(settings, payload.path)
    state = add_popup(settings.resolved_world_root, item, payload.preset, payload.visible)
    queue_display_event(background_tasks, state)
    return _display_response(state)


@router.put("/api/display/popup/{popup_id}")
def display_popup_visibility(
    popup_id: str,
    payload: DisplayPopupVisibilityRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = set_popup_visible(settings.resolved_world_root, popup_id, payload.visible)
    queue_display_event(background_tasks, state)
    return _display_response(state)


@router.post("/api/display/show-active")
def display_show_active(
    payload: DisplayShowActiveRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    item = _resolve_item(settings, payload.path)
    state = show_active(
        settings.resolved_world_root,
        item,
        payload.mode,
        clear_existing=payload.clear_existing,
        preset=payload.preset,
    )
    queue_display_event(background_tasks, state)
    return _display_response(state)


@router.delete("/api/display/popup/{popup_id}")
def display_popup_close(
    popup_id: str,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = close_popup(settings.resolved_world_root, popup_id)
    queue_display_event(background_tasks, state)
    return _display_response(state)


@router.delete("/api/display/popups")
def display_popups_clear(
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = clear_popups(settings.resolved_world_root)
    queue_display_event(background_tasks, state)
    return _display_response(state)


@router.post("/api/display/blank")
def display_blank(
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = blank_fullscreen(settings.resolved_world_root)
    queue_display_event(background_tasks, state)
    return _display_response(state)


@router.websocket("/ws/display")
async def display_events(websocket: WebSocket) -> None:
    await display_event_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await display_event_hub.disconnect(websocket)


@router.websocket("/ws/screen/display")
async def screen_display_events(websocket: WebSocket) -> None:
    await screen_display_event_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await screen_display_event_hub.disconnect(websocket)
