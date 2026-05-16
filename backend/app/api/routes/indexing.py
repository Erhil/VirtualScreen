from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.index import rebuild_index

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class RebuildIndexResponse(BaseModel):
    pages_indexed: int
    links_indexed: int
    rebuilt_at: str


@router.post("/index/rebuild", response_model=RebuildIndexResponse)
def rebuild(settings: SettingsDep) -> RebuildIndexResponse:
    result = rebuild_index(settings.resolved_world_root)
    return RebuildIndexResponse(
        pages_indexed=result.pages_indexed,
        links_indexed=result.links_indexed,
        rebuilt_at=result.rebuilt_at.isoformat().replace("+00:00", "Z"),
    )
