from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Literal

from fastapi import BackgroundTasks, WebSocket

from app.core.index import RebuildResult
from app.core.paths import normalize_relative_path

WorldEventReason = Literal["created", "modified", "deleted", "mixed"]
WorldEventSource = Literal["watcher", "api"]


def _event_time(value: datetime | None = None) -> str:
    event_time = value or datetime.now(tz=UTC)
    return event_time.isoformat().replace("+00:00", "Z")


def _dedupe_paths(paths: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for path in paths:
        relative_path = normalize_relative_path(path)
        if relative_path not in seen:
            seen.add(relative_path)
            normalized.append(relative_path)
    return normalized


def world_event_payload(
    *,
    paths: list[str],
    deleted_paths: list[str],
    reason: WorldEventReason,
    source: WorldEventSource,
    rebuilt_at: datetime | None = None,
) -> dict[str, object]:
    return {
        "type": "world_changed",
        "paths": _dedupe_paths(paths),
        "deleted_paths": _dedupe_paths(deleted_paths),
        "reason": reason,
        "source": source,
        "rebuilt_at": _event_time(rebuilt_at),
    }


class WorldEventHub:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._clients.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(websocket)

    async def publish(self, event: dict[str, object]) -> None:
        async with self._lock:
            clients = list(self._clients)

        disconnected: list[WebSocket] = []
        for websocket in clients:
            try:
                await websocket.send_json(event)
            except RuntimeError:
                disconnected.append(websocket)

        if disconnected:
            async with self._lock:
                for websocket in disconnected:
                    self._clients.discard(websocket)


world_event_hub = WorldEventHub()


def queue_world_event(
    background_tasks: BackgroundTasks,
    rebuild_result: RebuildResult,
    *,
    paths: list[str],
    deleted_paths: list[str],
    reason: WorldEventReason,
    source: WorldEventSource = "api",
) -> None:
    event = world_event_payload(
        paths=paths,
        deleted_paths=deleted_paths,
        reason=reason,
        source=source,
        rebuilt_at=rebuild_result.rebuilt_at,
    )
    background_tasks.add_task(world_event_hub.publish, event)
