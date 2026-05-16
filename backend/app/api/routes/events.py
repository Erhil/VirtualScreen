from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.events import world_event_hub

router = APIRouter()


@router.websocket("/ws/events")
async def world_events(websocket: WebSocket) -> None:
    await world_event_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await world_event_hub.disconnect(websocket)
