import { describe, expect, it } from "vitest";

import {
  groupSystemPackPreviewRows,
  mapSystemPackImportResultSummary,
  validateSystemPackConflictDecisions,
  type SystemPackConflictDecision,
  type SystemPackPreviewRow
} from "./systemPacks";

const previewRows: SystemPackPreviewRow[] = [
  {
    id: "ready:README.md",
    source_path: "README.md",
    target_path: "README.md",
    status: "ready"
  },
  {
    id: "conflict:NPCs/Ilyra.md",
    source_path: "NPCs/Ilyra.md",
    target_path: "NPCs/Ilyra.md",
    status: "conflict",
    message: "File already exists."
  },
  {
    id: "skipped:Unsupported/roll.bin",
    source_path: "Unsupported/roll.bin",
    target_path: "Unsupported/roll.bin",
    status: "skipped",
    message: "Unsupported file type."
  },
  {
    id: "invalid:../secret.md",
    source_path: "../secret.md",
    target_path: "../secret.md",
    status: "invalid",
    message: "Path escapes world root."
  }
];

describe("system pack preview helpers", () => {
  it("groups preview rows by import status while preserving row order", () => {
    expect(groupSystemPackPreviewRows(previewRows)).toEqual({
      ready: [previewRows[0]],
      conflict: [previewRows[1]],
      skipped: [previewRows[2]],
      invalid: [previewRows[3]]
    });
  });
});

describe("system pack conflict decisions", () => {
  it("accepts replace, skip, and safe rename decisions for every conflict", () => {
    const decisions: SystemPackConflictDecision[] = [
      { target_path: "NPCs/Ilyra.md", decision: "rename", rename_target_path: "NPCs/Ilyra Pack.md" }
    ];

    expect(validateSystemPackConflictDecisions(previewRows, decisions)).toEqual({
      valid: true,
      errors: {}
    });
  });

  it("requires a decision and a safe rename target path for conflicts", () => {
    const rows: SystemPackPreviewRow[] = [
      previewRows[0],
      previewRows[1],
      {
        id: "conflict:Docs/Home.md",
        source_path: "Docs/Home.md",
        target_path: "Docs/Home.md",
        status: "conflict"
      }
    ];
    const decisions: SystemPackConflictDecision[] = [
      { target_path: "NPCs/Ilyra.md", decision: "rename", rename_target_path: "../Ilyra.md" }
    ];

    expect(validateSystemPackConflictDecisions(rows, decisions)).toEqual({
      valid: false,
      errors: {
        "NPCs/Ilyra.md": "Rename target must stay inside the world.",
        "Docs/Home.md": "Choose how to resolve this conflict."
      }
    });
  });

  it("rejects rename targets that collide with ready imports or other rename targets", () => {
    const rows: SystemPackPreviewRow[] = [
      previewRows[0],
      previewRows[1],
      {
        id: "conflict:Docs/Home.md",
        source_path: "Docs/Home.md",
        target_path: "Docs/Home.md",
        status: "conflict"
      }
    ];

    expect(
      validateSystemPackConflictDecisions(rows, [
        {
          target_path: "NPCs/Ilyra.md",
          decision: "rename",
          rename_target_path: "README.md"
        },
        {
          target_path: "Docs/Home.md",
          decision: "rename",
          rename_target_path: "README.md"
        }
      ])
    ).toEqual({
      valid: false,
      errors: {
        "NPCs/Ilyra.md": "Rename target conflicts with another import.",
        "Docs/Home.md": "Rename target conflicts with another import."
      }
    });
  });
});

describe("system pack import result helpers", () => {
  it("maps import result counts into a compact summary", () => {
    expect(
      mapSystemPackImportResultSummary({
        imported: 3,
        overwritten: 2,
        renamed: 1,
        skipped: 4,
        failed: 1
      })
    ).toEqual({
      imported: 3,
      overwritten: 2,
      renamed: 1,
      skipped: 4,
      failed: 1,
      changed: 6,
      total: 11
    });
  });
});
