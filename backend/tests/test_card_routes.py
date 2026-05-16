import hashlib
import json
from pathlib import Path

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


def card_content(
    title: str = "Captain Varo",
    note: str = "Keeps the tideword hidden near [[README|Home]].",
) -> str:
    return json.dumps(
        {
            "title": title,
            "type": "npc",
            "tags": ["ally", "harbor"],
            "aliases": ["Varo"],
            "fields": {
                "role": "Harbor pilot",
                "note": note,
            },
        },
        indent=2,
        sort_keys=True,
    ) + "\n"


def v2_card_content() -> str:
    return json.dumps(
        {
            "title": "Mira",
            "kind": "character",
            "tags": ["pc"],
            "sections": [
                {
                    "title": "Abilities",
                    "layout": "grid",
                    "fields": {
                        "STR": {"type": "number", "value": 12},
                        "Hidden Motto": {"type": "text", "value": "silver oath"},
                        "Active": {"type": "boolean", "value": True},
                    },
                },
                {
                    "title": "Attacks",
                    "layout": "table",
                    "rows": [
                        {"Name": "Saber", "Bonus": "+5", "Damage": "1d8+3"},
                        {"Name": "Lantern Bow", "Bonus": "+4", "Damage": "moonbolt"},
                    ],
                },
                {
                    "title": "References",
                    "fields": {
                        "Home": {
                            "type": "world_link",
                            "value": "README.md",
                            "label": "Home Base",
                        }
                    },
                },
            ],
        },
        indent=2,
        sort_keys=True,
    ) + "\n"


def make_card_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    (world / "Cards").mkdir(parents=True)
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    (world / "Cards" / "Varo.cs").write_text(card_content(), encoding="utf-8")
    return world


def tab(path: str, name: str, media_kind: str, title: str | None = None) -> dict[str, object]:
    return {"path": path, "name": name, "title": title, "mediaKind": media_kind}


def test_card_reads_as_json_and_appears_in_tree_pages_search_and_links(tmp_path: Path) -> None:
    world = make_card_world(tmp_path)
    client = make_client(world)

    file_response = client.get("/api/world/file", params={"path": "Cards/Varo.cs"})
    tree_response = client.get("/api/world/tree")
    pages_response = client.get("/api/pages")
    page_response = client.get("/api/page", params={"path": "Cards/Varo.cs"})
    search_response = client.get("/api/search", params={"q": "tideword"})
    links_response = client.get("/api/page/links", params={"path": "Cards/Varo.cs"})
    backlinks_response = client.get("/api/page/backlinks", params={"path": "README.md"})

    assert file_response.status_code == 200
    file_body = file_response.json()
    assert file_body["extension"] == "cs"
    assert file_body["media_kind"] == "card"
    assert file_body["content_type"] == "application/json"
    assert file_body["hash"] == hashlib.sha256(card_content().encode("utf-8")).hexdigest()

    card_entry = tree_response.json()["children"][0]["children"][0]
    assert card_entry["path"] == "Cards/Varo.cs"
    assert card_entry["title"] == "Captain Varo"
    assert card_entry["page_type"] == "npc"
    assert card_entry["tags"] == ["ally", "harbor"]

    pages = {page["path"]: page for page in pages_response.json()}
    assert pages["Cards/Varo.cs"]["title"] == "Captain Varo"
    assert pages["Cards/Varo.cs"]["page_type"] == "npc"

    page = page_response.json()
    assert page["title"] == "Captain Varo"
    assert page["page_type"] == "npc"
    assert page["tags"] == ["ally", "harbor"]
    assert page["fields"]["note"] == "Keeps the tideword hidden near [[README|Home]]."

    results = search_response.json()
    assert results[0]["path"] == "Cards/Varo.cs"
    assert results[0]["media_kind"] == "card"

    links = links_response.json()
    assert links[0]["source_path"] == "Cards/Varo.cs"
    assert links[0]["target_path"] == "README.md"
    assert links[0]["target_kind"] == "markdown"
    assert any(link["source_path"] == "Cards/Varo.cs" for link in backlinks_response.json())


def test_v1_card_fields_still_index_after_v2_parser_changes(tmp_path: Path) -> None:
    world = make_card_world(tmp_path)
    client = make_client(world)

    search_response = client.get("/api/search", params={"q": "Harbor pilot"})

    assert search_response.status_code == 200
    assert search_response.json()[0]["path"] == "Cards/Varo.cs"


