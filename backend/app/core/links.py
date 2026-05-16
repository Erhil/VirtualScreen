import re
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

from app.core.pages import MARKDOWN_EXTENSIONS, PageData
from app.core.paths import WorldPathError, normalize_relative_path


@dataclass(frozen=True)
class RawPageLink:
    source_path: str
    raw_target: str
    label: str
    link_type: str
    heading: str | None
    order: int


@dataclass(frozen=True)
class PageLink:
    source_path: str
    raw_target: str
    label: str
    link_type: str
    target_path: str | None
    target_title: str | None
    target_kind: str | None
    heading: str | None
    resolved: bool
    order: int


WIKI_LINK_RE = re.compile(r"(!)?\[\[([^\]]+)]]")
MARKDOWN_LINK_RE = re.compile(r"(!)?\[([^\]]*)]\(([^)]+)\)")
IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".svg"}
PDF_EXTENSIONS = {".pdf"}
VIDEO_EXTENSIONS = {".mp4"}
CARD_EXTENSIONS = {".cs"}


def _split_target(raw_target: str) -> tuple[str, str | None]:
    target, _, heading = raw_target.partition("#")
    return target.strip(), heading.strip() or None


def _display_name(path: str) -> str:
    return PurePosixPath(path).name


def parse_links(source_path: str, content: str) -> list[RawPageLink]:
    links: list[RawPageLink] = []

    for match in WIKI_LINK_RE.finditer(content):
        embedded, body = match.groups()
        target_part, _, label_part = body.partition("|")
        target, heading = _split_target(target_part)
        label = label_part.strip() or _display_name(target)
        links.append(
            RawPageLink(
                source_path=source_path,
                raw_target=target_part.strip(),
                label=label,
                link_type="embed" if embedded else "wiki",
                heading=heading,
                order=match.start(),
            )
        )

    for match in MARKDOWN_LINK_RE.finditer(content):
        embedded, label, raw_target = match.groups()
        target, heading = _split_target(raw_target)
        links.append(
            RawPageLink(
                source_path=source_path,
                raw_target=raw_target.strip(),
                label=label.strip() or _display_name(target),
                link_type="embed" if embedded else "markdown",
                heading=heading,
                order=match.start(),
            )
        )

    return sorted(links, key=lambda link: link.order)


def _target_kind(path: str | None) -> str | None:
    if path is None:
        return None

    suffix = PurePosixPath(path).suffix.lower()
    if suffix in MARKDOWN_EXTENSIONS:
        return "markdown"
    if suffix == ".csv":
        return "csv"
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    if suffix in PDF_EXTENSIONS:
        return "pdf"
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    if suffix == ".txt":
        return "text"
    if suffix in CARD_EXTENSIONS:
        return "card"
    return "unsupported"


def _without_markdown_suffix(path: str) -> str:
    suffix = PurePosixPath(path).suffix.lower()
    if suffix in MARKDOWN_EXTENSIONS:
        return path[: -len(suffix)]
    return path


def _relative_candidate(source_path: str, target: str) -> str:
    if target.startswith("/"):
        return normalize_relative_path(target[1:])

    source_parts = PurePosixPath(source_path).parent.parts
    target_parts = PurePosixPath(target).parts
    resolved: list[str] = []
    for part in [*source_parts, *target_parts]:
        if part in {"", "."}:
            continue
        if part == "..":
            if resolved:
                resolved.pop()
            continue
        resolved.append(part)

    return normalize_relative_path("/".join(resolved))


def _path_lookup(pages: list[PageData]) -> dict[str, PageData]:
    lookup: dict[str, PageData] = {}
    for page in pages:
        lookup[page.path.lower()] = page
        lookup[_without_markdown_suffix(page.path).lower()] = page
    return lookup


def _resolve_page(source_path: str, target: str, pages: list[PageData]) -> PageData | None:
    lookup = _path_lookup(pages)
    candidates = [_relative_candidate(source_path, target)]
    try:
        candidates.append(normalize_relative_path(target.lstrip("/")))
    except WorldPathError:
        pass

    for candidate in candidates:
        page = lookup.get(candidate.lower())
        if page:
            return page

    target_lower = target.lower()
    for page in pages:
        if (
            page.title.lower() == target_lower
            and PurePosixPath(page.path).stem.lower() == target_lower
        ):
            return page

    for page in pages:
        if page.title.lower() == target_lower:
            return page

    for page in pages:
        if any(alias.lower() == target_lower for alias in page.aliases):
            return page

    return None


def resolve_links(
    root: Path,
    source_path: str,
    links: list[RawPageLink],
    pages: list[PageData],
) -> list[PageLink]:
    resolved_links: list[PageLink] = []

    for link in links:
        target, _ = _split_target(link.raw_target)
        page = _resolve_page(source_path, target, pages)
        resolved_links.append(
            PageLink(
                source_path=link.source_path,
                raw_target=link.raw_target,
                label=link.label,
                link_type=link.link_type,
                target_path=page.path if page else None,
                target_title=page.title if page else None,
                target_kind=_target_kind(page.path if page else None),
                heading=link.heading,
                resolved=page is not None,
                order=link.order,
            )
        )

    return resolved_links
