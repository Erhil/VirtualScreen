from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(world: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def write_pdf(world: Path, path: str = "Docs/Guide.pdf") -> None:
    target = world / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"%PDF-1.4\n%tiny\n")


def test_pdf_bookmarks_fresh_pdf_returns_empty_list(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_pdf(world)
    client = make_client(world, monkeypatch)

    response = client.get("/api/pdf/bookmarks", params={"path": "Docs/Guide.pdf"})

    assert response.status_code == 200
    assert response.json() == {"bookmarks": []}


def test_pdf_bookmarks_round_trip_and_persist_per_pdf(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_pdf(world, "Docs/Guide.pdf")
    write_pdf(world, "Docs/Other.pdf")
    client = make_client(world, monkeypatch)
    payload = {
        "bookmarks": [
            {
                "id": "bandit-stat-block",
                "label": "Bandit stat block",
                "page": 42,
                "note": "Use for camp fight.",
                "created_at": "2026-06-13T12:00:00Z",
                "updated_at": "2026-06-13T12:05:00Z",
            }
        ]
    }

    put_response = client.put(
        "/api/pdf/bookmarks",
        params={"path": "Docs/Guide.pdf"},
        json=payload,
    )
    guide_response = client.get("/api/pdf/bookmarks", params={"path": "Docs/Guide.pdf"})
    other_response = client.get("/api/pdf/bookmarks", params={"path": "Docs/Other.pdf"})

    assert put_response.status_code == 200
    assert put_response.json() == payload
    assert guide_response.json() == payload
    assert other_response.json() == {"bookmarks": []}
    assert (world / ".virtualscreen" / "pdf-bookmarks.json").is_file()


@pytest.mark.parametrize(
    ("path", "expected_status"),
    [
        ("../Guide.pdf", 400),
        ("Docs/Missing.pdf", 404),
        ("Docs/Notes.md", 400),
    ],
)
def test_pdf_bookmarks_reject_invalid_missing_and_non_pdf_paths(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    path: str,
    expected_status: int,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "Docs").mkdir()
    write_pdf(world)
    (world / "Docs" / "Notes.md").write_text("# Notes\n", encoding="utf-8")
    client = make_client(world, monkeypatch)

    response = client.get("/api/pdf/bookmarks", params={"path": path})

    assert response.status_code == expected_status


@pytest.mark.parametrize(
    "payload",
    [
        {"bookmarks": "not a list"},
        {"bookmarks": [{"id": "", "label": "A", "page": 1}]},
        {"bookmarks": [{"id": "bad/id", "label": "A", "page": 1}]},
        {"bookmarks": [{"id": "a", "label": "", "page": 1}]},
        {"bookmarks": [{"id": "a", "label": "A", "page": 0}]},
        {"bookmarks": [{"id": "a", "label": "A", "page": 1}, {"id": "a", "label": "B", "page": 2}]},
    ],
)
def test_pdf_bookmarks_reject_invalid_payloads(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    payload: dict[str, object],
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_pdf(world)
    client = make_client(world, monkeypatch)

    response = client.put(
        "/api/pdf/bookmarks",
        params={"path": "Docs/Guide.pdf"},
        json=payload,
    )

    assert response.status_code == 400


def test_pdf_bookmarks_are_world_local(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    world_a = tmp_path / "a"
    world_b = tmp_path / "b"
    world_a.mkdir()
    world_b.mkdir()
    write_pdf(world_a)
    write_pdf(world_b)
    client_a = make_client(world_a, monkeypatch)
    client_b = make_client(world_b, monkeypatch)

    response = client_a.put(
        "/api/pdf/bookmarks",
        params={"path": "Docs/Guide.pdf"},
        json={
            "bookmarks": [
                {
                    "id": "a",
                    "label": "A",
                    "page": 1,
                    "created_at": "2026-06-13T12:00:00Z",
                    "updated_at": "2026-06-13T12:00:00Z",
                }
            ]
        },
    )

    assert response.status_code == 200
    assert client_b.get("/api/pdf/bookmarks", params={"path": "Docs/Guide.pdf"}).json() == {
        "bookmarks": []
    }


