import json
import stat
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Literal

from app.core.audio import AUDIO_EXTENSIONS
from app.core.card_templates import TEMPLATE_ID_PATTERN, VALID_KINDS, validate_card_shape
from app.core.file_safety import atomic_write_bytes, backup_file
from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root

MAX_MANIFEST_FILES = 200
MAX_ZIP_BYTES = 50 * 1024 * 1024
MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024
MANIFEST_PATH = "system-pack.json"

ConflictDecision = Literal["skip", "overwrite", "rename"]
PreviewStatus = Literal["ready", "conflict", "skipped", "invalid"]

WORLD_EXTENSIONS = {
    ".csv",
    ".cs",
    ".gif",
    ".jpeg",
    ".jpg",
    ".markdown",
    ".md",
    ".mp4",
    ".pdf",
    ".png",
    ".svg",
    ".txt",
    ".webp",
    *AUDIO_EXTENSIONS,
}


@dataclass(frozen=True)
class PackManifest:
    name: str
    version: str
    description: str
    files: list[str]


@dataclass(frozen=True)
class PlannedFile:
    source_path: str
    path: str
    status: PreviewStatus
    reason: str | None = None


@dataclass(frozen=True)
class PackPlan:
    manifest: PackManifest
    files: list[PlannedFile]
    skipped_unlisted: list[str]


@dataclass(frozen=True)
class ImportedFile:
    path: str
    action: Literal["created", "overwritten", "renamed"]
    source_path: str | None = None
    backup_path: str | None = None


@dataclass(frozen=True)
class ImportResult:
    manifest: PackManifest
    imported: list[ImportedFile]
    skipped: list[PlannedFile]

    @property
    def paths(self) -> list[str]:
        return [item.path for item in self.imported]


class SystemPackError(ValueError):
    status_code = 400


class SystemPackLimitError(SystemPackError):
    status_code = 413


def _manifest_response(manifest: PackManifest) -> dict[str, object]:
    return {
        "name": manifest.name,
        "version": manifest.version,
        "description": manifest.description,
        "file_count": len(manifest.files),
    }


def _message_for_reason(reason: str | None) -> str | None:
    if reason is None:
        return None
    return {
        "conflict": "File already exists.",
        "directory": "Pack entry is a directory.",
        "invalid_card_template": "Card template is not valid.",
        "missing": "Manifest file is missing from the zip.",
        "nested_card_template": "Card templates must be direct JSON files.",
        "symlink": "Symbolic links are not allowed.",
        "unsafe_path": "Path is not safe to import.",
        "unsupported_dms": "DMS scripts are skipped in V2 content packs.",
        "unsupported_extension": "File type is not supported.",
    }.get(reason, reason)


def plan_response(plan: PackPlan) -> dict[str, object]:
    counts = {
        "ready": sum(1 for item in plan.files if item.status == "ready"),
        "conflict": sum(1 for item in plan.files if item.status == "conflict"),
        "skipped": sum(1 for item in plan.files if item.status == "skipped"),
        "invalid": sum(1 for item in plan.files if item.status == "invalid"),
    }
    return {
        "manifest": _manifest_response(plan.manifest),
        "rows": [
            {
                "id": f"{item.status}:{item.path}",
                "source_path": item.source_path,
                "target_path": item.path,
                "status": item.status,
                "message": _message_for_reason(item.reason),
                **({"reason": item.reason} if item.reason else {}),
            }
            for item in plan.files
        ],
        "skipped_unlisted": plan.skipped_unlisted,
        "counts": counts,
    }


def import_response(result: ImportResult) -> dict[str, object]:
    imported = sum(1 for item in result.imported if item.action == "created")
    overwritten = sum(1 for item in result.imported if item.action == "overwritten")
    renamed = sum(1 for item in result.imported if item.action == "renamed")
    return {
        "manifest": _manifest_response(result.manifest),
        "imported": imported,
        "overwritten": overwritten,
        "renamed": renamed,
        "skipped": len(result.skipped),
        "failed": 0,
        "files": [
            {
                "source_path": item.source_path or item.path,
                "target_path": item.path,
                "status": {
                    "created": "imported",
                    "overwritten": "overwritten",
                    "renamed": "renamed",
                }[item.action],
                "message": None,
                **({"source_path": item.source_path} if item.source_path else {}),
                **({"backup_path": item.backup_path} if item.backup_path else {}),
            }
            for item in result.imported
        ]
        + [
            {
                "source_path": item.source_path,
                "target_path": item.path,
                "status": "skipped",
                "message": _message_for_reason(item.reason),
                **({"reason": item.reason} if item.reason else {}),
            }
            for item in result.skipped
        ],
        "summary": {
            "imported": len(result.imported),
            "skipped": len(result.skipped),
            "backups": sum(1 for item in result.imported if item.backup_path),
        },
        "event_paths": result.paths,
    }


