from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.prep_health import PrepHealthReport, build_prep_health_report

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/prep-health", response_model=PrepHealthReport)
def prep_health(settings: SettingsDep) -> PrepHealthReport:
    return build_prep_health_report(settings.resolved_world_root)
