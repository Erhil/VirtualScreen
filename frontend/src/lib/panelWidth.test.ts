import { describe, expect, it } from "vitest";

import {
  DEFAULT_TOOLS_PANEL_WIDTH,
  MAX_TOOLS_PANEL_WIDTH,
  MIN_TOOLS_PANEL_WIDTH,
  clampToolsPanelWidth,
  loadToolsPanelWidth,
  saveToolsPanelWidth
} from "./panelWidth";

function fakeStorage(initialValue?: string): Storage {
  const values = new Map<string, string>();
  if (initialValue) {
    values.set("virtualscreen.toolsPanelWidth", initialValue);
  }
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

describe("tools panel width helpers", () => {
  it("clamps panel width to practical bounds", () => {
    expect(clampToolsPanelWidth(120)).toBe(MIN_TOOLS_PANEL_WIDTH);
    expect(clampToolsPanelWidth(999)).toBe(MAX_TOOLS_PANEL_WIDTH);
    expect(clampToolsPanelWidth(Number.NaN)).toBe(DEFAULT_TOOLS_PANEL_WIDTH);
  });

  it("loads and saves a local browser width", () => {
    const storage = fakeStorage("420");

    expect(loadToolsPanelWidth(storage)).toBe(420);
    expect(saveToolsPanelWidth(800, storage)).toBe(MAX_TOOLS_PANEL_WIDTH);
    expect(loadToolsPanelWidth(storage)).toBe(MAX_TOOLS_PANEL_WIDTH);
  });
});
