import { describe, expect, it } from "vitest";

import {
  filterWorldPathPickerCandidates,
  flattenWorldPathPickerEntries,
  moveWorldPathPickerActiveIndex,
  searchWorldPathPickerCandidates,
  selectedWorldPathPickerCandidate,
  type WorldPathPickerCandidate
} from "./worldPathPicker";
import type { WorldEntry } from "./api";

const tree: WorldEntry = {
  name: "sample-world",
  path: "",
  kind: "directory",
  extension: null,
  children: [
    {
      name: "Cards",
      path: "Cards",
      kind: "directory",
      extension: null,
      children: [
        {
          name: "Lantern Whisper.cs",
          path: "Cards/Lantern Whisper.cs",
          kind: "file",
          extension: "cs",
          title: "Lantern Whisper",
          aliases: ["lamp"],
          children: []
        }
      ]
    },
    {
      name: "Session Logs",
      path: "Session Logs",
      kind: "directory",
      extension: null,
      children: [
        {
          name: "2026-05-15.md",
          path: "Session Logs/2026-05-15.md",
          kind: "file",
          extension: "md",
          children: []
        }
      ]
    }
  ]
};

describe("world path picker helpers", () => {
  it("flattens world tree entries and adds unique audio tracks", () => {
    const candidates = flattenWorldPathPickerEntries(tree, [
      {
        path: "Audio/Harbor.mp3",
        name: "Harbor.mp3",
        title: "Harbor Ambience",
        bus: "ambient",
        playlist: "Docks",
        extension: "mp3",
        content_type: "audio/mpeg",
        size: 1024,
        modified_at: "2026-05-15T00:00:00Z"
      }
    ]);

    expect(candidates.map((candidate) => candidate.path)).toEqual([
      "Cards",
      "Cards/Lantern Whisper.cs",
      "Session Logs",
      "Session Logs/2026-05-15.md",
      "Audio/Harbor.mp3"
    ]);
    expect(candidates.at(-1)?.pickerKind).toBe("audio");
  });

  it("filters candidates by picker kind", () => {
    const candidates = flattenWorldPathPickerEntries(tree);

    expect(filterWorldPathPickerCandidates(candidates, "folder").map(pathOf)).toEqual([
      "Cards",
      "Session Logs"
    ]);
    expect(filterWorldPathPickerCandidates(candidates, "card").map(pathOf)).toEqual([
      "Cards/Lantern Whisper.cs"
    ]);
  });

  it("searches path, name, title, and aliases with stable scoring", () => {
    const candidates = flattenWorldPathPickerEntries(tree);

    expect(searchWorldPathPickerCandidates(candidates, "lantern").map(pathOf)).toEqual([
      "Cards/Lantern Whisper.cs"
    ]);
    expect(searchWorldPathPickerCandidates(candidates, "lamp").map(pathOf)).toEqual([
      "Cards/Lantern Whisper.cs"
    ]);
    expect(searchWorldPathPickerCandidates(candidates, "session").map(pathOf)).toEqual([
      "Session Logs",
      "Session Logs/2026-05-15.md"
    ]);
  });

  it("moves through candidates with wrapping keyboard navigation", () => {
    expect(moveWorldPathPickerActiveIndex(null, "ArrowDown", 2)).toBe(0);
    expect(moveWorldPathPickerActiveIndex(1, "ArrowDown", 2)).toBe(0);
    expect(moveWorldPathPickerActiveIndex(null, "ArrowUp", 2)).toBe(1);
    expect(moveWorldPathPickerActiveIndex(0, "ArrowUp", 2)).toBe(1);
    expect(moveWorldPathPickerActiveIndex(1, "Home", 2)).toBe(0);
    expect(moveWorldPathPickerActiveIndex(0, "End", 2)).toBe(1);
  });

  it("clears or ignores selection for escape, empty results, and unrelated keys", () => {
    expect(moveWorldPathPickerActiveIndex(0, "Escape", 2)).toBeNull();
    expect(moveWorldPathPickerActiveIndex(0, "ArrowDown", 0)).toBeNull();
    expect(moveWorldPathPickerActiveIndex(0, "Tab", 2)).toBe(0);
  });

  it("returns selected candidates only for in-range indexes", () => {
    const candidates = flattenWorldPathPickerEntries(tree);

    expect(selectedWorldPathPickerCandidate(candidates, 1)?.path).toBe("Cards/Lantern Whisper.cs");
    expect(selectedWorldPathPickerCandidate(candidates, null)).toBeNull();
    expect(selectedWorldPathPickerCandidate(candidates, candidates.length)).toBeNull();
  });
});

function pathOf(candidate: WorldPathPickerCandidate): string {
  return candidate.path;
}
