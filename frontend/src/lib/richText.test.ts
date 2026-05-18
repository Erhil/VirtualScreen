import { describe, expect, it } from "vitest";

import type { PageLink } from "./api";
import { renderRichInline, renderRichMarkdown, sanitizeRichHtml } from "./richText";

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

const videoLink: PageLink = {
  source_path: "README.md",
  raw_target: "Media/flyover.mp4",
  label: "flyover.mp4",
  link_type: "embed",
  target_path: "Media/flyover.mp4",
  target_title: "flyover",
  target_kind: "video",
  heading: null,
  resolved: true
};

describe("rich text rendering", () => {
  it("renders inline and block LaTeX with KaTeX markup", () => {
    const html = renderRichMarkdown("Inline $x^2$.\n\n$$d20 + 4$$", [], "README.md");

    expect(html).toContain("katex");
    expect(html).toContain("math-inline");
    expect(html).toContain("math-block");
  });

  it("sanitizes script tags and event handler attributes", () => {
    const html = sanitizeRichHtml('<img src="x" onerror="alert(1)"><script>alert(1)</script>');

    expect(html).toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("script");
  });

  it("keeps allowed HTML tags", () => {
    const html = renderRichMarkdown("<details><summary>DC</summary><table><tr><td>15</td></tr></table></details>", [], "README.md");

    expect(html).toContain("<details>");
    expect(html).toContain("<summary>DC</summary>");
    expect(html).toContain("<table>");
  });

  it("renders resolved wiki-links as openable world anchors", () => {
    const html = renderRichMarkdown("Talk to [[NPCs/Captain Ilyra]].", [captainLink], "README.md");

    expect(html).toContain('data-world-link-index="0"');
    expect(html).toContain("Captain Ilyra");
  });

  it("renders dice roll markdown links as safe roll anchors", () => {
    const html = renderRichMarkdown("[Perception](roll:1d20+3)", [], "README.md");

    expect(html).toContain('class="dice-roll-link"');
    expect(html).toContain('data-dice-expression="1d20+3"');
    expect(html).toContain("Perception");
  });

  it("renders dice roll links in inline card and CSV content", () => {
    const html = renderRichInline("[Secret](roll:1d6)", [], "Tables/events.csv");

    expect(html).toContain('data-dice-expression="1d6"');
  });

  it("renders CSV cell links and formulas together", () => {
    const html = renderRichInline("[[NPCs/Captain Ilyra]] rolls $1d20$.", [captainLink], "Tables/events.csv");

    expect(html).toContain('data-world-link-index="0"');
    expect(html).toContain("katex");
  });

  it("renders resolved video embeds as muted looping video", () => {
    const html = renderRichMarkdown("![[Media/flyover.mp4]]", [videoLink], "README.md");

    expect(html).toContain("<video");
    expect(html).toContain("autoplay");
    expect(html).toContain("loop");
    expect(html).toContain("muted");
  });

  it("uses an injected media URL builder for player-screen embeds", () => {
    const html = renderRichMarkdown(
      "![Map](Media/map.svg)\n\n![[Media/flyover.mp4]]",
      [videoLink],
      "README.md",
      (path) => `/api/screen/world/media?path=${encodeURIComponent(path)}`
    );

    expect(html).toContain("/api/screen/world/media?path=Media%2Fmap.svg");
    expect(html).toContain("/api/screen/world/media?path=Media%2Fflyover.mp4");
    expect(html).not.toContain("/api/world/media");
  });
});
