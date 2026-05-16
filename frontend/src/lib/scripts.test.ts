import { describe, expect, it } from "vitest";

import {
  buildDmsFormDefaults,
  buildDmsOutputSavePayload,
  defaultDmsOutputSavePath,
  dmsOutputToWorldFile,
  isScriptRunAvailable,
  normalizeDmsFormSchema,
  shouldPersistTab
} from "./scripts";

describe("DMS script helpers", () => {
  it("normalizes shorthand and object form schemas", () => {
    expect(
      normalizeDmsFormSchema({
        name: "text",
        level: { type: "number", default: 3 },
        target: { type: "file", label: "Target File" },
        hidden: { type: "unknown" }
      })
    ).toEqual([
      { name: "name", label: "name", input_type: "text", required: true, default: "", options: [] },
      { name: "level", label: "level", input_type: "number", required: true, default: 3, options: [] },
      { name: "target", label: "Target File", input_type: "file", required: true, default: null, options: [] }
    ]);
  });

  it("builds defaults for form fields", () => {
    expect(
      buildDmsFormDefaults([
        { name: "name", label: "Name", input_type: "text", required: true, default: "", options: [] },
        { name: "ok", label: "Ok", input_type: "boolean", required: false, default: null, options: [] },
        { name: "path", label: "File", input_type: "file", required: true, default: null, options: [] }
      ])
    ).toEqual({ name: "", ok: false, path: "" });
  });

  it("maps temporary DMS output to a virtual world file", () => {
    expect(
      dmsOutputToWorldFile({
        id: "output-1",
        media_kind: "markdown",
        virtual_path: "dms://run/output-1.md",
        name: "output-1.md",
        content: "# Hi"
      })
    ).toMatchObject({
      path: "dms://run/output-1.md",
      media_kind: "markdown",
      content: "# Hi"
    });
  });

  it("does not persist temporary tabs and disables dirty script runs", () => {
    expect(shouldPersistTab({ path: "dms://run/output-1.md", name: "output-1.md", mediaKind: "markdown" })).toBe(false);
    expect(shouldPersistTab({ path: "Scripts/a.dms", name: "a.dms", mediaKind: "script" })).toBe(true);
    expect(isScriptRunAvailable({ mediaKind: "script", dirty: false, saving: false })).toEqual({
      available: true
    });
    expect(isScriptRunAvailable({ mediaKind: "script", dirty: true, saving: false })).toEqual({
      available: false,
      reason: "Save before running."
    });
    expect(isScriptRunAvailable({ mediaKind: "script", dirty: false, saving: false, running: true })).toEqual({
      available: false,
      reason: "Script is already running."
    });
  });

  it("builds Save As payloads for temporary outputs", () => {
    const output = {
      id: "output-1",
      media_kind: "markdown" as const,
      virtual_path: "dms://run/output-1.md",
      name: "output-1.md",
      content: "# Saved"
    };

    expect(defaultDmsOutputSavePath(output)).toBe("DMS Outputs/output-1.md");
    expect(buildDmsOutputSavePayload(output, "Notes/output.md")).toEqual({
      path: "Notes/output.md",
      file_type: "markdown",
      content: "# Saved"
    });
  });
});
