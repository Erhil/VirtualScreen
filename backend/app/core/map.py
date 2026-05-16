from __future__ import annotations

import asyncio
import json
import mimetypes
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import BackgroundTasks, WebSocket

from app.core.database import initialize_database
from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root

MAP_IMAGE_EXTENSIONS = {"gif", "jpeg", "jpg", "png", "svg", "webp"}


def _event_time(value: datetime | None = None) -> str:
    event_time = value or datetime.now(tz=UTC)
    return event_time.isoformat().replace("+00:00", "Z")


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


def _coordinate(value: float) -> float:
    return round(_clamp(float(value), 0.0, 1.0), 6)


@dataclass(frozen=True)
class MapViewport:
    center_x: float
    center_y: float
    zoom: float


@dataclass(frozen=True)
class MapReveal:
    id: str
    x: float
    y: float
    width: float
    height: float


@dataclass(frozen=True)
class MapPin:
    id: str
    x: float
    y: float
    label: str
    visibility: str


@dataclass(frozen=True)
class MapGrid:
    enabled: bool
    columns: int
    rows: int
    visible_to_players: bool


@dataclass(frozen=True)
class MapState:
    image_path: str | None
    title: str | None
    viewport: MapViewport
    fog_enabled: bool
    grid: MapGrid
    reveals: list[MapReveal]
    pins: list[MapPin]
    presenting: bool
    updated_at: str


@dataclass(frozen=True)
class MapPreset:
    id: str
    name: str
    state: MapState
    created_at: str
    updated_at: str


def default_viewport() -> MapViewport:
    return MapViewport(center_x=0.5, center_y=0.5, zoom=1.0)


def default_grid() -> MapGrid:
    return MapGrid(enabled=False, columns=10, rows=10, visible_to_players=True)


def blank_map_state(updated_at: str | None = None) -> MapState:
    return MapState(
        image_path=None,
        title=None,
        viewport=default_viewport(),
        fog_enabled=False,
        grid=default_grid(),
        reveals=[],
        pins=[],
        presenting=False,
        updated_at=updated_at or _event_time(),
    )


def clamp_viewport(center_x: float, center_y: float, zoom: float) -> MapViewport:
    return MapViewport(
        center_x=_coordinate(center_x),
        center_y=_coordinate(center_y),
        zoom=round(_clamp(float(zoom), 0.5, 6.0), 6),
    )


def clamp_grid(enabled: bool, columns: int, rows: int, visible_to_players: bool) -> MapGrid:
    return MapGrid(
        enabled=bool(enabled),
        columns=int(_clamp(int(columns), 1, 200)),
        rows=int(_clamp(int(rows), 1, 200)),
        visible_to_players=bool(visible_to_players),
    )


def normalize_reveal(x: float, y: float, width: float, height: float) -> MapReveal:
    x1 = _coordinate(x)
    y1 = _coordinate(y)
    x2 = _coordinate(float(x) + float(width))
    y2 = _coordinate(float(y) + float(height))
    left = min(x1, x2)
    top = min(y1, y2)
    reveal_width = round(abs(x2 - x1), 6)
    reveal_height = round(abs(y2 - y1), 6)
    if reveal_width <= 0 or reveal_height <= 0:
        raise ValueError("Map reveal must have positive width and height.")
    return MapReveal(
        id=uuid4().hex,
        x=left,
        y=top,
        width=reveal_width,
        height=reveal_height,
    )


def normalize_pin(x: float, y: float, label: str, visibility: str | None = None) -> MapPin:
    pin_label = label.strip()
    if not pin_label:
        raise ValueError("Map pin label is required.")
    pin_visibility = visibility or "player"
    if pin_visibility not in {"player", "dm"}:
        raise ValueError("Map pin visibility must be 'player' or 'dm'.")
    return MapPin(
        id=uuid4().hex,
        x=_coordinate(x),
        y=_coordinate(y),
        label=pin_label,
        visibility=pin_visibility,
    )


