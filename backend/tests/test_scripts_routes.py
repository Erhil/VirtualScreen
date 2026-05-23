import json
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import scripts as scripts_core
from app.core.config import Settings, get_settings
from app.core.map import map_state_from_payload, save_map_preset
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings():
    yield
    get_settings.cache_clear()


def make_client(
    world: Path,
    *,
    token: str | None = None,
    auto_trust: bool = True,
) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        access_token=token,
        world_root=world,
    )
    client = TestClient(app)
    if auto_trust:
        trust_response = client.post("/api/scripts/trust")
        assert trust_response.status_code == 200
    return client


def make_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    (world / "Scripts").mkdir(parents=True)
    (world / "Media").mkdir()
    (world / ".music" / "effects").mkdir(parents=True)
    (world / "README.md").write_text("# Home", encoding="utf-8")
    (world / "Media" / "map.svg").write_text("<svg></svg>", encoding="utf-8")
    (world / ".music" / "effects" / "glass.wav").write_bytes(b"wav")
    return world


def write_script(world: Path, path: str, content: str) -> None:
    target = world.joinpath(*path.split("/"))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def wait_for_run(
    client: TestClient,
    run_id: str,
    *,
    terminal: set[str] | None = None,
) -> dict:
    terminal = terminal or {"success", "error", "timeout", "cancelled", "waiting_for_form"}
    for _ in range(240):
        response = client.get(f"/api/scripts/runs/{run_id}")
        assert response.status_code == 200
        run = response.json()
        if run["status"] in terminal:
            return run
        time.sleep(0.05)
    raise AssertionError(f"DMS run {run_id} did not finish")


