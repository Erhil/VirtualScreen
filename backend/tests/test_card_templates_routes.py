import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path, token: str | None = None) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
        access_token=token or "",
    )
    return TestClient(app)


def template_payload(
    template_id: str = "npc-contact",
    name: str = "NPC Contact",
    kind: str = "npc",
    field_name: str = "Hook",
) -> dict[str, object]:
    return {
        "id": template_id,
        "name": name,
        "kind": kind,
        "description": "Compact NPC card for live use.",
        "card": {
            "kind": kind,
            "title": "{{title}}",
            "tags": [kind],
            "sections": [
                {
                    "title": "Core",
                    "fields": {
                        field_name: "",
                    },
                }
            ],
        },
    }


def v2_template_payload(template_id: str = "character-v2") -> dict[str, object]:
    return {
        "id": template_id,
        "name": "Character V2",
        "kind": "character",
        "description": "Typed character card.",
        "card": {
            "kind": "character",
            "title": "{{title}}",
            "tags": ["pc"],
            "sections": [
                {
                    "title": "Abilities",
                    "layout": "grid",
                    "fields": {
                        "STR": {"type": "number", "value": 12},
                        "Portrait": {"type": "world_link", "value": "README.md"},
                    },
                },
                {
                    "title": "Attacks",
                    "layout": "table",
                    "rows": [
                        {"Name": "Saber", "Bonus": "+5", "Damage": "1d8+3"},
                    ],
                },
            ],
        },
    }


def write_template(world: Path, name: str, payload: dict[str, object]) -> None:
    folder = world / ".virtualscreen" / "card-templates"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_text(json.dumps(payload), encoding="utf-8")


