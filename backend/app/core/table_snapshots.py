from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.core.audio import AudioBus, scan_audio_library
from app.core.database import initialize_database
from app.core.display import (
    DisplayState,
    display_item_for_path,
    display_state_from_payload,
    display_state_payload,
    restore_display_state,
)
from app.core.map import (
    MapState,
    map_image_path,
    map_state_from_payload,
    map_state_payload,
    restore_map_state,
)
from app.core.paths import WorldPathError
from app.core.workspace import (
    WorkspaceLayout,
    WorkspaceState,
    WorkspaceTab,
    _layout_from_dict,
    _tab_from_dict,
    _validate_tabs,
    list_workspaces,
    load_workspace,
    restore_workspace_state,
)

SNAPSHOT_NAME_LIMIT = 80
AUDIO_BUSES: tuple[AudioBus, ...] = ("ambient", "music", "effect")


class SnapshotConflictError(ValueError):
    pass


class SnapshotNotFoundError(KeyError):
    pass


@dataclass(frozen=True)
class TableSnapshotAudioBus:
    track: dict[str, object] | None
    volume: float
    loop: bool
    playing: bool


@dataclass(frozen=True)
class TableSnapshotWorkspace:
    workspace_id: str
    workspace_name: str
    tabs: list[WorkspaceTab]
    activePath: str | None
    layout: WorkspaceLayout


@dataclass(frozen=True)
class TableSnapshotState:
    display: DisplayState
    map: MapState
    workspace: TableSnapshotWorkspace
    audio: dict[AudioBus, TableSnapshotAudioBus]


@dataclass(frozen=True)
class TableSnapshotSummary:
    id: str
    name: str
    updated_at: str


@dataclass(frozen=True)
class TableSnapshotDetail(TableSnapshotSummary):
    state: TableSnapshotState


@dataclass(frozen=True)
class TableSnapshotRestoreResult:
    snapshot: TableSnapshotDetail
    display: DisplayState
    map: MapState
    workspace: WorkspaceState
    audio: dict[AudioBus, TableSnapshotAudioBus]


def _now() -> str:
    return datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")


def _normalize_name(name: str) -> str:
    normalized = name.strip()
    if not normalized:
        raise ValueError("Snapshot name is required.")
    if len(normalized) > SNAPSHOT_NAME_LIMIT:
        raise ValueError("Snapshot name must be 80 characters or fewer.")
    return normalized


def _workspace_payload(workspace: WorkspaceState) -> dict[str, object]:
    return {
        "workspace_id": workspace.workspaceId,
        "workspace_name": workspace.workspaceName,
        "tabs": [asdict(tab) for tab in workspace.tabs],
        "activePath": workspace.activePath,
        "layout": asdict(workspace.layout),
    }


def current_snapshot_state_payload(
    display: DisplayState,
    map_state: MapState,
    workspace: WorkspaceState,
    audio: object,
) -> dict[str, object]:
    return {
        "display": display_state_payload(display),
        "map": map_state_payload(map_state),
        "workspace": _workspace_payload(workspace),
        "audio": audio,
    }


def _audio_track_payload(root: Path, value: object, bus: AudioBus) -> dict[str, object] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("Snapshot audio track must be an object.")
    track_path = str(value.get("path") or "")
    if not track_path:
        raise ValueError("Snapshot audio track path is required.")
    for track in scan_audio_library(root, bus=bus):
        if track.path == track_path:
            return {
                "path": track.path,
                "name": track.name,
                "title": track.title,
                "bus": track.bus,
                "playlist": track.playlist,
                "extension": track.extension,
                "content_type": track.content_type,
                "size": track.size,
                "modified_at": track.modified_at.isoformat().replace("+00:00", "Z"),
            }
    raise FileNotFoundError(track_path)


def _audio_bus_from_dict(root: Path, value: object, bus: AudioBus) -> TableSnapshotAudioBus:
    if not isinstance(value, dict):
        raise ValueError("Snapshot audio bus must be an object.")
    volume = float(value.get("volume", 0))
    volume = min(max(volume, 0.0), 1.0)
    track = _audio_track_payload(root, value.get("track"), bus)
    return TableSnapshotAudioBus(
        track=track,
        volume=volume,
        loop=bool(value.get("loop")),
        playing=bool(track and value.get("playing")),
    )


def _audio_from_payload(root: Path, value: object) -> dict[AudioBus, TableSnapshotAudioBus]:
    if not isinstance(value, dict):
        raise ValueError("Snapshot audio state must be an object.")
    return {bus: _audio_bus_from_dict(root, value.get(bus, {}), bus) for bus in AUDIO_BUSES}


def _validate_display(root: Path, state: DisplayState) -> None:
    items = [item for item in [state.fullscreen, *state.popups] if item is not None]
    for item in items:
        display_item_for_path(root, item.path)


def _validate_map(root: Path, state: MapState) -> None:
    if state.image_path is not None:
        map_image_path(root, state.image_path)


def _workspace_exists(root: Path, workspace_id: str) -> bool:
    return any(workspace.id == workspace_id for workspace in list_workspaces(root))


