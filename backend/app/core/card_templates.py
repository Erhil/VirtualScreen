import json
import re
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel

TemplateKind = Literal[
    "npc",
    "monster",
    "character",
    "spell",
    "item",
    "location",
    "reference",
    "custom",
]
TemplateSource = Literal["built_in", "world"]

VALID_KINDS = {
    "npc",
    "monster",
    "character",
    "spell",
    "item",
    "location",
    "reference",
    "custom",
}
TEMPLATE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
SUPPORTED_FIELD_TYPES = {"text", "number", "boolean", "select", "long_text", "world_link"}
COMPUTED_FIELD_TYPE = "computed"
COMPUTED_FORMATS = {"plain", "signed"}


class CardTemplate(BaseModel):
    id: str
    name: str
    kind: TemplateKind
    description: str | None
    source: TemplateSource
    card: dict[str, Any]


class CardTemplateWarning(BaseModel):
    path: str
    message: str


class CardTemplateCatalog(BaseModel):
    templates: list[CardTemplate]
    warnings: list[CardTemplateWarning]


def _card(kind: TemplateKind, sections: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "kind": kind,
        "title": "{{title}}",
        "tags": [],
        "sections": sections,
    }


BUILT_IN_TEMPLATES: tuple[CardTemplate, ...] = (
    CardTemplate(
        id="npc",
        name="NPC",
        kind="npc",
        description=None,
        source="built_in",
        card=_card(
            "npc",
            [
                {"title": "Core", "fields": {"Role": "", "Location": ""}},
                {"title": "Notes", "fields": {"Hooks": ""}},
            ],
        ),
    ),
    CardTemplate(
        id="monster",
        name="Monster",
        kind="monster",
        description=None,
        source="built_in",
        card=_card(
            "monster",
            [
                {"title": "Core", "fields": {"Type": "", "Threat": ""}},
                {"title": "Notes", "fields": {"Tactics": ""}},
            ],
        ),
    ),
    CardTemplate(
        id="character",
        name="Character",
        kind="character",
        description=None,
        source="built_in",
        card=_card(
            "character",
            [
                {"title": "Core", "fields": {"Class": "", "Level": ""}},
                {"title": "Notes", "fields": {"Goals": ""}},
            ],
        ),
    ),
    CardTemplate(
        id="spell",
        name="Spell",
        kind="spell",
        description=None,
        source="built_in",
        card=_card(
            "spell",
            [
                {"title": "Core", "fields": {"Level": "", "School": ""}},
                {"title": "Effect", "fields": {"Description": ""}},
            ],
        ),
    ),
    CardTemplate(
        id="item",
        name="Item",
        kind="item",
        description=None,
        source="built_in",
        card=_card(
            "item",
            [
                {"title": "Core", "fields": {"Type": "", "Rarity": ""}},
                {"title": "Notes", "fields": {"Description": ""}},
            ],
        ),
    ),
    CardTemplate(
        id="location",
        name="Location",
        kind="location",
        description=None,
        source="built_in",
        card=_card(
            "location",
            [
                {"title": "Core", "fields": {"Region": "", "Mood": ""}},
                {"title": "Notes", "fields": {"Details": ""}},
            ],
        ),
    ),
    CardTemplate(
        id="reference",
        name="Reference",
        kind="reference",
        description=None,
        source="built_in",
        card=_card(
            "reference",
            [
                {"title": "Core", "fields": {"Source": "", "Topic": ""}},
                {"title": "Notes", "fields": {"Summary": ""}},
            ],
        ),
    ),
    CardTemplate(
        id="custom",
        name="Custom",
        kind="custom",
        description=None,
        source="built_in",
        card=_card("custom", [{"title": "Core", "fields": {"Notes": ""}}]),
    ),
)


def _warning(path: Path, world_root: Path, reason: str) -> CardTemplateWarning:
    relative_path = path.relative_to(world_root).as_posix()
    return CardTemplateWarning(path=relative_path, message=reason)


def _is_valid_template_id(value: Any) -> bool:
    return isinstance(value, str) and bool(TEMPLATE_ID_PATTERN.fullmatch(value))


def _validate_typed_field(
    value: dict[str, Any],
    path: str,
    *,
    allow_computed: bool = True,
) -> str | None:
    field_type = value.get("type")
    if field_type == COMPUTED_FIELD_TYPE and allow_computed:
        if not set(value.keys()).issubset({"type", "formula", "format"}):
            return f"{path} may only contain type, formula, and format"
        formula = value.get("formula")
        if not isinstance(formula, str) or not formula.strip():
            return f"{path}.formula must be a non-empty string"
        card_format = value.get("format")
        if card_format is not None and card_format not in COMPUTED_FORMATS:
            return f"{path}.format must be plain or signed"
        return None
    if field_type not in SUPPORTED_FIELD_TYPES:
        return f"{path}.type must be supported"
    if "value" not in value:
        return f"{path}.value is required"

    field_value = value.get("value")
    if field_type == "number" and (
        not isinstance(field_value, (int, float)) or isinstance(field_value, bool)
    ):
        return f"{path}.value must be a number"
    if field_type == "boolean" and not isinstance(field_value, bool):
        return f"{path}.value must be a boolean"
    if field_type in {"text", "long_text", "select", "world_link"} and not isinstance(
        field_value,
        str,
    ):
        return f"{path}.value must be a string"
    label = value.get("label")
    if label is not None and not isinstance(label, str):
        return f"{path}.label must be a string"
    options = value.get("options")
    if options is not None and (
        not isinstance(options, list)
        or any(not isinstance(option, str) for option in options)
    ):
        return f"{path}.options must be an array of strings"
    return None


def _validate_field_value(value: Any, path: str) -> str | None:
    if isinstance(value, str):
        return None
    if isinstance(value, dict):
        return _validate_typed_field(value, path)
    return f"{path} must be a string"


