from dataclasses import asdict
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.display import display_state_payload, queue_display_event
from app.core.map import map_state_payload, queue_map_event
from app.core.paths import WorldPathError
from app.core.table_snapshots import (
    SnapshotConflictError,
    SnapshotNotFoundError,
    TableSnapshotAudioBus,
    TableSnapshotDetail,
    TableSnapshotRestoreResult,
    TableSnapshotSummary,
    create_table_snapshot,
    delete_table_snapshot,
    get_table_snapshot,
    list_table_snapshots,
    restore_table_snapshot,
    state_payload,
)
from app.core.workspace import WorkspaceState

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class TableSnapshotCreatePayload(BaseModel):
    name: str
    state: dict[str, Any]


def _summary_response(summary: TableSnapshotSummary) -> dict[str, object]:
    return {
        "id": summary.id,
        "name": summary.name,
        "updated_at": summary.updated_at,
    }


def _snapshot_response(snapshot: TableSnapshotDetail) -> dict[str, object]:
    return {
        **_summary_response(snapshot),
        "state": state_payload(snapshot.state),
    }


def _audio_response(audio: dict[str, TableSnapshotAudioBus]) -> dict[str, object]:
    return {
        bus: {
            "track": value.track,
            "volume": value.volume,
            "loop": value.loop,
            "playing": value.playing,
        }
        for bus, value in audio.items()
    }


def _workspace_response(workspace: WorkspaceState) -> dict[str, object]:
    return {
        "workspaceId": workspace.workspaceId,
        "workspaceName": workspace.workspaceName,
        "tabs": [asdict(tab) for tab in workspace.tabs],
        "activePath": workspace.activePath,
        "layout": asdict(workspace.layout),
        "favorites": [asdict(tab) for tab in workspace.favorites],
        "recentFiles": [asdict(tab) for tab in workspace.recentFiles],
    }


def _restore_response(result: TableSnapshotRestoreResult) -> dict[str, object]:
    return {
        "snapshot": _snapshot_response(result.snapshot),
        "display": display_state_payload(result.display),
        "map": map_state_payload(result.map),
        "workspace": _workspace_response(result.workspace),
        "audio": _audio_response(result.audio),
    }


def _raise_not_found(exc: Exception) -> None:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


def _raise_bad_request(exc: Exception) -> None:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


def _raise_conflict(exc: Exception) -> None:
    raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/table-snapshots")
def table_snapshot_list(settings: SettingsDep) -> list[dict[str, object]]:
    return [
        _summary_response(snapshot)
        for snapshot in list_table_snapshots(settings.resolved_world_root)
    ]


@router.post("/table-snapshots")
def table_snapshot_create(
    payload: TableSnapshotCreatePayload,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        snapshot = create_table_snapshot(
            settings.resolved_world_root,
            payload.name,
            payload.state,
        )
    except SnapshotConflictError as exc:
        _raise_conflict(exc)
    except (FileNotFoundError, WorldPathError) as exc:
        _raise_conflict(exc)
    except ValueError as exc:
        _raise_bad_request(exc)
    return _snapshot_response(snapshot)


@router.get("/table-snapshots/{snapshot_id}")
def table_snapshot_detail(snapshot_id: str, settings: SettingsDep) -> dict[str, object]:
    try:
        snapshot = get_table_snapshot(settings.resolved_world_root, snapshot_id)
    except SnapshotNotFoundError as exc:
        _raise_not_found(exc)
    return _snapshot_response(snapshot)


@router.post("/table-snapshots/{snapshot_id}/restore")
def table_snapshot_restore(
    snapshot_id: str,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        result = restore_table_snapshot(settings.resolved_world_root, snapshot_id)
    except SnapshotNotFoundError as exc:
        _raise_not_found(exc)
    except (SnapshotConflictError, FileNotFoundError, WorldPathError) as exc:
        _raise_conflict(exc)
    except ValueError as exc:
        _raise_bad_request(exc)

    queue_display_event(background_tasks, result.display)
    queue_map_event(background_tasks, result.map, settings.resolved_world_root)
    return _restore_response(result)


@router.delete("/table-snapshots/{snapshot_id}")
def table_snapshot_delete(snapshot_id: str, settings: SettingsDep) -> dict[str, object]:
    if not delete_table_snapshot(settings.resolved_world_root, snapshot_id):
        raise HTTPException(status_code=404, detail="Table snapshot was not found.")
    return {"deleted": True}