def _workspace_from_payload(root: Path, value: object) -> TableSnapshotWorkspace:
    if not isinstance(value, dict):
        raise ValueError("Snapshot workspace must be an object.")
    workspace_id = str(value.get("workspace_id") or "")
    if not workspace_id:
        raise ValueError("Snapshot workspace id is required.")
    if not _workspace_exists(root, workspace_id):
        raise SnapshotConflictError("Snapshot workspace no longer exists.")
    tabs_value = value.get("tabs")
    if not isinstance(tabs_value, list):
        raise ValueError("Snapshot workspace tabs must be a list.")
    tabs = [_tab_from_dict(item) for item in tabs_value]
    _validate_tabs(root, tabs)
    tab_paths = {tab.path for tab in tabs}
    active_path = value.get("activePath")
    normalized_active_path = str(active_path) if active_path is not None else None
    if normalized_active_path is not None and normalized_active_path not in tab_paths:
        raise WorldPathError("Snapshot active tab must be one of the open tabs.")
    layout = _layout_from_dict(value.get("layout"), tab_paths)
    return TableSnapshotWorkspace(
        workspace_id=workspace_id,
        workspace_name=str(value.get("workspace_name") or ""),
        tabs=tabs,
        activePath=normalized_active_path,
        layout=layout,
    )


def state_from_payload(root: Path, value: object) -> TableSnapshotState:
    if not isinstance(value, dict):
        raise ValueError("Snapshot state must be an object.")
    display_value = value.get("display") or {}
    map_value = value.get("map") or {}
    display_updated_at = (
        str(display_value.get("updated_at")) if isinstance(display_value, dict) else None
    )
    map_updated_at = str(map_value.get("updated_at")) if isinstance(map_value, dict) else None
    display = display_state_from_payload(display_value, display_updated_at)
    map_state = map_state_from_payload(map_value, map_updated_at)
    workspace = _workspace_from_payload(root, value.get("workspace"))
    audio = _audio_from_payload(root, value.get("audio") or {})
    _validate_display(root, display)
    _validate_map(root, map_state)
    return TableSnapshotState(
        display=display,
        map=map_state,
        workspace=workspace,
        audio=audio,
    )


def state_payload(state: TableSnapshotState) -> dict[str, object]:
    return {
        "display": display_state_payload(state.display),
        "map": map_state_payload(state.map),
        "workspace": {
            "workspace_id": state.workspace.workspace_id,
            "workspace_name": state.workspace.workspace_name,
            "tabs": [asdict(tab) for tab in state.workspace.tabs],
            "activePath": state.workspace.activePath,
            "layout": asdict(state.workspace.layout),
        },
        "audio": {bus: asdict(value) for bus, value in state.audio.items()},
    }


def _detail_from_row(root: Path, row) -> TableSnapshotDetail:
    return TableSnapshotDetail(
        id=row["id"],
        name=row["name"],
        updated_at=row["updated_at"],
        state=state_from_payload(root, json.loads(row["state_json"])),
    )


def list_table_snapshots(root: Path) -> list[TableSnapshotSummary]:
    conn = initialize_database(root)
    rows = conn.execute(
        "select id, name, updated_at from table_snapshots order by updated_at desc, name"
    ).fetchall()
    conn.close()
    return [
        TableSnapshotSummary(id=row["id"], name=row["name"], updated_at=row["updated_at"])
        for row in rows
    ]


def create_table_snapshot(root: Path, name: str, state_value: object) -> TableSnapshotDetail:
    snapshot_name = _normalize_name(name)
    state = state_from_payload(root, state_value)
    now = _now()
    snapshot_id = uuid4().hex
    conn = initialize_database(root)
    with conn:
        existing = conn.execute(
            "select 1 from table_snapshots where name = ?",
            (snapshot_name,),
        ).fetchone()
        if existing:
            raise ValueError("Snapshot name must be unique.")
        conn.execute(
            """
            insert into table_snapshots(id, name, state_json, created_at, updated_at)
            values (?, ?, ?, ?, ?)
            """,
            (
                snapshot_id,
                snapshot_name,
                json.dumps(state_payload(state), ensure_ascii=False, sort_keys=True),
                now,
                now,
            ),
        )
    conn.close()
    return get_table_snapshot(root, snapshot_id)


def get_table_snapshot(root: Path, snapshot_id: str) -> TableSnapshotDetail:
    conn = initialize_database(root)
    row = conn.execute(
        "select id, name, state_json, updated_at from table_snapshots where id = ?",
        (snapshot_id,),
    ).fetchone()
    conn.close()
    if row is None:
        raise SnapshotNotFoundError(snapshot_id)
    return _detail_from_row(root, row)


def delete_table_snapshot(root: Path, snapshot_id: str) -> bool:
    conn = initialize_database(root)
    with conn:
        cursor = conn.execute("delete from table_snapshots where id = ?", (snapshot_id,))
    conn.close()
    return cursor.rowcount > 0


def restore_table_snapshot(root: Path, snapshot_id: str) -> TableSnapshotRestoreResult:
    snapshot = get_table_snapshot(root, snapshot_id)
    state = state_from_payload(root, state_payload(snapshot.state))

    display = restore_display_state(root, state.display)
    map_state = restore_map_state(root, state.map)
    workspace = restore_workspace_state(
        root,
        state.workspace.workspace_id,
        state.workspace.tabs,
        state.workspace.activePath,
        state.workspace.layout,
    )
    restored_snapshot = TableSnapshotDetail(
        id=snapshot.id,
        name=snapshot.name,
        updated_at=snapshot.updated_at,
        state=state,
    )
    return TableSnapshotRestoreResult(
        snapshot=restored_snapshot,
        display=display,
        map=map_state,
        workspace=workspace,
        audio=state.audio,
    )


def current_table_snapshot_state(root: Path, audio: object) -> dict[str, object]:
    from app.core.display import load_display_state
    from app.core.map import load_map_state

    return current_snapshot_state_payload(
        load_display_state(root),
        load_map_state(root),
        load_workspace(root),
        audio,
    )