def _validate_row_value(value: Any, path: str) -> str | None:
    if value is None or isinstance(value, (str, int, float, bool)):
        return None
    if isinstance(value, dict):
        return _validate_typed_field(value, path, allow_computed=False)
    return f"{path} must be a string, number, boolean, or null"


def validate_card_shape(
    value: Any,
    *,
    allowed_kinds: set[str] | None = None,
    path: str = "card",
) -> str | None:
    if not isinstance(value, dict):
        return f"{path} must be an object"
    if set(value.keys()) != {"kind", "title", "tags", "sections"}:
        return f"{path} must contain kind, title, tags, and sections"
    if allowed_kinds is not None and value.get("kind") not in allowed_kinds:
        return f"{path}.kind must be a supported kind"
    if allowed_kinds is None and (
        not isinstance(value.get("kind"), str) or not value.get("kind", "").strip()
    ):
        return f"{path}.kind must be a non-empty string"
    if not isinstance(value.get("title"), str):
        return f"{path}.title must be a string"
    tags = value.get("tags")
    if not isinstance(tags, list) or any(not isinstance(tag, str) for tag in tags):
        return f"{path}.tags must be an array of strings"
    sections = value.get("sections")
    if not isinstance(sections, list):
        return f"{path}.sections must be an array"
    for section_index, section in enumerate(sections):
        section_path = f"{path}.sections[{section_index}]"
        if not isinstance(section, dict):
            return f"{section_path} must be an object"
        if not set(section.keys()).issubset({"title", "layout", "fields", "columns", "rows"}):
            return f"{section_path} may only contain title, layout, fields, columns, and rows"
        if not isinstance(section.get("title"), str):
            return f"{section_path}.title must be a string"
        layout = section.get("layout")
        if layout is not None and not isinstance(layout, str):
            return f"{section_path}.layout must be a string"
        fields = section.get("fields")
        rows = section.get("rows")
        columns = section.get("columns")
        if fields is None and rows is None:
            return f"{section_path} must contain fields or rows"
        if columns is not None and (
            not isinstance(columns, list)
            or any(not isinstance(column, str) for column in columns)
        ):
            return f"{section_path}.columns must be an array of strings"
        if fields is not None:
            if not isinstance(fields, dict):
                return f"{section_path}.fields must be an object"
            for key, field_value in fields.items():
                if not isinstance(key, str):
                    return f"{section_path}.fields keys must be strings"
                warning = _validate_field_value(field_value, f"{section_path}.fields.{key}")
                if warning:
                    return warning
        if rows is not None:
            if not isinstance(rows, list):
                return f"{section_path}.rows must be an array"
            for row_index, row in enumerate(rows):
                row_path = f"{section_path}.rows[{row_index}]"
                if not isinstance(row, dict):
                    return f"{row_path} must be an object"
                for key, row_value in row.items():
                    if not isinstance(key, str):
                        return f"{row_path} keys must be strings"
                    warning = _validate_row_value(row_value, f"{row_path}.{key}")
                    if warning:
                        return warning
    return None


def _template_from_json(
    path: Path,
    world_root: Path,
) -> tuple[CardTemplate | None, CardTemplateWarning | None]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None, _warning(path, world_root, "invalid JSON")
    except UnicodeDecodeError:
        return None, _warning(path, world_root, "file must be UTF-8 JSON")

    if not isinstance(loaded, dict):
        return None, _warning(path, world_root, "template must be an object")

    template_id = loaded.get("id")
    if not _is_valid_template_id(template_id):
        return None, _warning(path, world_root, "template id must match [A-Za-z0-9_-]+")

    name = loaded.get("name")
    if not isinstance(name, str) or not name.strip():
        return None, _warning(path, world_root, "template name is required")
    if len(name) > 80:
        return None, _warning(path, world_root, "template name must be at most 80 characters")

    kind = loaded.get("kind")
    if kind not in VALID_KINDS:
        return None, _warning(path, world_root, "template kind is invalid")

    description = loaded.get("description")
    if description is not None and not isinstance(description, str):
        return None, _warning(path, world_root, "template description must be a string or null")

    card = loaded.get("card")
    card_warning = validate_card_shape(card, allowed_kinds=VALID_KINDS)
    if card_warning:
        return None, _warning(path, world_root, card_warning)

    return (
        CardTemplate(
            id=template_id,
            name=name.strip(),
            kind=kind,
            description=description,
            source="world",
            card=card,
        ),
        None,
    )


def list_card_templates(world_root: Path) -> CardTemplateCatalog:
    templates = {
        template.id: template.model_copy(deep=True)
        for template in BUILT_IN_TEMPLATES
    }
    warnings: list[CardTemplateWarning] = []
    templates_dir = world_root / ".virtualscreen" / "card-templates"
    if not templates_dir.exists():
        return CardTemplateCatalog(templates=list(templates.values()), warnings=warnings)
    if not templates_dir.is_dir():
        return CardTemplateCatalog(
            templates=list(templates.values()),
            warnings=[
                CardTemplateWarning(
                    path=".virtualscreen/card-templates",
                    message="expected a directory",
                )
            ],
        )

    for path in sorted(templates_dir.iterdir(), key=lambda item: item.name.lower()):
        if path.is_dir():
            warnings.append(_warning(path, world_root, "nested entries are ignored"))
            continue
        if path.suffix.lower() != ".json":
            warnings.append(_warning(path, world_root, "non-JSON files are ignored"))
            continue
        template, warning = _template_from_json(path, world_root)
        if warning:
            warnings.append(warning)
            continue
        if template is not None:
            templates[template.id] = template

    return CardTemplateCatalog(templates=list(templates.values()), warnings=warnings)
