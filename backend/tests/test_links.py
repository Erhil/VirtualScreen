from pathlib import Path

from app.core.links import parse_links, resolve_links
from app.core.pages import scan_pages


def test_parses_wiki_link() -> None:
    links = parse_links("README.md", "Open [[NPCs/Captain Ilyra]].")

    assert len(links) == 1
    assert links[0].raw_target == "NPCs/Captain Ilyra"
    assert links[0].label == "Captain Ilyra"
    assert links[0].link_type == "wiki"
    assert links[0].heading is None


def test_parses_wiki_link_with_label() -> None:
    links = parse_links("NPCs/Captain Ilyra.md", "Related: [[../README|Home]]")

    assert links[0].raw_target == "../README"
    assert links[0].label == "Home"
    assert links[0].link_type == "wiki"


def test_parses_wiki_link_with_heading_and_label() -> None:
    links = parse_links("README.md", "See [[Page#Heading|Label]].")

    assert links[0].raw_target == "Page#Heading"
    assert links[0].label == "Label"
    assert links[0].heading == "Heading"


def test_parses_embed_as_embed_link() -> None:
    links = parse_links("README.md", "![[Media/sample-map.svg]]")

    assert links[0].raw_target == "Media/sample-map.svg"
    assert links[0].label == "sample-map.svg"
    assert links[0].link_type == "embed"


def test_parses_markdown_link() -> None:
    links = parse_links("README.md", "[events](Tables/random-events.csv)")

    assert links[0].raw_target == "Tables/random-events.csv"
    assert links[0].label == "events"
    assert links[0].link_type == "markdown"


def test_parses_markdown_image_as_embed() -> None:
    links = parse_links("README.md", "![Sample Map](Media/sample-map.svg)")

    assert links[0].raw_target == "Media/sample-map.svg"
    assert links[0].label == "Sample Map"
    assert links[0].link_type == "embed"


def test_resolves_relative_path(sample_world: Path) -> None:
    raw_links = parse_links("NPCs/Captain Ilyra.md", "[[../README|Home]]")

    links = resolve_links(
        sample_world,
        "NPCs/Captain Ilyra.md",
        raw_links,
        scan_pages(sample_world),
    )

    assert links[0].resolved is True
    assert links[0].target_path == "README.md"
    assert links[0].target_title == "Sample World Guide"
    assert links[0].target_kind == "markdown"


def test_resolves_root_path_without_markdown_extension(sample_world: Path) -> None:
    raw_links = parse_links("README.md", "[[NPCs/Captain Ilyra]]")

    links = resolve_links(sample_world, "README.md", raw_links, scan_pages(sample_world))

    assert links[0].target_path == "NPCs/Captain Ilyra.md"
    assert links[0].target_title == "Captain Ilyra"


def test_resolves_by_title(sample_world: Path) -> None:
    raw_links = parse_links("README.md", "[[Captain Ilyra]]")

    links = resolve_links(sample_world, "README.md", raw_links, scan_pages(sample_world))

    assert links[0].target_path == "NPCs/Captain Ilyra.md"


def test_resolves_by_alias(sample_world: Path) -> None:
    raw_links = parse_links("NPCs/Captain Ilyra.md", "[[Home]]")

    links = resolve_links(
        sample_world,
        "NPCs/Captain Ilyra.md",
        raw_links,
        scan_pages(sample_world),
    )

    assert links[0].target_path == "README.md"


def test_resolves_mp4_media_as_video(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("[flyover](Media/flyover.mp4)", encoding="utf-8")
    (world / "Media").mkdir()
    (world / "Media" / "flyover.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
    raw_links = parse_links("README.md", "[flyover](Media/flyover.mp4)")

    links = resolve_links(world, "README.md", raw_links, scan_pages(world))

    assert links[0].resolved is True
    assert links[0].target_path == "Media/flyover.mp4"
    assert links[0].target_kind == "video"


def test_resolves_pdf_media_as_pdf(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("[handout](Docs/handout.pdf)", encoding="utf-8")
    (world / "Docs").mkdir()
    (world / "Docs" / "handout.pdf").write_bytes(b"%PDF-1.4\n%tiny\n")
    raw_links = parse_links("README.md", "[handout](Docs/handout.pdf)")

    links = resolve_links(world, "README.md", raw_links, scan_pages(world))

    assert links[0].resolved is True
    assert links[0].target_path == "Docs/handout.pdf"
    assert links[0].target_kind == "pdf"


def test_preserves_unresolved_link(sample_world: Path) -> None:
    raw_links = parse_links("README.md", "[[Missing Page]]")

    links = resolve_links(sample_world, "README.md", raw_links, scan_pages(sample_world))

    assert links[0].resolved is False
    assert links[0].target_path is None
    assert links[0].target_title is None
    assert links[0].target_kind is None
