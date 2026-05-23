from enum import StrEnum
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.core.capture import CaptureResult, CaptureToday, append_capture, today_capture
from app.core.config import Settings, get_settings
from app.core.events import queue_world_event
from app.core.index import refresh_index

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class CaptureCategory(StrEnum):
    idea = "idea"
    todo = "todo"
    npc = "npc"
    player_wish = "player_wish"
    ruling = "ruling"
    loot = "loot"
    question = "question"
    other = "other"


class CaptureRequest(BaseModel):
    category: CaptureCategory
    text: str


@router.get("/capture/today", response_model=CaptureToday)
def capture_today(settings: SettingsDep) -> CaptureToday:
    return today_capture(settings.resolved_world_root)


@router.post("/capture", response_model=CaptureResult)
def capture(
    payload: CaptureRequest,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> CaptureResult:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Capture text cannot be empty.")

    root = settings.resolved_world_root
    result = append_capture(root, payload.category.value, payload.text)
    rebuild_result = refresh_index(root, changed_paths=[result.path])
    queue_world_event(
        background_tasks,
        rebuild_result,
        paths=[result.path],
        deleted_paths=[],
        reason="created" if result.created else "modified",
    )
    return result
