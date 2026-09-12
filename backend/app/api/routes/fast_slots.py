from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.fast_slots import FastSlot, load_fast_slots, save_fast_slots
from app.core.paths import WorldPathError

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class FastSlotsPayload(BaseModel):
    slots: list[FastSlot]


@router.get("/fast-slots", response_model=list[FastSlot])
def fast_slots(settings: SettingsDep) -> list[FastSlot]:
    return load_fast_slots(settings.resolved_world_root)


@router.put("/fast-slots", response_model=list[FastSlot])
def update_fast_slots(
    payload: FastSlotsPayload,
    settings: SettingsDep,
) -> list[FastSlot]:
    try:
        return save_fast_slots(
            settings.resolved_world_root,
            [asdict(slot) for slot in payload.slots],
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (ValueError, WorldPathError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
