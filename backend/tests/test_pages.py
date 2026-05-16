from pathlib import Path

from app.core.pages import parse_page


def test_parses_markdown_frontmatter(sample_world: Path) -> None:
    page = parse_page(sample_world, sample_world / "README.md")

    assert page.title == "Sample World Guide"
    assert page.page_type == "index"
    assert page.tags == ["sample", "guide", "session"]
    assert page.aliases == ["Home"]
    assert page.metadata["title"] == "Sample World Guide"


def test_parses_nested_frontmatter_fields(sample_world: Path) -> None:
    page = parse_page(sample_world, sample_world / "NPCs" / "Captain Ilyra.md")

    assert page.title == "Captain Ilyra"
    assert page.page_type == "npc"
    assert page.tags == ["city-watch", "ally"]
    assert page.aliases == ["Ilyra", "Watch Captain"]
    assert page.fields["voice"] == "calm and formal"
    assert page.fields["danger"] == "medium"


def test_infers_title_from_first_heading(tmp_path: Path) -> None:
    note = tmp_path / "note.md"
    note.write_text("# Heading Title\n\nBody", encoding="utf-8")

    page = parse_page(tmp_path, note)

    assert page.title == "Heading Title"
    assert page.metadata == {}


def test_infers_title_from_filename_without_frontmatter_or_heading(tmp_path: Path) -> None:
    note = tmp_path / "quiet-note.md"
    note.write_text("Only body text.", encoding="utf-8")

    page = parse_page(tmp_path, note)

    assert page.title == "quiet-note"
    assert page.tags == []
    assert page.aliases == []


def test_non_markdown_files_have_empty_metadata(tmp_path: Path) -> None:
    table = tmp_path / "events.csv"
    table.write_text("roll,event\n1,Rain\n", encoding="utf-8")

    page = parse_page(tmp_path, table)

    assert page.title == "events"
    assert page.page_type is None
    assert page.tags == []
    assert page.aliases == []
    assert page.metadata == {}
    assert page.fields == {}
