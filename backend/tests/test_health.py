from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_check() -> None:
    client = TestClient(create_app())

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "virtualscreen-api"}


def test_api_routes_are_registered_once() -> None:
    app = create_app()
    seen: set[tuple[str, str]] = set()
    duplicates: set[tuple[str, str]] = set()

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in route.methods:
            key = (method, route.path)
            if key in seen:
                duplicates.add(key)
            seen.add(key)

    assert duplicates == set()
