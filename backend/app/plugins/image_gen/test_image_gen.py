from __future__ import annotations

import json
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.core.config import get_settings
from app.main import create_app
from app.plugins.image_gen import plugin as image_gen_plugin
from app.plugins.image_gen.plugin import DEFAULT_BASE_URL, ImageGenSettings


@pytest.fixture(autouse=True)
def clear_cached_settings() -> Iterator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
    *,
    url: str | None = None,
    token: str | None = None,
    model: str | None = None,
) -> TestClient:
    world = tmp_path / "world"
    world.mkdir(parents=True, exist_ok=True)
    (world / "README.md").write_text("# Home", encoding="utf-8")
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")

    # Set all three every time rather than deleting the unused ones: the plugin also reads
    # the repo `.env`, so an unset variable would let the developer's own configuration
    # decide what these tests see. The environment wins over the file.
    monkeypatch.setenv(image_gen_plugin.ENV_URL, url if url is not None else DEFAULT_BASE_URL)
    monkeypatch.setenv(image_gen_plugin.ENV_TOKEN, token if token is not None else "")
    monkeypatch.setenv(image_gen_plugin.ENV_MODEL, model if model is not None else "")

    get_settings.cache_clear()
    return TestClient(create_app())


def install_transport(
    monkeypatch: MonkeyPatch,
    handler: Callable[[httpx.Request], httpx.Response],
) -> None:
    """Stub the outbound httpx layer with a MockTransport, composed with AsyncClient.

    Patches the module-level `_client` builder rather than `httpx.AsyncClient` itself,
    so the real httpx module is never touched.
    """

    def fake_client(
        runtime: image_gen_plugin.ImageGenRuntime,
        *,
        read_timeout: float = image_gen_plugin.READ_TIMEOUT_SECONDS,
    ) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            transport=httpx.MockTransport(handler),
            base_url=runtime.base_url,
            headers=runtime.headers(),
        )

    monkeypatch.setattr(image_gen_plugin, "_client", fake_client)


