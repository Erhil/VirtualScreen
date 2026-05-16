from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.audio import BUS_FOLDER_TO_BUS, AudioBus, scan_audio_library
from app.core.config import Settings, get_settings

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


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
