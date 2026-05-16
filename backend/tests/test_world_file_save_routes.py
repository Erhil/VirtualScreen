from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def file_payload(client: TestClient, path: str, content: str) -> dict[str, str]:
    current = client.get("/api/world/file", params={"path": path}).json()
    return {
        "content": content,
        "expected_modified_at": current["modified_at"],
        "expected_hash": current["hash"],
    }


def test_saves_markdown_with_matching_hash_and_mtime(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    client = make_client(world)
    payload = file_payload(client, "README.md", "# Updated\n\nNew body.")

    response = client.put(
        "/api/world/file",
        params={"path": "README.md"},
        json=payload,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["content"] == "# Updated\n\nNew body."
    assert body["hash"] != payload["expected_hash"]
    assert (world / "README.md").read_text(encoding="utf-8") == "# Updated\n\nNew body."
    assert body["backup_path"].endswith("README.md")


def test_saves_csv_with_matching_hash_and_mtime(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "table.csv").write_text("roll,event\n1,Rain\n", encoding="utf-8")
    client = make_client(world)

    response = client.put(
        "/api/world/file",
        params={"path": "table.csv"},
        json=file_payload(client, "table.csv", "roll,event\n1,Fog\n"),
    )

    assert response.status_code == 200
    assert response.json()["content"] == "roll,event\n1,Fog\n"
    assert (world / "table.csv").read_text(encoding="utf-8") == "roll,event\n1,Fog\n"


def test_saves_dms_with_matching_hash_and_mtime(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "hello.dms").write_text("render_md('# Hello')\n", encoding="utf-8")
    client = make_client(world)

    response = client.put(
        "/api/world/file",
        params={"path": "hello.dms"},
        json=file_payload(client, "hello.dms", "render_md('# Updated')\n"),
    )

    assert response.status_code == 200
    assert response.json()["media_kind"] == "script"
    assert response.json()["content"] == "render_md('# Updated')\n"
    assert (world / "hello.dms").read_text(encoding="utf-8") == "render_md('# Updated')\n"


def test_save_creates_backup_before_replacement(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Original\n", encoding="utf-8")
    client = make_client(world)

    response = client.put(
        "/api/world/file",
        params={"path": "README.md"},
        json=file_payload(client, "README.md", "# Updated\n"),
    )

    assert response.status_code == 200
    backup_path = world / response.json()["backup_path"]
    assert backup_path.exists()
    assert backup_path.read_text(encoding="utf-8") == "# Original\n"


def test_stale_hash_returns_409(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    note = world / "README.md"
    note.write_text("# Home\n", encoding="utf-8")
    client = make_client(world)
    payload = file_payload(client, "README.md", "# Updated\n")
    note.write_text("# External change\n", encoding="utf-8")

    response = client.put("/api/world/file", params={"path": "README.md"}, json=payload)

    assert response.status_code == 409
    assert response.json()["detail"] == "World file changed on disk."


def test_stale_mtime_returns_409(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    client = make_client(world)
    payload = file_payload(client, "README.md", "# Updated\n")
    payload["expected_modified_at"] = "2000-01-01T00:00:00Z"

    response = client.put("/api/world/file", params={"path": "README.md"}, json=payload)

    assert response.status_code == 409


def test_save_rejects_missing_file(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.put(
        "/api/world/file",
        params={"path": "missing.md"},
        json={
            "content": "# Missing",
            "expected_modified_at": "2026-01-01T00:00:00Z",
            "expected_hash": "x",
        },
    )

    assert response.status_code == 404


def test_save_rejects_directory_and_traversal(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)
    payload = {
        "content": "# Home",
        "expected_modified_at": "2026-01-01T00:00:00Z",
        "expected_hash": "x",
    }

    directory_response = client.put("/api/world/file", params={"path": "."}, json=payload)
    traversal_response = client.put("/api/world/file", params={"path": "../x.md"}, json=payload)

    assert directory_response.status_code == 400
    assert traversal_response.status_code == 400


def test_save_rejects_unsupported_binary(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "roll.bin").write_bytes(b"\x00\x01")
    client = make_client(world)

    response = client.put(
        "/api/world/file",
        params={"path": "roll.bin"},
        json={
            "content": "x",
            "expected_modified_at": "2026-01-01T00:00:00Z",
            "expected_hash": "x",
        },
    )

    assert response.status_code == 415
