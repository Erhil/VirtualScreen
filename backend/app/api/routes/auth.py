from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from app.core.auth import AUTH_COOKIE, auth_enabled, is_authenticated
from app.core.config import Settings, get_settings

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class AuthStatusResponse(BaseModel):
    enabled: bool
    authenticated: bool


class AuthLoginRequest(BaseModel):
    token: str


def _status(request: Request, settings: Settings) -> AuthStatusResponse:
    enabled = auth_enabled(settings)
    return AuthStatusResponse(
        enabled=enabled,
        authenticated=True if not enabled else is_authenticated(request.scope, settings),
    )


@router.get("/auth/status", response_model=AuthStatusResponse)
def auth_status(request: Request, settings: SettingsDep) -> AuthStatusResponse:
    return _status(request, settings)


@router.post("/auth/login", response_model=AuthStatusResponse)
def auth_login(
    payload: AuthLoginRequest,
    response: Response,
    settings: SettingsDep,
) -> AuthStatusResponse:
    if not auth_enabled(settings):
        return AuthStatusResponse(enabled=False, authenticated=True)

    if payload.token != settings.access_token:
        raise HTTPException(status_code=401, detail="Invalid access token.")

    response.set_cookie(
        AUTH_COOKIE,
        payload.token,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return AuthStatusResponse(enabled=True, authenticated=True)


@router.post("/auth/logout", response_model=AuthStatusResponse)
def auth_logout(response: Response, settings: SettingsDep) -> AuthStatusResponse:
    response.delete_cookie(AUTH_COOKIE)
    return AuthStatusResponse(enabled=auth_enabled(settings), authenticated=False)
