import type { AudioTrack, WorldMediaKind } from "./api";

export type WorldPathPickerKind = WorldMediaKind | "audio" | "folder";

export type WorldPathPickerFilter =
  | "any"
  | "displayable"
  | "image"
  | "audio"
  | "csv"
  | "script"
  | "card"
  | "markdown"
  | "folder";

export type WorldPathPickerEntry = {
  name: string;
  path: string;
  kind: "directory" | "file";
  extension?: string | null;
  children?: WorldPathPickerEntry[];
  title?: string | null;
  page_type?: string | null;
  tags?: string[];
  aliases?: string[];
};

export type WorldPathPickerCandidate = {
  entry: WorldPathPickerEntry;
  entryKind: WorldPathPickerEntry["kind"];
  pickerKind: WorldPathPickerKind;
  path: string;
  name: string;
  displayName: string;
  label: string;
  detail: string;
  title: string | null;
  aliases: string[];
};

export type WorldPathPickerResult = WorldPathPickerCandidate;

export type WorldPathPickerFilterDefinition = {
  label: string;
  include: (entry: WorldPathPickerEntry) => boolean;
};

const IMAGE_EXTENSIONS = new Set(["gif", "jpeg", "jpg", "png", "svg", "webp"]);
const AUDIO_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "webm"]);
const VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "webm"]);
const DISPLAYABLE_PICKER_KINDS = new Set<WorldPathPickerKind>([
  "markdown",
  "card",
  "csv",
  "text",
  "image",
  "pdf",
  "video"
]);
const DISPLAYABLE_PICKER_KIND_ORDER: WorldPathPickerKind[] = [
  "image",
  "video",
  "pdf",
  "card",
  "markdown",
  "csv",
  "text"
];

export const worldPathPickerFilters = {
  any: { label: "All paths", include: () => true },
  displayable: {
    label: "Displayable",
    include: (entry) => DISPLAYABLE_PICKER_KINDS.has(pickerKindForEntry(entry))
  },
  image: { label: "Images", include: (entry) => pickerKindForEntry(entry) === "image" },
  audio: { label: "Audio", include: (entry) => pickerKindForEntry(entry) === "audio" },
  csv: { label: "CSV", include: (entry) => pickerKindForEntry(entry) === "csv" },
  script: { label: "Scripts", include: (entry) => pickerKindForEntry(entry) === "script" },
  card: { label: "Cards", include: (entry) => pickerKindForEntry(entry) === "card" },
  markdown: { label: "Markdown", include: (entry) => pickerKindForEntry(entry) === "markdown" },
  folder: { label: "Folders", include: (entry) => pickerKindForEntry(entry) === "folder" }
} satisfies Record<WorldPathPickerFilter, WorldPathPickerFilterDefinition>;

function extensionForPath(path: string): string {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index + 1).toLowerCase();
}

function normalizedExtension(extension: string | null | undefined, path: string): string {
  return (extension ?? extensionForPath(path)).replace(/^\./, "").toLowerCase();
}

function pickerKindForEntry(entry: WorldPathPickerEntry): WorldPathPickerKind {
  if (entry.kind === "directory") {
    return "folder";
  }

  const extension = normalizedExtension(entry.extension, entry.path);
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
  if (AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }
  return "unsupported";
}

function candidateForEntry(entry: WorldPathPickerEntry): WorldPathPickerCandidate {
  const title = entry.title ?? null;
  const displayName = title || entry.name;
  return {
    entry,
    entryKind: entry.kind,
    pickerKind: pickerKindForEntry(entry),
    path: entry.path,
    name: entry.name,
    displayName,
    label: displayName,
    detail: entry.path,
    title,
    aliases: entry.aliases ?? []
  };
}

function candidateForAudioTrack(track: AudioTrack): WorldPathPickerCandidate {
  const entry: WorldPathPickerEntry = {
    name: track.name,
    path: track.path,
    kind: "file",
    extension: track.extension,
    children: [],
    title: track.title || null
  };
  const displayName = track.title || track.name;
  return {
    entry,
    entryKind: "file",
    pickerKind: "audio",
    path: track.path,
    name: track.name,
    displayName,
    label: displayName,
    detail: track.path,
    title: track.title || null,
    aliases: track.playlist ? [track.playlist, track.bus] : [track.bus]
  };
}

export function flattenWorldPathPickerEntries(
  tree: WorldPathPickerEntry | null,
  audioTracks: AudioTrack[] = []
): WorldPathPickerCandidate[] {
  const candidates: WorldPathPickerCandidate[] = [];

  function visit(entry: WorldPathPickerEntry) {
    if (entry.path) {
      candidates.push(candidateForEntry(entry));
    }
    for (const child of entry.children ?? []) {
      visit(child);
    }
  }

  if (tree) {
    visit(tree);
  }

  const existingAudioPaths = new Set(
    candidates.filter((candidate) => candidate.pickerKind === "audio").map((candidate) => candidate.path)
  );
  for (const track of audioTracks) {
    if (!existingAudioPaths.has(track.path)) {
      candidates.push(candidateForAudioTrack(track));
    }
  }

  return candidates;
}

export function filterWorldPathPickerCandidates(
  candidates: WorldPathPickerCandidate[],
  filter: WorldPathPickerFilter = "any"
): WorldPathPickerCandidate[] {
  if (filter === "any") {
    return candidates;
  }
  if (filter === "displayable") {
    return rankWorldPathPickerCandidates(
      candidates.filter((candidate) => DISPLAYABLE_PICKER_KINDS.has(candidate.pickerKind)),
      filter
    );
  }
  return rankWorldPathPickerCandidates(
    candidates.filter((candidate) => candidate.pickerKind === filter),
    filter
  );
}

