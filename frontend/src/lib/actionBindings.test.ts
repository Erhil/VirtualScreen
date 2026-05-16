import { describe, expect, it } from "vitest";

import { dispatchableHotkeyPosition } from "./fastSlots";
import {
  bindingStorageKey,
  canonicalShortcutFromEvent,
  clearActionBindings,
  duplicateShortcut,
  isEditableHotkeyTarget,
  isReservedShortcut,
  loadActionBindings,
  saveActionBindings,
  shortcutValidationError,
  sortActionBindings
} from "./actionBindings";
import type { ActionBinding } from "./actionBindings";

const binding: ActionBinding = {
  id: "binding-1",
  label: "Open Home",
  shortcut: "Ctrl+Shift+M",
  action: { kind: "open_file", path: "README.md" }
};

function fakeStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map<string, string>(Object.entries(initialValues));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

describe("action binding helpers", () => {
  it("canonicalizes keyboard-like events into stable shortcut strings", () => {
    expect(
      canonicalShortcutFromEvent({
        key: "m",
        ctrlKey: true,
        shiftKey: true
      })
    ).toBe("Ctrl+Shift+M");
    expect(
      canonicalShortcutFromEvent({
        key: "1",
        altKey: true
      })
    ).toBe("Alt+1");
    expect(
      canonicalShortcutFromEvent({
        key: "F5",
        ctrlKey: true
      })
    ).toBe("Ctrl+F5");
  });

  it("requires a modifier and rejects reserved browser shortcuts", () => {
    expect(shortcutValidationError("M", [])).toBe("Use at least one modifier.");
    expect(shortcutValidationError("Ctrl+R", [])).toBe("Shortcut is reserved by the browser.");
    expect(shortcutValidationError("Meta+W", [])).toBe("Shortcut is reserved by the browser.");
    expect(isReservedShortcut("Ctrl+L")).toBe(true);
    expect(isReservedShortcut("Ctrl+Shift+R")).toBe(false);
    expect(shortcutValidationError("Ctrl+Shift+M", [])).toBeNull();
  });

  it("detects duplicate shortcuts case-insensitively", () => {
    expect(duplicateShortcut("ctrl+shift+m", [binding])).toBe(true);
    expect(duplicateShortcut("Ctrl+Shift+M", [binding], "binding-1")).toBe(false);
    expect(shortcutValidationError("Ctrl+Shift+M", [binding])).toBe("Shortcut is already used.");
  });

  it("ignores hotkeys from editable targets and CodeMirror content", () => {
    expect(isEditableHotkeyTarget({ tagName: "input" })).toBe(true);
    expect(isEditableHotkeyTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableHotkeyTarget({ tagName: "select" })).toBe(true);
    expect(isEditableHotkeyTarget({ isContentEditable: true })).toBe(true);
    expect(isEditableHotkeyTarget({ className: "cm-content" })).toBe(true);
    expect(isEditableHotkeyTarget({ className: "card CodeMirror-focused" })).toBe(true);
    expect(isEditableHotkeyTarget({ tagName: "button" })).toBe(false);
  });

  it("stores bindings in localStorage by world id or path", () => {
    const storage = fakeStorage();
    const key = bindingStorageKey("sample-world");
    expect(key).toContain("sample-world");

    saveActionBindings("sample-world", [binding], storage);
    expect(loadActionBindings("sample-world", storage)).toEqual([binding]);
    expect(loadActionBindings("other-world", storage)).toEqual([]);

    clearActionBindings("sample-world", storage);
    expect(loadActionBindings("sample-world", storage)).toEqual([]);
  });

  it("sorts bindings by label then shortcut", () => {
    const sorted = sortActionBindings([
      { ...binding, id: "b", label: "Screen", shortcut: "Ctrl+2" },
      { ...binding, id: "a", label: "Audio", shortcut: "Ctrl+3" },
      { ...binding, id: "c", label: "Audio", shortcut: "Ctrl+1" }
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("preserves existing fixed fast slot hotkey mapping", () => {
    expect(dispatchableHotkeyPosition({ altKey: true, key: "1" })).toBe(1);
    expect(dispatchableHotkeyPosition({ altKey: true, key: "0" })).toBe(10);
  });
});
