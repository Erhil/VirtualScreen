from typing import Annotated

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

from app.core.config import Settings, get_settings
from app.core.display import clear_fullscreen, queue_display_event
from app.core.map import (
    MapState,
    add_map_pin,
    add_map_reveal,
    clamp_grid,
    clamp_viewport,
    clear_map_reveals,
    delete_map_pin,
    delete_map_preset,
    delete_map_reveal,
    list_map_presets,
    load_map_preset,
    load_map_state,
    map_event_hub,
    map_image_path,
    map_media_content_type,
    map_preset_payload,
    map_state_from_payload,
    map_state_payload,
    normalize_pin,
    normalize_polygon_reveal,
    normalize_reveal,
    present_map,
    public_map_state,
    queue_map_event,
    save_map_preset,
    screen_map_event_hub,
    set_map_fog,
    set_map_grid,
    set_map_source,
    set_map_viewport,
    stop_map,
)
from app.core.paths import WorldPathError

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class MapSourceRequest(BaseModel):
    path: str | None = None
    image_path: str | None = None


class MapViewportRequest(BaseModel):
    center_x: float | None = None
    center_y: float | None = None
    zoom: float | None = None
    viewport: dict[str, float] | None = None


class MapFogRequest(BaseModel):
    enabled: bool | None = None
    fog_enabled: bool | None = None


class MapGridRequest(BaseModel):
    enabled: bool | None = None
    columns: int | None = None
    rows: int | None = None
    visible_to_players: bool | None = None


class MapRevealRequest(BaseModel):
    action: str | None = None
    shape: str | None = None
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    points: list[dict[str, object]] | None = None


class MapPinRequest(BaseModel):
    x: float
    y: float
    label: str
    visibility: str | None = None


class MapPresetRequest(BaseModel):
    name: str
    state: dict[str, object] | None = None


def _response(state: MapState) -> dict[str, object]:
    return map_state_payload(state)


