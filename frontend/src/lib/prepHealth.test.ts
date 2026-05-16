import { describe, expect, it } from "vitest";

import type { PrepHealthIssue, PrepHealthStatus } from "./api";
import {
  filterPrepHealthIssues,
  prepHealthCompactStatusLabel,
  prepHealthIssueToOpenTab,
  prepHealthStatusLabel,
  sortPrepHealthIssues
} from "./prepHealth";

const linkError: PrepHealthIssue = {
  id: "link:README.md:Missing Page",
  severity: "error",
  kind: "broken_link",
  source_path: "README.md",
  source_title: "Home",
  source_kind: "markdown",
  raw_target: "Missing Page",
  label: "Missing Page",
  command: null,
  message: "Broken link: Missing Page"
};

const dmsWarning: PrepHealthIssue = {
  id: "dms:Scripts/intro.dms",
  severity: "warning",
  kind: "dms_parse_error",
  source_path: "Scripts/intro.dms",
  source_title: "Intro",
  source_kind: "script",
  raw_target: "",
  label: null,
  command: null,
  message: "DMS parse error on line 3."
};

const embedError: PrepHealthIssue = {
  id: "embed:Notes/Side Quest.md:Old Map",
  severity: "error",
  kind: "missing_embed",
  source_path: "Notes/Side Quest.md",
  source_title: "Side Quest",
  source_kind: "markdown",
  raw_target: "Old Map",
  label: "Old Map",
  command: null,
  message: "Missing embedded reference: Old Map"
};

describe("prep health helpers", () => {
  it("maps prep health statuses to labels", () => {
    const statuses: PrepHealthStatus[] = ["ok", "warning", "error"];

    expect(statuses.map(prepHealthStatusLabel)).toEqual(["Ready", "Warnings", "Errors"]);
  });

  it("builds compact labels from the latest report and current status", () => {
    expect(prepHealthCompactStatusLabel(null, { status: "idle" })).toBe("Not checked");
    expect(prepHealthCompactStatusLabel(null, { status: "loading" })).toBe("Checking");
    expect(prepHealthCompactStatusLabel(null, { status: "error" })).toBe("Check failed");

    expect(
      prepHealthCompactStatusLabel(
        {
          checked_at: "2026-05-14T17:00:00Z",
          status: "ok",
          issue_count: 0,
          errors: 0,
          warnings: 0,
          issues: []
        },
        { status: "ready" }
      )
    ).toBe("Ready");

    expect(
      prepHealthCompactStatusLabel(
        {
          checked_at: "2026-05-14T17:00:00Z",
          status: "warning",
          issue_count: 3,
          errors: 1,
          warnings: 2,
          issues: [linkError, dmsWarning, embedError]
        },
        { status: "idle" }
      )
    ).toBe("1 error / 2 warnings");
  });

  it("filters issues by all, severity, and audit kind", () => {
    const issues = [linkError, dmsWarning, embedError];

    expect(filterPrepHealthIssues(issues, "all")).toEqual(issues);
    expect(filterPrepHealthIssues(issues, "errors")).toEqual([linkError, embedError]);
    expect(filterPrepHealthIssues(issues, "warnings")).toEqual([dmsWarning]);
    expect(filterPrepHealthIssues(issues, "links")).toEqual([linkError, embedError]);
    expect(filterPrepHealthIssues(issues, "dms")).toEqual([dmsWarning]);
  });

  it("sorts errors first, then source path", () => {
    expect(sortPrepHealthIssues([dmsWarning, embedError, linkError])).toEqual([
      embedError,
      linkError,
      dmsWarning
    ]);
  });

  it("maps source issues to open tabs by source path", () => {
    expect(prepHealthIssueToOpenTab(linkError)).toEqual({
      path: "README.md",
      name: "README.md",
      title: "Home",
      mediaKind: "markdown"
    });

    expect(prepHealthIssueToOpenTab(dmsWarning)).toEqual({
      path: "Scripts/intro.dms",
      name: "intro.dms",
      title: "Intro",
      mediaKind: "script"
    });
  });
});
