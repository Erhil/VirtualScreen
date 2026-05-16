import type { PageLink } from "./api";
import type { OpenTab } from "./tabs";

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "link"; text: string; link: PageLink }
  | { type: "unresolved"; text: string; rawTarget: string };

type InlineMatch = {
  index: number;
  length: number;
  rawTarget: string;
  text: string;
  linkType: PageLink["link_type"];
};

const WIKI_RE = /(!)?\[\[([^\]]+)]]/g;
const MARKDOWN_RE = /(!)?\[([^\]]*)]\(([^)]+)\)/g;

function displayName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function matchLink(match: InlineMatch, links: PageLink[]): PageLink | undefined {
  return links.find(
    (link) => link.raw_target === match.rawTarget && link.link_type === match.linkType
  );
}

function collectMatches(line: string): InlineMatch[] {
  const matches: InlineMatch[] = [];
  let wikiMatch: RegExpExecArray | null;
  let markdownMatch: RegExpExecArray | null;

  while ((wikiMatch = WIKI_RE.exec(line)) !== null) {
    const embedded = Boolean(wikiMatch[1]);
    const body = wikiMatch[2];
    const [rawTarget, label] = body.split("|");
    matches.push({
      index: wikiMatch.index,
      length: wikiMatch[0].length,
      rawTarget: rawTarget.trim(),
      text: label?.trim() || displayName(rawTarget.trim().split("#")[0]),
      linkType: embedded ? "embed" : "wiki"
    });
  }

  while ((markdownMatch = MARKDOWN_RE.exec(line)) !== null) {
    const embedded = Boolean(markdownMatch[1]);
    const label = markdownMatch[2];
    const rawTarget = markdownMatch[3];
    matches.push({
      index: markdownMatch.index,
      length: markdownMatch[0].length,
      rawTarget: rawTarget.trim(),
      text: label.trim() || displayName(rawTarget.trim().split("#")[0]),
      linkType: embedded ? "embed" : "markdown"
    });
  }

  return matches.sort((left, right) => left.index - right.index);
}

export function tokenizeInlineLinks(line: string, links: PageLink[]): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of collectMatches(line)) {
    if (match.index < cursor) {
      continue;
    }

    if (match.index > cursor) {
      tokens.push({ type: "text", text: line.slice(cursor, match.index) });
    }

    const link = matchLink(match, links);
    if (link?.resolved) {
      tokens.push({ type: "link", text: match.text, link });
    } else {
      tokens.push({ type: "unresolved", text: match.text, rawTarget: match.rawTarget });
    }

    cursor = match.index + match.length;
  }

  if (cursor < line.length) {
    tokens.push({ type: "text", text: line.slice(cursor) });
  }

  return tokens.length > 0 ? tokens : [{ type: "text", text: line }];
}

export function linkToOpenTab(link: PageLink): OpenTab | null {
  if (!link.resolved || !link.target_path || !link.target_kind) {
    return null;
  }

  return {
    path: link.target_path,
    name: displayName(link.target_path),
    title:
      link.target_kind === "markdown" || link.target_kind === "card"
        ? link.target_title
        : null,
    mediaKind: link.target_kind
  };
}
