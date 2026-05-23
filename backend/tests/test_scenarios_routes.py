from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(world: Path, *, enable_legacy_scenarios: bool = True) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
        enable_legacy_scenarios=enable_legacy_scenarios,
    )
    return TestClient(app)


def write_scenario(
    world: Path,
    scenario_id: str,
    manifest: str,
    script: str = "import sys\nprint(sys.stdin.read())\n",
) -> None:
    folder = world / ".virtualscreen" / "scenarios" / scenario_id
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "scenario.json").write_text(manifest, encoding="utf-8")
    (folder / "main.py").write_text(script, encoding="utf-8")


def make_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    world.mkdir()
    write_scenario(
        world,
        "create-npc",
        """
        {
          "id": "create-npc",
          "name": "Create NPC",
          "description": "Generate a quick NPC",
          "script": "main.py",
          "timeout_seconds": 5,
          "output_kind": "markdown",
          "inputs": [
            {
              "name": "name",
              "label": "Name",
              "input_type": "text",
              "required": true,
              "default": null,
              "options": []
            }
          ]
        }
        """,
        "import json, sys\nprint('# ' + json.load(sys.stdin)['name'])\n",
    )
    write_scenario(
        world,
        "invalid",
        '{"id":"invalid","name":"Invalid","script":"../oops.py","inputs":[]}',
    )
    return world


def test_legacy_scenario_routes_are_unavailable_by_default(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    client = make_client(world, enable_legacy_scenarios=False)

    list_response = client.get("/api/scenarios")
    run_response = client.post("/api/scenarios/create-npc/run", json={"inputs": {"name": "Mira"}})
    runs_response = client.get("/api/scenarios/runs")

    assert Settings(world_root=world).enable_legacy_scenarios is False
    assert list_response.status_code == 404
    assert run_response.status_code == 404
    assert runs_response.status_code == 404


def test_legacy_scenario_env_opt_in_restores_compatibility(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = make_world(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    monkeypatch.setenv("VIRTUALSCREEN_ENABLE_LEGACY_SCENARIOS", "true")
    get_settings.cache_clear()
    client = TestClient(create_app())

    response = client.get("/api/scenarios")

    assert response.status_code == 200
    assert [scenario["id"] for scenario in response.json()] == ["create-npc"]


def test_valid_manifest_is_discovered_and_invalid_manifest_is_ignored(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.get("/api/scenarios")

    assert response.status_code == 200
    scenarios = response.json()
    assert [scenario["id"] for scenario in scenarios] == ["create-npc"]
    assert scenarios[0]["inputs"][0]["name"] == "name"


def test_running_scenario_passes_inputs_on_stdin(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.post(
        "/api/scenarios/create-npc/run",
        json={"inputs": {"name": "Ilyra"}},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "success"
    assert result["output_kind"] == "markdown"
    assert result["output"] == "# Ilyra\n"


def test_scenario_nonzero_exit_returns_error(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_scenario(
        world,
        "fail",
        '{"id":"fail","name":"Fail","script":"main.py","output_kind":"text","inputs":[]}',
        "import sys\nprint('bad', file=sys.stderr)\nsys.exit(2)\n",
    )
    client = make_client(world)

    response = client.post("/api/scenarios/fail/run", json={"inputs": {}})

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert "bad" in response.json()["stderr"]


def test_scenario_timeout_returns_timeout(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_scenario(
        world,
        "slow",
        '{"id":"slow","name":"Slow","script":"main.py","timeout_seconds":1,"inputs":[]}',
        "import time\ntime.sleep(2)\n",
    )
    client = make_client(world)

    response = client.post("/api/scenarios/slow/run", json={"inputs": {}})

    assert response.status_code == 200
    assert response.json()["status"] == "timeout"


def test_scenario_runs_history_keeps_latest_results(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    client.post("/api/scenarios/create-npc/run", json={"inputs": {"name": "A"}})
    client.post("/api/scenarios/create-npc/run", json={"inputs": {"name": "B"}})

    response = client.get("/api/scenarios/runs")

    assert response.status_code == 200
    assert [item["output"] for item in response.json()] == ["# B\n", "# A\n"]


def test_legacy_scenarios_are_discoverable_and_runnable_from_test_fixtures(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_scenario(
        world,
        "random-event",
        """
        {
          "id": "random-event",
          "name": "Random Event",
          "script": "main.py",
          "timeout_seconds": 5,
          "output_kind": "markdown",
          "inputs": []
        }
        """,
        "print('# Random Event')\n",
    )
    write_scenario(
        world,
        "create-npc",
        """
        {
          "id": "create-npc",
          "name": "Create NPC",
          "script": "main.py",
          "timeout_seconds": 5,
          "output_kind": "markdown",
          "inputs": [
            {"name": "name", "label": "Name", "input_type": "text", "required": true}
          ]
        }
        """,
        "import json, sys\nprint('# ' + json.load(sys.stdin)['name'])\n",
    )
    client = make_client(world)

    response = client.get("/api/scenarios")

    assert response.status_code == 200
    scenario_ids = [scenario["id"] for scenario in response.json()]
    assert scenario_ids == ["create-npc", "random-event"]

    run = client.post(
        "/api/scenarios/create-npc/run",
        json={"inputs": {"name": "Mira"}},
    )

    assert run.status_code == 200
    assert run.json()["status"] == "success"
    assert "# Mira" in run.json()["output"]
