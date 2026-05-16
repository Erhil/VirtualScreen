import type { AudioTrack, PageSummary, WorldEntry, WorldMediaKind } from "./api";

export type EditorAutocompleteMode = "markdown" | "dms";

export type EditorCompletion = {
  label: string;
  apply: string;
  detail?: string;
  type?: "function" | "keyword" | "text" | "variable";
  source?: "page" | "file" | "audio" | "command";
  path?: string;
  mediaKind?: WorldMediaKind | "audio";
  replaceFrom?: number;
};

export type EditorAutocompleteContext =
  | { kind: "markdownWiki"; from: number; prefix: string }
  | { kind: "markdownAt"; from: number; prefix: string }
  | { kind: "dmsCommand"; from: number; prefix: string }
  | { kind: "dmsStringPath"; from: number; prefix: string; command: string }
  | { kind: "dmsAt"; from: number; prefix: string };

export type EditorAutocompleteResult = {
  from: number;
  options: EditorCompletion[];
};

export const dmsCommandNames = [
  "form",
  "choose_file",
  "roll",
  "table",
  "render_md",
  "render_csv",
  "screen_fs",
  "screen_pu",
  "audio_play",
  "card_template",
  "create_card",
  "create_note",
  "append_note"
] as const;

const IMAGE_EXTENSIONS = new Set(["gif", "jpeg", "jpg", "png", "svg", "webp"]);
const DISPLAYABLE_MEDIA_KINDS = new Set<WorldMediaKind>([
  "markdown",
  "card",
  "csv",
  "text",
  "image",
  "pdf",
  "video"
]);

export function wikiTargetForPath(path: string): string {
  return path.replace(/\.(md|markdown)$/i, "");
}

function extensionForPath(path: string): string {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index + 1).toLowerCase();
}

