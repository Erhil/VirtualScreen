import { describe, expect, it } from "vitest";

import { linkToOpenTab } from "./links";
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
