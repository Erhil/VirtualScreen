from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.fast_slots import FastSlot, load_fast_slots, save_fast_slots
from app.core.paths import WorldPathError

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class FastSlotModel(BaseModel):
    id: str
    position: int
    label: str
    icon: str | None
    action: dict[str, Any]


class FastSlotsPayload(BaseModel):
    slots: list[FastSlotModel]


def _slot_model(slot: FastSlot) -> FastSlotModel:
    return FastSlotModel(
        id=slot.id,
        position=slot.position,
        label=slot.label,
        icon=slot.icon,
        action=slot.action,
    )


@router.get("/fast-slots", response_model=list[FastSlotModel])
def fast_slots(settings: SettingsDep) -> list[FastSlotModel]:
    return [
        _slot_model(slot)
        for slot in load_fast_slots(
            settings.resolved_world_root,
            enable_legacy_scenarios=settings.enable_legacy_scenarios,
        )
    ]


@router.put("/fast-slots", response_model=list[FastSlotModel])
def update_fast_slots(
    payload: FastSlotsPayload,
    settings: SettingsDep,
) -> list[FastSlotModel]:
    try:
        slots = save_fast_slots(
            settings.resolved_world_root,
            [slot.model_dump() for slot in payload.slots],
            enable_legacy_scenarios=settings.enable_legacy_scenarios,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (ValueError, WorldPathError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return [_slot_model(slot) for slot in slots]
