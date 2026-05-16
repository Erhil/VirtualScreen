from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings
from app.core.index import rebuild_index
from app.core.world_library import (
    WorldLibraryEntry,
    create_library_world,
    list_worlds,
    recent_worlds,
    resolve_library_world,
    save_recent_world_ids,
    set_active_world_root,
    world_entry,
)

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class WorldLibraryEntryModel(BaseModel):
    id: str
    name: str
    path: str
    modified_at: str


class WorldLibraryStateResponse(BaseModel):
    worlds_root: str
    current: WorldLibraryEntryModel | None
    worlds: list[WorldLibraryEntryModel]
    recent: list[WorldLibraryEntryModel]


class OpenWorldRequest(BaseModel):
    id: str


class CreateWorldRequest(BaseModel):
    name: str


class RecentWorldsRequest(BaseModel):
    recent: list[str] = Field(default_factory=list)


def _entry_model(entry: WorldLibraryEntry) -> WorldLibraryEntryModel:
    return WorldLibraryEntryModel(**entry.__dict__)


def _state(settings: Settings) -> WorldLibraryStateResponse:
    current_root = settings.resolved_world_root
    current = world_entry(current_root) if current_root.exists() and current_root.is_dir() else None
    return WorldLibraryStateResponse(
        worlds_root=str(settings.resolved_worlds_root),
        current=_entry_model(current) if current else None,
        worlds=[_entry_model(entry) for entry in list_worlds(settings.resolved_worlds_root)],
        recent=[_entry_model(entry) for entry in recent_worlds(settings.resolved_worlds_root)],
    )


@router.get("/worlds", response_model=WorldLibraryStateResponse)
def worlds(settings: SettingsDep) -> WorldLibraryStateResponse:
    return _state(settings)


@router.get("/worlds/current", response_model=WorldLibraryStateResponse)
def current_world(settings: SettingsDep) -> WorldLibraryStateResponse:
    return _state(settings)


@router.post("/worlds", response_model=WorldLibraryStateResponse)
async def create_world(
    payload: CreateWorldRequest,
    request: Request,
    settings: SettingsDep,
) -> WorldLibraryStateResponse:
    try:
        world_root = create_library_world(settings.resolved_worlds_root, payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail="World already exists.") from exc

    set_active_world_root(settings.resolved_worlds_root, world_root)
    rebuild_index(world_root)
    watcher_manager = getattr(request.app.state, "watcher_manager", None)
    if watcher_manager is not None:
        await watcher_manager.switch(world_root)
    save_recent_world_ids(settings.resolved_worlds_root, [world_root.name])
    return _state(settings)


@router.post("/worlds/open", response_model=WorldLibraryStateResponse)
async def open_world(
    payload: OpenWorldRequest,
    request: Request,
    settings: SettingsDep,
) -> WorldLibraryStateResponse:
    try:
        world_root = resolve_library_world(settings.resolved_worlds_root, payload.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="World was not found.") from exc

    set_active_world_root(settings.resolved_worlds_root, world_root)
    rebuild_index(world_root)
    watcher_manager = getattr(request.app.state, "watcher_manager", None)
    if watcher_manager is not None:
        await watcher_manager.switch(world_root)
    recent_ids = [payload.id, *[entry.id for entry in recent_worlds(settings.resolved_worlds_root)]]
    save_recent_world_ids(settings.resolved_worlds_root, recent_ids)
    return _state(settings)


@router.put("/worlds/recent", response_model=WorldLibraryStateResponse)
def save_recent_worlds(
    payload: RecentWorldsRequest,
    settings: SettingsDep,
) -> WorldLibraryStateResponse:
    try:
        save_recent_world_ids(settings.resolved_worlds_root, payload.recent)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _state(settings)
