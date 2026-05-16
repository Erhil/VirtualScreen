import { describe, expect, it } from "vitest";

import {
  CAPTURE_CATEGORY_OPTIONS,
  clearCaptureDraft,
  getCaptureCategoryLabel,
  isCaptureSubmitShortcut,
  loadCaptureDraft,
  nextCaptureDraftCategory,
  nextCaptureDraftText,
  saveCaptureDraft,
  shouldPersistCaptureDraft
} from "./capture";

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

describe("capture helpers", () => {
  it("maps capture categories to UI labels", () => {
    expect(CAPTURE_CATEGORY_OPTIONS).toEqual([
      { value: "idea", label: "Idea" },
      { value: "todo", label: "Todo" },
      { value: "npc", label: "NPC" },
      { value: "player_wish", label: "Player Wish" },
      { value: "ruling", label: "Ruling" },
      { value: "loot", label: "Loot" },
      { value: "question", label: "Question" },
      { value: "other", label: "Other" }
    ]);
    expect(getCaptureCategoryLabel("player_wish")).toBe("Player Wish");
  });

  it("saves, loads, and clears a draft per world key", () => {
    const storage = fakeStorage();

    saveCaptureDraft(
      "world-id:Campaign A",
      { category: "todo", text: "Prep lighthouse encounter." },
      storage
    );
    saveCaptureDraft(
      "world-id:Campaign B",
      { category: "loot", text: "Moonlit compass." },
      storage
    );

    expect(loadCaptureDraft("world-id:Campaign A", storage)).toEqual({
      category: "todo",
      text: "Prep lighthouse encounter."
    });
    expect(loadCaptureDraft("world-id:Campaign B", storage)).toEqual({
      category: "loot",
      text: "Moonlit compass."
    });

    clearCaptureDraft("world-id:Campaign A", storage);

    expect(loadCaptureDraft("world-id:Campaign A", storage)).toBeNull();
    expect(loadCaptureDraft("world-id:Campaign B", storage)).toEqual({
      category: "loot",
      text: "Moonlit compass."
    });
  });

  it("updates capture category and text without mutating the draft", () => {
    const draft = { category: "idea" as const, text: "Ask about the lighthouse." };

    expect(nextCaptureDraftCategory(draft, "npc")).toEqual({
      category: "npc",
      text: "Ask about the lighthouse."
    });
    expect(nextCaptureDraftText(draft, "Follow the bell")).toEqual({
      category: "idea",
      text: "Follow the bell"
    });
    expect(draft).toEqual({ category: "idea", text: "Ask about the lighthouse." });
  });

  it("persists drafts only when there is meaningful text", () => {
    expect(shouldPersistCaptureDraft({ category: "todo", text: "  " })).toBe(false);
    expect(shouldPersistCaptureDraft({ category: "todo", text: "Prep harbor clocks" })).toBe(true);
  });

  it("ignores missing or invalid draft values", () => {
    const storage = fakeStorage({
      "virtualscreen.captureDraft.bad-json": "{",
      "virtualscreen.captureDraft.bad-shape": JSON.stringify({
        category: "invalid",
        text: "Nope"
      })
    });

    expect(loadCaptureDraft("missing", storage)).toBeNull();
    expect(loadCaptureDraft("bad-json", storage)).toBeNull();
    expect(loadCaptureDraft("bad-shape", storage)).toBeNull();
  });

  it("detects Ctrl+Enter or Meta+Enter submit shortcuts", () => {
    expect(
      isCaptureSubmitShortcut({
        ctrlKey: true,
        metaKey: false,
        key: "Enter"
      })
    ).toBe(true);
    expect(
      isCaptureSubmitShortcut({
        ctrlKey: false,
        metaKey: true,
        key: "Enter"
      })
    ).toBe(true);
    expect(
      isCaptureSubmitShortcut({
        ctrlKey: true,
        metaKey: false,
        isComposing: true,
        key: "Enter"
      })
    ).toBe(false);
    expect(
      isCaptureSubmitShortcut({
        ctrlKey: true,
        metaKey: false,
        key: "Escape"
      })
    ).toBe(false);
  });
});
