from pathlib import Path, PurePosixPath


def is_link_or_reparse_point(path: Path) -> bool:
    try:
        stat_result = path.lstat()
    except OSError:
        return True
    return path.is_symlink() or bool(getattr(stat_result, "st_file_attributes", 0) & 0x400)


class WorldPathError(ValueError):
    """Raised when a user-supplied world path is invalid or unsafe."""


RESERVED_WORLD_PATH_PARTS = {".virtualscreen", ".git", "__pycache__"}


def is_direct_card_template_path(relative_path: str) -> bool:
    parts = relative_path.split("/")
    return (
        len(parts) == 3
        and parts[0] == ".virtualscreen"
        and parts[1] == "card-templates"
        and parts[2].endswith(".json")
    )


def reserved_path_part(
    relative_path: str,
    *,
    allow_virtualscreen_card_template: bool = False,
) -> str | None:
    parts = [part for part in relative_path.split("/") if part]
    if allow_virtualscreen_card_template and is_direct_card_template_path(relative_path):
        for part in parts:
            if part in {".git", "__pycache__"}:
                return part
        return None
    for part in parts:
        if part in RESERVED_WORLD_PATH_PARTS:
            return part
    return None


def ensure_no_reserved_path_parts(
    relative_path: str,
    *,
    allow_virtualscreen_card_template: bool = False,
    message: str = "World path contains a reserved folder.",
) -> None:
    if reserved_path_part(
        relative_path,
        allow_virtualscreen_card_template=allow_virtualscreen_card_template,
    ):
        raise WorldPathError(message)


def normalize_relative_path(raw_path: str | Path) -> str:
    """Normalize a browser/API path to a POSIX-style path relative to the world root."""

    path_text = str(raw_path).replace("\\", "/").strip()
    if path_text in {"", "."}:
        return ""

    posix_path = PurePosixPath(path_text)
    if posix_path.is_absolute():
        raise WorldPathError("World paths must be relative.")

    parts: list[str] = []
    for part in posix_path.parts:
        if part in {"", "."}:
            continue
        if part == "..":
            raise WorldPathError("World paths cannot contain parent-directory traversal.")
        parts.append(part)

    return "/".join(parts)


_EXTENDED_PATH_PREFIX = "\\\\?\\"
_EXTENDED_UNC_PREFIX = "\\\\?\\UNC\\"


def without_extended_length_prefix(path: Path) -> Path:
    r"""Drop Windows' \\?\ prefix, which resolve() only sometimes leaves behind.

    ntpath.realpath re-resolves the stripped form to check it names the same
    file, and keeps the prefix when that second call fails - a sharing violation,
    or the file being replaced at that instant. A world folder is written to
    constantly, so this happens at random and made resolve_under_root reject
    perfectly ordinary files as escaping the root. The prefix means nothing for
    an already-resolved path, but relative_to compares text.
    """
    text = str(path)
    if text.startswith(_EXTENDED_UNC_PREFIX):
        return Path("\\\\" + text[len(_EXTENDED_UNC_PREFIX) :])
    if text.startswith(_EXTENDED_PATH_PREFIX):
        return Path(text[len(_EXTENDED_PATH_PREFIX) :])
    return path


def resolve_under_root(root: Path, raw_path: str | Path) -> Path:
    """Resolve a user path and guarantee the result remains inside the world root."""

    resolved_root = without_extended_length_prefix(root.expanduser().resolve())
    relative_path = normalize_relative_path(raw_path)
    target = (
        resolved_root
        if relative_path == ""
        else resolved_root.joinpath(*relative_path.split("/"))
    )
    # Both sides go through the same normalisation, so containment is still
    # decided on fully resolved paths - this only removes a formatting
    # difference, never a directory boundary.
    resolved_target = without_extended_length_prefix(target.resolve())

    try:
        resolved_target.relative_to(resolved_root)
    except ValueError as exc:
        raise WorldPathError("Resolved path escapes the world root.") from exc

    return resolved_target