function typeRankForFilter(
  candidate: WorldPathPickerCandidate,
  filter: WorldPathPickerFilter
): number {
  if (filter === "displayable") {
    const rank = DISPLAYABLE_PICKER_KIND_ORDER.indexOf(candidate.pickerKind);
    return rank === -1 ? DISPLAYABLE_PICKER_KIND_ORDER.length : rank;
  }
  if (filter !== "any") {
    return candidate.pickerKind === filter ? 0 : 1;
  }
  return 0;
}

export function rankWorldPathPickerCandidates(
  candidates: WorldPathPickerCandidate[],
  filter: WorldPathPickerFilter = "any"
): WorldPathPickerCandidate[] {
  if (filter === "any") {
    return candidates;
  }
  return candidates
    .map((candidate, index) => ({ candidate, index, rank: typeRankForFilter(candidate, filter) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((result) => result.candidate);
}

function normalizedSearchParts(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function fieldScore(field: string, term: string, weight: number): number | null {
  const normalized = field.toLowerCase();
  if (!normalized.includes(term)) {
    return null;
  }
  if (normalized === term) {
    return weight + 30;
  }
  if (normalized.startsWith(term)) {
    return weight + 20;
  }
  if (normalized.split(/[\s/_-]+/).some((part) => part.startsWith(term))) {
    return weight + 10;
  }
  return weight;
}

function scoreCandidate(candidate: WorldPathPickerCandidate, terms: string[]): number | null {
  let score = 0;
  const fields = [
    { value: candidate.title ?? "", weight: 100 },
    { value: candidate.name, weight: 80 },
    ...candidate.aliases.map((alias) => ({ value: alias, weight: 70 })),
    { value: candidate.path, weight: 50 },
    { value: candidate.pickerKind, weight: 20 }
  ];

  for (const term of terms) {
    const termScore = Math.max(
      ...fields.map((field) => fieldScore(field.value, term, field.weight) ?? -1)
    );
    if (termScore < 0) {
      return null;
    }
    score += termScore;
  }

  return score;
}

export function searchWorldPathPickerCandidates(
  candidates: WorldPathPickerCandidate[],
  query: string,
  filter: WorldPathPickerFilter = "any"
): WorldPathPickerCandidate[] {
  const effectiveFilter =
    filter === "any" && candidates.every((candidate) => DISPLAYABLE_PICKER_KINDS.has(candidate.pickerKind))
      ? "displayable"
      : filter;
  const terms = normalizedSearchParts(query);
  if (terms.length === 0) {
    return rankWorldPathPickerCandidates(candidates, effectiveFilter);
  }

  return candidates
    .map((candidate, index) => ({
      candidate,
      index,
      rank: typeRankForFilter(candidate, effectiveFilter),
      score: scoreCandidate(candidate, terms)
    }))
    .filter((result): result is {
      candidate: WorldPathPickerCandidate;
      index: number;
      rank: number;
      score: number;
    } => result.score !== null
    )
    .sort((left, right) => left.rank - right.rank || right.score - left.score || left.index - right.index)
    .map((result) => result.candidate);
}

export function moveWorldPathPickerActiveIndex(
  activeIndex: number | null,
  key: string,
  candidateCount: number
): number | null {
  if (candidateCount <= 0) {
    return null;
  }
  const currentIndex =
    activeIndex === null || activeIndex < 0 || activeIndex >= candidateCount ? null : activeIndex;
  if (key === "ArrowDown") {
    return currentIndex === null ? 0 : (currentIndex + 1) % candidateCount;
  }
  if (key === "ArrowUp") {
    return currentIndex === null ? candidateCount - 1 : (currentIndex - 1 + candidateCount) % candidateCount;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return candidateCount - 1;
  }
  if (key === "Escape") {
    return null;
  }
  return currentIndex;
}

export function selectedWorldPathPickerCandidate(
  candidates: WorldPathPickerCandidate[],
  activeIndex: number | null
): WorldPathPickerCandidate | null {
  if (activeIndex === null || activeIndex < 0 || activeIndex >= candidates.length) {
    return null;
  }
  return candidates[activeIndex];
}

export function filterWorldPathPickerEntries(
  entries: WorldPathPickerEntry[],
  query: string,
  filter?: WorldPathPickerFilter | WorldPathPickerFilterDefinition
): WorldPathPickerResult[] {
  const root: WorldPathPickerEntry = {
    name: "World",
    path: "",
    kind: "directory",
    extension: null,
    children: entries
  };
  const candidates = flattenWorldPathPickerEntries(root);
  const filtered =
    typeof filter === "object"
      ? candidates.filter((candidate) => filter.include(candidate.entry))
      : filterWorldPathPickerCandidates(candidates, filter ?? "any");
  return searchWorldPathPickerCandidates(filtered, query, typeof filter === "string" ? filter : "any");
}

export const moveWorldPathPickerSelection = moveWorldPathPickerActiveIndex;

export function selectedWorldPathPickerResult<
  T extends { path: string }
>(results: T[], activeIndex: number | null): T | null {
  if (activeIndex === null || activeIndex < 0 || activeIndex >= results.length) {
    return null;
  }
  return results[activeIndex];
}
