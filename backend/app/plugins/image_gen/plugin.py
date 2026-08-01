"""Image Gen plugin.

A thin, typed proxy in front of a separate SDXL image-generation service the user runs
alongside VirtualScreen. The DM console must never talk to that service directly: the
console is often opened from a tablet over a VPN that cannot reach it, and the service's
token must stay server-side.

Configuration is read from the environment at *request* time (not import time) so tests
can monkeypatch it and so a running backend picks up an updated `.env` on restart without
code changes:

  VIRTUALSCREEN_IMAGE_GEN_URL    default "http://127.0.0.1:8000"
  VIRTUALSCREEN_IMAGE_GEN_TOKEN  default ""
  VIRTUALSCREEN_IMAGE_GEN_MODEL  default ""
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Annotated, Any
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings
from app.core.file_safety import atomic_write_bytes
from app.core.paths import (
    WorldPathError,
    ensure_no_reserved_path_parts,
    normalize_relative_path,
    resolve_under_root,
)
from app.core.plugins import BackendPlugin

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]

ENV_URL = "VIRTUALSCREEN_IMAGE_GEN_URL"
ENV_TOKEN = "VIRTUALSCREEN_IMAGE_GEN_TOKEN"
ENV_MODEL = "VIRTUALSCREEN_IMAGE_GEN_MODEL"
DEFAULT_BASE_URL = "http://127.0.0.1:8000"

# Generation is slow and polled repeatedly, so JSON calls get a generous read timeout;
# the connect timeout stays short so an unreachable host fails fast instead of hanging
# the console. Downloading the finished image may take longer still.
CONNECT_TIMEOUT_SECONDS = 5.0
READ_TIMEOUT_SECONDS = 30.0
DOWNLOAD_TIMEOUT_SECONDS = 120.0

IMAGE_SUFFIXES = (".jpg", ".jpeg", ".png")


@dataclass(frozen=True)
class ImageGenRuntime:
    base_url: str
    token: str
    model: str

    @property
    def has_token(self) -> bool:
        return bool(self.token)

    def headers(self) -> dict[str, str]:
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}


def _resolve_runtime() -> ImageGenRuntime:
    """Read the upstream service's configuration from the environment.

    Read at request time (not module import time) so tests can monkeypatch the
    environment and so a running server picks up a changed `.env` on restart.
    """

    base_url = os.environ.get(ENV_URL, DEFAULT_BASE_URL).strip() or DEFAULT_BASE_URL
    if base_url.endswith("/"):
        base_url = base_url[:-1]
    token = os.environ.get(ENV_TOKEN, "").strip()
    model = os.environ.get(ENV_MODEL, "").strip()
    return ImageGenRuntime(base_url=base_url, token=token, model=model)


def _client(
    runtime: ImageGenRuntime, *, read_timeout: float = READ_TIMEOUT_SECONDS
) -> httpx.AsyncClient:
    timeout = httpx.Timeout(
        connect=CONNECT_TIMEOUT_SECONDS,
        read=read_timeout,
        write=read_timeout,
        pool=read_timeout,
    )
    return httpx.AsyncClient(base_url=runtime.base_url, timeout=timeout, headers=runtime.headers())


def _unreachable_error(runtime: ImageGenRuntime) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=f"Could not reach the image service at {runtime.base_url}. Is it running?",
    )


def _upstream_message(response: httpx.Response) -> str | None:
    try:
        data = response.json()
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    for key in ("detail", "error", "message"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


async def _request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    runtime: ImageGenRuntime,
    **kwargs: Any,
) -> httpx.Response:
    try:
        response = await client.request(method, url, **kwargs)
    except httpx.RequestError as exc:
        raise _unreachable_error(runtime) from exc

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=502,
            detail=(
                f"The image service at {runtime.base_url} rejected the request: "
                "the token is missing or wrong."
            ),
        )
    if response.status_code >= 400:
        message = _upstream_message(response)
        detail = (
            f"The image service returned an error ({response.status_code}): {message}"
            if message
            else f"The image service returned an error ({response.status_code})."
        )
        raise HTTPException(status_code=502, detail=detail)
    return response


def _reject_hostile_filename(filename: str) -> None:
    if not filename or "/" in filename or "\\" in filename or ".." in filename or ":" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")


def _reject_management_path(relative_path: str) -> None:
    if relative_path == "" or relative_path.split("/")[0] in {".virtualscreen", ".music"}:
        raise WorldPathError("World management path is not allowed.")
    ensure_no_reserved_path_parts(relative_path, message="World management path is not allowed.")


def _require_image_response(response: httpx.Response) -> None:
    """Refuse anything that is not actually an image.

    A 2xx is not proof: point the base url at a captive portal or a proxy and the
    "image" comes back as a login page, or as an empty body after a redirect httpx does
    not follow. Written to the world unchecked, that surfaces as a broken picture on the
    player screen, mid-session, having reported success.
    """

    content_type = response.headers.get("content-type", "")
    if not content_type.split(";")[0].strip().lower().startswith("image/"):
        raise HTTPException(
            status_code=502,
            detail=(
                "The image service returned something that is not an image "
                f"(content type: {content_type or 'none'})."
            ),
        )
    if not response.content:
        raise HTTPException(status_code=502, detail="The image service returned an empty image.")


def _with_image_suffix(path: str) -> str:
    if path.lower().endswith(IMAGE_SUFFIXES):
        return path
    return f"{path}.jpg"


def _extract_model_names(data: Any) -> list[str]:
    items: list[Any] | None = None
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        maybe_items = data.get("models")
        if isinstance(maybe_items, list):
            items = maybe_items

    if items is None:
        return []

    names: list[str] = []
    for item in items:
        if isinstance(item, str):
            if item:
                names.append(item)
        elif isinstance(item, dict):
            for key in ("name", "filename"):
                value = item.get(key)
                if isinstance(value, str) and value:
                    names.append(value)
                    break
    return names


class ImageGenConfigResponse(BaseModel):
    base_url: str
    model: str
    has_token: bool


class ImageGenModelsResponse(BaseModel):
    models: list[str]


class ImageGenGenerateRequest(BaseModel):
    prompt: str
    neg_prompt: str = ""
    model_name: str
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)
    n_steps: int = Field(default=30, ge=1, le=100)
    guidance_scale: float = Field(default=4.0, ge=0, le=20)
    seed: int = -1
    batch_size: int = Field(default=1, ge=1, le=4)


class ImageGenGenerateResponse(BaseModel):
    task_id: str


class ImageGenTaskResponse(BaseModel):
    status: str
    # The upstream carries progress as a float (0.0 - 100.0). Typing this `int` made
    # pydantic reject every real value and the bar sat empty for the whole generation.
    progress: float
    message: str | None = None
    images: list[str] = Field(default_factory=list)
    error: str | None = None


class ImageGenSaveRequest(BaseModel):
    filename: str
    path: str


class ImageGenSaveResponse(BaseModel):
    path: str


@router.get("/plugins/image-gen/config", response_model=ImageGenConfigResponse)
def image_gen_config() -> ImageGenConfigResponse:
    runtime = _resolve_runtime()
    return ImageGenConfigResponse(
        base_url=runtime.base_url,
        model=runtime.model,
        has_token=runtime.has_token,
    )


@router.get("/plugins/image-gen/models", response_model=ImageGenModelsResponse)
async def image_gen_models() -> ImageGenModelsResponse:
    runtime = _resolve_runtime()
    async with _client(runtime) as client:
        response = await _request(client, "GET", "/api/models", runtime)

    try:
        data = response.json()
    except ValueError as exc:
        # An empty dropdown with no explanation is what a wrong port looks like, so say so.
        raise HTTPException(
            status_code=502,
            detail=(
                f"{runtime.base_url} answered, but not with JSON. "
                "Is that really the image service?"
            ),
        ) from exc
    return ImageGenModelsResponse(models=_extract_model_names(data))


@router.post("/plugins/image-gen/generate", response_model=ImageGenGenerateResponse)
async def image_gen_generate(payload: ImageGenGenerateRequest) -> ImageGenGenerateResponse:
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")
    model_name = payload.model_name.strip()
    if not model_name:
        raise HTTPException(status_code=400, detail="A model must be selected.")

    runtime = _resolve_runtime()
    body: dict[str, Any] = {
        "batch_size": payload.batch_size,
        "clip_skip": False,
        "control_image_url": None,
        "control_model": None,
        "control_type": None,
        "control_weight": None,
        "eta": 0,
        "guidance_scale": payload.guidance_scale,
        "height": payload.height,
        "init_image_url": None,
        "lora_config": None,
        "model_name": model_name,
        "n_steps": payload.n_steps,
        "neg_prompt": payload.neg_prompt,
        "neg_prompt2": "",
        "num_iterations": 1,
        "pipeline_type": "txt2img",
        "preprocess_mode": "resize",
        "prompt": prompt,
        "prompt2": "",
        "reference_image_url": None,
        "reference_weight": None,
        "scheduler": "euler_a",
        "seed": payload.seed,
        "source_task_id": None,
        "strength": 0.75,
        "vae_name": None,
        "width": payload.width,
    }

    async with _client(runtime) as client:
        response = await _request(client, "POST", "/api/generate", runtime, json=body)

    try:
        data = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502, detail="The image service returned an invalid response."
        ) from exc

    task_id = data.get("task_id") if isinstance(data, dict) else None
    if not isinstance(task_id, str) or not task_id:
        raise HTTPException(
            status_code=502, detail="The image service did not return a task id."
        )
    return ImageGenGenerateResponse(task_id=task_id)


@router.get("/plugins/image-gen/tasks/{task_id}", response_model=ImageGenTaskResponse)
async def image_gen_task(task_id: str) -> ImageGenTaskResponse:
    runtime = _resolve_runtime()
    async with _client(runtime) as client:
        response = await _request(client, "GET", f"/api/tasks/{task_id}", runtime)

    try:
        data = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502, detail="The image service returned an invalid response."
        ) from exc
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=502, detail="The image service returned an invalid response."
        )

    status = data.get("status")
    if not isinstance(status, str) or not status:
        raise HTTPException(status_code=502, detail="The image service returned no task status.")

    progress_raw = data.get("progress")
    progress = 0.0
    if isinstance(progress_raw, (int, float)) and not isinstance(progress_raw, bool):
        progress = float(progress_raw)
    message = data.get("message") if isinstance(data.get("message"), str) else None
    error = data.get("error") if isinstance(data.get("error"), str) else None

    images: list[str] = []
    result = data.get("result")
    if isinstance(result, dict):
        raw_images = result.get("images")
        if isinstance(raw_images, list):
            for item in raw_images:
                if isinstance(item, dict):
                    filename = item.get("filename")
                    if isinstance(filename, str) and filename:
                        images.append(filename)

    return ImageGenTaskResponse(
        status=status,
        progress=progress,
        message=message,
        images=images,
        error=error,
    )


@router.get("/plugins/image-gen/preview/{filename}")
async def image_gen_preview(filename: str) -> Response:
    _reject_hostile_filename(filename)
    runtime = _resolve_runtime()
    async with _client(runtime, read_timeout=DOWNLOAD_TIMEOUT_SECONDS) as client:
        response = await _request(client, "GET", f"/images/{quote(filename, safe='')}", runtime)

    # Echoing the upstream content type verbatim would let a login page render as HTML
    # on the console's own origin, which holds the session cookie.
    _require_image_response(response)
    return Response(content=response.content, media_type=response.headers["content-type"])


@router.post("/plugins/image-gen/save", response_model=ImageGenSaveResponse)
async def image_gen_save(
    payload: ImageGenSaveRequest,
    settings: SettingsDep,
) -> ImageGenSaveResponse:
    _reject_hostile_filename(payload.filename)

    try:
        # Validate what was actually asked for, before any suffix is appended: an empty
        # path would otherwise become ".jpg" and pass as an ordinary hidden file.
        requested = normalize_relative_path(payload.path)
        # Same guard every other writer in the app pairs with resolve_under_root. Staying
        # inside the world root is not enough on its own: .virtualscreen holds the index,
        # the trash and the backups, so a path landing there would show up in the DM's
        # own Trash panel as something they had deleted.
        _reject_management_path(requested)
        world_path = _with_image_suffix(requested)
        destination = resolve_under_root(settings.resolved_world_root, world_path)
    except WorldPathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if destination.exists():
        raise HTTPException(status_code=409, detail="A file already exists at that path.")

    runtime = _resolve_runtime()
    image_url = f"/images/{quote(payload.filename, safe='')}"
    async with _client(runtime, read_timeout=DOWNLOAD_TIMEOUT_SECONDS) as client:
        response = await _request(client, "GET", image_url, runtime)

    _require_image_response(response)
    destination.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_bytes(destination, response.content)

    return ImageGenSaveResponse(path=world_path)


PLUGIN = BackendPlugin(id="image-gen", router=router)
