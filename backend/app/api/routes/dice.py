from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.dice import roll_dice_expression

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


class DiceRollPayload(BaseModel):
    expression: str


class DiceBreakdownModel(BaseModel):
    count: int
    sides: int
    results: list[int]


class DiceRollResponse(BaseModel):
    expression: str
    dice: DiceBreakdownModel
    modifier: int
    total: int
    detail: str
    rolled_at: str


@router.post("/dice/roll", response_model=DiceRollResponse)
def dice_roll(payload: DiceRollPayload, _settings: SettingsDep) -> DiceRollResponse:
    try:
        roll = roll_dice_expression(payload.expression)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DiceRollResponse(
        expression=roll.expression,
        dice=DiceBreakdownModel(
            count=roll.count,
            sides=roll.sides,
            results=roll.results,
        ),
        modifier=roll.modifier,
        total=roll.total,
        detail=roll.detail,
        rolled_at=_utc_now(),
    )
