import json
from typing import Any

CARD_EXTENSIONS = {".cs"}
CARD_BODY_FIELD = "fields"
CARD_SECTIONS_FIELD = "sections"
TYPED_FIELD_TYPES = {"text", "number", "boolean", "select", "long_text", "world_link"}


def _is_typed_field(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and isinstance(value.get("type"), str)
        and value.get("type") in TYPED_FIELD_TYPES
        and "value" in value
    )


def _is_computed_field(value: Any) -> bool:
    return isinstance(value, dict) and value.get("type") == "computed"


def _field_text(value: Any) -> list[str]:
    if _is_computed_field(value):
        formula = str(value.get("formula") or "").strip()
        return [formula] if formula else []
    if _is_typed_field(value):
        field_type = str(value.get("type"))
        field_value = value.get("value")
        if field_type == "world_link":
            target = str(field_value or "").strip()
            if not target:
                return []
            if target.startswith("[[") and target.endswith("]]"):
                return [target]
            label = str(value.get("label") or "").strip()
            return [f"[[{target}|{label}]]" if label else f"[[{target}]]"]
        return _field_text(field_value)
    if isinstance(value, bool):
        return ["true" if value else "false"]
    if isinstance(value, str):
        return [value]
    if isinstance(value, (int, float)):
        return [str(value)]
    if isinstance(value, dict):
        parts: list[str] = []
        for field_value in value.values():
            parts.extend(_field_text(field_value))
        return parts
    if isinstance(value, (list, tuple)):
        parts = []
        for item in value:
            parts.extend(_field_text(item))
        return parts
    if value is None:
        return []
    return [str(value)]


def _flattened_field_text(value: Any) -> str:
    if _is_computed_field(value):
        return "\n".join(_field_text(value))
    if _is_typed_field(value):
        return "\n".join(_field_text(value.get("value")))
    return "\n".join(_field_text(value))


def _sections_body(sections: Any) -> tuple[list[str], dict[str, str]]:
    if not isinstance(sections, list):
        return [], {}

    body_parts: list[str] = []
    flattened_fields: dict[str, str] = {}
    for section in sections:
        if not isinstance(section, dict):
            continue
        section_title = str(section.get("title") or "").strip()
        if section_title:
            body_parts.append(section_title)
        fields = section.get(CARD_BODY_FIELD)
        if not isinstance(fields, dict):
            fields = {}
        for key, value in fields.items():
            field_key = str(key)
            field_value = _flattened_field_text(value)
            body_value = "\n".join(_field_text(value))
            body_parts.extend([field_key, body_value])
            flattened_key = f"{section_title}.{field_key}" if section_title else field_key
            flattened_fields[flattened_key] = field_value
        rows = section.get("rows")
        if not isinstance(rows, list):
            continue
        table_fields: dict[str, list[str]] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            for key, value in row.items():
                row_key = str(key)
                row_value = _flattened_field_text(value)
                body_value = "\n".join(_field_text(value))
                body_parts.extend([row_key, body_value])
                table_fields.setdefault(row_key, []).append(row_value)
        for row_key, values in table_fields.items():
            flattened_key = f"{section_title}.{row_key}" if section_title else row_key
            flattened_fields[flattened_key] = "\n".join(value for value in values if value)
    return body_parts, flattened_fields


def _legacy_fields_body(fields: Any) -> tuple[list[str], dict[str, str]]:
    if isinstance(fields, list):
        body_parts: list[str] = []
        flattened_fields: dict[str, str] = {}
        for field in fields:
            if not isinstance(field, dict):
                continue
            key = str(field.get("name") or field.get("label") or "")
            value = _flattened_field_text(field.get("value"))
            body_parts.extend([key, value])
            if key:
                flattened_fields[key] = value
        return body_parts, flattened_fields

    body_parts = _field_text(fields)
    flattened_fields = {
        str(key): _flattened_field_text(value)
        for key, value in fields.items()
    } if isinstance(fields, dict) else {}
    return body_parts, flattened_fields


def parse_card(content: str) -> tuple[dict[str, Any], str]:
    try:
        loaded = json.loads(content)
    except json.JSONDecodeError:
        return {}, content

    if not isinstance(loaded, dict):
        return {}, content

    metadata = dict(loaded)
    kind = metadata.get("kind") or metadata.get("type")
    if kind and "type" not in metadata:
        metadata["type"] = kind

    body_parts: list[str] = []
    for value in (metadata.get("title"), kind, metadata.get("tags")):
        body_parts.extend(_field_text(value))

    section_body, section_fields = _sections_body(metadata.get(CARD_SECTIONS_FIELD))
    body_parts.extend(section_body)

    if CARD_BODY_FIELD not in metadata and section_fields:
        metadata[CARD_BODY_FIELD] = section_fields
    else:
        legacy_body, legacy_fields = _legacy_fields_body(metadata.get(CARD_BODY_FIELD))
        body_parts.extend(legacy_body)
        if legacy_fields:
            metadata[CARD_BODY_FIELD] = legacy_fields

    body = "\n".join(part for part in body_parts if part)
    return metadata, body
