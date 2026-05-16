import { describe, expect, it } from "vitest";

import {
  buildMetadataViewModel,
  formatMetadataList,
  treeEntryLabel,
  type MetadataEntry
} from "./metadata";

describe("treeEntryLabel", () => {
  it("prefers page title when present", () => {
    expect(
      treeEntryLabel({
        name: "README.md",
        path: "README.md",
        kind: "file",
        extension: "md",
        children: [],
        title: "Sample World Guide",
        page_type: "index",
        tags: ["sample"],
        aliases: ["Home"]
      })
    ).toEqual({ primary: "Sample World Guide", secondary: "README.md" });
  });

  it("uses filename when page title is absent", () => {
    expect(
      treeEntryLabel({
        name: "random-events.csv",
        path: "Tables/random-events.csv",
        kind: "file",
        extension: "csv",
        children: [],
        title: null,
        page_type: null,
        tags: [],
        aliases: []
      })
    ).toEqual({ primary: "random-events.csv", secondary: null });
  });
});

describe("formatMetadataList", () => {
  it("formats empty and populated arrays", () => {
    expect(formatMetadataList([])).toBe("None");
    expect(formatMetadataList(["city-watch", "ally"])).toBe("city-watch, ally");
  });
});

describe("buildMetadataViewModel", () => {
  it("separates standard metadata from custom fields", () => {
    const entries: MetadataEntry[] = buildMetadataViewModel({
      path: "NPCs/Captain Ilyra.md",
      name: "Captain Ilyra.md",
      extension: "md",
      title: "Captain Ilyra",
      page_type: "npc",
      tags: ["city-watch", "ally"],
      aliases: ["Ilyra"],
      size: 100,
      modified_at: "2026-05-05T09:00:00Z",
      hash: "captain-hash",
      metadata: { title: "Captain Ilyra" },
      fields: { voice: "calm and formal", danger: "medium" }
    });

    expect(entries).toContainEqual({ label: "Type", value: "npc" });
    expect(entries).toContainEqual({ label: "Tags", value: "city-watch, ally" });
    expect(entries).toContainEqual({ label: "voice", value: "calm and formal" });
    expect(entries).toContainEqual({ label: "danger", value: "medium" });
    expect(entries.map((entry) => entry.label)).not.toEqual(
      expect.arrayContaining(["Path", "Size", "Modified"])
    );
  });
});
