from pathlib import Path

import frontmatter
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def file_preconditions(client: TestClient, path: str) -> dict[str, str]:
    current = client.get("/api/world/file", params={"path": path}).json()
    return {
        "expected_modified_at": current["modified_at"],
        "expected_hash": current["hash"],
    }


def write_markdown(path: Path, metadata: dict[str, object], body: str) -> None:
    path.write_text(frontmatter.dumps(frontmatter.Post(body, **metadata)), encoding="utf-8")


def test_updates_managed_metadata_and_preserves_body_and_unknown_keys(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    note = world / "README.md"
    write_markdown(
        note,
        {
            "title": "Old Home",
            "type": "index",
            "tags": ["old"],
            "aliases": ["Start"],
            "rating": "secret",
        },
        "# Old Home\n\nBody keeps this sentence.\n",
    )
    client = make_client(world)
    preconditions = file_preconditions(client, "README.md")

    response = client.put(
        "/api/page/metadata",
        params={"path": "README.md"},
        json={
            "metadata": {
                "title": "New Home",
                "type": "session",
                "tags": ["sample", "ready"],
                "aliases": ["Home", "Landing"],
                "fields": {},
            },
            **preconditions,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["page"]["title"] == "New Home"
    assert body["page"]["page_type"] == "session"
    assert body["page"]["tags"] == ["sample", "ready"]
    assert body["page"]["aliases"] == ["Home", "Landing"]
    assert body["file"]["hash"] != preconditions["expected_hash"]
    assert body["backup_path"].endswith("README.md")

    saved = frontmatter.loads(note.read_text(encoding="utf-8"))
    assert saved.metadata["rating"] == "secret"
    assert saved.metadata["title"] == "New Home"
    assert "Body keeps this sentence." in saved.content
    assert (world / body["backup_path"]).exists()


def test_updates_custom_fields_by_replacing_fields_object(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    npcs = world / "NPCs"
    npcs.mkdir()
    note = npcs / "Captain Ilyra.md"
    write_markdown(
        note,
        {
            "title": "Captain Ilyra",
            "type": "npc",
            "tags": ["city-watch"],
            "aliases": ["Ilyra"],
            "fields": {"voice": "calm", "danger": "medium", "class": "Warrior"},
        },
        "# Captain Ilyra\n\nShe keeps the river gate.\n",
    )
    client = make_client(world)

    response = client.put(
        "/api/page/metadata",
        params={"path": "NPCs/Captain Ilyra.md"},
        json={
            "metadata": {
                "title": "Captain Ilyra",
                "type": "npc",
                "tags": ["city-watch", "ally"],
                "aliases": ["Ilyra", "Watch Captain"],
                "fields": {"voice": "formal", "mood": "tired"},
            },
            **file_preconditions(client, "NPCs/Captain Ilyra.md"),
        },
    )

    assert response.status_code == 200
    page = response.json()["page"]
    assert page["fields"] == {"voice": "formal", "mood": "tired"}
    saved = frontmatter.loads(note.read_text(encoding="utf-8"))
    assert saved.metadata["fields"] == {"voice": "formal", "mood": "tired"}
    assert "She keeps the river gate." in saved.content


def test_metadata_update_refreshes_search_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_markdown(world / "note.md", {"title": "Old Title"}, "# Old Title\n")
    client = make_client(world)

    response = client.put(
        "/api/page/metadata",
        params={"path": "note.md"},
        json={
            "metadata": {
                "title": "Indexed New Title",
                "type": None,
                "tags": ["new-tag"],
                "aliases": [],
                "fields": {},
            },
            **file_preconditions(client, "note.md"),
        },
    )

    assert response.status_code == 200
    search_response = client.get("/api/search", params={"q": "new-tag"})
    assert [result["path"] for result in search_response.json()] == ["note.md"]


def test_metadata_update_writes_sidecar_metadata_for_csv_and_media(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "table.csv").write_text("result,event\n1,[[note.md]]\n", encoding="utf-8")
    (world / "image.png").write_bytes(b"png")
    client = make_client(world)

    csv_response = client.put(
        "/api/page/metadata",
        params={"path": "table.csv"},
        json={
            "metadata": {
                "title": "Event Table",
                "type": "table",
                "tags": ["session"],
                "aliases": ["Events"],
                "fields": {"owner": "dm"},
            },
            **file_preconditions(client, "table.csv"),
        },
    )
    image_current = client.get("/api/page", params={"path": "image.png"}).json()
    image_response = client.put(
        "/api/page/metadata",
        params={"path": "image.png"},
        json={
            "metadata": {
                "title": "Harbor Map",
                "type": "map",
                "tags": ["location"],
                "aliases": [],
                "fields": {},
            },
            "expected_modified_at": image_current["modified_at"],
            "expected_hash": image_current["hash"],
        },
    )

    assert csv_response.status_code == 200
    assert csv_response.json()["page"]["title"] == "Event Table"
    assert (world / ".virtualscreen/metadata/table.csv.json").exists()
    assert image_response.status_code == 200
    assert image_response.json()["page"]["title"] == "Harbor Map"
    assert (world / ".virtualscreen/metadata/image.png.json").exists()


def test_metadata_update_accepts_frontend_csv_payload_with_optional_lists(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    tables = world / "Tables"
    tables.mkdir()
    (tables / "random-events.csv").write_text("result,event\n1,Rain\n", encoding="utf-8")
    client = make_client(world)
    preconditions = file_preconditions(client, "Tables/random-events.csv")

    response = client.put(
        "/api/page/metadata",
        params={"path": "Tables/random-events.csv"},
        json={
            "metadata": {
                "title": "Random Events",
                "type": "",
                "fields": {},
            },
            **preconditions,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["page"]["title"] == "Random Events"
    assert body["page"]["tags"] == []
    assert body["page"]["aliases"] == []
    assert (world / ".virtualscreen/metadata/Tables/random-events.csv.json").exists()


def test_page_endpoint_rebuilds_index_for_disk_added_file(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_markdown(world / "note.md", {"title": "Note"}, "# Note\n")
    client = make_client(world)
    assert client.get("/api/pages").status_code == 200
    write_markdown(world / "external.md", {"title": "External"}, "# External\n")

    response = client.get("/api/page", params={"path": "external.md"})

    assert response.status_code == 200
    assert response.json()["title"] == "External"


def test_page_endpoint_rebuilds_index_for_disk_added_unicode_file(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    npcs = world / "NPCs" / "Tavern"
    npcs.mkdir(parents=True)
    write_markdown(world / "note.md", {"title": "Note"}, "# Note\n")
    client = make_client(world)
    assert client.get("/api/pages").status_code == 200
    write_markdown(
        npcs / "Captain Ilyra — копия.md",
        {"title": "Captain Ilyra Copy"},
        "# Captain Ilyra Copy\n",
    )

    response = client.get(
        "/api/page",
        params={"path": "NPCs/Tavern/Captain Ilyra — копия.md"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Captain Ilyra Copy"


def test_metadata_update_rejects_unsafe_missing_and_stale_paths(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_markdown(world / "note.md", {"title": "Note"}, "# Note\n")
    client = make_client(world)
    payload = {
        "metadata": {
            "title": "Title",
            "type": None,
            "tags": [],
            "aliases": [],
            "fields": {},
        },
        "expected_modified_at": "2026-01-01T00:00:00Z",
        "expected_hash": "stale",
    }

    assert (
        client.put("/api/page/metadata", params={"path": "missing.md"}, json=payload).status_code
        == 404
    )
    assert (
        client.put("/api/page/metadata", params={"path": "."}, json=payload).status_code == 400
    )
    assert client.put(
        "/api/page/metadata",
        params={"path": "../secret.md"},
        json=payload,
    ).status_code == 400
    assert (
        client.put("/api/page/metadata", params={"path": "note.md"}, json=payload).status_code
        == 409
    )


def test_metadata_update_rejects_invalid_field_keys(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_markdown(world / "note.md", {"title": "Note"}, "# Note\n")
    client = make_client(world)

    response = client.put(
        "/api/page/metadata",
        params={"path": "note.md"},
        json={
            "metadata": {
                "title": "Note",
                "type": None,
                "tags": [],
                "aliases": [],
                "fields": {" voice ": "formal", "voice": "calm"},
            },
            **file_preconditions(client, "note.md"),
        },
    )

    assert response.status_code == 400

    response = client.put(
        "/api/page/metadata",
        params={"path": "note.md"},
        json={
            "metadata": {
                "title": "Note",
                "type": None,
                "tags": [],
                "aliases": [],
                "fields": {"": "blank"},
            },
            **file_preconditions(client, "note.md"),
        },
    )

    assert response.status_code == 400
