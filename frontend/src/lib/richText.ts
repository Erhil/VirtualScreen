import DOMPurify from "dompurify";
import katex from "katex";
import MarkdownIt from "markdown-it";

import { buildMediaUrl, type PageLink } from "./api";

const markdown = new MarkdownIt({
  breaks: false,
  html: true,
  linkify: false
});

type RichEnv = {
  links: PageLink[];
  sourcePath: string;
  mediaUrlBuilder: (path: string) => string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function displayName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export function stripFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return content.trimStart();
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return content.trimStart();
  }

  return normalized.slice(endIndex + 5).trimStart();
}

export function resolveWorldReference(sourcePath: string, targetPath: string): string {
  if (/^[a-z]+:/i.test(targetPath) || targetPath.startsWith("#")) {
    return targetPath;
  }

  const sourceParts = sourcePath.split("/").slice(0, -1);
  const targetParts = targetPath.startsWith("/")
    ? targetPath.slice(1).split("/")
    : [...sourceParts, ...targetPath.split("/")];
  const resolvedParts: string[] = [];

  for (const part of targetParts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      resolvedParts.pop();
      continue;
    }
    resolvedParts.push(part);
  }

  return resolvedParts.join("/");
}

function linkIndex(links: PageLink[], rawTarget: string, linkType: PageLink["link_type"]) {
  return links.findIndex(
    (link) => link.raw_target === rawTarget && link.link_type === linkType && link.resolved
  );
}

function renderWorldAnchor(index: number, label: string): string {
  return `<a class="inline-link" href="#" data-world-link-index="${index}">${escapeHtml(label)}</a>`;
}

function diceExpressionFromHref(href: string): string | null {
  if (!href.toLowerCase().startsWith("roll:")) {
    return null;
  }
  const expression = href.slice(5).trim();
  return expression ? expression : null;
}

function renderWorldVideo(
  path: string,
  label: string,
  mediaUrlBuilder: (path: string) => string
): string {
  return `<video aria-label="${escapeHtml(label)}" autoplay loop muted playsinline src="${mediaUrlBuilder(path)}"></video>`;
}

function renderUnresolved(label: string, rawTarget: string): string {
  return `<span class="unresolved-link" title="${escapeHtml(rawTarget)}">${escapeHtml(label)}</span>`;
}

function renderMath(value: string, displayMode: boolean): string {
  return katex.renderToString(value.trim(), {
    displayMode,
    throwOnError: false
  });
}

function replaceMath(content: string): string {
  const withBlocks = content.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula: string) => {
    return `<div class="math-block">${renderMath(formula, true)}</div>`;
  });

  return withBlocks.replace(/(^|[^\\])\$([^\n$]+?)\$/g, (_match, prefix: string, formula: string) => {
    return `${prefix}<span class="math-inline">${renderMath(formula, false)}</span>`;
  });
}

function replaceWikiLinks(
  content: string,
  links: PageLink[],
  mediaUrlBuilder: (path: string) => string
): string {
  return content.replace(/(!)?\[\[([^\]]+)]]/g, (match, embed: string | undefined, body: string) => {
    const [rawTargetValue, labelValue] = body.split("|");
    const rawTarget = rawTargetValue.trim();
    const label = labelValue?.trim() || displayName(rawTarget.split("#")[0]);
    const type: PageLink["link_type"] = embed ? "embed" : "wiki";
    const index = linkIndex(links, rawTarget, type);
    const link = index >= 0 ? links[index] : null;

    if (link?.target_kind === "image" && link.target_path) {
      return `<img alt="${escapeHtml(label)}" src="${mediaUrlBuilder(link.target_path)}">`;
    }
    if (link?.target_kind === "video" && link.target_path) {
      return renderWorldVideo(link.target_path, label, mediaUrlBuilder);
    }
    if (index >= 0) {
      return renderWorldAnchor(index, label);
    }
    return renderUnresolved(label, rawTarget) || match;
  });
}

function fallbackSanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function sanitizeRichHtml(html: string): string {
  if (typeof window === "undefined") {
    return fallbackSanitize(html);
  }

  return DOMPurify.sanitize(html, {
    ADD_ATTR: [
      "aria-label",
      "autoplay",
      "class",
      "controls",
      "data-dice-expression",
      "data-world-link-index",
      "loop",
      "muted",
      "playsinline",
      "rel",
      "target"
    ],
    ADD_TAGS: ["math", "semantics", "annotation", "video"],
    FORBID_TAGS: ["script", "iframe", "object", "embed"]
  });
}

function renderMarkdown(
  rawContent: string,
  links: PageLink[],
  sourcePath: string,
  inline: boolean,
  mediaUrlBuilder: (path: string) => string
) {
  const prepared = replaceWikiLinks(replaceMath(rawContent), links, mediaUrlBuilder);
  const env: RichEnv = { links, sourcePath, mediaUrlBuilder };
  const html = inline ? markdown.renderInline(prepared, env) : markdown.render(prepared, env);
  return sanitizeRichHtml(html);
}

markdown.renderer.rules.link_open = (tokens, index, options, env: RichEnv, self) => {
  const token = tokens[index];
  const href = token.attrGet("href") ?? "";
  const diceExpression = diceExpressionFromHref(href);
  if (diceExpression) {
    token.attrSet("href", "#");
    token.attrSet("class", "dice-roll-link");
    token.attrSet("data-dice-expression", diceExpression);
    return self.renderToken(tokens, index, options);
  }
  const link = env.links.find((candidate) => {
    return candidate.link_type === "markdown" && candidate.raw_target === href;
  });
  if (link?.resolved) {
    const indexValue = env.links.indexOf(link);
    token.attrSet("href", "#");
    token.attrSet("class", "inline-link");
    token.attrSet("data-world-link-index", String(indexValue));
  } else if (link) {
    token.attrSet("class", "unresolved-link");
    token.attrSet("aria-disabled", "true");
  }
  return self.renderToken(tokens, index, options);
};

markdown.renderer.rules.image = (tokens, index, _options, env: RichEnv) => {
  const token = tokens[index];
  const src = token.attrGet("src") ?? "";
  const resolvedSource = resolveWorldReference(env.sourcePath, src);
  const alt = token.content || token.attrGet("alt") || displayName(src);
  if (!/^[a-z]+:/i.test(src) && resolvedSource.toLowerCase().endsWith(".mp4")) {
    return renderWorldVideo(resolvedSource, alt, env.mediaUrlBuilder);
  }
  const finalSource = /^[a-z]+:/i.test(src) ? src : env.mediaUrlBuilder(resolvedSource);
  return `<img alt="${escapeHtml(alt)}" src="${escapeHtml(finalSource)}">`;
};

export function renderRichMarkdown(
  content: string,
  links: PageLink[],
  sourcePath: string,
  mediaUrlBuilder: (path: string) => string = buildMediaUrl
): string {
  return renderMarkdown(stripFrontmatter(content), links, sourcePath, false, mediaUrlBuilder);
}

export function renderRichInline(
  content: string,
  links: PageLink[],
  sourcePath: string,
  mediaUrlBuilder: (path: string) => string = buildMediaUrl
): string {
  return renderMarkdown(content, links, sourcePath, true, mediaUrlBuilder);
}
