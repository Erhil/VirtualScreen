import { describe, expect, it } from "vitest";

import type { WorldFile } from "./api";
import {
  createEditorDraft,
  editorShortcutIntent,
  editorModesForTarget,
  isDraftDirty,
  markDraftChangedOnDisk,
  markDraftConflict,
  markDraftSaved,
  normalizeEditorModeForTarget,
  revertDraft,
  shouldStopEditorHotkeyPropagation,
  supportsEditorMode,
  updateDraftContent
} from "./editor";

const file: WorldFile = {
  path: "README.md",
  name: "README.md",
  extension: "md",
  media_kind: "markdown",
  content_type: "text/markdown",
  size: 8,
  modified_at: "2026-05-05T09:00:00Z",
  hash: "old",
  content: "# Home"
};

describe("editor helpers", () => {
  it("creates a clean draft from a file", () => {
    const draft = createEditorDraft(file);

    expect(draft.content).toBe("# Home");
    expect(isDraftDirty(draft)).toBe(false);
  });

  it("marks edits dirty and reverts to original content", () => {
    const dirty = updateDraftContent(createEditorDraft(file), "# Updated");

    expect(isDraftDirty(dirty)).toBe(true);
    expect(revertDraft(dirty).content).toBe("# Home");
    expect(revertDraft(dirty).status).toBe("clean");
  });

  it("updates draft baseline after a successful save", () => {
    const saved = markDraftSaved(updateDraftContent(createEditorDraft(file), "# Updated"), {
      ...file,
      content: "# Updated",
      hash: "new"
    });

    expect(saved.originalContent).toBe("# Updated");
    expect(saved.hash).toBe("new");
    expect(saved.status).toBe("saved");
    expect(isDraftDirty(saved)).toBe(false);
  });

  it("keeps unsaved content visible on conflict", () => {
    const conflict = markDraftConflict(
      updateDraftContent(createEditorDraft(file), "# Unsaved"),
      "World file changed on disk."
    );

    expect(conflict.content).toBe("# Unsaved");
    expect(conflict.status).toBe("conflict");
    expect(conflict.externalChanged).toBe(true);
    expect(conflict.message).toBe("World file changed on disk.");
  });

  it("marks a dirty draft as changed on disk without overwriting content", () => {
    const dirty = updateDraftContent(createEditorDraft(file), "# Unsaved");
    const changed = markDraftChangedOnDisk(dirty);

    expect(changed.content).toBe("# Unsaved");
    expect(changed.externalChanged).toBe(true);
    expect(isDraftDirty(changed)).toBe(true);
  });

  it("supports split mode for Markdown files", () => {
    expect(editorModesForTarget(file)).toEqual(["preview", "edit", "split"]);
    expect(supportsEditorMode(file, "split")).toBe(true);
  });

  it("keeps DMS scripts to preview and edit modes", () => {
    const scriptFile: WorldFile = {
      ...file,
      path: "Scripts/hello.dms",
      name: "hello.dms",
      extension: "dms",
      media_kind: "text",
      content_type: "text/plain",
      content: "render_md('# Hi')"
    };

    expect(editorModesForTarget(scriptFile)).toEqual(["preview", "edit"]);
    expect(supportsEditorMode(scriptFile, "split")).toBe(false);
    expect(normalizeEditorModeForTarget(scriptFile, "split")).toBe("edit");
  });

  it("does not let split mode affect draft dirty/save/revert behavior", () => {
    const splitDraft = { ...createEditorDraft(file), mode: "split" as const };
    const dirty = updateDraftContent(splitDraft, "# Split edit");

    expect(dirty.mode).toBe("split");
    expect(dirty.status).toBe("dirty");
    expect(revertDraft(dirty)).toMatchObject({
      content: "# Home",
      mode: "split",
      status: "clean"
    });
  });

  it("identifies CodeMirror hotkeys that should not reach fast slots", () => {
    expect(shouldStopEditorHotkeyPropagation({ altKey: true, key: "1" })).toBe(true);
    expect(shouldStopEditorHotkeyPropagation({ altKey: true, key: "0" })).toBe(true);
    expect(shouldStopEditorHotkeyPropagation({ altKey: false, key: "1" })).toBe(false);
    expect(shouldStopEditorHotkeyPropagation({ altKey: true, key: "k" })).toBe(false);
  });

  it("maps editor cleanup shortcuts to safe intents", () => {
    expect(
      editorShortcutIntent(
        { ctrlKey: true, key: "s" },
        { dirty: true, mode: "edit", supportsSplit: true }
      )
    ).toBe("save");
    expect(
      editorShortcutIntent(
        { metaKey: true, key: "s" },
        { dirty: true, mode: "edit", supportsSplit: true }
      )
    ).toBe("save");
    expect(
      editorShortcutIntent(
        { code: "KeyS", ctrlKey: true, key: "ы" },
        { dirty: true, mode: "edit", supportsSplit: true }
      )
    ).toBe("save");
    expect(
      editorShortcutIntent(
        { ctrlKey: true, key: "\\" },
        { dirty: false, mode: "edit", supportsSplit: true }
      )
    ).toBe("toggle-split");
  });

  it("keeps Escape safe for clean, dirty, and revert flows", () => {
    expect(
      editorShortcutIntent(
        { key: "Escape" },
        { dirty: false, mode: "edit", supportsSplit: true }
      )
    ).toBe("exit-edit");
    expect(
      editorShortcutIntent(
        { key: "Escape" },
        { dirty: true, mode: "edit", supportsSplit: true }
      )
    ).toBe("dirty-escape");
    expect(
      editorShortcutIntent(
        { key: "Escape", shiftKey: true },
        { dirty: true, mode: "edit", supportsSplit: true }
      )
    ).toBe("revert");
    expect(
      editorShortcutIntent(
        { key: "Escape", shiftKey: true },
        { dirty: false, mode: "edit", supportsSplit: true }
      )
    ).toBeNull();
  });
});
