from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read_repo_file(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


def test_user_docs_present_dms_scripts_as_normal_workflow() -> None:
    readme = read_repo_file("README.md")
    development = read_repo_file("docs/DEVELOPMENT.md")
    cookbook = read_repo_file("docs/DMS_COOKBOOK.md")

    combined = "\n".join([readme, development, cookbook])
    assert "Scripts tool" in combined
    assert "trusted `.dms` scripts" in combined
    assert "DMS scripts are trusted local `.dms` files" in cookbook

    stale_normal_workflow_phrases = [
        "Actions, and Scenarios",
        "scenario actions",
        "Trusted Python scenarios under `.virtualscreen/scenarios`",
        "Run a sample scenario",
        "scenario execution behavior",
        "Scenario output saved as a note",
    ]
    for phrase in stale_normal_workflow_phrases:
        assert phrase not in combined


def test_legacy_scenario_docs_are_explicitly_marked_deprecated() -> None:
    development = read_repo_file("docs/DEVELOPMENT.md")

    legacy_refs = [
        line
        for line in development.splitlines()
        if "/api/scenarios" in line or ".virtualscreen/scenarios" in line
    ]
    assert legacy_refs
    assert all("deprecated" in line.lower() or "legacy" in line.lower() for line in legacy_refs)
