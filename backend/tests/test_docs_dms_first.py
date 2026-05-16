from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read_repo_file(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


def test_user_docs_present_dms_scripts_as_normal_workflow() -> None:
    readme = read_repo_file("README.md")
    implementation_plan = read_repo_file("docs/IMPLEMENTATION_PLAN.md")
    development = read_repo_file("docs/DEVELOPMENT.md")
    release_checklist = read_repo_file("docs/V1_RELEASE_CHECKLIST.md")

    combined = "\n".join([readme, implementation_plan, development, release_checklist])
    assert "Scripts tool" in combined
    assert "trusted `.dms` scripts" in combined
    assert "Run a sample `.dms` script" in release_checklist

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
    architecture = read_repo_file("docs/ARCHITECTURE.md")
    implementation_plan = read_repo_file("docs/IMPLEMENTATION_PLAN.md")

    legacy_refs = [
        line
        for line in f"{architecture}\n{implementation_plan}".splitlines()
        if "/api/scenarios" in line or ".virtualscreen/scenarios" in line
    ]
    assert legacy_refs
    assert all("deprecated" in line.lower() or "legacy" in line.lower() for line in legacy_refs)
