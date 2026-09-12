import asyncio

from fastapi import WebSocket, WebSocketDisconnect


class EventHub:
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
            except (WebSocketDisconnect, RuntimeError):
                # A client that has gone away - a reloaded page, a closed player screen -
                # must not break the publish for the rest of the subscribers, nor kill
                # whatever task called publish (the world file watcher, notably). Anything
                # else is a real bug in the payload or the connection and should surface.
                disconnected.append(websocket)

        if disconnected:
            async with self._lock:
                for websocket in disconnected:
                    self._clients.discard(websocket)
