import { describe, expect, it } from "vitest";

import type { AudioTrack, PageSummary, WorldEntry } from "./api";
import {
  buildEditorCompletionItems,
  completionResultForTextBeforeCursor,
  detectEditorAutocompleteContext,
  dmsCommandNames,
  wikiTargetForPath
} from "./editorAutocomplete";

const pages: PageSummary[] = [
  {
    path: "README.md",
    name: "README.md",
    extension: "md",
    title: "Sample World Guide",
    page_type: "home",
    tags: ["home"],
    aliases: ["Home"],
    size: 10,
    modified_at: "2026-05-12T12:00:00Z",
    hash: "home"
  },
  {
    path: "NPCs/Captain Ilyra.md",
    name: "Captain Ilyra.md",
    extension: "md",
    title: "Captain Ilyra",
    page_type: "npc",
    tags: ["city-watch"],
    aliases: ["Ilyra", "Watch Captain"],
    size: 10,
    modified_at: "2026-05-12T12:00:00Z",
    hash: "ilyra"
  }
];

const tree: WorldEntry = {
  name: "sample-world",
  path: "",
  kind: "directory",
  extension: null,
  children: [
    {
      name: "README.md",
      path: "README.md",
      kind: "file",
      extension: "md",
      children: [],
      title: "Sample World Guide"
    },
    {
      name: "NPCs",
      path: "NPCs",
      kind: "directory",
      extension: null,
      children: [
        {
          name: "Captain Ilyra.md",
          path: "NPCs/Captain Ilyra.md",
          kind: "file",
          extension: "md",
          children: [],
          title: "Captain Ilyra"
        }
      ]
    },
    {
      name: "Cards",
      path: "Cards",
      kind: "directory",
      extension: null,
      children: [
        {
          name: "Moonlit Key.cs",
          path: "Cards/Moonlit Key.cs",
          kind: "file",
          extension: "cs",
          children: [],
          title: "Moonlit Key"
        }
      ]
    },
    {
      name: "Tables",
      path: "Tables",
      kind: "directory",
      extension: null,
      children: [
        {
          name: "random-events.csv",
          path: "Tables/random-events.csv",
          kind: "file",
          extension: "csv",
          children: [],
          title: null
        }
      ]
    },
    {
      name: "Media",
      path: "Media",
      kind: "directory",
      extension: null,
      children: [
        {
          name: "sample-map.svg",
          path: "Media/sample-map.svg",
          kind: "file",
          extension: "svg",
          children: []
        },
        {
          name: "theme.mp4",
          path: "Media/theme.mp4",
          kind: "file",
          extension: "mp4",
          children: []
        }
      ]
    },
    {
      name: "Scripts",
      path: "Scripts",
      kind: "directory",
      extension: null,
      children: [
        {
          name: "hello_world.dms",
          path: "Scripts/hello_world.dms",
          kind: "file",
          extension: "dms",
          children: []
        }
      ]
    }
  ]
};

const audioTracks: AudioTrack[] = [
  {
    path: ".music/effects/broken-glass.wav",
    name: "broken-glass.wav",
    title: "broken-glass",
    bus: "effect",
    playlist: null,
    extension: "wav",
    content_type: "audio/wav",
    size: 10,
    modified_at: "2026-05-12T12:00:00Z"
  }
];

const items = buildEditorCompletionItems({ pages, tree, audioTracks });

describe("editor autocomplete helpers", () => {
  it("formats markdown page wiki targets without Markdown extensions", () => {
    expect(wikiTargetForPath("NPCs/Captain Ilyra.md")).toBe("NPCs/Captain Ilyra");
    expect(wikiTargetForPath("Cards/Moonlit Key.cs")).toBe("Cards/Moonlit Key.cs");
  });

  it("detects markdown wiki and @ contexts", () => {
    expect(detectEditorAutocompleteContext("See [[Ily", "markdown")).toMatchObject({
      kind: "markdownWiki",
      prefix: "Ily"
    });
    expect(detectEditorAutocompleteContext("Show @Moon", "markdown")).toMatchObject({
      kind: "markdownAt",
      prefix: "Moon"
    });
  });

  it("completes markdown wiki links by title, path, and alias", () => {
    const result = completionResultForTextBeforeCursor("See [[Watch", "markdown", items);

    expect(result?.options[0]).toMatchObject({
      label: "Watch Captain",
      apply: "NPCs/Captain Ilyra]]",
      detail: "Captain Ilyra"
    });
  });

  it("completes markdown @ mentions as full wiki links to files", () => {
    const result = completionResultForTextBeforeCursor("Show @Moonlit", "markdown", items);

    expect(result?.from).toBe("Show @".length);
    expect(result?.options[0]).toMatchObject({
      label: "Moonlit Key",
      apply: "[[Cards/Moonlit Key.cs]]"
    });
  });

  it("suggests DMS commands for bare command completion", () => {
    expect(dmsCommandNames).toContain("screen_fs");
    expect(dmsCommandNames).toContain("card_template");
    expect(dmsCommandNames).toContain("create_card");
    expect(completionResultForTextBeforeCursor("screen_", "dms", items)?.options).toEqual([
      expect.objectContaining({ label: "screen_fs", apply: "screen_fs(" }),
      expect.objectContaining({ label: "screen_pu", apply: "screen_pu(" })
    ]);

    expect(completionResultForTextBeforeCursor("card_", "dms", items)?.options).toEqual([
      expect.objectContaining({ label: "card_template", apply: "card_template(" })
    ]);
    expect(completionResultForTextBeforeCursor("create_", "dms", items)?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "create_card", apply: "create_card(" })
      ])
    );
  });

  it("filters DMS path completions by command", () => {
    expect(
      completionResultForTextBeforeCursor('table("random', "dms", items)?.options
    ).toEqual([expect.objectContaining({ apply: 'Tables/random-events.csv")' })]);
    expect(
      completionResultForTextBeforeCursor('screen_fs("sample', "dms", items)?.options
    ).toEqual([expect.objectContaining({ apply: 'Media/sample-map.svg")' })]);
    expect(
      completionResultForTextBeforeCursor('append_note("Captain', "dms", items)?.options
    ).toEqual([expect.objectContaining({ apply: 'NPCs/Captain Ilyra.md", ' })]);
  });

  it("uses audio library tracks only for audio_play path completion", () => {
    const result = completionResultForTextBeforeCursor('audio_play("glass', "dms", items);

    expect(result?.options).toEqual([
      expect.objectContaining({
        label: "broken-glass",
        apply: '.music/effects/broken-glass.wav")'
      })
    ]);
  });

  it("inserts DMS @ mentions as quoted world paths", () => {
    const result = completionResultForTextBeforeCursor("path = @Moonlit", "dms", items);

    expect(result?.from).toBe("path = @".length);
    expect(result?.options[0]).toMatchObject({
      label: "Moonlit Key",
      apply: '"Cards/Moonlit Key.cs"'
    });
  });
});