def _load_zip(content: bytes) -> zipfile.ZipFile:
    if len(content) > MAX_ZIP_BYTES:
        raise SystemPackLimitError("System pack zip exceeds the 50MB limit.")
    try:
        archive = zipfile.ZipFile(BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise SystemPackError("System pack must be a valid zip archive.") from exc

    decompressed_size = sum(info.file_size for info in archive.infolist() if not info.is_dir())
    if decompressed_size > MAX_DECOMPRESSED_BYTES:
        archive.close()
        raise SystemPackLimitError("System pack exceeds the 100MB decompressed limit.")
    return archive


def _read_manifest(archive: zipfile.ZipFile) -> PackManifest:
    try:
        raw_manifest = archive.read(MANIFEST_PATH)
    except KeyError as exc:
        raise SystemPackError("System pack manifest system-pack.json is required.") from exc
    try:
        loaded = json.loads(raw_manifest.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SystemPackError("System pack manifest must be UTF-8 JSON.") from exc
    if not isinstance(loaded, dict):
        raise SystemPackError("System pack manifest must be an object.")
    if loaded.get("schema_version") != 1:
        raise SystemPackError("System pack manifest schema_version must be 1.")

    name = loaded.get("name")
    version = loaded.get("version")
    description = loaded.get("description", "")
    files = loaded.get("files")
    if not isinstance(name, str) or not name.strip():
        raise SystemPackError("System pack manifest name is required.")
    if not isinstance(version, str) or not version.strip():
        raise SystemPackError("System pack manifest version is required.")
    if description is None:
        description = ""
    if not isinstance(description, str):
        raise SystemPackError("System pack manifest description must be a string.")
    if not isinstance(files, list) or any(not isinstance(item, str) for item in files):
        raise SystemPackError("System pack manifest files must be path strings.")
    if len(files) > MAX_MANIFEST_FILES:
        raise SystemPackLimitError("System pack manifest exceeds the 200 file limit.")

    return PackManifest(
        name=name.strip(),
        version=version.strip(),
        description=description,
        files=files,
    )


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    mode = info.external_attr >> 16
    return stat.S_IFMT(mode) == stat.S_IFLNK


def _normalize_manifest_path(raw_path: str) -> str | None:
    try:
        relative_path = normalize_relative_path(raw_path)
    except WorldPathError:
        return None
    first_part = relative_path.split("/", 1)[0]
    if ":" in first_part:
        return None
    return relative_path


def _is_card_template_path(path: str) -> bool:
    parts = path.split("/")
    return (
        len(parts) == 3
        and parts[0] == ".virtualscreen"
        and parts[1] == "card-templates"
        and parts[2].endswith(".json")
    )


def _validate_card_template(content: bytes) -> bool:
    try:
        loaded = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return False
    if not isinstance(loaded, dict):
        return False
    template_id = loaded.get("id")
    if not isinstance(template_id, str) or not TEMPLATE_ID_PATTERN.fullmatch(template_id):
        return False
    name = loaded.get("name")
    if not isinstance(name, str) or not name.strip() or len(name) > 80:
        return False
    if loaded.get("kind") not in VALID_KINDS:
        return False
    description = loaded.get("description")
    if description is not None and not isinstance(description, str):
        return False
    return validate_card_shape(loaded.get("card"), allowed_kinds=VALID_KINDS) is None


def _skip_reason(path: str, info: zipfile.ZipInfo | None, content: bytes | None) -> str | None:
    if info is None:
        return "missing"
    if info.is_dir():
        return "directory"
    if _is_symlink(info):
        return "symlink"
    if Path(path).suffix.lower() == ".dms":
        return "unsupported_dms"
    if path.startswith(".music/"):
        return None if Path(path).suffix.lower() in AUDIO_EXTENSIONS else "unsupported_extension"
    if path.startswith(".virtualscreen/card-templates/"):
        if not _is_card_template_path(path):
            return "nested_card_template"
        if content is None or not _validate_card_template(content):
            return "invalid_card_template"
        return None
    if path.startswith(".virtualscreen/"):
        return "unsupported_extension"
    return None if Path(path).suffix.lower() in WORLD_EXTENSIONS else "unsupported_extension"


def _zip_file_map(archive: zipfile.ZipFile) -> dict[str, zipfile.ZipInfo]:
    return {
        info.filename.replace("\\", "/"): info
        for info in archive.infolist()
        if not info.is_dir()
    }


def _unlisted_files(
    infos: dict[str, zipfile.ZipInfo],
    manifest_paths: set[str],
) -> list[str]:
    return sorted(
        path
        for path in infos
        if path != MANIFEST_PATH and path not in manifest_paths
    )


def plan_system_pack(root: Path, content: bytes) -> PackPlan:
    with _load_zip(content) as archive:
        manifest = _read_manifest(archive)
        infos = _zip_file_map(archive)
        manifest_paths = set(manifest.files)
        files: list[PlannedFile] = []

        for raw_path in manifest.files:
            relative_path = _normalize_manifest_path(raw_path)
            if relative_path is None:
                files.append(
                    PlannedFile(
                        source_path=raw_path,
                        path=raw_path,
                        status="invalid",
                        reason="unsafe_path",
                    )
                )
                continue
            info = infos.get(relative_path)
            content_bytes = archive.read(info) if info and not _is_symlink(info) else None
            reason = _skip_reason(relative_path, info, content_bytes)
            if reason:
                status: PreviewStatus = "skipped"
                if reason not in {"unsupported_dms", "unsupported_extension"}:
                    status = "invalid"
                files.append(
                    PlannedFile(
                        source_path=raw_path,
                        path=relative_path,
                        status=status,
                        reason=reason,
                    )
                )
                continue
            try:
                target_path = resolve_under_root(root, relative_path)
            except WorldPathError:
                files.append(
                    PlannedFile(
                        source_path=raw_path,
                        path=relative_path,
                        status="invalid",
                        reason="unsafe_path",
                    )
                )
                continue
            status: Literal["ready", "conflict"] = "conflict" if target_path.exists() else "ready"
            files.append(PlannedFile(source_path=raw_path, path=relative_path, status=status))

        return PackPlan(
            manifest=manifest,
            files=files,
            skipped_unlisted=_unlisted_files(infos, manifest_paths),
        )


def _rename_target_reason(
    source_path: str,
    target_path: str,
    content: bytes,
) -> str | None:
    if Path(source_path).suffix.lower() != Path(target_path).suffix.lower():
        return "unsupported_extension"
    if target_path.startswith(".music/"):
        if Path(target_path).suffix.lower() in AUDIO_EXTENSIONS:
            return None
        return "unsupported_extension"
    if target_path.startswith(".virtualscreen/card-templates/"):
        if not _is_card_template_path(target_path):
            return "nested_card_template"
        return None if _validate_card_template(content) else "invalid_card_template"
    if target_path.startswith(".virtualscreen/"):
        return "unsupported_extension"
    return None if Path(target_path).suffix.lower() in WORLD_EXTENSIONS else "unsupported_extension"


def _decisions_by_path(
    decisions: dict[str, dict[str, str | None]],
) -> dict[str, tuple[ConflictDecision, str | None]]:
    parsed: dict[str, tuple[ConflictDecision, str | None]] = {}
    for target_path, decision in decisions.items():
        kind = decision.get("decision")
        if kind not in {"skip", "overwrite", "rename"}:
            raise SystemPackError("Conflict decisions must be skip, overwrite, or rename.")
        rename_target = decision.get("rename_target_path")
        if rename_target is not None and not isinstance(rename_target, str):
            raise SystemPackError("Rename target path must be a string.")
        parsed[target_path] = (kind, rename_target)
    return parsed


def import_system_pack(
    root: Path,
    content: bytes,
    decisions: dict[str, dict[str, str | None]],
) -> ImportResult:
    with _load_zip(content) as archive:
        plan = plan_system_pack(root, content)
        if any(item.status == "invalid" for item in plan.files):
            raise SystemPackError("System pack contains invalid entries.")
        conflict_decisions = _decisions_by_path(decisions)
        conflict_paths = {item.path for item in plan.files if item.status == "conflict"}
        missing_decisions = sorted(conflict_paths - set(conflict_decisions))
        if missing_decisions:
            raise SystemPackError("Every conflict requires an explicit decision.")
        infos = _zip_file_map(archive)
        imported: list[ImportedFile] = []
        skipped: list[PlannedFile] = []

        for item in plan.files:
            if item.status == "skipped":
                skipped.append(item)
                continue
            decision: ConflictDecision | None = None
            rename_target_path: str | None = None
            if item.status == "conflict":
                decision, rename_target_path = conflict_decisions[item.path]
            if item.status == "conflict" and decision == "skip":
                skipped.append(
                    PlannedFile(
                        source_path=item.source_path,
                        path=item.path,
                        status="skipped",
                        reason="conflict",
                    )
                )
                continue

            target_relative_path = item.path
            target_path = resolve_under_root(root, target_relative_path)
            source_path: str | None = None
            backup_path: str | None = None
            action: Literal["created", "overwritten", "renamed"] = "created"

            if item.status == "conflict" and decision == "overwrite":
                backup = backup_file(root, target_path)
                backup_path = normalize_relative_path(backup.relative_to(root).as_posix())
                action = "overwritten"
            elif item.status == "conflict" and decision == "rename":
                source_path = item.path
                if not rename_target_path:
                    raise SystemPackError("Rename decision requires rename_target_path.")
                target_relative_path = normalize_relative_path(rename_target_path)
                source_info = infos[source_path]
                source_content = archive.read(source_info)
                reason = _rename_target_reason(source_path, target_relative_path, source_content)
                if reason:
                    message = _message_for_reason(reason) or "Rename target is not supported."
                    raise SystemPackError(message)
                target_path = resolve_under_root(root, target_relative_path)
                if target_path.exists():
                    raise SystemPackError("Rename target already exists.")
                action = "renamed"

            info = infos[target_relative_path if source_path is None else source_path]
            content_bytes = archive.read(info)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            atomic_write_bytes(target_path, content_bytes)
            imported.append(
                ImportedFile(
                    path=target_relative_path,
                    action=action,
                    source_path=source_path,
                    backup_path=backup_path,
                )
            )

        return ImportResult(manifest=plan.manifest, imported=imported, skipped=skipped)
