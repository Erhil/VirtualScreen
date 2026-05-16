import { describe, expect, it } from "vitest";

import { moveSearchResultSelection, selectedSearchResult } from "./searchPalette";

describe("search palette helpers", () => {
  it("does not select anything when there are no results", () => {
    expect(moveSearchResultSelection(null, "ArrowDown", 0)).toBeNull();
    expect(moveSearchResultSelection(0, "ArrowUp", 0)).toBeNull();
  });

  it("moves through results with arrow keys and wraps at the edges", () => {
    expect(moveSearchResultSelection(null, "ArrowDown", 3)).toBe(0);
    expect(moveSearchResultSelection(0, "ArrowDown", 3)).toBe(1);
    expect(moveSearchResultSelection(2, "ArrowDown", 3)).toBe(0);

    expect(moveSearchResultSelection(null, "ArrowUp", 3)).toBe(2);
    expect(moveSearchResultSelection(2, "ArrowUp", 3)).toBe(1);
    expect(moveSearchResultSelection(0, "ArrowUp", 3)).toBe(2);
  });

  it("jumps to first or last result with home and end", () => {
    expect(moveSearchResultSelection(2, "Home", 4)).toBe(0);
    expect(moveSearchResultSelection(0, "End", 4)).toBe(3);
  });

  it("clears selection on escape and ignores unrelated keys", () => {
    expect(moveSearchResultSelection(1, "Escape", 3)).toBeNull();
    expect(moveSearchResultSelection(1, "Enter", 3)).toBe(1);
  });

  it("clamps stale selections before moving", () => {
    expect(moveSearchResultSelection(10, "ArrowDown", 3)).toBe(0);
    expect(moveSearchResultSelection(-2, "ArrowUp", 3)).toBe(2);
  });

  it("returns the selected result only when the index is in range", () => {
    const results = ["first", "second"];

    expect(selectedSearchResult(results, 1)).toBe("second");
    expect(selectedSearchResult(results, null)).toBeNull();
    expect(selectedSearchResult(results, 3)).toBeNull();
  });
});
