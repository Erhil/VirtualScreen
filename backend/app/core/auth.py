from http.cookies import SimpleCookie

from starlette.datastructures import Headers, QueryParams
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import Settings, get_settings

AUTH_COOKIE = "virtualscreen_access"
AUTH_HEADER = "x-virtualscreen-token"
PUBLIC_API_PATHS = {
    "/api/app/config",
    "/api/health",
    "/api/auth/status",
    "/api/auth/login",
    "/api/auth/logout",
}


def auth_enabled(settings: Settings | None = None) -> bool:
    token = (settings or get_settings()).access_token
    return bool(token and token.strip())


def request_token(scope: Scope) -> str | None:
    headers = Headers(scope=scope)
    header_token = headers.get(AUTH_HEADER)
    if header_token:
        return header_token

    if scope.get("type") == "websocket":
        query_token = QueryParams(scope.get("query_string", b"")).get("token")
        if query_token:
            return query_token

    cookie_header = headers.get("cookie")
    if not cookie_header:
        return None
    cookies = SimpleCookie()
    cookies.load(cookie_header)
    morsel = cookies.get(AUTH_COOKIE)
    return morsel.value if morsel else None


def is_authenticated(scope: Scope, settings: Settings | None = None) -> bool:
    current_settings = settings or get_settings()
    if not auth_enabled(current_settings):
        return True
    configured_token = current_settings.access_token or ""
    return request_token(scope) == configured_token


def _is_public(scope: Scope) -> bool:
    path = str(scope.get("path") or "")
    if scope.get("type") == "http" and scope.get("method") == "OPTIONS":
        return True
    if path.startswith("/api/screen/") or path in {"/ws/screen/display", "/ws/screen/map"}:
        return True
    if path.startswith("/api/app/language/"):
        return True
    if path in PUBLIC_API_PATHS:
        return True
    return not (path.startswith("/api/") or path.startswith("/ws/"))


class AuthMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if _is_public(scope) or is_authenticated(scope):
            await self.app(scope, receive, send)
            return

        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return

        body = b'{"detail":"Authentication required."}'
        await send(
            {
                "type": "http.response.start",
                "status": 401,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})