def test_card_template_catalog_returns_built_ins(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/card-templates")

    assert response.status_code == 200
    body = response.json()
    ids = [template["id"] for template in body["templates"]]
    assert ids == [
        "npc",
        "monster",
        "character",
        "spell",
        "item",
        "location",
        "reference",
        "custom",
    ]
    assert body["templates"][0]["source"] == "built_in"
    assert body["templates"][0]["card"]["title"] == "{{title}}"
    assert body["warnings"] == []


def test_card_template_catalog_scans_world_templates(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_template(world, "npc-contact.json", template_payload())
    client = make_client(world)

    response = client.get("/api/card-templates")

    assert response.status_code == 200
    body = response.json()
    template = next(item for item in body["templates"] if item["id"] == "npc-contact")
    assert template["name"] == "NPC Contact"
    assert template["source"] == "world"
    assert template["kind"] == "npc"
    assert template["card"]["sections"][0]["fields"] == {"Hook": ""}


def test_card_template_catalog_accepts_world_v2_template_shapes(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_template(world, "character-v2.json", v2_template_payload())
    client = make_client(world)

    response = client.get("/api/card-templates")

    assert response.status_code == 200
    body = response.json()
    assert body["warnings"] == []
    template = next(item for item in body["templates"] if item["id"] == "character-v2")
    assert template["source"] == "world"
    assert template["card"]["sections"][0]["fields"]["STR"] == {
        "type": "number",
        "value": 12,
    }
    assert template["card"]["sections"][1]["rows"] == [
        {"Name": "Saber", "Bonus": "+5", "Damage": "1d8+3"},
    ]


def test_card_template_catalog_allows_world_override(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_template(
        world,
        "npc.json",
        template_payload(template_id="npc", name="Campaign NPC", field_name="Need"),
    )
    client = make_client(world)

    response = client.get("/api/card-templates")

    assert response.status_code == 200
    templates = response.json()["templates"]
    assert templates[0]["id"] == "npc"
    assert templates[0]["name"] == "Campaign NPC"
    assert templates[0]["source"] == "world"
    assert templates[0]["card"]["sections"][0]["fields"] == {"Need": ""}


def test_card_template_catalog_accepts_complex_card_layouts(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_template(
        world,
        "character-sheet.json",
        {
            "id": "character-sheet",
            "name": "Character Sheet",
            "kind": "character",
            "description": "Basic typed character sheet.",
            "card": {
                "kind": "character",
                "title": "{{title}}",
                "tags": ["pc"],
                "sections": [
                    {
                        "title": "Abilities",
                        "layout": "grid",
                        "fields": {
                            "STR": {"type": "number", "value": 10},
                            "WIS": {"type": "number", "value": 16},
                            "WIS Bonus": {
                                "type": "computed",
                                "formula": "ability_mod(WIS)",
                                "format": "signed",
                            },
                            "Ally": {
                                "type": "world_link",
                                "value": "[[NPCs/Captain Ilyra]]",
                            },
                        },
                    },
                    {
                        "title": "Attacks",
                        "layout": "table",
                        "columns": ["Name", "Bonus", "Damage"],
                        "rows": [{"Name": "Saber", "Bonus": "+5", "Damage": "1d8+3"}],
                    },
                ],
            },
        },
    )
    client = make_client(world)

    response = client.get("/api/card-templates")

    assert response.status_code == 200
    template = next(
        item for item in response.json()["templates"] if item["id"] == "character-sheet"
    )
    assert template["source"] == "world"
    assert template["card"]["sections"][0]["layout"] == "grid"
    assert template["card"]["sections"][0]["fields"]["WIS Bonus"] == {
        "type": "computed",
        "formula": "ability_mod(WIS)",
        "format": "signed",
    }
    assert template["card"]["sections"][1]["rows"][0]["Name"] == "Saber"


def test_card_template_catalog_warns_for_invalid_templates(tmp_path: Path) -> None:
    world = tmp_path / "world"
    folder = world / ".virtualscreen" / "card-templates"
    folder.mkdir(parents=True)
    (folder / "broken.json").write_text("{", encoding="utf-8")
    (folder / "unsafe.json").write_text(
        json.dumps(template_payload(template_id="../bad")),
        encoding="utf-8",
    )
    (folder / "missing-card.json").write_text(
        json.dumps({"id": "missing-card", "name": "Missing", "kind": "npc"}),
        encoding="utf-8",
    )
    (folder / "missing-name.json").write_text(
        json.dumps({**template_payload(template_id="missing-name"), "name": ""}),
        encoding="utf-8",
    )
    (folder / "long-name.json").write_text(
        json.dumps({**template_payload(template_id="long-name"), "name": "x" * 81}),
        encoding="utf-8",
    )
    (folder / "invalid-card.json").write_text(
        json.dumps(
            {
                **template_payload(template_id="invalid-card"),
                "card": {
                    "kind": "npc",
                    "title": "{{title}}",
                    "tags": ["npc"],
                    "sections": [{"title": "Core", "fields": {"HP": 12}}],
                },
            }
        ),
        encoding="utf-8",
    )
    (folder / "nested").mkdir()
    (folder / "readme.txt").write_text("ignored", encoding="utf-8")
    client = make_client(world)

    response = client.get("/api/card-templates")

    assert response.status_code == 200
    body = response.json()
    assert "npc" in [template["id"] for template in body["templates"]]
    assert "invalid-card" not in [template["id"] for template in body["templates"]]
    warning_paths = {warning["path"] for warning in body["warnings"]}
    assert warning_paths == {
        ".virtualscreen/card-templates/broken.json",
        ".virtualscreen/card-templates/unsafe.json",
        ".virtualscreen/card-templates/missing-card.json",
        ".virtualscreen/card-templates/missing-name.json",
        ".virtualscreen/card-templates/long-name.json",
        ".virtualscreen/card-templates/invalid-card.json",
        ".virtualscreen/card-templates/nested",
        ".virtualscreen/card-templates/readme.txt",
    }


def test_card_template_catalog_warns_for_invalid_typed_templates(tmp_path: Path) -> None:
    world = tmp_path / "world"
    folder = world / ".virtualscreen" / "card-templates"
    folder.mkdir(parents=True)
    write_template(
        world,
        "invalid-number.json",
        {
            **v2_template_payload("invalid-number"),
            "card": {
                **v2_template_payload()["card"],  # type: ignore[index]
                "sections": [
                    {
                        "title": "Abilities",
                        "layout": "grid",
                        "fields": {
                            "STR": {"type": "number", "value": "twelve"},
                        },
                    }
                ],
            },
        },
    )
    invalid_computed_cases = {
        "invalid-computed-empty.json": {
            "Formula": {"type": "computed", "formula": ""},
        },
        "invalid-computed-format.json": {
            "Formula": {"type": "computed", "formula": "1 + 1", "format": "bonus"},
        },
        "invalid-computed-extra.json": {
            "Formula": {"type": "computed", "formula": "1 + 1", "value": 2},
        },
        "invalid-computed-row.json": {},
    }
    for filename, fields in invalid_computed_cases.items():
        if filename == "invalid-computed-row.json":
            sections = [
                {
                    "title": "Table",
                    "layout": "table",
                    "rows": [{"Formula": {"type": "computed", "formula": "1 + 1"}}],
                }
            ]
        else:
            sections = [{"title": "Core", "fields": fields}]
        write_template(
            world,
            filename,
            {
                **v2_template_payload(filename.removesuffix(".json")),
                "card": {
                    **v2_template_payload()["card"],  # type: ignore[index]
                    "sections": sections,
                },
            },
        )
    client = make_client(world)

    response = client.get("/api/card-templates")

    assert response.status_code == 200
    body = response.json()
    assert "invalid-number" not in [template["id"] for template in body["templates"]]
    assert "invalid-type" not in [template["id"] for template in body["templates"]]
    warnings = {warning["path"]: warning["message"] for warning in body["warnings"]}
    assert warnings[".virtualscreen/card-templates/invalid-number.json"] == (
        "card.sections[0].fields.STR.value must be a number"
    )
    assert warnings[".virtualscreen/card-templates/invalid-computed-empty.json"] == (
        "card.sections[0].fields.Formula.formula must be a non-empty string"
    )
    assert warnings[".virtualscreen/card-templates/invalid-computed-format.json"] == (
        "card.sections[0].fields.Formula.format must be plain or signed"
    )
    assert warnings[".virtualscreen/card-templates/invalid-computed-extra.json"] == (
        "card.sections[0].fields.Formula may only contain type, formula, and format"
    )
    assert warnings[".virtualscreen/card-templates/invalid-computed-row.json"] == (
        "card.sections[0].rows[0].Formula.type must be supported"
    )


def test_card_templates_are_hidden_from_tree_pages_and_search(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_template(world, "npc-contact.json", template_payload(field_name="SecretPhrase"))
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    client = make_client(world)

    tree_response = client.get("/api/world/tree")
    pages_response = client.get("/api/pages")
    search_response = client.get("/api/search", params={"q": "SecretPhrase"})

    assert tree_response.status_code == 200
    assert ".virtualscreen" not in [
        child["name"] for child in tree_response.json()["children"]
    ]
    assert all(
        page["path"] != ".virtualscreen/card-templates/npc-contact.json"
        for page in pages_response.json()
    )
    assert search_response.json() == []


def test_card_template_catalog_is_auth_protected(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world, token="secret")

    locked_response = client.get("/api/card-templates")
    unlocked_response = client.get(
        "/api/card-templates",
        headers={"X-VirtualScreen-Token": "secret"},
    )

    assert locked_response.status_code == 401
    assert unlocked_response.status_code == 200