def unreachable_handler(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("Connection refused", request=request)


# ---------------------------------------------------------------------------
# config
# ---------------------------------------------------------------------------


def test_config_reports_defaults_without_token(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/config")

    assert response.status_code == 200
    assert response.json() == {
        "base_url": "http://127.0.0.1:8000",
        "model": "",
        "has_token": False,
    }


def test_config_strips_one_trailing_slash_and_hides_token(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    client = make_client(
        tmp_path,
        monkeypatch,
        url="http://sdxl.local:9000/",
        token="secret-token",
        model="sdxl_base",
    )

    response = client.get("/api/plugins/image-gen/config")

    assert response.status_code == 200
    assert response.json() == {
        "base_url": "http://sdxl.local:9000",
        "model": "sdxl_base",
        "has_token": True,
    }
    assert "secret-token" not in response.text


# ---------------------------------------------------------------------------
# generate
# ---------------------------------------------------------------------------


def test_generate_forwards_full_body_with_caller_values_mapped(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["path"] = request.url.path
        captured["body"] = json.loads(request.content)
        captured["headers"] = dict(request.headers)
        return httpx.Response(
            200,
            json={
                "task_id": "task-123",
                "status": "queued",
                "message": "queued",
                "queue_position": 1,
            },
        )

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch, url="http://sdxl.local:9000", token="secret-token")

    response = client.post(
        "/api/plugins/image-gen/generate",
        json={
            "prompt": "a dragon",
            "neg_prompt": "blurry",
            "model_name": "sdxl\\dvine_v108.safetensors",
            "width": 768,
            "height": 512,
            "n_steps": 40,
            "guidance_scale": 7.5,
            "seed": 42,
            "batch_size": 2,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"task_id": "task-123"}
    assert captured["method"] == "POST"
    assert captured["path"] == "/api/generate"
    assert captured["headers"]["authorization"] == "Bearer secret-token"
    assert captured["body"] == {
        "batch_size": 2,
        "clip_skip": False,
        "control_image_url": None,
        "control_model": None,
        "control_type": None,
        "control_weight": None,
        "eta": 0,
        "guidance_scale": 7.5,
        "height": 512,
        "init_image_url": None,
        "lora_config": None,
        "model_name": "sdxl\\dvine_v108.safetensors",
        "n_steps": 40,
        "neg_prompt": "blurry",
        "neg_prompt2": "",
        "num_iterations": 1,
        "pipeline_type": "txt2img",
        "preprocess_mode": "resize",
        "prompt": "a dragon",
        "prompt2": "",
        "reference_image_url": None,
        "reference_weight": None,
        "scheduler": "euler_a",
        "seed": 42,
        "source_task_id": None,
        "strength": 0.75,
        "vae_name": None,
        "width": 768,
    }


def test_generate_rejects_blank_prompt(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/generate",
        json={"prompt": "   ", "model_name": "sdxl_base"},
    )

    assert response.status_code == 400
    assert response.json()["detail"]


def test_generate_rejects_blank_model_name(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/generate",
        json={"prompt": "a dragon", "model_name": "   "},
    )

    assert response.status_code == 400
    assert response.json()["detail"]


def test_generate_reports_unreachable_service_with_base_url(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    install_transport(monkeypatch, unreachable_handler)
    client = make_client(tmp_path, monkeypatch, url="http://sdxl.local:9000")

    response = client.post(
        "/api/plugins/image-gen/generate",
        json={"prompt": "a dragon", "model_name": "sdxl_base"},
    )

    assert response.status_code == 502
    assert "http://sdxl.local:9000" in response.json()["detail"]


def test_generate_reports_wrong_token_on_401(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": "unauthorized"})

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch, url="http://sdxl.local:9000", token="wrong")

    response = client.post(
        "/api/plugins/image-gen/generate",
        json={"prompt": "a dragon", "model_name": "sdxl_base"},
    )

    assert response.status_code == 502
    assert "token" in response.json()["detail"]


def test_generate_quotes_upstream_detail_on_4xx(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"detail": "model failed to load"})

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/generate",
        json={"prompt": "a dragon", "model_name": "sdxl_base"},
    )

    assert response.status_code == 502
    assert "model failed to load" in response.json()["detail"]


# ---------------------------------------------------------------------------
# tasks
# ---------------------------------------------------------------------------


def test_task_completed_maps_result_images_to_bare_filenames(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/tasks/task-123"
        return httpx.Response(
            200,
            json={
                "id": "task-123",
                "type": "generate",
                "status": "completed",
                "progress": 100,
                "message": "done",
                "result": {
                    "task_id": "task-123",
                    "status": "completed",
                    "images": [
                        {"index": 0, "filename": "out-0.jpg", "image_url": "/images/out-0.jpg"},
                        {"index": 1, "filename": "out-1.jpg", "image_url": "/images/out-1.jpg"},
                    ],
                    "image_url": "/images/out-0.jpg",
                },
                "error": None,
                "created_at": "2026-01-01T00:00:00Z",
            },
        )

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/tasks/task-123")

    assert response.status_code == 200
    assert response.json() == {
        "status": "completed",
        "progress": 100,
        "message": "done",
        "images": ["out-0.jpg", "out-1.jpg"],
        "error": None,
    }


def test_task_failed_surfaces_the_error_and_no_images(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "id": "task-999",
                "type": "generate",
                "status": "failed",
                "progress": 40,
                "message": None,
                "result": None,
                "error": "CUDA out of memory",
                "created_at": "2026-01-01T00:00:00Z",
            },
        )

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/tasks/task-999")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["error"] == "CUDA out of memory"
    assert body["images"] == []


# ---------------------------------------------------------------------------
# hostile filenames (unit-level - see preview/save sections below for HTTP-level coverage)
# ---------------------------------------------------------------------------


def test_reject_hostile_filename_covers_all_categories() -> None:
    for hostile_filename in ("../escape.jpg", "sub/dir.jpg", "sub\\dir.jpg", "C:evil.jpg", ""):
        with pytest.raises(HTTPException) as exc_info:
            image_gen_plugin._reject_hostile_filename(hostile_filename)
        assert exc_info.value.status_code == 400


def test_reject_hostile_filename_accepts_a_plain_filename() -> None:
    image_gen_plugin._reject_hostile_filename("out-0.jpg")  # must not raise


# ---------------------------------------------------------------------------
# preview
# ---------------------------------------------------------------------------


def test_preview_streams_image_bytes_with_upstream_content_type(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/images/out-0.png"
        return httpx.Response(200, content=b"pngdata", headers={"content-type": "image/png"})

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/preview/out-0.png")

    assert response.status_code == 200
    assert response.content == b"pngdata"
    assert response.headers["content-type"] == "image/png"


def test_preview_rejects_hostile_filenames_over_http(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("must not reach the upstream service")

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    # A raw "/" can never reach a single-segment {filename} route at all - Starlette 404s
    # at the routing layer before our handler runs, which is itself a safe outcome (see
    # test_reject_hostile_filename_covers_all_categories for that case exercised directly).
    # These three values contain no "/" so they *do* reach the handler, exercising the
    # backslash-separator, drive-letter-colon, and embedded ".." checks over real HTTP.
    for hostile_filename in ("sub\\dir.jpg", "C:evil.jpg", "..evil.jpg"):
        response = client.get(
            f"/api/plugins/image-gen/preview/{quote(hostile_filename, safe='')}"
        )
        assert response.status_code == 400, hostile_filename


def test_preview_reports_unreachable_service(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    install_transport(monkeypatch, unreachable_handler)
    client = make_client(tmp_path, monkeypatch, url="http://sdxl.local:9000")

    response = client.get("/api/plugins/image-gen/preview/out-0.jpg")

    assert response.status_code == 502
    assert "http://sdxl.local:9000" in response.json()["detail"]


# ---------------------------------------------------------------------------
# save
# ---------------------------------------------------------------------------


def test_save_rejects_hostile_filenames_over_http(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("must not reach the upstream service")

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    hostile_filenames = (
        "../escape.jpg",
        "/etc/passwd",
        "sub/dir.jpg",
        "sub\\dir.jpg",
        "C:evil.jpg",
    )
    for hostile_filename in hostile_filenames:
        response = client.post(
            "/api/plugins/image-gen/save",
            json={"filename": hostile_filename, "path": "npcs/portrait"},
        )
        assert response.status_code == 400, hostile_filename


def test_save_rejects_a_path_that_escapes_the_world_root(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("must not reach the upstream service")

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/save",
        json={"filename": "out-0.jpg", "path": "../outside.jpg"},
    )

    assert response.status_code == 400


def test_save_writes_into_the_world_and_returns_relative_path(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    image_bytes = b"\xff\xd8\xff\xd9fakejpegbytes"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/images/out-0.jpg"
        return httpx.Response(200, content=image_bytes, headers={"content-type": "image/jpeg"})

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/save",
        json={"filename": "out-0.jpg", "path": "npcs/goblin.jpg"},
    )

    assert response.status_code == 200
    assert response.json() == {"path": "npcs/goblin.jpg"}
    saved_file = tmp_path / "world" / "npcs" / "goblin.jpg"
    assert saved_file.read_bytes() == image_bytes


def test_save_a_second_time_to_the_same_path_is_a_conflict(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"data", headers={"content-type": "image/jpeg"})

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    first = client.post(
        "/api/plugins/image-gen/save",
        json={"filename": "out-0.jpg", "path": "npcs/goblin.jpg"},
    )
    second = client.post(
        "/api/plugins/image-gen/save",
        json={"filename": "out-0.jpg", "path": "npcs/goblin.jpg"},
    )

    assert first.status_code == 200
    assert second.status_code == 409


def test_save_appends_jpg_when_destination_has_no_image_suffix(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"data", headers={"content-type": "image/jpeg"})

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/save",
        json={"filename": "out-0.jpg", "path": "npcs/goblin"},
    )

    assert response.status_code == 200
    assert response.json() == {"path": "npcs/goblin.jpg"}
    assert (tmp_path / "world" / "npcs" / "goblin.jpg").exists()


# ---------------------------------------------------------------------------
# models
# ---------------------------------------------------------------------------


def test_models_accepts_a_bare_list_of_strings(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=["sdxl\\dvine_v108.safetensors", "anime_v3.safetensors"])

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/models")

    assert response.status_code == 200
    assert response.json() == {
        "models": ["sdxl\\dvine_v108.safetensors", "anime_v3.safetensors"]
    }


def test_models_accepts_an_object_with_a_models_key_of_name_or_filename_objects(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"models": [{"name": "sdxl_base"}, {"filename": "sdxl_refiner.safetensors"}]},
        )

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/models")

    assert response.status_code == 200
    assert response.json() == {"models": ["sdxl_base", "sdxl_refiner.safetensors"]}


def test_models_returns_an_empty_list_for_a_shape_it_cannot_interpret(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": "shape"})

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/models")

    assert response.status_code == 200
    assert response.json() == {"models": []}


def test_models_reports_unreachable_service(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    install_transport(monkeypatch, unreachable_handler)
    client = make_client(tmp_path, monkeypatch, url="http://sdxl.local:9000")

    response = client.get("/api/plugins/image-gen/models")

    assert response.status_code == 502
    assert "http://sdxl.local:9000" in response.json()["detail"]


def test_models_says_so_when_the_answer_is_not_json(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>Router login</html>")

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch, url="http://sdxl.local:9000")

    response = client.get("/api/plugins/image-gen/models")

    # An empty dropdown is what a wrong port used to look like, with nothing to diagnose.
    assert response.status_code == 502
    assert "http://sdxl.local:9000" in response.json()["detail"]


def test_task_progress_survives_being_reported_as_a_float(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        # The upstream initialises progress to 0.0 and finishes at 100.0, so every real
        # value is a float; an int-only guard threw all of them away.
        return httpx.Response(
            200,
            json={"id": "t", "status": "processing", "progress": 42.5, "result": None},
        )

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/tasks/t")

    assert response.status_code == 200
    assert response.json()["progress"] == 42.5


@pytest.mark.parametrize(
    "world_path",
    [
        ".virtualscreen/backups/pwned.jpg",
        ".virtualscreen/card-templates/evil.jpg",
        ".music/hidden.jpg",
        ".git/hooks/x.jpg",
        "__pycache__/x.jpg",
        "",
    ],
)
def test_save_refuses_the_world_management_namespace(
    tmp_path: Path, monkeypatch: MonkeyPatch, world_path: str
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("the image must not even be fetched for a rejected path")

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/save",
        json={"filename": "out-0.jpg", "path": world_path},
    )

    # .virtualscreen holds the index, the trash and the backups: a file landing there
    # shows up in the DM's own Trash panel as something they deleted.
    assert response.status_code == 400


@pytest.mark.parametrize(
    ("status_code", "headers", "body"),
    [
        (200, {"content-type": "text/html; charset=utf-8"}, b"<html>Router login</html>"),
        (200, {"content-type": "image/jpeg"}, b""),
        (204, {}, b""),
    ],
)
def test_save_refuses_a_response_that_is_not_an_image(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
    status_code: int,
    headers: dict[str, str],
    body: bytes,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, content=body, headers=headers)

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/plugins/image-gen/save",
        json={"filename": "out-0.jpg", "path": "npcs/goblin.jpg"},
    )

    # Reporting "Saved" while writing a login page into the world surfaces as a broken
    # picture on the player screen, mid-session.
    assert response.status_code == 502
    assert not (tmp_path / "world" / "npcs" / "goblin.jpg").exists()


def test_preview_refuses_a_response_that_is_not_an_image(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, content=b"<html>Router login</html>", headers={"content-type": "text/html"}
        )

    install_transport(monkeypatch, handler)
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/plugins/image-gen/preview/out-0.jpg")

    # Echoing the upstream type verbatim would render HTML on the console's own origin.
    assert response.status_code == 502


def clear_image_gen_env(monkeypatch: MonkeyPatch) -> None:
    for key in (image_gen_plugin.ENV_URL, image_gen_plugin.ENV_TOKEN, image_gen_plugin.ENV_MODEL):
        monkeypatch.delenv(key, raising=False)


def test_settings_fall_back_to_the_documented_defaults(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    clear_image_gen_env(monkeypatch)
    # `.env` is resolved against the working directory, so move somewhere without one
    # rather than letting the developer's own file decide what this asserts.
    monkeypatch.chdir(tmp_path)

    settings = ImageGenSettings()

    assert settings.url == DEFAULT_BASE_URL
    assert settings.token == ""
    assert settings.model == ""


def test_settings_are_read_from_a_dotenv_file(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    clear_image_gen_env(monkeypatch)
    (tmp_path / ".env").write_text(
        "VIRTUALSCREEN_IMAGE_GEN_URL=http://sdxl.local:8337\n"
        "VIRTUALSCREEN_IMAGE_GEN_MODEL=sdxl\\dvine_v108.safetensors\n",
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    # Neither dev.ps1 nor start-appliance.ps1 exports arbitrary keys out of .env, so
    # reading only os.environ would silently ignore the obvious place to configure this.
    settings = ImageGenSettings()

    assert settings.url == "http://sdxl.local:8337"
    assert settings.model == "sdxl\\dvine_v108.safetensors"