function mediaKindForEntry(entry: WorldEntry): WorldMediaKind {
  const extension = (entry.extension ?? extensionForPath(entry.path)).toLowerCase();
  if (extension === "md" || extension === "markdown") {
    return "markdown";
  }
  if (extension === "cs") {
    return "card";
  }
  if (extension === "csv") {
    return "csv";
  }
  if (extension === "dms") {
    return "script";
  }
  if (extension === "txt") {
    return "text";
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  if (extension === "mp4") {
    return "video";
  }
  return "unsupported";
}

function collectFileEntries(entry: WorldEntry | null): WorldEntry[] {
  if (!entry) {
    return [];
  }
  if (entry.kind === "file") {
    return [entry];
  }
  return entry.children.flatMap(collectFileEntries);
}

function pageCompletion(page: PageSummary, label: string, detail: string): EditorCompletion {
  return {
    label,
    apply: wikiTargetForPath(page.path),
    detail,
    type: "text",
    source: "page",
    path: page.path,
    mediaKind: "markdown"
  };
}

export function buildEditorCompletionItems({
  pages,
  tree,
  audioTracks = []
}: {
  pages: PageSummary[];
  tree: WorldEntry | null;
  audioTracks?: AudioTrack[];
}): EditorCompletion[] {
  const pageItems = pages.flatMap((page) => [
    pageCompletion(page, page.title, page.path),
    ...page.aliases.map((alias) => pageCompletion(page, alias, page.title))
  ]);
  const fileItems = collectFileEntries(tree).map((entry) => {
    const mediaKind = mediaKindForEntry(entry);
    return {
      label: entry.title ?? entry.name,
      apply: mediaKind === "markdown" ? wikiTargetForPath(entry.path) : entry.path,
      detail: entry.path,
      type: "variable" as const,
      source: "file" as const,
      path: entry.path,
      mediaKind
    };
  });
  const audioItems = audioTracks.map((track) => ({
    label: track.title || track.name,
    apply: track.path,
    detail: track.playlist ? `${track.bus} / ${track.playlist}` : track.bus,
    type: "variable" as const,
    source: "audio" as const,
    path: track.path,
    mediaKind: "audio" as const
  }));
  const commandItems = dmsCommandNames.map((command) => ({
    label: command,
    apply: command,
    detail: "DMS command",
    type: "function" as const,
    source: "command" as const
  }));

  return [...commandItems, ...pageItems, ...fileItems, ...audioItems];
}

export function detectEditorAutocompleteContext(
  textBeforeCursor: string,
  mode: EditorAutocompleteMode,
  explicit = false
): EditorAutocompleteContext | null {
  const cursor = textBeforeCursor.length;

  if (mode === "markdown") {
    const wiki = /\[\[([^\]\n]*)$/.exec(textBeforeCursor);
    if (wiki) {
      return {
        kind: "markdownWiki",
        from: cursor - wiki[1].length,
        prefix: wiki[1]
      };
    }

    const at = /(?:^|[\s([{:;,])@([A-Za-z0-9 _./-]*)$/.exec(textBeforeCursor);
    if (at) {
      const atIndex = at.index + at[0].lastIndexOf("@");
      return {
        kind: "markdownAt",
        from: atIndex,
        prefix: at[1]
      };
    }

    return null;
  }

  const lineStart = Math.max(textBeforeCursor.lastIndexOf("\n") + 1, 0);
  const line = textBeforeCursor.slice(lineStart);
  const stringPath = /\b([A-Za-z_][\w]*)\s*\([^()\n]*?(['"])([^'"\n]*)$/.exec(line);
  if (stringPath) {
    return {
      kind: "dmsStringPath",
      command: stringPath[1],
      from: lineStart + stringPath.index + stringPath[0].length - stringPath[3].length,
      prefix: stringPath[3]
    };
  }

  const at = /(?:^|[\s(,])@([A-Za-z0-9 _./-]*)$/.exec(line);
  if (at) {
    const atIndex = lineStart + at.index + at[0].lastIndexOf("@");
    return {
      kind: "dmsAt",
      from: atIndex,
      prefix: at[1]
    };
  }

  const command = /(?:^|[^\w.])([A-Za-z_][\w]*)$/.exec(line);
  if (command && (explicit || command[1].length > 0)) {
    return {
      kind: "dmsCommand",
      from: lineStart + command.index + command[0].length - command[1].length,
      prefix: command[1]
    };
  }

  return null;
}

function matchesPrefix(completion: EditorCompletion, prefix: string): boolean {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return `${completion.label} ${completion.apply} ${completion.detail ?? ""}`
    .toLowerCase()
    .includes(normalized);
}

function matchesPathPrefix(completion: EditorCompletion, prefix: string): boolean {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return `${completion.path ?? ""} ${completion.apply} ${completion.detail ?? ""}`
    .toLowerCase()
    .includes(normalized);
}

function dedupeCompletions(completions: EditorCompletion[]): EditorCompletion[] {
  const seen = new Set<string>();
  return completions.filter((completion) => {
    const key = `${completion.label}\n${completion.apply}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dmsPathApply(command: string, path: string): string {
  if (command === "append_note") {
    return `${path}", `;
  }
  return `${path}")`;
}

function optionsForContext(
  context: EditorAutocompleteContext,
  completions: EditorCompletion[]
): EditorCompletion[] {
  if (context.kind === "markdownWiki") {
    return completions
      .filter((completion) => completion.source === "page")
      .filter((completion) => matchesPrefix(completion, context.prefix))
      .map((completion) => ({ ...completion, apply: `${completion.apply}]]` }));
  }

  if (context.kind === "markdownAt") {
    return completions
      .filter((completion) => completion.source === "page" || completion.source === "file")
      .filter((completion) => matchesPrefix(completion, context.prefix))
      .map((completion) => ({
        ...completion,
        apply: `[[${completion.apply}]]`,
        replaceFrom: context.from
      }));
  }

  if (context.kind === "dmsCommand") {
    return completions
      .filter((completion) => completion.source === "command")
      .filter((completion) => matchesPrefix(completion, context.prefix))
      .map((completion) => ({ ...completion, apply: `${completion.apply}(` }));
  }

  if (context.kind === "dmsAt") {
    return completions
      .filter((completion) => completion.source === "file" || completion.source === "audio")
      .filter((completion) => matchesPrefix(completion, context.prefix))
      .map((completion) => ({
        ...completion,
        apply: `"${completion.path ?? completion.apply}"`,
        replaceFrom: context.from
      }));
  }

  const command = context.command;
  const sourceCandidates = completions.filter((completion) => {
    if (command === "audio_play") {
      return completion.source === "audio";
    }
    if (completion.source !== "file") {
      return false;
    }
    if (command === "table") {
      return completion.mediaKind === "csv";
    }
    if (command === "screen_fs" || command === "screen_pu") {
      return (
        completion.mediaKind !== "audio" &&
        DISPLAYABLE_MEDIA_KINDS.has(completion.mediaKind as WorldMediaKind)
      );
    }
    if (command === "append_note") {
      return completion.mediaKind === "markdown";
    }
    return false;
  });

  return sourceCandidates
    .filter((completion) => matchesPathPrefix(completion, context.prefix))
    .map((completion) => ({
      ...completion,
      apply: dmsPathApply(command, completion.path ?? completion.apply)
    }));
}

export function completionResultForTextBeforeCursor(
  textBeforeCursor: string,
  mode: EditorAutocompleteMode,
  completions: EditorCompletion[],
  explicit = false
): EditorAutocompleteResult | null {
  const context = detectEditorAutocompleteContext(textBeforeCursor, mode, explicit);
  if (!context) {
    return null;
  }

  const options = dedupeCompletions(optionsForContext(context, completions)).slice(0, 40);
  if (options.length === 0) {
    return null;
  }

  return {
    from:
      context.kind === "markdownAt" || context.kind === "dmsAt"
        ? context.from + 1
        : context.from,
    options
  };
}
