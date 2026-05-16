import { describe, expect, it } from "vitest";

import type { PageDetail } from "./api";
import {
  addMetadataFieldRow,
  isMetadataFormDirty,
  listToText,
  metadataFormFromPage,
  metadataPayloadFromForm,
  removeMetadataFieldRow,
  textToList,
  updateMetadataFieldRow,
  validateMetadataForm
} from "./metadataEditor";

const page: PageDetail = {
  path: "NPCs/Captain Ilyra.md",
  name: "Captain Ilyra.md",
  extension: "md",
  title: "Captain Ilyra",
  page_type: "npc",
  tags: ["city-watch", "ally"],
  aliases: ["Ilyra", "Watch Captain"],
  size: 100,
  modified_at: "2026-05-05T09:00:00Z",
  hash: "captain-hash",
  metadata: { title: "Captain Ilyra" },
  fields: { voice: "calm and formal", danger: "medium" }
};

describe("metadata editor helpers", () => {
  it("formats and parses comma-separated metadata lists", () => {
    expect(listToText(["city-watch", "ally"])).toBe("city-watch, ally");
    expect(textToList(" city-watch, ally, ,npc ")).toEqual(["city-watch", "ally", "npc"]);
  });

  it("maps page detail into editable form state", () => {
    expect(metadataFormFromPage(page)).toEqual({
      title: "Captain Ilyra",
      type: "npc",
      tagsText: "city-watch, ally",
      aliasesText: "Ilyra, Watch Captain",
      fields: [
        { key: "voice", value: "calm and formal" },
        { key: "danger", value: "medium" }
      ]
    });
  });

  it("adds, updates, and removes custom field rows", () => {
    const added = addMetadataFieldRow(metadataFormFromPage(page));
    const updated = updateMetadataFieldRow(added, 2, { key: "mood", value: "tired" });

    expect(updated.fields.at(-1)).toEqual({ key: "mood", value: "tired" });
    expect(removeMetadataFieldRow(updated, 1).fields).toEqual([
      { key: "voice", value: "calm and formal" },
      { key: "mood", value: "tired" }
    ]);
  });

  it("creates normalized API payloads from form state", () => {
    expect(
      metadataPayloadFromForm({
        title: " Captain Ilyra ",
        type: " npc ",
        tagsText: " city-watch, ally ",
        aliasesText: " Ilyra ",
        fields: [{ key: " voice ", value: "formal" }]
      })
    ).toEqual({
      title: "Captain Ilyra",
      type: "npc",
      tags: ["city-watch", "ally"],
      aliases: ["Ilyra"],
      fields: { voice: "formal" }
    });
  });

  it("defaults empty list and field metadata for API payloads", () => {
    expect(
      metadataPayloadFromForm({
        title: " Random Events ",
        type: "",
        tagsText: "",
        aliasesText: "",
        fields: []
      })
    ).toEqual({
      title: "Random Events",
      type: null,
      tags: [],
      aliases: [],
      fields: {}
    });
  });

  it("validates title and duplicate custom field keys", () => {
    expect(validateMetadataForm({ ...metadataFormFromPage(page), title: "" })).toBe(
      "Title is required."
    );
    expect(
      validateMetadataForm({
        ...metadataFormFromPage(page),
        fields: [
          { key: "voice", value: "formal" },
          { key: " voice ", value: "calm" }
        ]
      })
    ).toBe("Custom field keys must be unique.");
    expect(
      validateMetadataForm({
        ...metadataFormFromPage(page),
        fields: [{ key: "", value: "missing key" }]
      })
    ).toBe("Custom field key is required.");
  });

  it("detects dirty form state after a metadata change", () => {
    expect(isMetadataFormDirty(metadataFormFromPage(page), page)).toBe(false);
    expect(
      isMetadataFormDirty({ ...metadataFormFromPage(page), title: "Captain Ilyra Updated" }, page)
    ).toBe(true);
  });
});