def _bad_path(exc: WorldPathError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def _source_path(payload: MapSourceRequest) -> str:
    requested_path = payload.path or payload.image_path
    if not requested_path:
        raise HTTPException(status_code=400, detail="Map source path is required.")
    return requested_path


def _queue(background_tasks: BackgroundTasks, state: MapState, settings: Settings) -> None:
    queue_map_event(background_tasks, state, settings.resolved_world_root)


@router.get("/api/map/state")
def map_state(settings: SettingsDep) -> dict[str, object]:
    return _response(load_map_state(settings.resolved_world_root))


@router.get("/api/screen/map/state")
def screen_map_state(settings: SettingsDep) -> dict[str, object]:
    return _response(public_map_state(settings.resolved_world_root))


@router.get("/api/screen/map/media")
def screen_map_media(path: str, settings: SettingsDep) -> FileResponse:
    root = settings.resolved_world_root
    state = public_map_state(root)
    if not state.presenting or not state.image_path or path != state.image_path:
        raise HTTPException(status_code=403, detail="Map image is not currently displayed.")
    try:
        _, media_path = map_image_path(root, path)
    except WorldPathError as exc:
        raise _bad_path(exc) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Map image was not found.") from exc
    except IsADirectoryError as exc:
        raise HTTPException(status_code=400, detail="Map path points to a directory.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    headers = {"X-Content-Type-Options": "nosniff"}
    if media_path.suffix.lower() == ".svg":
        headers["Content-Security-Policy"] = (
            "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'"
        )
    return FileResponse(
        media_path,
        media_type=map_media_content_type(media_path),
        filename=media_path.name,
        content_disposition_type="inline",
        headers=headers,
    )


@router.put("/api/map/source")
def map_source(
    payload: MapSourceRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        state = set_map_source(settings.resolved_world_root, _source_path(payload))
    except WorldPathError as exc:
        raise _bad_path(exc) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Map image was not found.") from exc
    except IsADirectoryError as exc:
        raise HTTPException(status_code=400, detail="Map path points to a directory.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    _queue(background_tasks, state, settings)
    return _response(state)


@router.put("/api/map/viewport")
def map_viewport(
    payload: MapViewportRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    values = payload.viewport or {}
    viewport = clamp_viewport(
        payload.center_x if payload.center_x is not None else values.get("center_x", 0.5),
        payload.center_y if payload.center_y is not None else values.get("center_y", 0.5),
        payload.zoom if payload.zoom is not None else values.get("zoom", 1.0),
    )
    state = set_map_viewport(settings.resolved_world_root, viewport)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.put("/api/map/fog")
def map_fog(
    payload: MapFogRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    enabled = payload.enabled if payload.enabled is not None else payload.fog_enabled
    if enabled is None:
        raise HTTPException(status_code=400, detail="Map fog value is required.")
    state = set_map_fog(settings.resolved_world_root, enabled)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.put("/api/map/grid")
def map_grid(
    payload: MapGridRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    current_grid = load_map_state(settings.resolved_world_root).grid
    grid = clamp_grid(
        payload.enabled if payload.enabled is not None else current_grid.enabled,
        payload.columns if payload.columns is not None else current_grid.columns,
        payload.rows if payload.rows is not None else current_grid.rows,
        (
            payload.visible_to_players
            if payload.visible_to_players is not None
            else current_grid.visible_to_players
        ),
    )
    state = set_map_grid(settings.resolved_world_root, grid)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.post("/api/map/reveals")
def map_reveal_add(
    payload: MapRevealRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        shape = payload.shape or ("polygon" if payload.points is not None else "rect")
        if shape == "polygon":
            reveal = normalize_polygon_reveal(payload.points or [], payload.action)
        elif shape == "rect":
            if (
                payload.x is None
                or payload.y is None
                or payload.width is None
                or payload.height is None
            ):
                raise ValueError("Map rectangle reveal requires x, y, width, and height.")
            reveal = normalize_reveal(
                payload.x,
                payload.y,
                payload.width,
                payload.height,
                payload.action,
            )
        else:
            raise ValueError("Map reveal shape must be 'rect' or 'polygon'.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    state = add_map_reveal(settings.resolved_world_root, reveal)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.delete("/api/map/reveals/{reveal_id}")
def map_reveal_delete(
    reveal_id: str,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = delete_map_reveal(settings.resolved_world_root, reveal_id)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.delete("/api/map/reveals")
def map_reveals_clear(
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = clear_map_reveals(settings.resolved_world_root)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.post("/api/map/pins")
def map_pin_add(
    payload: MapPinRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        pin = normalize_pin(payload.x, payload.y, payload.label, payload.visibility)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    state = add_map_pin(settings.resolved_world_root, pin)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.delete("/api/map/pins/{pin_id}")
def map_pin_delete(
    pin_id: str,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = delete_map_pin(settings.resolved_world_root, pin_id)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.get("/api/map/presets")
def map_presets(settings: SettingsDep) -> dict[str, object]:
    return {
        "presets": [
            map_preset_payload(preset)
            for preset in list_map_presets(settings.resolved_world_root)
        ]
    }


@router.post("/api/map/presets")
def map_preset_save(
    payload: MapPresetRequest,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        state = map_state_from_payload(payload.state) if payload.state is not None else None
        preset = save_map_preset(settings.resolved_world_root, payload.name, state)
    except WorldPathError as exc:
        raise _bad_path(exc) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Map image was not found.") from exc
    except IsADirectoryError as exc:
        raise HTTPException(status_code=400, detail="Map path points to a directory.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return map_preset_payload(preset)


@router.post("/api/map/presets/{preset_id}/load")
def map_preset_load(
    preset_id: str,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        state = load_map_preset(settings.resolved_world_root, preset_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Map preset was not found.") from exc
    except WorldPathError as exc:
        raise _bad_path(exc) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Map image was not found.") from exc
    except IsADirectoryError as exc:
        raise HTTPException(status_code=400, detail="Map path points to a directory.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    _queue(background_tasks, state, settings)
    return _response(state)


@router.delete("/api/map/presets/{preset_id}")
def map_preset_delete(preset_id: str, settings: SettingsDep) -> dict[str, object]:
    if not delete_map_preset(settings.resolved_world_root, preset_id):
        raise HTTPException(status_code=404, detail="Map preset was not found.")
    return {"deleted": True}


@router.post("/api/map/present")
def map_present(
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        state = present_map(settings.resolved_world_root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    display_state = clear_fullscreen(settings.resolved_world_root)
    queue_display_event(background_tasks, display_state)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.post("/api/map/stop")
def map_stop(
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    state = stop_map(settings.resolved_world_root)
    _queue(background_tasks, state, settings)
    return _response(state)


@router.websocket("/ws/map")
async def map_events(websocket: WebSocket) -> None:
    await map_event_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await map_event_hub.disconnect(websocket)


@router.websocket("/ws/screen/map")
async def screen_map_events(websocket: WebSocket) -> None:
    await screen_map_event_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await screen_map_event_hub.disconnect(websocket)
