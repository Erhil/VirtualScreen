from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, cast
from uuid import uuid4

from fastapi import BackgroundTasks, WebSocket

from app.core.database import initialize_database
from app.core.index import media_kind_for_extension
from app.core.pages import parse_page
from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root

DISPLAY_BACKGROUND_FILENAMES = (
    "screen-background.png",
    "screen-background.jpg",
    "screen-background.jpeg",
    "screen-background.gif",
    "screen-background.webp",
    "screen-background.svg",
)

DisplayPopupPreset = Literal["plain", "note", "letter", "portrait", "clue"]
DISPLAY_POPUP_PRESETS = {"plain", "note", "letter", "portrait", "clue"}


def _event_time(value: datetime | None = None) -> str:
    event_time = value or datetime.now(tz=UTC)
    return event_time.isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class DisplayItem:
    path: str
    title: str | None
    name: str
    media_kind: str


@dataclass(frozen=True)
class DisplayPopup(DisplayItem):
    id: str
    created_at: str
    preset: DisplayPopupPreset
    visible: bool = True


@dataclass(frozen=True)
class DisplayState:
    fullscreen: DisplayItem | None
    popups: list[DisplayPopup]
    updated_at: str


def _item_from_dict(value: object) -> DisplayItem | None:
    if not isinstance(value, dict):
        return None
    return DisplayItem(
        path=str(value.get("path") or ""),
        title=str(value["title"]) if value.get("title") is not None else None,
        name=str(value.get("name") or ""),
        media_kind=str(value.get("media_kind") or "unsupported"),
    )


def _popup_from_dict(value: object) -> DisplayPopup | None:
    item = _item_from_dict(value)
    if item is None or not isinstance(value, dict):
        return None
    raw_preset = str(value.get("preset") or "plain")
    preset = cast(
        DisplayPopupPreset,
        raw_preset if raw_preset in DISPLAY_POPUP_PRESETS else "plain",
    )
    return DisplayPopup(
        id=str(value.get("id") or ""),
        path=item.path,
        title=item.title,
        name=item.name,
        media_kind=item.media_kind,
        created_at=str(value.get("created_at") or ""),
        preset=preset,
        visible=bool(value.get("visible", True)),
    )


def _state_from_json(value: str, updated_at: str) -> DisplayState:
    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        loaded = {}
    fullscreen = _item_from_dict(loaded.get("fullscreen")) if isinstance(loaded, dict) else None
    raw_popups = loaded.get("popups") if isinstance(loaded, dict) else []
    raw_popup_items = raw_popups if isinstance(raw_popups, list) else []
    popups = [
        popup
        for popup in (_popup_from_dict(item) for item in raw_popup_items)
        if popup is not None and popup.id
    ]
    return DisplayState(fullscreen=fullscreen, popups=popups, updated_at=updated_at)


def display_state_from_payload(value: object, updated_at: str | None = None) -> DisplayState:
    return _state_from_json(
        json.dumps(value, ensure_ascii=False),
        updated_at or _event_time(),
    )


def display_state_payload(state: DisplayState) -> dict[str, object]:
    return {
        "fullscreen": asdict(state.fullscreen) if state.fullscreen else None,
        "popups": [asdict(popup) for popup in state.popups],
        "updated_at": state.updated_at,
    }


def screen_display_state_payload(state: DisplayState) -> dict[str, object]:
    return display_state_payload(
        DisplayState(
            fullscreen=state.fullscreen,
            popups=[popup for popup in state.popups if popup.visible],
            updated_at=state.updated_at,
        )
    )


def display_background_path(root: Path) -> Path | None:
    internal_root = root / ".virtualscreen"
    for filename in DISPLAY_BACKGROUND_FILENAMES:
        path = internal_root / filename
        if path.is_file():
            return path
    return None


def load_display_state(root: Path) -> DisplayState:
    conn = initialize_database(root)
    row = conn.execute(
        "select state_json, updated_at from display_state where id = 1"
    ).fetchone()
    conn.close()
    if row is None:
        return DisplayState(fullscreen=None, popups=[], updated_at=_event_time())
    return _state_from_json(row["state_json"], row["updated_at"])


