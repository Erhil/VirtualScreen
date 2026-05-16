import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.database import initialize_database
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def make_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Home", encoding="utf-8")
    (world / "table.csv").write_text("roll,event\n1,Rain\n", encoding="utf-8")
    (world / "map.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
    (world / "handout.pdf").write_bytes(b"%PDF-1.4\n%tiny\n")
    return world


def tab(path: str, name: str, media_kind: str, title: str | None = None) -> dict[str, object]:
    return {"path": path, "name": name, "title": title, "mediaKind": media_kind}


def default_layout(active_path: str | None = None) -> dict[str, object]:
    return {
        "mode": "single",
        "activePaneId": "main",
        "panes": [
            {"id": "main", "activePath": active_path},
            {"id": "secondary", "activePath": None},
        ],
        "splitRatio": 0.5,
    }


def hp_row(
    row_id: str = "unit-1",
    name: str = "Unit",
    current_hp: int = 7,
    max_hp: int | None = 7,
    status: str = "",
    notes: str = "",
) -> dict[str, object]:
    return {
        "id": row_id,
        "name": name,
        "current_hp": current_hp,
        "max_hp": max_hp,
        "status": status,
        "notes": notes,
    }


def test_empty_workspace_returns_empty_state(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.get("/api/workspace")

    assert response.status_code == 200
    assert response.json() == {
        "workspaceId": "default",
        "workspaceName": "Default",
        "tabs": [],
        "activePath": None,
        "layout": default_layout(),
        "favorites": [],
        "recentFiles": [],
    }


def test_workspace_list_auto_creates_default(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.get("/api/workspaces")

    assert response.status_code == 200
    workspaces = response.json()
    assert len(workspaces) == 1
    assert workspaces[0]["id"] == "default"
    assert workspaces[0]["name"] == "Default"
    assert workspaces[0]["is_active"] is True
    assert workspaces[0]["updated_at"]


def test_workspace_hp_starts_empty_for_active_workspace(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.get("/api/workspace/hp")

    assert response.status_code == 200
    assert response.json()["workspace_id"] == "default"
    assert response.json()["rows"] == []
    assert response.json()["updated_at"]


def test_workspace_hp_round_trip_and_isolates_named_workspaces(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    created = client.post("/api/workspaces", json={"name": "Combat"}).json()
    combat_id = created["workspaceId"]
    payload = {
        "rows": [
            hp_row("pc-1", " Aster ", 12, 18, "bloodied", "holding the door"),
            hp_row("npc-1", "Kell", -2, None),
        ]
    }

    response = client.put("/api/workspace/hp", json=payload)

    assert response.status_code == 200
    saved = response.json()
    assert saved["workspace_id"] == combat_id
    assert saved["rows"] == [
        hp_row("pc-1", "Aster", 12, 18, "bloodied", "holding the door"),
        hp_row("npc-1", "Kell", -2, None),
    ]
    assert saved["updated_at"]

    client.post("/api/workspaces/default/activate")
    default_hp = client.get("/api/workspace/hp").json()
    assert default_hp["workspace_id"] == "default"
    assert default_hp["rows"] == []

    client.post(f"/api/workspaces/{combat_id}/activate")
    assert client.get("/api/workspace/hp").json()["rows"] == saved["rows"]


def test_workspace_hp_rejects_invalid_rows(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    too_many_rows = [hp_row(str(index), f"Unit {index}") for index in range(61)]
    cases = [
        {"rows": too_many_rows},
        {"rows": [hp_row("", "Aster")]},
        {"rows": [hp_row("same", "Aster"), hp_row("same", "Kell")]},
        {"rows": [hp_row("pc-1", "  ")]},
        {"rows": [hp_row("pc-1", "Aster", -10000)]},
        {"rows": [hp_row("pc-1", "Aster", 10000)]},
        {"rows": [hp_row("pc-1", "Aster", 1, 0)]},
        {"rows": [hp_row("pc-1", "Aster", 1, 10000)]},
        {"rows": [hp_row("pc-1", "Aster", 1, 1, "x" * 121)]},
        {"rows": [hp_row("pc-1", "Aster", 1, 1, "", "x" * 501)]},
    ]

    for payload in cases:
        response = client.put("/api/workspace/hp", json=payload)
        assert response.status_code == 400, payload


def test_legacy_workspace_state_migrates_to_default(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    conn = initialize_database(world)
    legacy_tabs = [tab("README.md", "README.md", "markdown", "Home")]
    with conn:
        conn.execute(
            """
            insert into workspace_state(id, tabs_json, active_path)
            values (1, ?, ?)
            """,
            (json.dumps(legacy_tabs), "README.md"),
        )
    conn.close()
    client = make_client(world)

    response = client.get("/api/workspace")

    assert response.status_code == 200
    workspace = response.json()
    assert workspace["workspaceId"] == "default"
    assert workspace["workspaceName"] == "Default"
    assert workspace["tabs"] == legacy_tabs
    assert workspace["activePath"] == "README.md"
    assert workspace["layout"] == default_layout("README.md")


def test_workspace_tabs_round_trip(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    payload = {
        "tabs": [tab("README.md", "README.md", "markdown", "Home")],
        "activePath": "README.md",
    }

    response = client.put("/api/workspace/tabs", json=payload)

    assert response.status_code == 200
    workspace = client.get("/api/workspace").json()
    assert workspace["workspaceId"] == "default"
    assert workspace["workspaceName"] == "Default"
    assert workspace["tabs"] == payload["tabs"]
    assert workspace["activePath"] == "README.md"
    assert workspace["layout"] == default_layout("README.md")


def test_named_workspaces_create_rename_activate_and_isolate_tabs(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    created = client.post("/api/workspaces", json={"name": " Session A "})

    assert created.status_code == 200
    assert created.json()["workspaceName"] == "Session A"
    session_id = created.json()["workspaceId"]

    client.put(
        "/api/workspace/tabs",
        json={
            "tabs": [tab("README.md", "README.md", "markdown", "Home")],
            "activePath": "README.md",
        },
    )
    renamed = client.put(f"/api/workspaces/{session_id}", json={"name": "Session Prep"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Session Prep"

    default_id = "default"
    activated_default = client.post(f"/api/workspaces/{default_id}/activate")
    assert activated_default.status_code == 200
    assert activated_default.json()["workspaceName"] == "Default"
    assert activated_default.json()["tabs"] == []

    activated_session = client.post(f"/api/workspaces/{session_id}/activate")
    assert activated_session.status_code == 200
    assert activated_session.json()["workspaceName"] == "Session Prep"
    assert activated_session.json()["tabs"][0]["path"] == "README.md"

    workspaces = client.get("/api/workspaces").json()
    assert [(item["name"], item["is_active"]) for item in workspaces] == [
        ("Default", False),
        ("Session Prep", True),
    ]


def test_named_workspace_name_validation(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    assert client.post("/api/workspaces", json={"name": ""}).status_code == 400
    assert client.post("/api/workspaces", json={"name": "x" * 61}).status_code == 400
    assert client.post("/api/workspaces", json={"name": "Session"}).status_code == 200
    assert client.post("/api/workspaces", json={"name": "Session"}).status_code == 400


def test_named_workspace_delete_rules(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    active = client.post("/api/workspaces", json={"name": "Active"}).json()
    inactive = client.post("/api/workspaces", json={"name": "Inactive"}).json()

    assert client.delete("/api/workspaces/default").status_code == 400
    assert client.delete(f"/api/workspaces/{inactive['workspaceId']}").status_code == 400

    client.post(f"/api/workspaces/{active['workspaceId']}/activate")
    deleted = client.delete(f"/api/workspaces/{inactive['workspaceId']}")

    assert deleted.status_code == 200
    names = [item["name"] for item in client.get("/api/workspaces").json()]
    assert names == ["Default", "Active"]


def test_workspace_layout_round_trip_and_clamps_split_ratio(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    tabs = [
        tab("README.md", "README.md", "markdown", "Home"),
        tab("table.csv", "table.csv", "csv"),
    ]
    client.put("/api/workspace/tabs", json={"tabs": tabs, "activePath": "README.md"})

    response = client.put(
        "/api/workspace/layout",
        json={
            "layout": {
                "mode": "vertical_split",
                "activePaneId": "secondary",
                "panes": [
                    {"id": "main", "activePath": "README.md"},
                    {"id": "secondary", "activePath": "table.csv"},
                ],
                "splitRatio": 0.9,
            }
        },
    )

    assert response.status_code == 200
    layout = response.json()["layout"]
    assert layout == {
        "mode": "vertical_split",
        "activePaneId": "secondary",
        "panes": [
            {"id": "main", "activePath": "README.md"},
            {"id": "secondary", "activePath": "table.csv"},
        ],
        "splitRatio": 0.75,
    }
    assert client.get("/api/workspace").json()["layout"] == layout


def test_workspace_layout_rejects_invalid_values(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    client.put(
        "/api/workspace/tabs",
        json={
            "tabs": [tab("README.md", "README.md", "markdown", "Home")],
            "activePath": "README.md",
        },
    )

    invalid_path = client.put(
        "/api/workspace/layout",
        json={
            "layout": {
                "mode": "single",
                "activePaneId": "main",
                "panes": [
                    {"id": "main", "activePath": "table.csv"},
                    {"id": "secondary", "activePath": None},
                ],
                "splitRatio": 0.5,
            }
        },
    )
    invalid_mode = client.put(
        "/api/workspace/layout",
        json={
            "layout": {
                "mode": "grid",
                "activePaneId": "main",
                "panes": [
                    {"id": "main", "activePath": "README.md"},
                    {"id": "secondary", "activePath": None},
                ],
                "splitRatio": 0.5,
            }
        },
    )

    assert invalid_path.status_code == 400
    assert invalid_mode.status_code == 400


def test_workspace_favorites_preserve_order(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    payload = {
        "favorites": [
            tab("table.csv", "table.csv", "csv"),
            tab("README.md", "README.md", "markdown", "Home"),
        ]
    }

    response = client.put("/api/workspace/favorites", json=payload)

    assert response.status_code == 200
    assert client.get("/api/workspace").json()["favorites"] == payload["favorites"]


def test_workspace_accepts_video_tabs(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    payload = {
        "tabs": [tab("map.mp4", "map.mp4", "video")],
        "activePath": "map.mp4",
    }

    response = client.put("/api/workspace/tabs", json=payload)

    assert response.status_code == 200
    assert client.get("/api/workspace").json()["tabs"] == payload["tabs"]


def test_workspace_accepts_pdf_tabs(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    payload = {
        "tabs": [tab("handout.pdf", "handout.pdf", "pdf")],
        "activePath": "handout.pdf",
    }

    response = client.put("/api/workspace/tabs", json=payload)

    assert response.status_code == 200
    assert client.get("/api/workspace").json()["tabs"] == payload["tabs"]


def test_recent_files_deduplicate_and_newest_wins(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    client.post("/api/workspace/recent", json={"tab": tab("README.md", "README.md", "markdown")})
    client.post("/api/workspace/recent", json={"tab": tab("table.csv", "table.csv", "csv")})
    client.post(
        "/api/workspace/recent",
        json={"tab": tab("README.md", "README.md", "markdown", "Home")},
    )

    recent = client.get("/api/workspace").json()["recentFiles"]
    assert [item["path"] for item in recent] == ["README.md", "table.csv"]
    assert recent[0]["title"] == "Home"


def test_recent_files_can_be_replaced_and_removed(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put(
        "/api/workspace/recent",
        json={"recentFiles": [tab("table.csv", "table.csv", "csv")]},
    )

    assert response.status_code == 200
    recent = client.get("/api/workspace").json()["recentFiles"]
    assert recent == [tab("table.csv", "table.csv", "csv")]

    response = client.put("/api/workspace/recent", json={"recentFiles": []})

    assert response.status_code == 200
    assert client.get("/api/workspace").json()["recentFiles"] == []


def test_workspace_rejects_unsafe_paths(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put(
        "/api/workspace/tabs",
        json={
            "tabs": [tab("../secret.md", "secret.md", "markdown")],
            "activePath": "../secret.md",
        },
    )

    assert response.status_code == 400


def test_workspace_rejects_missing_tab_paths(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put(
        "/api/workspace/tabs",
        json={
            "tabs": [tab("missing.md", "missing.md", "markdown")],
            "activePath": "missing.md",
        },
    )

    assert response.status_code == 400
