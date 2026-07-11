export type PdfBookmark = {
  id: string;
  label: string;
  page: number;
  note?: string | null;
  created_at: string;
  updated_at: string;
};

export type PdfBookmarkState = {
  bookmarks: PdfBookmark[];
};

export type PdfTarget =
  | { kind: "page"; page: number }
  | { kind: "bookmark"; id: string };

const BOOKMARK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

export function parsePdfTarget(value: string | null | undefined): PdfTarget | null {
  const target = (value ?? "").trim();
  const pageMatch = /^page=(\d+)$/i.exec(target);
  if (pageMatch) {
    const page = Number(pageMatch[1]);
    return page >= 1 ? { kind: "page", page } : null;
  }
  const bookmarkMatch = /^b:([A-Za-z0-9][A-Za-z0-9_-]{0,79})$/.exec(target);
  if (bookmarkMatch) {
    return { kind: "bookmark", id: bookmarkMatch[1] };
  }
  return null;
}

export function pdfBookmarkStateWith(
  state: PdfBookmarkState,
  bookmark: PdfBookmark
): PdfBookmarkState {
  const next = state.bookmarks.filter((item) => item.id !== bookmark.id);
  return { bookmarks: [...next, bookmark].sort((a, b) => a.page - b.page || a.label.localeCompare(b.label)) };
}

export function removePdfBookmark(state: PdfBookmarkState, id: string): PdfBookmarkState {
  return { bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id) };
}

export function bookmarkIdFromLabel(label: string, fallback = "bookmark"): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const base = slug || fallback;
  return BOOKMARK_ID_RE.test(base) ? base : fallback;
}

export function uniqueBookmarkId(label: string, state: PdfBookmarkState): string {
  const base = bookmarkIdFromLabel(label);
  const existing = new Set(state.bookmarks.map((bookmark) => bookmark.id));
  if (!existing.has(base)) {
    return base;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }
  return `bookmark-${Date.now()}`;
}

export function pageLinkTarget(path: string, page: number, label: string): string {
  return `[[${path}#page=${page}|${label}]]`;
}

export function bookmarkLinkTarget(path: string, id: string, label: string): string {
  return `[[${path}#b:${id}|${label}]]`;
}
