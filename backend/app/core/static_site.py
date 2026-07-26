from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Receive, Scope, Send
from starlette.websockets import WebSocketClose

logger = logging.getLogger(__name__)


class SpaStaticFiles(StaticFiles):
    """Serves the built SPA, falling back to index.html for client-side routes."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            # Mount("/") also catches websocket scopes; mimic Starlette's
            # not-found behaviour (clean close) instead of tripping
            # StaticFiles' http-only assert.
            if scope["type"] == "websocket":
                await WebSocketClose()(scope, receive, send)
            return
        await super().__call__(scope, receive, send)

    async def get_response(self, path: str, scope: Scope) -> Response:
        if scope.get("method") not in ("GET", "HEAD"):
            # Match pre-mount behaviour: unmatched non-GET/HEAD requests are a
            # plain 404, not StaticFiles' 405 (which would mask e.g. a removed
            # plugin route and confuse clients that branch on 404).
            raise StarletteHTTPException(status_code=404)
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            # Never mask a missing API/WS route with the SPA shell.
            # `path` uses OS-native separators (e.g. backslashes on Windows).
            normalized = path.replace("\\", "/").strip("/").lower()
            if normalized.split("/", 1)[0] in {"api", "ws"}:
                raise
            return await super().get_response("index.html", scope)


def mount_frontend(app: FastAPI, static_dir: Path | None) -> bool:
    """Mount the built frontend at / when configured. Returns True when mounted."""
    if static_dir is None:
        return False
    if not static_dir.is_dir():
        logger.warning("Static dir %s does not exist or is not a directory; skipping.", static_dir)
        return False
    if not (static_dir / "index.html").is_file():
        logger.warning("Static dir %s has no index.html; skipping.", static_dir)
        return False

    try:
        app.mount("/", SpaStaticFiles(directory=static_dir, html=True), name="frontend")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to mount frontend from %s", static_dir)
        return False
    logger.info("Serving frontend from %s", static_dir)
    return True
