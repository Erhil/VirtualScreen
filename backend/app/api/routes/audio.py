from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from app.core.audio import (
    BUS_FOLDER_TO_BUS,
    AudioBus,
    AudioPlaylist,
    load_audio_playlists,
    save_audio_playlists,
    scan_audio_library,
)
from app.core.config import Settings, get_settings
from app.core.paths import WorldPathError

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]
JsonBody = Annotated[Any, Body()]


class AudioTrackResponse(BaseModel):
    path: str
    name: str
    title: str
    bus: AudioBus
    playlist: str | None
    extension: str
    content_type: str
    size: int
    modified_at: str


class AudioPlaylistResponse(BaseModel):
    id: str
    name: str
    bus: AudioBus
    track_paths: list[str]
    loop: bool
    created_at: str
    updated_at: str


class AudioPlaylistsResponse(BaseModel):
    playlists: list[AudioPlaylistResponse]


def _playlist_response(playlist: AudioPlaylist) -> AudioPlaylistResponse:
    return AudioPlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        bus=playlist.bus,
        track_paths=playlist.track_paths,
        loop=playlist.loop,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
    )


@router.get("/audio/library", response_model=list[AudioTrackResponse])
def audio_library(
    settings: SettingsDep,
    q: str = "",
    bus: str | None = None,
) -> list[AudioTrackResponse]:
    if bus is not None and bus not in set(BUS_FOLDER_TO_BUS.values()):
        raise HTTPException(status_code=400, detail="Audio bus is not supported.")

    tracks = scan_audio_library(
        settings.resolved_world_root,
        query=q,
        bus=bus,  # type: ignore[arg-type]
    )
    return [
        AudioTrackResponse(
            path=track.path,
            name=track.name,
            title=track.title,
            bus=track.bus,
            playlist=track.playlist,
            extension=track.extension,
            content_type=track.content_type,
            size=track.size,
            modified_at=track.modified_at.isoformat().replace("+00:00", "Z"),
        )
        for track in tracks
    ]


@router.get("/audio/playlists", response_model=AudioPlaylistsResponse)
def audio_playlists(settings: SettingsDep) -> AudioPlaylistsResponse:
    return AudioPlaylistsResponse(
        playlists=[
            _playlist_response(playlist)
            for playlist in load_audio_playlists(settings.resolved_world_root)
        ]
    )


@router.put("/audio/playlists", response_model=AudioPlaylistsResponse)
def update_audio_playlists(
    settings: SettingsDep,
    payload: JsonBody,
) -> AudioPlaylistsResponse:
    try:
        playlists = save_audio_playlists(settings.resolved_world_root, payload)
    except (ValueError, WorldPathError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AudioPlaylistsResponse(
        playlists=[_playlist_response(playlist) for playlist in playlists]
    )
