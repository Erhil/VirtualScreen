import { describe, expect, it } from "vitest";

import {
  linkToOpenTab,
  tokenizeInlineLinks,
  type InlineToken
} from "./links";
import type { PageLink } from "./api";

const captainLink: PageLink = {
  source_path: "README.md",
  raw_target: "NPCs/Captain Ilyra",
  label: "Captain Ilyra",
  link_type: "wiki",
  target_path: "NPCs/Captain Ilyra.md",
  target_title: "Captain Ilyra",
  target_kind: "markdown",
  heading: null,
  resolved: true
};

describe("tokenizeInlineLinks", () => {
  it("converts wiki links into link tokens and preserves text", () => {
    expect(tokenizeInlineLinks("Open [[NPCs/Captain Ilyra]] now.", [captainLink])).toEqual([
      { type: "text", text: "Open " },
      { type: "link", text: "Captain Ilyra", link: captainLink },
      { type: "text", text: " now." }
    ] satisfies InlineToken[]);
  });

  it("marks unresolved wiki links", () => {
    const tokens = tokenizeInlineLinks("See [[Missing Page]].", []);

    expect(tokens).toEqual([
      { type: "text", text: "See " },
      { type: "unresolved", text: "Missing Page", rawTarget: "Missing Page" },
      { type: "text", text: "." }
    ]);
  });

  it("converts markdown links into link tokens", () => {
    const csvLink: PageLink = {
      source_path: "README.md",
      raw_target: "Tables/random-events.csv",
      label: "events",
      link_type: "markdown",
      target_path: "Tables/random-events.csv",
      target_title: "random-events",
      target_kind: "csv",
      heading: null,
      resolved: true
    };

    expect(tokenizeInlineLinks("Check [events](Tables/random-events.csv).", [csvLink])).toEqual([
      { type: "text", text: "Check " },
      { type: "link", text: "events", link: csvLink },
      { type: "text", text: "." }
    ] satisfies InlineToken[]);
  });

  it("tokenizes wiki links from CSV cell text", () => {
    const homeLink: PageLink = {
      source_path: "Tables/random-events.csv",
      raw_target: "../README",
      label: "Home",
      link_type: "wiki",
      target_path: "README.md",
      target_title: "Sample World Guide",
      target_kind: "markdown",
      heading: null,
      resolved: true
    };

    expect(tokenizeInlineLinks("[[../README|Home]]", [homeLink])).toEqual([
      { type: "link", text: "Home", link: homeLink }
    ] satisfies InlineToken[]);
  });
});

describe("linkToOpenTab", () => {
  it("maps resolved link targets to existing tab metadata", () => {
    expect(linkToOpenTab(captainLink)).toEqual({
      path: "NPCs/Captain Ilyra.md",
      name: "Captain Ilyra.md",
      title: "Captain Ilyra",
      mediaKind: "markdown"
    });
  });

  it("maps resolved PDF links to PDF tabs", () => {
    expect(
      linkToOpenTab({
        ...captainLink,
        raw_target: "Docs/handout.pdf",
        label: "Handout",
        target_path: "Docs/handout.pdf",
        target_title: "handout",
        target_kind: "pdf"
      })
    ).toEqual({
      path: "Docs/handout.pdf",
      name: "handout.pdf",
      title: null,
      mediaKind: "pdf"
    });
  });

  it("maps resolved card links to card tabs", () => {
    expect(
      linkToOpenTab({
        ...captainLink,
        raw_target: "NPCs/Captain Ilyra.cs",
        label: "Captain Ilyra",
        target_path: "NPCs/Captain Ilyra.cs",
        target_title: "Captain Ilyra",
        target_kind: "card"
      })
    ).toEqual({
      path: "NPCs/Captain Ilyra.cs",
      name: "Captain Ilyra.cs",
      title: "Captain Ilyra",
      mediaKind: "card"
    });
  });

  it("returns null for unresolved links", () => {
    expect(linkToOpenTab({ ...captainLink, resolved: false, target_path: null })).toBeNull();
  });
});