def map_state_payload(state: MapState) -> dict[str, object]:
    return {
        "image_path": state.image_path,
        "title": state.title,
        "viewport": asdict(state.viewport),
        "fog_enabled": state.fog_enabled,
        "grid": asdict(state.grid),
        "reveals": [asdict(reveal) for reveal in state.reveals],
        "pins": [asdict(pin) for pin in state.pins],
        "presenting": state.presenting,
        "updated_at": state.updated_at,
    }


def map_preset_payload(preset: MapPreset) -> dict[str, object]:
    return {
        "id": preset.id,
        "name": preset.name,
        "state": map_state_payload(preset.state),
        "created_at": preset.created_at,
        "updated_at": preset.updated_at,
    }


def _state_json(state: MapState) -> str:
    return json.dumps(
        {
            "image_path": state.image_path,
            "title": state.title,
            "viewport": asdict(state.viewport),
            "fog_enabled": state.fog_enabled,
            "grid": asdict(state.grid),
            "reveals": [asdict(reveal) for reveal in state.reveals],
            "pins": [asdict(pin) for pin in state.pins],
            "presenting": state.presenting,
        },
        ensure_ascii=False,
        sort_keys=True,
    )


def _viewport_from_dict(value: object) -> MapViewport:
    if not isinstance(value, dict):
        return default_viewport()
    return clamp_viewport(
        float(value.get("center_x") or 0.5),
        float(value.get("center_y") or 0.5),
        float(value.get("zoom") or 1.0),
    )


def _grid_from_dict(value: object) -> MapGrid:
    if not isinstance(value, dict):
        return default_grid()
    fallback = default_grid()
    try:
        return clamp_grid(
            bool(value.get("enabled")),
            int(value.get("columns") or fallback.columns),
            int(value.get("rows") or fallback.rows),
            bool(
                value["visible_to_players"]
                if "visible_to_players" in value
                else fallback.visible_to_players
            ),
        )
    except (TypeError, ValueError):
        return fallback


def _reveal_from_dict(value: object) -> MapReveal | None:
    if not isinstance(value, dict):
        return None
    reveal_id = str(value.get("id") or "")
    if not reveal_id:
        return None
    try:
        reveal = normalize_reveal(
            float(value.get("x") or 0.0),
            float(value.get("y") or 0.0),
            float(value.get("width") or 0.0),
            float(value.get("height") or 0.0),
        )
    except (TypeError, ValueError):
        return None
    return MapReveal(
        id=reveal_id,
        x=reveal.x,
        y=reveal.y,
        width=reveal.width,
        height=reveal.height,
    )


def _pin_from_dict(value: object) -> MapPin | None:
    if not isinstance(value, dict):
        return None
    pin_id = str(value.get("id") or "")
    if not pin_id:
        return None
    try:
        pin = normalize_pin(
            float(value.get("x") or 0.0),
            float(value.get("y") or 0.0),
            str(value.get("label") or ""),
            str(value.get("visibility") or "player"),
        )
    except (TypeError, ValueError):
        return None
    return MapPin(id=pin_id, x=pin.x, y=pin.y, label=pin.label, visibility=pin.visibility)


def _state_from_json(value: str, updated_at: str) -> MapState:
    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        loaded = {}
    if not isinstance(loaded, dict):
        return blank_map_state(updated_at)

    raw_reveals = loaded.get("reveals") if isinstance(loaded.get("reveals"), list) else []
    raw_pins = loaded.get("pins") if isinstance(loaded.get("pins"), list) else []
    return MapState(
        image_path=str(loaded["image_path"]) if loaded.get("image_path") else None,
        title=str(loaded["title"]) if loaded.get("title") else None,
        viewport=_viewport_from_dict(loaded.get("viewport")),
        fog_enabled=bool(loaded.get("fog_enabled")),
        grid=_grid_from_dict(loaded.get("grid")),
        reveals=[
            reveal for reveal in (_reveal_from_dict(item) for item in raw_reveals) if reveal
        ],
        pins=[pin for pin in (_pin_from_dict(item) for item in raw_pins) if pin],
        presenting=bool(loaded.get("presenting")),
        updated_at=updated_at,
    )