def test_v2_typed_fields_table_rows_and_world_links_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Cards").mkdir(parents=True)
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    (world / "Cards" / "Mira.cs").write_text(v2_card_content(), encoding="utf-8")
    client = make_client(world)

    typed_search = client.get("/api/search", params={"q": "silver oath"})
    table_search = client.get("/api/search", params={"q": "moonbolt"})
    page_response = client.get("/api/page", params={"path": "Cards/Mira.cs"})
    links_response = client.get("/api/page/links", params={"path": "Cards/Mira.cs"})

    assert typed_search.status_code == 200
    assert typed_search.json()[0]["path"] == "Cards/Mira.cs"
    assert typed_search.json()[0]["match_reason"] in {"metadata", "body"}
    assert table_search.status_code == 200
    assert table_search.json()[0]["path"] == "Cards/Mira.cs"
    assert page_response.status_code == 200
    fields = page_response.json()["fields"]
    assert fields["Abilities.STR"] == "12"
    assert fields["Abilities.Hidden Motto"] == "silver oath"
    assert fields["References.Home"] == "README.md"
    assert links_response.status_code == 200
    assert links_response.json()[0]["source_path"] == "Cards/Mira.cs"
    assert links_response.json()[0]["target_path"] == "README.md"
    assert links_response.json()[0]["label"] == "Home Base"


def test_workspace_tabs_favorites_and_recents_accept_card_media_kind(tmp_path: Path) -> None:
    client = make_client(make_card_world(tmp_path))
    card_tab = tab("Cards/Varo.cs", "Varo.cs", "card", "Captain Varo")

    tabs_response = client.put(
        "/api/workspace/tabs",
        json={"tabs": [card_tab], "activePath": "Cards/Varo.cs"},
    )
    favorites_response = client.put("/api/workspace/favorites", json={"favorites": [card_tab]})
    recent_response = client.post("/api/workspace/recent", json={"tab": card_tab})
    replace_recent_response = client.put(
        "/api/workspace/recent",
        json={"recentFiles": [card_tab]},
    )

    assert tabs_response.status_code == 200
    assert favorites_response.status_code == 200
    assert recent_response.status_code == 200
    assert replace_recent_response.status_code == 200
    workspace = client.get("/api/workspace").json()
    assert workspace["tabs"] == [card_tab]
    assert workspace["favorites"] == [card_tab]
    assert workspace["recentFiles"] == [card_tab]


def test_display_accepts_card_paths_and_exposes_displayed_card_text(tmp_path: Path) -> None:
    client = make_client(make_card_world(tmp_path))

    fullscreen_response = client.put("/api/display/fullscreen", json={"path": "Cards/Varo.cs"})
    popup_response = client.post("/api/display/popup", json={"path": "Cards/Varo.cs"})
    screen_file_response = client.get("/api/screen/world/file", params={"path": "Cards/Varo.cs"})
    screen_links_response = client.get("/api/screen/page/links", params={"path": "Cards/Varo.cs"})

    assert fullscreen_response.status_code == 200
    assert fullscreen_response.json()["fullscreen"]["media_kind"] == "card"
    assert fullscreen_response.json()["fullscreen"]["title"] == "Captain Varo"
    assert popup_response.status_code == 200
    assert popup_response.json()["popups"][0]["media_kind"] == "card"
    assert screen_file_response.status_code == 200
    assert screen_file_response.json()["media_kind"] == "card"
    assert screen_links_response.status_code == 200
    assert screen_links_response.json()[0]["target_path"] == "README.md"


