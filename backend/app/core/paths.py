from pathlib import Path, PurePosixPath


class WorldPathError(ValueError):
    """Raised when a user-supplied world path is invalid or unsafe."""


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


def resolve_under_root(root: Path, raw_path: str | Path) -> Path:
    """Resolve a user path and guarantee the result remains inside the world root."""

    resolved_root = root.expanduser().resolve()
    relative_path = normalize_relative_path(raw_path)
    target = (
        resolved_root
        if relative_path == ""
        else resolved_root.joinpath(*relative_path.split("/"))
    )
    resolved_target = target.resolve()

    try:
        resolved_target.relative_to(resolved_root)
    except ValueError as exc:
        raise WorldPathError("Resolved path escapes the world root.") from exc

    return resolved_target