def map_state_from_payload(value: object, updated_at: str | None = None) -> MapState:
    return _state_from_json(
        json.dumps(value, ensure_ascii=False),
        updated_at or _event_time(),
    )


def load_map_state(root: Path) -> MapState:
    conn = initialize_database(root)
    row = conn.execute("select state_json, updated_at from map_state where id = 1").fetchone()
    conn.close()
    if row is None:
        return blank_map_state()
    return _state_from_json(row["state_json"], row["updated_at"])


def _save_map_state(root: Path, state: MapState) -> MapState:
    updated_at = _event_time()
    next_state = MapState(
        image_path=state.image_path,
        title=state.title,
        viewport=state.viewport,
        fog_enabled=state.fog_enabled,
        grid=state.grid,
        reveals=state.reveals,
        pins=state.pins,
        presenting=state.presenting,
        updated_at=updated_at,
    )
    conn = initialize_database(root)
    with conn:
        conn.execute(
            """
            insert into map_state(id, state_json, updated_at)
            values (1, ?, ?)
            on conflict(id) do update
            set state_json = excluded.state_json,
                updated_at = excluded.updated_at
            """,
            (_state_json(next_state), updated_at),
        )
    conn.close()
    return next_state


def list_map_presets(root: Path) -> list[MapPreset]:
    conn = initialize_database(root)
    rows = conn.execute(
        """
        select id, name, state_json, created_at, updated_at
        from map_presets
        order by updated_at desc, name collate nocase asc
        """
    ).fetchall()
    conn.close()
    return [
        MapPreset(
            id=row["id"],
            name=row["name"],
            state=_state_from_json(row["state_json"], row["updated_at"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def save_map_preset(root: Path, name: str, state: MapState | None = None) -> MapPreset:
    preset_name = name.strip()
    if not preset_name:
        raise ValueError("Map preset name is required.")

    preset_state = state or load_map_state(root)
    if preset_state.image_path is None:
        raise ValueError("Map source is required before saving a preset.")
    map_image_path(root, preset_state.image_path)

    created_at = _event_time()
    preset = MapPreset(
        id=uuid4().hex,
        name=preset_name,
        state=preset_state,
        created_at=created_at,
        updated_at=created_at,
    )
    conn = initialize_database(root)
    with conn:
        conn.execute(
            """
            insert into map_presets(id, name, state_json, created_at, updated_at)
            values (?, ?, ?, ?, ?)
            """,
            (
                preset.id,
                preset.name,
                _state_json(preset.state),
                preset.created_at,
                preset.updated_at,
            ),
        )
    conn.close()
    return preset


def load_map_preset(root: Path, preset_id: str) -> MapState:
    conn = initialize_database(root)
    row = conn.execute(
        "select state_json, updated_at from map_presets where id = ?",
        (preset_id,),
    ).fetchone()
    conn.close()
    if row is None:
        raise KeyError(preset_id)

    state = _state_from_json(row["state_json"], row["updated_at"])
    if state.image_path is None:
        raise ValueError("Map preset has no source image.")
    map_image_path(root, state.image_path)
    return _save_map_state(root, state)


def restore_map_state(root: Path, state: MapState) -> MapState:
    if state.image_path is not None:
        map_image_path(root, state.image_path)
    return _save_map_state(root, state)


def delete_map_preset(root: Path, preset_id: str) -> bool:
    conn = initialize_database(root)
    with conn:
        cursor = conn.execute("delete from map_presets where id = ?", (preset_id,))
    conn.close()
    return cursor.rowcount > 0


def _reject_map_internal_path(relative_path: str) -> None:
    parts = relative_path.split("/")
    if (
        relative_path == ""
        or parts[0] in {".virtualscreen", ".music"}
        or ".virtualscreen" in parts
        or ".music" in parts
    ):
        raise WorldPathError("Map source path is not allowed.")


def map_image_path(root: Path, requested_path: str) -> tuple[str, Path]:
    relative_path = normalize_relative_path(requested_path)
    _reject_map_internal_path(relative_path)
    path = resolve_under_root(root, relative_path)
    if not path.exists():
        raise FileNotFoundError(relative_path)
    if path.is_dir():
        raise IsADirectoryError(relative_path)
    extension = path.suffix.lower().lstrip(".")
    if extension not in MAP_IMAGE_EXTENSIONS:
        raise ValueError("Map source must be an image file.")
    return relative_path, path


def map_media_content_type(path: Path) -> str:
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def set_map_source(root: Path, requested_path: str) -> MapState:
    relative_path, path = map_image_path(root, requested_path)
    return _save_map_state(
        root,
        MapState(
            image_path=relative_path,
            title=path.stem,
            viewport=default_viewport(),
            fog_enabled=False,
            grid=default_grid(),
            reveals=[],
            pins=[],
            presenting=False,
            updated_at=_event_time(),
        ),
    )


def set_map_viewport(root: Path, viewport: MapViewport) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=current.reveals,
            pins=current.pins,
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def set_map_fog(root: Path, enabled: bool) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=enabled,
            grid=current.grid,
            reveals=current.reveals,
            pins=current.pins,
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def set_map_grid(root: Path, grid: MapGrid) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=grid,
            reveals=current.reveals,
            pins=current.pins,
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def add_map_reveal(root: Path, reveal: MapReveal) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=[*current.reveals, reveal],
            pins=current.pins,
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def delete_map_reveal(root: Path, reveal_id: str) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=[reveal for reveal in current.reveals if reveal.id != reveal_id],
            pins=current.pins,
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def clear_map_reveals(root: Path) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=[],
            pins=current.pins,
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def add_map_pin(root: Path, pin: MapPin) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=current.reveals,
            pins=[*current.pins, pin],
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def delete_map_pin(root: Path, pin_id: str) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=current.reveals,
            pins=[pin for pin in current.pins if pin.id != pin_id],
            presenting=current.presenting,
            updated_at=current.updated_at,
        ),
    )


def present_map(root: Path) -> MapState:
    current = load_map_state(root)
    if current.image_path is None:
        raise ValueError("Map source is required before presenting.")
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=current.reveals,
            pins=current.pins,
            presenting=True,
            updated_at=current.updated_at,
        ),
    )


