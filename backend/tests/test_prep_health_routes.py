from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings():
    yield
    get_settings.cache_clear()


def make_client(world: Path, *, token: str | None = None) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        access_token=token,
        world_root=world,
    )
    return TestClient(app)


def write_file(world: Path, path: str, content: str = "") -> None:
    target = world.joinpath(*path.split("/"))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def issue_pairs(body: dict) -> list[tuple[str, str, str, str | None]]:
    return [
        (
            issue["kind"],
            issue["source_path"],
            issue["raw_target"],
            issue["command"],
        )
        for issue in body["issues"]
    ]


def test_prep_health_returns_ok_on_clean_world(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_file(world, "README.md", "# Home\n\n[[Notes/Target]]")
    write_file(world, "Notes/Target.md", "# Target")
    client = make_client(world)

    response = client.get("/api/prep-health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["issue_count"] == 0
    assert body["errors"] == 0
    assert body["warnings"] == 0
    assert body["issues"] == []
    assert body["checked_at"].endswith("Z")


def test_prep_health_reports_unresolved_links_and_embeds(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_file(
        world,
        "README.md",
        "\n".join(
            [
                "# Home",
                "[[Missing Page]]",
                "![[Media/missing-map.png]]",
            ]
        ),
    )
    write_file(world, "Tables/random.csv", "result,event\n1,[[Missing Table Target]]\n")
    write_file(
        world,
        "Cards/Broken.cs",
        (
            '{"kind":"npc","title":"Broken Card","tags":[],"sections":'
            '[{"title":"Core","fields":{"Hook":"[[Missing Card Target]]"}}]}'
        ),
    )
    client = make_client(world)

    response = client.get("/api/prep-health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "error"
    assert body["issue_count"] == 4
    assert body["errors"] == 4
    assert body["warnings"] == 0
    assert issue_pairs(body) == [
        ("broken_link", "Cards/Broken.cs", "Missing Card Target", None),
        ("broken_link", "README.md", "Missing Page", None),
        ("missing_embed", "README.md", "Media/missing-map.png", None),
        ("broken_link", "Tables/random.csv", "Missing Table Target", None),
    ]
    assert body["issues"][0]["source_title"] == "Broken Card"
    assert body["issues"][0]["source_kind"] == "card"


def test_prep_health_scans_dms_literal_path_arguments(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_file(world, "README.md", "# Home")
    write_file(world, "Tables/random.csv", "roll,event\n1,Rain\n")
    write_file(world, "Notes/existing.md", "# Existing")
    write_file(world, ".music/effects/hit.wav", "wav")
    write_file(world, "Media/map.svg", "<svg></svg>")
    write_file(
        world,
        "Scripts/references.dms",
        "\n".join(
            [
                "screen_fs('README.md')",
                "screen_pu('Missing/popup.md')",
                "audio_play('.music/effects/missing.wav')",
                "table('Tables/random.csv')",
                "append_note('Notes/missing.md', 'text')",
                "map_load('Maps/missing.png')",
                "screen_fs(dynamic_path)",
                "audio_play('.music/effects/hit.wav')",
                "map_load('Media/map.svg')",
            ]
        ),
    )
    client = make_client(world)

    response = client.get("/api/prep-health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "error"
    assert issue_pairs(body) == [
        ("missing_dms_reference", "Scripts/references.dms", "Missing/popup.md", "screen_pu"),
        (
            "missing_dms_reference",
            "Scripts/references.dms",
            ".music/effects/missing.wav",
            "audio_play",
        ),
        ("missing_dms_reference", "Scripts/references.dms", "Notes/missing.md", "append_note"),
        ("missing_dms_reference", "Scripts/references.dms", "Maps/missing.png", "map_load"),
    ]


def test_prep_health_warns_on_dms_syntax_errors_and_blocks_traversal(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_file(world, "README.md", "# Home")
    write_file(world, "Scripts/bad.dms", "screen_fs(")
    write_file(world, "Scripts/traversal.dms", "screen_fs('../secret.md')")
    (tmp_path / "secret.md").write_text("# Secret", encoding="utf-8")
    client = make_client(world)

    response = client.get("/api/prep-health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "error"
    assert body["issue_count"] == 2
    assert body["errors"] == 1
    assert body["warnings"] == 1
    assert issue_pairs(body) == [
        ("dms_parse_error", "Scripts/bad.dms", "", None),
        ("missing_dms_reference", "Scripts/traversal.dms", "../secret.md", "screen_fs"),
    ]
    assert "parse" in body["issues"][0]["message"].lower()
    assert "outside the active world" in body["issues"][1]["message"]


def test_prep_health_is_protected_like_other_api_routes(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", "secret")
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    get_settings.cache_clear()
    client = TestClient(create_app())

    assert client.get("/api/prep-health").status_code == 401
    assert (
        client.get(
            "/api/prep-health",
            headers={"x-virtualscreen-token": "secret"},
        ).status_code
        == 200
    )
