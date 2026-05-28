import json
from email.parser import BytesParser
from email.policy import default
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.core.config import Settings, get_settings
from app.core.events import queue_world_event
from app.core.index import refresh_index_for_paths
from app.core.system_packs import (
    MAX_ZIP_BYTES,
    SystemPackError,
    import_response,
    import_system_pack,
    plan_response,
    plan_system_pack,
)

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


async def _read_multipart_upload(request: Request) -> tuple[bytes, dict[str, str]]:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type:
        raise HTTPException(
            status_code=415,
            detail="System pack upload must be multipart form data.",
        )
    content_length = request.headers.get("content-length")
    if content_length is None:
        raise HTTPException(status_code=411, detail="System pack upload requires Content-Length.")
    try:
        content_length_value = int(content_length)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Content-Length must be an integer.") from exc
    if content_length_value <= 0:
        raise HTTPException(status_code=400, detail="Content-Length must be positive.")
    if content_length_value > MAX_ZIP_BYTES + 1024 * 1024:
        raise HTTPException(status_code=413, detail="System pack upload is too large.")
    raw_body = await request.body()
    message = BytesParser(policy=default).parsebytes(
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode()
        + raw_body
    )

    fields: dict[str, str] = {}
    zip_content: bytes | None = None
    zip_filename = ""
    for part in message.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if not name:
            continue
        payload = part.get_payload(decode=True) or b""
        filename = part.get_param("filename", header="content-disposition")
        if name in {"file", "pack"}:
            zip_content = payload
            zip_filename = filename or ""
        else:
            fields[name] = payload.decode("utf-8")

    if zip_content is None or not zip_filename.lower().endswith(".zip"):
        raise HTTPException(status_code=415, detail="System pack upload must be a .zip file.")
    return zip_content, fields


def _read_decisions(fields: dict[str, str]) -> dict[str, dict[str, str | None]]:
    raw_decisions = fields.get("decisions")
    if not raw_decisions:
        return {}
    try:
        loaded = json.loads(raw_decisions)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="decisions must be JSON.") from exc
    if not isinstance(loaded, list):
        raise HTTPException(status_code=422, detail="decisions must be a JSON array.")

    decisions: dict[str, dict[str, str | None]] = {}
    for item in loaded:
        if not isinstance(item, dict):
            raise HTTPException(status_code=422, detail="decisions entries must be objects.")
        target_path = item.get("target_path")
        decision = item.get("decision")
        rename_target_path = item.get("rename_target_path")
        if not isinstance(target_path, str) or not isinstance(decision, str):
            raise HTTPException(
                status_code=422,
                detail="decisions entries require target_path and decision strings.",
            )
        if rename_target_path is not None and not isinstance(rename_target_path, str):
            raise HTTPException(status_code=422, detail="rename_target_path must be a string.")
        if decision == "replace":
            decision = "overwrite"
        decisions[target_path] = {
            "decision": decision,
            "rename_target_path": rename_target_path,
        }
    return decisions


@router.post("/system-packs/preview")
async def preview_system_pack(
    request: Request,
    settings: SettingsDep,
) -> dict[str, object]:
    content, _ = await _read_multipart_upload(request)
    try:
        plan = plan_system_pack(settings.resolved_world_root, content)
    except SystemPackError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return plan_response(plan)


@router.post("/system-packs/import")
async def import_system_pack_route(
    request: Request,
    background_tasks: BackgroundTasks,
    settings: SettingsDep,
) -> dict[str, object]:
    content, fields = await _read_multipart_upload(request)
    try:
        result = import_system_pack(
            settings.resolved_world_root,
            content,
            _read_decisions(fields),
        )
    except SystemPackError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    if result.imported:
        rebuild_result = refresh_index_for_paths(
            settings.resolved_world_root,
            changed_paths=result.paths,
        )
        queue_world_event(
            background_tasks,
            rebuild_result,
            paths=result.paths,
            deleted_paths=[],
            reason="created",
        )
    return import_response(result)