def stop_map(root: Path) -> MapState:
    current = load_map_state(root)
    return _save_map_state(
        root,
        MapState(
            image_path=current.image_path,
            title=current.title,
            viewport=current.viewport,
            fog_enabled=current.fog_enabled,
            grid=current.grid,
            reveals=current.reveals,
            pins=current.pins,
            presenting=False,
            updated_at=current.updated_at,
        ),
    )


def public_map_state(root: Path) -> MapState:
    state = load_map_state(root)
    if not state.presenting or state.image_path is None:
        return blank_map_state(state.updated_at)
    grid = state.grid
    if not grid.visible_to_players:
        grid = MapGrid(
            enabled=False,
            columns=grid.columns,
            rows=grid.rows,
            visible_to_players=False,
        )
    return MapState(
        image_path=state.image_path,
        title=state.title,
        viewport=state.viewport,
        fog_enabled=state.fog_enabled,
        grid=grid,
        reveals=state.reveals,
        pins=[pin for pin in state.pins if pin.visibility == "player"],
        presenting=state.presenting,
        updated_at=state.updated_at,
    )


class MapEventHub:
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


map_event_hub = MapEventHub()
screen_map_event_hub = MapEventHub()


def queue_map_event(
    background_tasks: BackgroundTasks,
    state: MapState,
    root: Path | None = None,
) -> None:
    background_tasks.add_task(map_event_hub.publish, map_state_payload(state))
    public_state = public_map_state(root) if root is not None else state
    background_tasks.add_task(screen_map_event_hub.publish, map_state_payload(public_state))