def _save_display_state(
    root: Path,
    fullscreen: DisplayItem | None,
    popups: list[DisplayPopup],
) -> DisplayState:
    updated_at = _event_time()
    state = DisplayState(fullscreen=fullscreen, popups=popups, updated_at=updated_at)
    conn = initialize_database(root)
    with conn:
        conn.execute(
            """
            insert into display_state(id, state_json, updated_at)
            values (1, ?, ?)
            on conflict(id) do update
            set state_json = excluded.state_json,
                updated_at = excluded.updated_at
            """,
            (
                json.dumps(
                    {
                        "fullscreen": asdict(fullscreen) if fullscreen else None,
                        "popups": [asdict(popup) for popup in popups],
                    },
                    ensure_ascii=False,
                    sort_keys=True,
                ),
                updated_at,
            ),
        )
    conn.close()
    return state


def display_item_for_path(root: Path, requested_path: str) -> DisplayItem:
    try:
        relative_path = normalize_relative_path(requested_path)
        if relative_path.split("/")[0] == ".virtualscreen":
            raise WorldPathError("Display path is not allowed.")
        path = resolve_under_root(root, relative_path)
    except WorldPathError as exc:
        raise exc

    if not path.exists():
        raise FileNotFoundError(relative_path)
    if path.is_dir():
        raise IsADirectoryError(relative_path)

    extension = path.suffix.lower().lstrip(".") or None
    page = parse_page(root, path)
    return DisplayItem(
        path=relative_path,
        title=page.title,
        name=path.name,
        media_kind=media_kind_for_extension(extension),
    )


def set_fullscreen(root: Path, item: DisplayItem) -> DisplayState:
    current = load_display_state(root)
    return _save_display_state(root, item, current.popups)


def blank_fullscreen(root: Path) -> DisplayState:
    return _save_display_state(root, None, [])


def restore_display_state(root: Path, state: DisplayState) -> DisplayState:
    return _save_display_state(root, state.fullscreen, state.popups)


def _popup_for_item(
    item: DisplayItem,
    preset: DisplayPopupPreset = "plain",
    visible: bool = True,
) -> DisplayPopup:
    return DisplayPopup(
        id=uuid4().hex,
        path=item.path,
        title=item.title,
        name=item.name,
        media_kind=item.media_kind,
        created_at=_event_time(),
        preset=preset,
        visible=visible,
    )


def add_popup(
    root: Path,
    item: DisplayItem,
    preset: DisplayPopupPreset = "plain",
    visible: bool = True,
) -> DisplayState:
    current = load_display_state(root)
    popup = _popup_for_item(item, preset, visible)
    return _save_display_state(root, current.fullscreen, [*current.popups, popup])


def show_active(
    root: Path,
    item: DisplayItem,
    mode: Literal["fullscreen", "popup"],
    clear_existing: bool = False,
    preset: DisplayPopupPreset = "plain",
) -> DisplayState:
    if mode == "fullscreen":
        popups = [] if clear_existing else load_display_state(root).popups
        return _save_display_state(root, item, popups)

    fullscreen = None if clear_existing else load_display_state(root).fullscreen
    return _save_display_state(root, fullscreen, [_popup_for_item(item, preset)])


def set_popup_visible(root: Path, popup_id: str, visible: bool) -> DisplayState:
    current = load_display_state(root)
    return _save_display_state(
        root,
        current.fullscreen,
        [
            DisplayPopup(
                id=popup.id,
                path=popup.path,
                title=popup.title,
                name=popup.name,
                media_kind=popup.media_kind,
                created_at=popup.created_at,
                preset=popup.preset,
                visible=visible if popup.id == popup_id else popup.visible,
            )
            for popup in current.popups
        ],
    )


def close_popup(root: Path, popup_id: str) -> DisplayState:
    current = load_display_state(root)
    return _save_display_state(
        root,
        current.fullscreen,
        [popup for popup in current.popups if popup.id != popup_id],
    )


def clear_popups(root: Path) -> DisplayState:
    current = load_display_state(root)
    return _save_display_state(root, current.fullscreen, [])


class DisplayEventHub:
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


display_event_hub = DisplayEventHub()
screen_display_event_hub = DisplayEventHub()


def queue_display_event(background_tasks: BackgroundTasks, state: DisplayState) -> None:
    background_tasks.add_task(display_event_hub.publish, display_state_payload(state))
    background_tasks.add_task(screen_display_event_hub.publish, screen_display_state_payload(state))
