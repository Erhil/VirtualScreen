import { describe, expect, it } from "vitest";

import { parseCard } from "./cards";
import {
  buildFolderKanbanColumns,
  buildFolderKanbanEntities,
  cardWithKanbanValue,
  createKanbanCardContent,
  findWorldEntry,
  folderKanbanGroupOptions,
  folderKanbanTab,
  kanbanCardPath,
  pageMetadataForKanbanMove,
  supportedFolderKanbanEntries
} from "./folderKanban";
import type { PageDetail, WorldEntry } from "./api";

function file(path: string, title?: string): WorldEntry {
  const name = path.split("/").at(-1) ?? path;
  return {
    name,
    path,
    kind: "file",
    extension: name.split(".").at(-1) ?? null,
    children: [],
    title
  };
}

function folder(path: string, children: WorldEntry[]): WorldEntry {
  return {
    name: path.split("/").at(-1) || "World",
    path,
    kind: "directory",
    extension: null,
    children
  };
}

function page(path: string, fields: Record<string, unknown> = {}, pageType: string | null = null): PageDetail {
  const name = path.split("/").at(-1) ?? path;
  return {
    path,
    name,
    extension: name.split(".").at(-1) ?? null,
    title: name.replace(/\.[^.]+$/, ""),
    page_type: pageType,
    tags: ["tag"],
    aliases: ["alias"],
    fields,
    metadata: {},
    size: 10,
    modified_at: "2026-06-13T12:00:00Z",
    hash: `${path}-hash`
  };
}

describe("folder kanban helpers", () => {
  it("finds folders and filters direct markdown csv and card children", () => {
    const root = folder("", [
      folder("Notes", [
        file("Notes/A.md", "A"),
        file("Notes/B.csv"),
        file("Notes/C.cs"),
        file("Notes/image.svg"),
        folder("Notes/Nested", [file("Notes/Nested/D.md")])
      ])
    ]);
    const notes = findWorldEntry(root, "Notes");

    expect(notes?.kind).toBe("directory");
    expect(supportedFolderKanbanEntries(notes).map((entry) => entry.path)).toEqual([
      "Notes/A.md",
      "Notes/B.csv",
      "Notes/C.cs"
    ]);
    expect(folderKanbanTab(notes!)).toEqual({
      path: "Notes",
      name: "Notes",
      title: "Notes",
      mediaKind: "folder"
    });
  });

  it("builds entities and columns from page metadata fields", () => {
    const notes = folder("Notes", [
      file("Notes/A.md", "A"),
      file("Notes/B.csv"),
      file("Notes/C.cs")
    ]);
    const entities = buildFolderKanbanEntities(notes, [
      page("Notes/A.md", { Status: "Ready" }, "note"),
      page("Notes/B.csv", { Status: "Draft" }),
      page("Notes/C.cs", {})
    ]);

    expect(entities.map((entity) => entity.title)).toEqual(["A", "B", "C"]);
    expect(folderKanbanGroupOptions(entities)).toEqual(["type", "Status"]);
    expect(
      buildFolderKanbanColumns(entities, "Status").map((column) => [
        column.label,
        column.entities.map((entity) => entity.name)
      ])
    ).toEqual([
      ["Unassigned", ["C.cs"]],
      ["Draft", ["B.csv"]],
      ["Ready", ["A.md"]]
    ]);
  });

  it("groups structured-card section fields by their leaf field name", () => {
    const notes = folder("Notes", [file("Notes/C.cs")]);
    const entities = buildFolderKanbanEntities(notes, [
      page("Notes/C.cs", { "Core.Status": "Ready", "Core.Hook": "knows the dock code" })
    ]);

    expect(folderKanbanGroupOptions(entities)).toContain("Status");
    expect(
      buildFolderKanbanColumns(entities, "Status").map((column) => [
        column.label,
        column.entities.map((entity) => entity.name)
      ])
    ).toEqual([
      ["Unassigned", []],
      ["Ready", ["C.cs"]]
    ]);
  });

  it("creates metadata payloads for markdown and csv moves", () => {
    const source = page("Notes/A.md", { Status: "Draft", Mood: "tense" }, "note");

    expect(pageMetadataForKanbanMove(source, "Status", "Ready")).toMatchObject({
      title: "A",
      type: "note",
      fields: { Status: "Ready", Mood: "tense" }
    });
    expect(pageMetadataForKanbanMove(source, "Status", "").fields).toEqual({
      Mood: "tense"
    });
    expect(pageMetadataForKanbanMove(source, "type", "npc").type).toBe("npc");
  });

  it("updates card kind or custom field in card JSON", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Dock Contact",
        kind: "npc",
        tags: [],
        sections: [{ title: "Core", fields: { Status: { value: "Draft" } } }]
      })
    );

    const moved = cardWithKanbanValue(card, "Status", "Ready");
    expect(moved.sections[0].fields.find((field) => field.label === "Status")?.value).toBe("Ready");
    expect(cardWithKanbanValue(card, "type", "location").kind).toBe("location");
    expect(
      cardWithKanbanValue(card, "Status", "").sections[0].fields.some((field) => field.label === "Status")
    ).toBe(false);
  });

  it("creates card content and paths for a kanban column", () => {
    const card = parseCard(createKanbanCardContent("New Lead", "Status", "Ready"));

    expect(card.title).toBe("New Lead");
    expect(card.sections[0].fields.find((field) => field.label === "Status")?.value).toBe("Ready");
    expect(kanbanCardPath("Notes", "New Lead")).toBe("Notes/New Lead.cs");
  });
});
