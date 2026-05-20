from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def make_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    (world / "Media").mkdir(parents=True)
    (world / "README.md").write_text(
        "# Home\n\n![Map](Media/map.svg)\n\n![[Media/map.mp4]]\n",
        encoding="utf-8",
    )
    (world / "Handout.md").write_text("# Letter\n", encoding="utf-8")
    (world / "Handout.pdf").write_bytes(b"%PDF-1.4\n%tiny\n")
    (world / "Media" / "map.svg").write_text("<svg></svg>", encoding="utf-8")
    (world / "Media" / "map.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
    (world / "Media" / "secret.png").write_bytes(b"secret")
    return world


def test_display_background_serves_optional_world_internal_image(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    client = make_client(world)

    missing_response = client.get("/api/display/background")
    assert missing_response.status_code == 204
    assert missing_response.headers["cache-control"] == "no-store"

    background = world / ".virtualscreen" / "screen-background.jpg"
    background.parent.mkdir()
    background.write_bytes(b"\xff\xd8\xff\xe0screen-background\xff\xd9")

    response = client.get("/api/display/background")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == b"\xff\xd8\xff\xe0screen-background\xff\xd9"


def test_display_state_starts_blank(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.get("/api/display/state")

    assert response.status_code == 200
    assert response.json()["fullscreen"] is None
    assert response.json()["popups"] == []
    assert response.json()["updated_at"]


def test_fullscreen_popup_close_and_blank_round_trip(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    fullscreen_response = client.put("/api/display/fullscreen", json={"path": "Media/map.mp4"})
    popup_response = client.post("/api/display/popup", json={"path": "Handout.md"})
    second_popup_response = client.post("/api/display/popup", json={"path": "README.md"})

    assert fullscreen_response.status_code == 200
    assert fullscreen_response.json()["fullscreen"]["media_kind"] == "video"
    assert popup_response.status_code == 200
    assert popup_response.json()["popups"][0]["title"] == "Letter"
    assert popup_response.json()["popups"][0]["preset"] == "plain"
    state = second_popup_response.json()
    assert [popup["path"] for popup in state["popups"]] == ["Handout.md", "README.md"]

    close_response = client.delete(f"/api/display/popup/{state['popups'][0]['id']}")
    assert close_response.status_code == 200
    assert [popup["path"] for popup in close_response.json()["popups"]] == ["README.md"]

    blank_response = client.post("/api/display/blank")
    assert blank_response.status_code == 200
    assert blank_response.json()["fullscreen"] is None
    assert blank_response.json()["popups"] == []

    clear_response = client.delete("/api/display/popups")
    assert clear_response.status_code == 200
    assert clear_response.json()["popups"] == []


def test_display_popup_presets_persist_to_public_screen_state(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.post(
        "/api/display/popup",
        json={"path": "Handout.md", "preset": "letter"},
    )
    invalid_response = client.post(
        "/api/display/popup",
        json={"path": "Handout.md", "preset": "giant-scroll"},
    )

    assert response.status_code == 200
    assert response.json()["popups"][0]["preset"] == "letter"
    screen_state = client.get("/api/screen/display/state")
    assert screen_state.status_code == 200
    assert screen_state.json()["popups"][0]["preset"] == "letter"
    assert invalid_response.status_code == 422


def test_display_popup_defaults_to_visible(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.post("/api/display/popup", json={"path": "Handout.md"})

    assert response.status_code == 200
    popup = response.json()["popups"][0]
    assert popup["visible"] is True

    screen_state = client.get("/api/screen/display/state")
    assert screen_state.status_code == 200
    assert screen_state.json()["popups"] == [popup]


def test_staged_popup_is_hidden_from_public_screen_state(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.post(
        "/api/display/popup",
        json={"path": "Handout.md", "visible": False},
    )

    assert response.status_code == 200
    assert response.json()["popups"][0]["path"] == "Handout.md"
    assert response.json()["popups"][0]["visible"] is False

    display_state = client.get("/api/display/state")
    screen_state = client.get("/api/screen/display/state")

    assert display_state.status_code == 200
    assert display_state.json()["popups"][0]["path"] == "Handout.md"
    assert screen_state.status_code == 200
    assert screen_state.json()["popups"] == []


def test_popup_visibility_toggle_updates_public_screen_state(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    staged_response = client.post(
        "/api/display/popup",
        json={"path": "Handout.md", "visible": False},
    )
    popup_id = staged_response.json()["popups"][0]["id"]

    show_response = client.put(f"/api/display/popup/{popup_id}", json={"visible": True})

    assert show_response.status_code == 200
    assert show_response.json()["popups"][0]["visible"] is True
    assert client.get("/api/screen/display/state").json()["popups"][0]["path"] == "Handout.md"

    hide_response = client.put(f"/api/display/popup/{popup_id}", json={"visible": False})

    assert hide_response.status_code == 200
    assert hide_response.json()["popups"][0]["visible"] is False
    assert client.get("/api/screen/display/state").json()["popups"] == []


def test_display_show_active_shortcut_clears_and_sets_content(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    assert client.put("/api/display/fullscreen", json={"path": "Media/map.mp4"}).status_code == 200
    assert (
        client.post("/api/display/popup", json={"path": "Handout.md", "preset": "note"}).status_code
        == 200
    )

    fullscreen_response = client.post(
        "/api/display/show-active",
        json={"path": "README.md", "mode": "fullscreen", "clear_existing": True},
    )

    assert fullscreen_response.status_code == 200
    assert fullscreen_response.json()["fullscreen"]["path"] == "README.md"
    assert fullscreen_response.json()["popups"] == []

    popup_response = client.post(
        "/api/display/show-active",
        json={
            "path": "Handout.md",
            "mode": "popup",
            "preset": "clue",
            "clear_existing": True,
        },
    )

    assert popup_response.status_code == 200
    assert popup_response.json()["fullscreen"] is None
    assert popup_response.json()["popups"][0]["path"] == "Handout.md"
    assert popup_response.json()["popups"][0]["preset"] == "clue"


def test_display_accepts_pdf_paths(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    fullscreen_response = client.put("/api/display/fullscreen", json={"path": "Handout.pdf"})
    popup_response = client.post("/api/display/popup", json={"path": "Handout.pdf"})

    assert fullscreen_response.status_code == 200
    assert fullscreen_response.json()["fullscreen"]["media_kind"] == "pdf"
    assert popup_response.status_code == 200
    assert popup_response.json()["popups"][0]["media_kind"] == "pdf"


def test_display_routes_reject_unsafe_and_missing_paths(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    traversal_response = client.put("/api/display/fullscreen", json={"path": "../secret.md"})
    missing_response = client.post("/api/display/popup", json={"path": "missing.md"})
    directory_response = client.put("/api/display/fullscreen", json={"path": "Media"})
    internal_response = client.put(
        "/api/display/fullscreen",
        json={"path": ".virtualscreen/virtualscreen.sqlite3"},
    )

    assert traversal_response.status_code == 400
    assert missing_response.status_code == 404
    assert directory_response.status_code == 400
    assert internal_response.status_code == 400


def test_display_state_is_scoped_to_world(tmp_path: Path) -> None:
    first_world = make_world(tmp_path / "first")
    second_world = make_world(tmp_path / "second")
    first_client = make_client(first_world)
    second_client = make_client(second_world)

    response = first_client.put("/api/display/fullscreen", json={"path": "README.md"})
    assert response.status_code == 200

    assert first_client.get("/api/display/state").json()["fullscreen"]["path"] == "README.md"
    assert second_client.get("/api/display/state").json()["fullscreen"] is None


def test_public_screen_routes_only_expose_current_display_content(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    assert client.get("/api/screen/world/file", params={"path": "README.md"}).status_code == 403

    response = client.put("/api/display/fullscreen", json={"path": "README.md"})
    assert response.status_code == 200

    assert client.get("/api/screen/world/file", params={"path": "README.md"}).status_code == 200
    assert client.get("/api/screen/page/links", params={"path": "README.md"}).status_code == 200
    assert (
        client.get("/api/screen/world/media", params={"path": "Media/map.svg"}).status_code
        == 200
    )
    assert (
        client.get("/api/screen/world/media", params={"path": "Media/map.mp4"}).status_code
        == 200
    )

    assert client.get("/api/screen/world/file", params={"path": "Handout.md"}).status_code == 403
    assert client.get("/api/screen/page/links", params={"path": "Handout.md"}).status_code == 403
    assert (
        client.get("/api/screen/world/media", params={"path": "Media/secret.png"}).status_code
        == 403
    )

    pdf_response = client.put("/api/display/fullscreen", json={"path": "Handout.pdf"})
    assert pdf_response.status_code == 200
    assert client.get("/api/screen/world/media", params={"path": "Handout.pdf"}).status_code == 200


def test_blank_display_clears_fullscreen_and_staged_popups(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    assert client.put("/api/display/fullscreen", json={"path": "README.md"}).status_code == 200
    assert (
        client.post(
            "/api/display/popup",
            json={"path": "Handout.md", "visible": False},
        ).status_code
        == 200
    )

    response = client.post("/api/display/blank")

    assert response.status_code == 200
    assert response.json()["fullscreen"] is None
    assert response.json()["popups"] == []

    display_state = client.get("/api/display/state")
    screen_state = client.get("/api/screen/display/state")
    assert display_state.json()["fullscreen"] is None
    assert display_state.json()["popups"] == []
    assert screen_state.json()["fullscreen"] is None
    assert screen_state.json()["popups"] == []


def test_public_screen_routes_do_not_expose_staged_popup_content(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.post(
        "/api/display/popup",
        json={"path": "README.md", "visible": False},
    )

    assert response.status_code == 200
    assert client.get("/api/display/state").json()["popups"][0]["path"] == "README.md"
    assert client.get("/api/screen/world/file", params={"path": "README.md"}).status_code == 403
    assert client.get("/api/screen/page/links", params={"path": "README.md"}).status_code == 403
    assert (
        client.get("/api/screen/world/media", params={"path": "Media/map.svg"}).status_code
        == 403
    )
    assert (
        client.get("/api/screen/world/media", params={"path": "Media/map.mp4"}).status_code
        == 403
    )


def test_display_websocket_receives_mutation_events(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    with client.websocket_connect("/ws/display") as first:
        with client.websocket_connect("/ws/display") as second:
            response = client.put("/api/display/fullscreen", json={"path": "README.md"})
            assert response.status_code == 200

            first_event = first.receive_json()
            second_event = second.receive_json()

    assert first_event["fullscreen"]["path"] == "README.md"
    assert second_event["fullscreen"]["path"] == "README.md"
