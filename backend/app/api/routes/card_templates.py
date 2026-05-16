from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth import auth_enabled, request_token
from app.core.card_templates import CardTemplateCatalog, list_card_templates
from app.core.config import Settings, get_settings

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/card-templates", response_model=CardTemplateCatalog)
def card_templates(request: Request, settings: SettingsDep) -> CardTemplateCatalog:
    if auth_enabled(settings) and request_token(request.scope) != settings.access_token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return list_card_templates(settings.resolved_world_root)
