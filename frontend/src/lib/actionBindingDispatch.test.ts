import { describe, expect, it } from "vitest";

import {
  isEditableHotkeyEvent,
  isTableSnapshotRestoreAction,
  normalizeDispatchAction,
  resolveScreenActionPath,
  validateDispatchAction
} from "./actionBindingDispatch";

describe("action binding dispatch helpers", () => {
  it("resolves dynamic screen actions from the active tab", () => {
    expect(
      resolveScreenActionPath({ kind: "screen_fullscreen" }, "README.md")
    ).toEqual({ path: "README.md" });
    expect(resolveScreenActionPath({ kind: "screen_popup" }, "NPCs/Captain.md")).toEqual({
      path: "NPCs/Captain.md"
    });
  });

  it("returns a compact error for dynamic screen actions without an active tab", () => {
    expect(resolveScreenActionPath({ kind: "screen_fullscreen" }, null)).toEqual({
      error: "No active page for screen action."
    });
  });

  it("prefers a stored screen path over the active tab", () => {
    expect(
      resolveScreenActionPath(
        { kind: "screen_fullscreen", path: "Maps/Tavern.svg" },
        "README.md"
      )
    ).toEqual({ path: "Maps/Tavern.svg" });
  });

  it("normalizes audio binding actions to effect bus and immediate play", () => {
    expect(
      normalizeDispatchAction({
        kind: "audio_track",
        path: ".music/music/theme.mp3",
        bus: "ambient",
        play: false
      })
    ).toEqual({
      kind: "audio_track",
      path: ".music/music/theme.mp3",
      bus: "effect",
      play: true
    });
  });

  it("validates script bindings with missing paths", () => {
    expect(validateDispatchAction({ kind: "script_run", path: "" })).toEqual({
      error: "Choose a DMS script path."
    });
  });

  it("detects table snapshot restore actions", () => {
    expect(
      isTableSnapshotRestoreAction({
        kind: "table_snapshot_restore",
        snapshot_id: "snap-1"
      })
    ).toBe(true);
    expect(isTableSnapshotRestoreAction({ kind: "open_file", path: "README.md" })).toBe(false);
  });

  it("ignores editable hotkey events", () => {
    expect(isEditableHotkeyEvent({ targetTagName: "textarea" })).toBe(true);
    expect(isEditableHotkeyEvent({ targetClassName: "cm-content" })).toBe(true);
    expect(isEditableHotkeyEvent({ targetIsContentEditable: true })).toBe(true);
    expect(isEditableHotkeyEvent({ targetTagName: "button" })).toBe(false);
  });
});
