import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.plugins import BackendPlugin

router = APIRouter()


class RollRequest(BaseModel):
    entries: list[str]


@router.post("/plugins/random-tables/roll")
def roll_random_table(payload: RollRequest) -> dict[str, str]:
    entries = [entry for entry in payload.entries if entry.strip()]
    if not entries:
        raise HTTPException(status_code=400, detail="No entries to roll on")
    return {"result": random.choice(entries)}


PLUGIN = BackendPlugin(id="random-tables", router=router)
