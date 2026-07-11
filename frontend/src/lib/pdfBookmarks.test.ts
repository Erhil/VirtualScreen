import { describe, expect, it } from "vitest";

import {
  bookmarkLinkTarget,
  pageLinkTarget,
  parsePdfTarget,
  pdfBookmarkStateWith,
  removePdfBookmark
} from "./pdfBookmarks";

describe("pdf bookmark helpers", () => {
  it("parses page targets", () => {
    expect(parsePdfTarget("page=42")).toEqual({ kind: "page", page: 42 });
    expect(parsePdfTarget("PAGE=2")).toEqual({ kind: "page", page: 2 });
  });

  it("parses bookmark targets", () => {
    expect(parsePdfTarget("b:bandit-stat-block")).toEqual({
      kind: "bookmark",
      id: "bandit-stat-block"
    });
  });

  it("rejects invalid targets", () => {
    expect(parsePdfTarget(null)).toBeNull();
    expect(parsePdfTarget("")).toBeNull();
    expect(parsePdfTarget("page=0")).toBeNull();
    expect(parsePdfTarget("b:bad/id")).toBeNull();
  });

  it("builds copyable wiki link targets", () => {
    expect(pageLinkTarget("Docs/Campaign.pdf", 42, "Ambush map")).toBe(
      "[[Docs/Campaign.pdf#page=42|Ambush map]]"
    );
    expect(bookmarkLinkTarget("Docs/Campaign.pdf", "bandit", "Bandit")).toBe(
      "[[Docs/Campaign.pdf#b:bandit|Bandit]]"
    );
  });

  it("adds replaces and removes bookmarks immutably", () => {
    const state = pdfBookmarkStateWith(
      { bookmarks: [] },
      {
        id: "a",
        label: "A",
        page: 1,
        created_at: "2026-06-13T12:00:00Z",
        updated_at: "2026-06-13T12:00:00Z"
      }
    );

    expect(state.bookmarks).toHaveLength(1);
    expect(
      pdfBookmarkStateWith(state, {
        ...state.bookmarks[0],
        label: "Renamed"
      }).bookmarks[0].label
    ).toBe("Renamed");
    expect(removePdfBookmark(state, "a").bookmarks).toEqual([]);
  });
});