def test_dms_trust_required_before_run_and_acknowledgement_enables_it(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(world, "Scripts/trusted.dms", "create_note('Notes/trusted.md', '# Trusted')\n")
    (world / "Notes").mkdir()
    client = make_client(world, auto_trust=False)

    trust_status = client.get("/api/scripts/trust")
    blocked = client.post("/api/scripts/run", json={"path": "Scripts/trusted.dms"})
    trust = client.post("/api/scripts/trust")
    started = client.post("/api/scripts/run", json={"path": "Scripts/trusted.dms"})

    assert trust_status.status_code == 200
    assert trust_status.json() == {"trusted": False}
    assert blocked.status_code == 403
    assert not (world / "Notes" / "trusted.md").exists()
    assert trust.status_code == 200
    assert trust.json() == {"trusted": True}
    assert started.status_code == 200
    assert wait_for_run(client, started.json()["run_id"])["status"] == "success"
    assert (world / "Notes" / "trusted.md").exists()


def test_dms_subprocess_environment_does_not_inherit_unrelated_secrets(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("UNRELATED_SECRET_TOKEN", "do-not-leak")
    world = make_world(tmp_path)
    write_script(
        world,
        "Scripts/env.dms",
        "\n".join(
            [
                "import os",
                "secret = os.environ.get('UNRELATED_SECRET_TOKEN', 'missing')",
                "run_id = 'set' if os.environ.get('VIRTUALSCREEN_DMS_RUN_ID') else 'missing'",
                "render_md(f'{secret}|{run_id}')",
            ]
        ),
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/env.dms"})
    run = wait_for_run(client, started.json()["run_id"])

    assert run["status"] == "success"
    assert run["outputs"][0]["content"] == "missing|set"
    assert "do-not-leak" not in run["stdout"]
    assert "do-not-leak" not in run["stderr"]


def test_lists_dms_scripts_and_rejects_unsafe_run_paths(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(world, "Scripts/hello.dms", "render_md('# Hello')")
    (world / "Scripts" / "note.txt").write_text("nope", encoding="utf-8")
    client = make_client(world)

    response = client.get("/api/scripts")

    assert response.status_code == 200
    assert [item["path"] for item in response.json()] == ["Scripts/hello.dms"]

    assert client.post("/api/scripts/run", json={"path": "../hello.dms"}).status_code == 400
    assert client.post("/api/scripts/run", json={"path": "Scripts"}).status_code == 400
    assert client.post("/api/scripts/run", json={"path": "missing.dms"}).status_code == 404
    assert client.post("/api/scripts/run", json={"path": "Scripts/note.txt"}).status_code == 415


def test_run_dms_render_outputs(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(
        world,
        "Scripts/render.dms",
        "render_md('# Hello DMS')\nrender_csv('result,event\\n1,Door')\n",
    )
    client = make_client(world)

    response = client.post("/api/scripts/run", json={"path": "Scripts/render.dms"})

    assert response.status_code == 200
    started = response.json()
    assert started["run_id"]
    assert started["status"] in {"running", "success"}
    run = wait_for_run(client, started["run_id"])
    assert run["status"] == "success"
    assert [output["media_kind"] for output in run["outputs"]] == ["markdown", "csv"]
    assert run["outputs"][0]["content"] == "# Hello DMS"
    assert run["outputs"][1]["content"] == "result,event\n1,Door"


def test_dms_runs_and_outputs_are_retained_with_caps(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = make_world(tmp_path)
    write_script(
        world,
        "Scripts/many_outputs.dms",
        "\n".join(
            [
                "render_md('1234567890abcdef')",
                "render_csv('abcdefghijklmnop')",
                "render_md('third output')",
            ]
        ),
    )
    monkeypatch.setattr(scripts_core, "MAX_DMS_RUNS", 2)
    monkeypatch.setattr(scripts_core, "MAX_DMS_OUTPUTS_PER_RUN", 2)
    monkeypatch.setattr(scripts_core, "MAX_DMS_OUTPUT_CONTENT_CHARS", 12)
    with scripts_core._RUNS_LOCK:
        scripts_core._RUNS.clear()
    client = make_client(world)

    run_ids: list[str] = []
    try:
        for _ in range(3):
            started = client.post("/api/scripts/run", json={"path": "Scripts/many_outputs.dms"})
            assert started.status_code == 200
            run_id = started.json()["run_id"]
            run_ids.append(run_id)
            wait_for_run(client, run_id)

        first_response = client.get(f"/api/scripts/runs/{run_ids[0]}")
        second_response = client.get(f"/api/scripts/runs/{run_ids[1]}")
        latest_response = client.get(f"/api/scripts/runs/{run_ids[2]}")

        assert first_response.status_code == 404
        assert second_response.status_code == 200
        assert latest_response.status_code == 200
        outputs = latest_response.json()["outputs"]
        assert len(outputs) == 2
        assert outputs[0]["content"] == "1234567890ab"
        assert outputs[1]["content"] == "abcdefghijkl"
        assert not (world / ".virtualscreen" / "dms-runs" / run_ids[0]).exists()
    finally:
        with scripts_core._RUNS_LOCK:
            scripts_core._RUNS.clear()


def test_dms_form_pauses_and_resumes(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(
        world,
        "Scripts/form.dms",
        "schema = {'name': 'text'}\nname = form(schema)['name']\nrender_md(f'# {name}')\n",
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/form.dms"})

    assert started.status_code == 200
    waiting = wait_for_run(client, started.json()["run_id"])
    assert waiting["status"] == "waiting_for_form"
    assert waiting["form_request"]["schema"] == {"name": "text"}

    resumed = client.post(
        f"/api/scripts/runs/{waiting['run_id']}/form",
        json={"values": {"name": "Ilyra"}},
    )

    assert resumed.status_code == 200
    run = wait_for_run(client, resumed.json()["run_id"])
    assert run["status"] == "success"
    assert run["outputs"][0]["content"] == "# Ilyra"


def test_dms_screen_and_audio_effects_are_validated(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(
        world,
        "Scripts/effects.dms",
        "\n".join(
            [
                "screen_fs('README.md')",
                "screen_pu('Media/map.svg')",
                "audio_play('.music/effects/glass.wav', volume=45)",
            ]
        ),
    )
    client = make_client(world)

    response = client.post("/api/scripts/run", json={"path": "Scripts/effects.dms"})

    assert response.status_code == 200
    effects = wait_for_run(client, response.json()["run_id"])["effects"]
    assert effects == [
        {"id": "effect-1", "kind": "screen_fullscreen", "path": "README.md"},
        {"id": "effect-2", "kind": "screen_popup", "path": "Media/map.svg"},
        {
            "id": "effect-3",
            "kind": "audio_play",
            "path": ".music/effects/glass.wav",
            "bus": "effect",
            "volume": 45,
        },
    ]


def test_dms_write_commands_reject_music_paths_but_audio_can_play(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / ".music" / "effects" / "existing.md").write_text("# Hidden", encoding="utf-8")
    scripts = {
        "create_note_music.dms": "create_note('.music/effects/no.md', '# No')",
        "append_note_music.dms": "append_note('.music/effects/existing.md', '\\nNo')",
        "create_card_music.dms": "create_card('.music/effects/No.cs', card_template())",
        "audio_music.dms": "audio_play('.music/effects/glass.wav')",
    }
    client = make_client(world)

    for name, content in scripts.items():
        write_script(world, f"Scripts/{name}", content)
        started = client.post("/api/scripts/run", json={"path": f"Scripts/{name}"})
        run = wait_for_run(client, started.json()["run_id"])
        if name == "audio_music.dms":
            assert run["status"] == "success", name
            assert run["effects"][0]["path"] == ".music/effects/glass.wav"
        else:
            assert run["status"] == "error", name
            assert "DMS write path is not allowed" in run["stderr"]

    assert not (world / ".music" / "effects" / "no.md").exists()
    assert (world / ".music" / "effects" / "existing.md").read_text(
        encoding="utf-8",
    ) == "# Hidden"
    assert not (world / ".music" / "effects" / "No.cs").exists()


def test_dms_map_effects_are_validated(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(
        world,
        "Scripts/map_effects.dms",
        "\n".join(
            [
                "map_load('Media/map.svg', present=True)",
                "map_present()",
                "map_stop()",
                "map_fog(True)",
            ]
        ),
    )
    client = make_client(world)

    response = client.post("/api/scripts/run", json={"path": "Scripts/map_effects.dms"})

    assert response.status_code == 200
    effects = wait_for_run(client, response.json()["run_id"])["effects"]
    assert effects == [
        {
            "id": "effect-1",
            "kind": "map_load",
            "path": "Media/map.svg",
            "present": True,
        },
        {"id": "effect-2", "kind": "map_present"},
        {"id": "effect-3", "kind": "map_stop"},
        {"id": "effect-4", "kind": "map_fog", "enabled": True},
    ]


def test_dms_map_preset_resolves_by_unique_exact_name_and_id(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    preset = save_map_preset(
        world,
        "Encounter",
        map_state_from_payload({"image_path": "Media/map.svg"}),
    )
    write_script(
        world,
        "Scripts/map_preset.dms",
        "\n".join(
            [
                "map_preset('Encounter', present=True)",
                f"map_preset('{preset.id}', present=False)",
            ]
        ),
    )
    client = make_client(world)

    response = client.post("/api/scripts/run", json={"path": "Scripts/map_preset.dms"})

    assert response.status_code == 200
    effects = wait_for_run(client, response.json()["run_id"])["effects"]
    assert effects == [
        {
            "id": "effect-1",
            "kind": "map_preset",
            "preset_id": preset.id,
            "present": True,
        },
        {
            "id": "effect-2",
            "kind": "map_preset",
            "preset_id": preset.id,
            "present": False,
        },
    ]


def test_dms_map_preset_missing_and_duplicate_names_error(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    save_map_preset(world, "Encounter", map_state_from_payload({"image_path": "Media/map.svg"}))
    save_map_preset(world, "Encounter", map_state_from_payload({"image_path": "Media/map.svg"}))
    write_script(world, "Scripts/missing_preset.dms", "map_preset('Missing')")
    write_script(world, "Scripts/duplicate_preset.dms", "map_preset('Encounter')")
    client = make_client(world)

    missing = client.post("/api/scripts/run", json={"path": "Scripts/missing_preset.dms"})
    duplicate = client.post("/api/scripts/run", json={"path": "Scripts/duplicate_preset.dms"})

    assert missing.status_code == 200
    missing_run = wait_for_run(client, missing.json()["run_id"])
    assert missing_run["status"] == "error"
    assert "Map preset was not found" in missing_run["stderr"]
    assert duplicate.status_code == 200
    duplicate_run = wait_for_run(client, duplicate.json()["run_id"])
    assert duplicate_run["status"] == "error"
    assert "Map preset name is not unique" in duplicate_run["stderr"]


def test_dms_map_load_rejects_unsafe_and_non_image_paths(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Media" / "note.txt").write_text("not an image", encoding="utf-8")
    scripts = {
        "unsafe_map.dms": "map_load('../map.svg')",
        "non_image_map.dms": "map_load('Media/note.txt')",
    }
    client = make_client(world)

    for name, content in scripts.items():
        write_script(world, f"Scripts/{name}", content)
        started = client.post("/api/scripts/run", json={"path": f"Scripts/{name}"})
        run = wait_for_run(client, started.json()["run_id"])
        assert run["status"] == "error", name


def test_dms_errors_timeouts_and_auth_protection(tmp_path: Path, monkeypatch) -> None:
    world = make_world(tmp_path)
    write_script(world, "Scripts/fail.dms", "raise RuntimeError('bad omen')\n")
    write_script(world, "Scripts/slow.dms", "import time\ntime.sleep(11)\n")
    client = make_client(world)

    failed = client.post("/api/scripts/run", json={"path": "Scripts/fail.dms"})
    timed_out = client.post("/api/scripts/run", json={"path": "Scripts/slow.dms"})

    assert failed.status_code == 200
    failed_run = wait_for_run(client, failed.json()["run_id"])
    assert failed_run["status"] == "error"
    assert "bad omen" in failed_run["stderr"]
    assert "Scripts/fail.dms" in failed_run["stderr"]
    assert timed_out.status_code == 200
    timed_out_run = wait_for_run(client, timed_out.json()["run_id"])
    assert timed_out_run["status"] == "timeout"
    assert "timed out" in timed_out_run["stderr"].lower()

    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", "secret")
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    get_settings.cache_clear()
    locked_client = TestClient(create_app())
    assert locked_client.get("/api/scripts").status_code == 401
    assert locked_client.get("/api/screen/display/state").status_code == 200


def test_dms_runs_can_be_cancelled(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(world, "Scripts/slow.dms", "import time\ntime.sleep(10)\n")
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/slow.dms"})

    assert started.status_code == 200
    assert started.json()["status"] in {"running", "success"}
    cancelled = client.post(f"/api/scripts/runs/{started.json()['run_id']}/cancel")
    assert cancelled.status_code == 200
    run = wait_for_run(client, started.json()["run_id"], terminal={"cancelled"})
    assert run["status"] == "cancelled"


def test_dms_core_commands_and_file_selection(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Tables").mkdir()
    (world / "Tables" / "random-events.csv").write_text(
        "result,event,tone\n1,River Gate,warm\n",
        encoding="utf-8",
    )
    write_script(
        world,
        "Scripts/core.dms",
        "\n".join(
            [
                "selected = choose_file('Pick a page', kind='markdown')",
                "row = table('Tables/random-events.csv')",
                "value = roll('1d1+2')",
                "render_md(f'# Core\\n{selected}\\n{row[\"event\"]}\\n{value}')",
            ]
        ),
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/core.dms"})

    assert started.status_code == 200
    waiting = wait_for_run(client, started.json()["run_id"])
    assert waiting["status"] == "waiting_for_form"
    assert waiting["form_request"]["schema"]["path"]["type"] == "file"

    resumed = client.post(
        f"/api/scripts/runs/{waiting['run_id']}/form",
        json={"values": {"path": "README.md"}},
    )

    assert resumed.status_code == 200
    run = wait_for_run(client, resumed.json()["run_id"])
    assert run["status"] == "success"
    assert "README.md" in run["outputs"][0]["content"]
    assert "River Gate" in run["outputs"][0]["content"]
    assert "\n3" in run["outputs"][0]["content"]


def test_dms_note_writes_are_deferred_until_success(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    write_script(
        world,
        "Scripts/write_wait.dms",
        "create_note('Notes/wait.md', '# Wait')\nform({'ok': 'text'})\n",
    )
    write_script(
        world,
        "Scripts/write_fail.dms",
        "create_note('Notes/fail.md', '# Fail')\nraise RuntimeError('nope')\n",
    )
    write_script(
        world,
        "Scripts/write_success.dms",
        "create_note('Notes/success.md', '# Success')\nappend_note('README.md', '\\nAppended')\n",
    )
    (world / "Notes").mkdir()
    client = make_client(world)

    waiting = client.post("/api/scripts/run", json={"path": "Scripts/write_wait.dms"})
    wait_for_run(client, waiting.json()["run_id"])
    assert not (world / "Notes" / "wait.md").exists()

    failed = client.post("/api/scripts/run", json={"path": "Scripts/write_fail.dms"})
    failed_run = wait_for_run(client, failed.json()["run_id"])
    assert failed_run["status"] == "error"
    assert not (world / "Notes" / "fail.md").exists()

    succeeded = client.post("/api/scripts/run", json={"path": "Scripts/write_success.dms"})
    success_run = wait_for_run(client, succeeded.json()["run_id"])
    assert success_run["status"] == "success"
    assert (world / "Notes" / "success.md").read_text(encoding="utf-8") == "# Success"
    assert "Appended" in (world / "README.md").read_text(encoding="utf-8")
    assert list((world / ".virtualscreen" / "backups").rglob("README.md"))


def test_dms_note_write_safety(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Notes").mkdir()
    (world / "Notes" / "existing.md").write_text("# Existing", encoding="utf-8")
    scripts = {
        "internal.dms": "create_note('.virtualscreen/no.md', '# No')",
        "traversal.dms": "create_note('../no.md', '# No')",
        "missing_parent.dms": "create_note('Missing/no.md', '# No')",
        "duplicate.dms": "create_note('Notes/existing.md', '# No')",
        "unsupported.dms": "create_note('Notes/no.txt', '# No')",
        "bad_table.dms": "table('../secret.csv')",
    }
    client = make_client(world)

    for name, content in scripts.items():
        write_script(world, f"Scripts/{name}", content)
        started = client.post("/api/scripts/run", json={"path": f"Scripts/{name}"})
        run = wait_for_run(client, started.json()["run_id"])
        assert run["status"] == "error", name


def test_dms_writes_reject_reserved_path_segments(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Notes" / ".virtualscreen").mkdir(parents=True)
    (world / "Notes" / ".git").mkdir()
    (world / "Notes" / "__pycache__").mkdir()
    scripts = {
        "nested_internal.dms": "create_note('Notes/.virtualscreen/no.md', '# No')",
        "nested_git.dms": "create_note('Notes/.git/no.md', '# No')",
        "nested_cache.dms": "create_note('Notes/__pycache__/no.md', '# No')",
    }
    client = make_client(world)

    for name, content in scripts.items():
        write_script(world, f"Scripts/{name}", content)
        started = client.post("/api/scripts/run", json={"path": f"Scripts/{name}"})
        run = wait_for_run(client, started.json()["run_id"])
        assert run["status"] == "error", name
        assert "DMS write path is not allowed" in run["stderr"]

    assert not (world / "Notes" / ".virtualscreen" / "no.md").exists()
    assert not (world / "Notes" / ".git" / "no.md").exists()
    assert not (world / "Notes" / "__pycache__" / "no.md").exists()


def test_dms_card_template_can_create_valid_card(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    write_script(
        world,
        "Scripts/create_card.dms",
        "\n".join(
            [
                "card = card_template('npc', 'Captain Mira')",
                "card['tags'].append('harbor')",
                "card['sections'][0]['fields']['note'] = 'Keeps the star-chart.'",
                "create_card('Cards/Mira.cs', card)",
            ]
        ),
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/create_card.dms"})
    run = wait_for_run(client, started.json()["run_id"])

    assert run["status"] == "success"
    card = json.loads((world / "Cards" / "Mira.cs").read_text(encoding="utf-8"))
    assert card["kind"] == "npc"
    assert card["title"] == "Captain Mira"
    assert card["tags"] == ["harbor"]
    assert card["sections"][0]["title"] == "Core"
    assert card["sections"][0]["fields"]["Role"] == ""
    assert card["sections"][0]["fields"]["note"] == "Keeps the star-chart."


def test_dms_card_template_uses_world_local_templates(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    template_folder = world / ".virtualscreen" / "card-templates"
    template_folder.mkdir(parents=True)
    (template_folder / "npc-contact.json").write_text(
        json.dumps(
            {
                "id": "npc-contact",
                "name": "NPC Contact",
                "kind": "npc",
                "description": "Contact card.",
                "card": {
                    "kind": "npc",
                    "title": "{{title}}",
                    "tags": ["npc", "{{title}}"],
                    "sections": [
                        {
                            "title": "{{title}} Core",
                            "fields": {
                                "Hook": "Find {{title}} near the docks.",
                            },
                        }
                    ],
                },
            }
        ),
        encoding="utf-8",
    )
    write_script(
        world,
        "Scripts/create_custom_card.dms",
        "\n".join(
            [
                "card = card_template('npc-contact', 'Captain Mira')",
                "create_card('Cards/Mira Contact.cs', card)",
            ]
        ),
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/create_custom_card.dms"})
    run = wait_for_run(client, started.json()["run_id"])

    assert run["status"] == "success"
    card = json.loads((world / "Cards" / "Mira Contact.cs").read_text(encoding="utf-8"))
    assert card["title"] == "Captain Mira"
    assert card["tags"] == ["npc", "Captain Mira"]
    assert card["sections"][0]["title"] == "Captain Mira Core"
    assert card["sections"][0]["fields"]["Hook"] == "Find Captain Mira near the docks."


def test_dms_card_template_missing_custom_id_errors(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    write_script(
        world,
        "Scripts/missing_template.dms",
        "create_card('Cards/Missing.cs', card_template('missing-template', 'Missing'))",
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/missing_template.dms"})
    run = wait_for_run(client, started.json()["run_id"])

    assert run["status"] == "error"
    assert "Card template 'missing-template' was not found." in run["stderr"]
    assert not (world / "Cards" / "Missing.cs").exists()


def test_dms_create_card_is_searchable_only_after_success(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    write_script(
        world,
        "Scripts/create_card_wait.dms",
        "\n".join(
            [
                "card = card_template('npc', 'Captain Mira')",
                "card['sections'][0]['fields']['secret'] = 'opal' + 'clasp'",
                "create_card('Cards/Generated NPC.cs', card)",
                "form({'ok': 'text'})",
            ]
        ),
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/create_card_wait.dms"})
    waiting = wait_for_run(client, started.json()["run_id"])

    assert waiting["status"] == "waiting_for_form"
    assert not (world / "Cards" / "Generated NPC.cs").exists()
    assert client.get("/api/search", params={"q": "opalclasp"}).json() == []

    resumed = client.post(
        f"/api/scripts/runs/{waiting['run_id']}/form",
        json={"values": {"ok": "yes"}},
    )
    run = wait_for_run(client, resumed.json()["run_id"])

    assert run["status"] == "success"
    assert (world / "Cards" / "Generated NPC.cs").exists()
    results = client.get("/api/search", params={"q": "opalclasp"}).json()
    assert results[0]["path"] == "Cards/Generated NPC.cs"
    assert results[0]["media_kind"] == "card"


def test_dms_create_card_accepts_v2_payload_and_rejects_invalid_v2(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    write_script(
        world,
        "Scripts/create_v2_card.dms",
        "\n".join(
            [
                "create_card('Cards/Mira V2.cs', {",
                "    'kind': 'character',",
                "    'title': 'Mira V2',",
                "    'tags': ['pc'],",
                "    'sections': [",
                "        {",
                "            'title': 'Abilities',",
                "            'layout': 'grid',",
                "            'fields': {",
                "                'STR': {'type': 'number', 'value': 12},",
                "                'WIS': {'type': 'number', 'value': 16},",
                "                'Perception_flag': {'type': 'boolean', 'value': True},",
                "                'Perception_bonus': {",
                "                    'type': 'computed',",
                "                    'formula': 'ability_mod(WIS) + Perception_flag * 3',",
                "                    'format': 'signed',",
                "                },",
                "                'Home': {'type': 'world_link', 'value': 'README.md'},",
                "            },",
                "        },",
                "        {",
                "            'title': 'Attacks',",
                "            'layout': 'table',",
                "            'rows': [{'Name': 'Saber', 'Damage': 'starlight'}],",
                "        },",
                "    ],",
                "})",
            ]
        ),
    )
    write_script(
        world,
        "Scripts/create_invalid_v2_card.dms",
        "\n".join(
            [
                "create_card('Cards/Invalid V2.cs', {",
                "    'kind': 'character',",
                "    'title': 'Invalid V2',",
                "    'tags': [],",
                "    'sections': [{",
                "        'title': 'Abilities',",
                "        'fields': {'STR': {'type': 'number', 'value': 'twelve'}},",
                "    }],",
                "})",
            ]
        ),
    )
    client = make_client(world)

    created = client.post("/api/scripts/run", json={"path": "Scripts/create_v2_card.dms"})
    create_run = wait_for_run(client, created.json()["run_id"])
    rejected = client.post("/api/scripts/run", json={"path": "Scripts/create_invalid_v2_card.dms"})
    reject_run = wait_for_run(client, rejected.json()["run_id"])
    search_response = client.get("/api/search", params={"q": "starlight"})

    assert create_run["status"] == "success"
    card = json.loads((world / "Cards" / "Mira V2.cs").read_text(encoding="utf-8"))
    assert card["sections"][0]["fields"]["STR"] == {"type": "number", "value": 12}
    assert card["sections"][0]["fields"]["Perception_bonus"] == {
        "type": "computed",
        "formula": "ability_mod(WIS) + Perception_flag * 3",
        "format": "signed",
    }
    assert search_response.json()[0]["path"] == "Cards/Mira V2.cs"
    assert reject_run["status"] == "error"
    assert "value must be a number" in reject_run["stderr"]
    assert not (world / "Cards" / "Invalid V2.cs").exists()


def test_dms_create_card_rejects_invalid_computed_payload(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    write_script(
        world,
        "Scripts/create_invalid_computed_card.dms",
        "\n".join(
            [
                "create_card('Cards/Invalid Computed.cs', {",
                "    'kind': 'character',",
                "    'title': 'Invalid Computed',",
                "    'tags': [],",
                "    'sections': [{",
                "        'title': 'Abilities',",
                "        'fields': {",
                "            'WIS': {'type': 'number', 'value': 16},",
                "            'WIS Bonus': {",
                "                'type': 'computed',",
                "                'formula': 'ability_mod(WIS)',",
                "                'format': 'bonus',",
                "            },",
                "        },",
                "    }],",
                "})",
            ]
        ),
    )
    client = make_client(world)

    started = client.post(
        "/api/scripts/run",
        json={"path": "Scripts/create_invalid_computed_card.dms"},
    )
    run = wait_for_run(client, started.json()["run_id"])

    assert run["status"] == "error"
    assert "format must be plain or signed" in run["stderr"]
    assert not (world / "Cards" / "Invalid Computed.cs").exists()


def test_dms_card_writes_are_deferred_until_success(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    write_script(
        world,
        "Scripts/create_card_fail.dms",
        "create_card('Cards/Failed.cs', card_template('npc', 'Failed Card'))\n"
        "raise RuntimeError('no card')\n",
    )
    client = make_client(world)

    started = client.post("/api/scripts/run", json={"path": "Scripts/create_card_fail.dms"})
    run = wait_for_run(client, started.json()["run_id"])

    assert run["status"] == "error"
    assert not (world / "Cards" / "Failed.cs").exists()


def test_dms_create_card_safety(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    (world / "Cards").mkdir()
    card = {"kind": "npc", "title": "Existing", "tags": [], "sections": []}
    (world / "Cards" / "Existing.cs").write_text(
        json.dumps(card),
        encoding="utf-8",
    )
    scripts = {
        "card_traversal.dms": "create_card('../No.cs', card_template())",
        "card_internal.dms": "create_card('.virtualscreen/No.cs', card_template())",
        "card_music.dms": "create_card('.music/No.cs', card_template())",
        "card_missing_parent.dms": "create_card('Missing/No.cs', card_template())",
        "card_duplicate.dms": "create_card('Cards/Existing.cs', card_template())",
        "card_extension.dms": "create_card('Cards/No.md', card_template())",
        "card_invalid_payload.dms": "create_card('Cards/Invalid.cs', {'title': 'Invalid'})",
    }
    client = make_client(world)

    assert card["title"] == "Existing"
    for name, content in scripts.items():
        write_script(world, f"Scripts/{name}", content)
        started = client.post("/api/scripts/run", json={"path": f"Scripts/{name}"})
        run = wait_for_run(client, started.json()["run_id"])
        assert run["status"] == "error", name
