from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.world_library import default_worlds_root
from app.main import create_app


def make_client(world: Path, worlds_root: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
        worlds_root=worlds_root,
        watch_world=False,
    )
    return TestClient(app)


def test_default_worlds_root_uses_user_storage_folder() -> None:
    root = default_worlds_root()

    assert root.name == "worlds"
    assert "VirtualScreen" in str(root) or ".vscreen" in str(root)


def test_worlds_list_only_direct_visible_directories(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "Campaign A").mkdir(parents=True)
    (worlds_root / "Campaign B").mkdir()
    (worlds_root / ".hidden").mkdir()
    (worlds_root / "__pycache__").mkdir()
    (worlds_root / "loose.md").write_text("# Loose\n", encoding="utf-8")
    client = make_client(fallback_world, worlds_root)

    response = client.get("/api/worlds")

    assert response.status_code == 200
    body = response.json()
    assert body["worlds_root"] == str(worlds_root.resolve())
    assert [world["id"] for world in body["worlds"]] == ["Campaign A", "Campaign B"]
    assert body["current"]["path"] == str(fallback_world.resolve())


def test_opening_listed_world_changes_current_world(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    campaign = worlds_root / "Campaign A"
    campaign.mkdir(parents=True)
    (campaign / "README.md").write_text("# Campaign A\n", encoding="utf-8")
    client = make_client(fallback_world, worlds_root)

    response = client.post("/api/worlds/open", json={"id": "Campaign A"})

    assert response.status_code == 200
    body = response.json()
    assert body["current"]["id"] == "Campaign A"
    tree = client.get("/api/world/tree").json()
    assert tree["name"] == "Campaign A"
    assert tree["children"][0]["path"] == "README.md"


def test_creating_world_adds_library_folder_and_opens_it(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    worlds_root.mkdir()
    client = make_client(fallback_world, worlds_root)

    response = client.post("/api/worlds", json={"name": "New Campaign"})

    assert response.status_code == 200
    body = response.json()
    assert body["current"]["id"] == "New Campaign"
    assert [world["id"] for world in body["worlds"]] == ["New Campaign"]
    assert [world["id"] for world in body["recent"]] == ["New Campaign"]
    assert (worlds_root / "New Campaign").is_dir()
    assert client.get("/api/world/tree").json()["name"] == "New Campaign"


def test_create_world_rejects_existing_and_unsafe_names(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "Existing").mkdir(parents=True)
    client = make_client(fallback_world, worlds_root)

    assert client.post("/api/worlds", json={"name": "Existing"}).status_code == 409
    assert client.post("/api/worlds", json={"name": "../escape"}).status_code == 400
    assert client.post("/api/worlds", json={"name": ".hidden"}).status_code == 400


def test_open_rejects_traversal_and_unknown_world(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    worlds_root.mkdir()
    client = make_client(fallback_world, worlds_root)

    assert client.post("/api/worlds/open", json={"id": "../escape"}).status_code == 400
    assert client.post("/api/worlds/open", json={"id": "Missing"}).status_code == 404


def test_recent_worlds_preserve_order_and_deduplicate(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "A").mkdir(parents=True)
    (worlds_root / "B").mkdir()
    client = make_client(fallback_world, worlds_root)

    response = client.put("/api/worlds/recent", json={"recent": ["A", "B", "A", "Missing"]})

    assert response.status_code == 200
    assert [world["id"] for world in response.json()["recent"]] == ["A", "B"]
    assert [world["id"] for world in client.get("/api/worlds").json()["recent"]] == ["A", "B"]