def test_creates_card_with_default_json_and_rejects_unsafe_card_paths(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    (world / "Cards").mkdir(parents=True)
    client = make_client(world)

    response = client.post(
        "/api/world/file",
        json={"path": "Cards/New Contact.cs", "file_type": "card"},
    )
    traversal_response = client.post(
        "/api/world/file",
        json={"path": "../escape.cs", "file_type": "card"},
    )
    extension_response = client.post(
        "/api/world/file",
        json={"path": "Cards/New Contact.md", "file_type": "card"},
    )
    internal_response = client.post(
        "/api/world/file",
        json={"path": ".virtualscreen/hidden.cs", "file_type": "card"},
    )

    assert response.status_code == 200
    assert response.json()["media_kind"] == "card"
    assert response.json()["content_type"] == "application/json"
    card = json.loads(response.json()["content"])
    assert card == {
        "kind": "custom",
        "title": "New Card",
        "tags": [],
        "sections": [
            {
                "title": "Core",
                "fields": {},
            }
        ],
    }
    assert json.loads((world / "Cards" / "New Contact.cs").read_text(encoding="utf-8")) == card
    assert traversal_response.status_code == 400
    assert extension_response.status_code == 415
    assert internal_response.status_code == 400


def test_saves_card_with_hash_mtime_backup_and_reindexes_fields(tmp_path: Path) -> None:
    world = make_card_world(tmp_path)
    client = make_client(world)
    preconditions = file_preconditions(client, "Cards/Varo.cs")
    next_content = card_content(title="Captain Varo Updated", note="Carries moon-silver.")

    response = client.put(
        "/api/world/file",
        params={"path": "Cards/Varo.cs"},
        json={**preconditions, "content": next_content},
    )
    stale_response = client.put(
        "/api/world/file",
        params={"path": "Cards/Varo.cs"},
        json={**preconditions, "content": card_content(title="Stale")},
    )
    search_response = client.get("/api/search", params={"q": "moon-silver"})

    assert response.status_code == 200
    body = response.json()
    assert body["media_kind"] == "card"
    assert body["content_type"] == "application/json"
    assert body["hash"] == hashlib.sha256(next_content.encode("utf-8")).hexdigest()
    assert body["modified_at"]
    assert (world / body["backup_path"]).read_text(encoding="utf-8") == card_content()
    assert stale_response.status_code == 409
    assert search_response.json()[0]["path"] == "Cards/Varo.cs"


def test_complex_card_layout_indexes_typed_fields_tables_and_links(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Cards").mkdir(parents=True)
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    (world / "Cards" / "Mira.cs").write_text(
        json.dumps(
            {
                "kind": "character",
                "title": "Mira",
                "tags": ["pc"],
                "sections": [
                    {
                        "title": "Abilities",
                        "layout": "grid",
                        "fields": {
                            "STR": {"type": "number", "value": 12},
                            "WIS": {"type": "number", "value": 16},
                            "Ready": {"type": "boolean", "value": True},
                            "Home": {"type": "world_link", "value": "[[README|Home]]"},
                        },
                    },
                    {
                        "title": "Attacks",
                        "layout": "table",
                        "columns": ["Name", "Bonus", "Damage"],
                        "rows": [
                            {"Name": "Saber", "Bonus": "+5", "Damage": "1d8+3"},
                            {"Name": "Dagger", "Bonus": "+4", "Damage": "1d4+2"},
                        ],
                    },
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    client = make_client(world)

    page_response = client.get("/api/page", params={"path": "Cards/Mira.cs"})
    search_response = client.get("/api/search", params={"q": "Saber"})
    links_response = client.get("/api/page/links", params={"path": "Cards/Mira.cs"})

    assert page_response.status_code == 200
    page = page_response.json()
    assert page["fields"]["Abilities.STR"] == "12"
    assert page["fields"]["Abilities.WIS"] == "16"
    assert page["fields"]["Abilities.Ready"] == "true"
    assert page["fields"]["Abilities.Home"] == "[[README|Home]]"
    assert page["fields"]["Attacks.Name"] == "Saber\nDagger"
    assert page["fields"]["Attacks.Damage"] == "1d8+3\n1d4+2"
    assert search_response.json()[0]["path"] == "Cards/Mira.cs"
    assert links_response.json()[0]["target_path"] == "README.md"


def test_computed_card_fields_index_label_and_formula_text(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Cards").mkdir(parents=True)
    (world / "Cards" / "Scout.cs").write_text(
        json.dumps(
            {
                "kind": "character",
                "title": "Scout",
                "tags": ["pc"],
                "sections": [
                    {
                        "title": "Skills",
                        "layout": "grid",
                        "fields": {
                            "WIS": {"type": "number", "value": 16},
                            "Perception_flag": {"type": "boolean", "value": True},
                            "Perception_bonus": {
                                "type": "computed",
                                "formula": "ability_mod(WIS) + Perception_flag * 3",
                                "format": "signed",
                            },
                        },
                    }
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    client = make_client(world)

    page_response = client.get("/api/page", params={"path": "Cards/Scout.cs"})
    label_search = client.get("/api/search", params={"q": "Perception_bonus"})
    formula_search = client.get("/api/search", params={"q": "ability_mod"})

    assert page_response.status_code == 200
    assert page_response.json()["fields"]["Skills.Perception_bonus"] == (
        "ability_mod(WIS) + Perception_flag * 3"
    )
    assert label_search.json()[0]["path"] == "Cards/Scout.cs"
    assert formula_search.json()[0]["path"] == "Cards/Scout.cs"


def test_renames_and_trashes_card_files(tmp_path: Path) -> None:
    world = make_card_world(tmp_path)
    client = make_client(world)

    rename_response = client.post(
        "/api/world/file/rename",
        json={
            "path": "Cards/Varo.cs",
            "new_path": "Cards/Renamed.cs",
            **file_preconditions(client, "Cards/Varo.cs"),
        },
    )
    search_response = client.get("/api/search", params={"q": "Captain Varo"})
    trash_response = client.post(
        "/api/world/file/trash",
        json={"path": "Cards/Renamed.cs", **file_preconditions(client, "Cards/Renamed.cs")},
    )

    assert rename_response.status_code == 200
    assert rename_response.json()["path"] == "Cards/Renamed.cs"
    assert not (world / "Cards" / "Varo.cs").exists()
    assert search_response.json()[0]["path"] == "Cards/Renamed.cs"

    assert trash_response.status_code == 200
    assert trash_response.json()["path"] == "Cards/Renamed.cs"
    assert not (world / "Cards" / "Renamed.cs").exists()
    assert (world / trash_response.json()["trashed_path"]).exists()
    assert client.get("/api/search", params={"q": "Captain Varo"}).json() == []
