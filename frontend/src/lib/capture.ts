import type { CaptureCategory } from "./api";

export type CaptureDraft = {
  category: CaptureCategory;
  text: string;
};

export const CAPTURE_CATEGORY_OPTIONS: { value: CaptureCategory; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "todo", label: "Todo" },
  { value: "npc", label: "NPC" },
  { value: "player_wish", label: "Player Wish" },
  { value: "ruling", label: "Ruling" },
  { value: "loot", label: "Loot" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" }
];

const CAPTURE_DRAFT_KEY_PREFIX = "virtualscreen.captureDraft.";
const CAPTURE_CATEGORIES = new Set<CaptureCategory>(
  CAPTURE_CATEGORY_OPTIONS.map((option) => option.value)
);

type CaptureSubmitEvent = {
  ctrlKey: boolean;
  metaKey: boolean;
  isComposing?: boolean;
  key: string;
};

function buildCaptureDraftKey(worldKey: string): string {
  return `${CAPTURE_DRAFT_KEY_PREFIX}${worldKey}`;
}

function isCaptureDraft(value: unknown): value is CaptureDraft {
  if (!value || typeof value !== "object") {
    return false;
  }
  const draft = value as Partial<CaptureDraft>;
  return (
    typeof draft.text === "string" &&
    typeof draft.category === "string" &&
    CAPTURE_CATEGORIES.has(draft.category as CaptureCategory)
  );
}

export function getCaptureCategoryLabel(category: CaptureCategory): string {
  return CAPTURE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? "Other";
}

export function nextCaptureDraftCategory(
  draft: CaptureDraft,
  category: CaptureCategory
): CaptureDraft {
  return { ...draft, category };
}

export function nextCaptureDraftText(draft: CaptureDraft, text: string): CaptureDraft {
  return { ...draft, text };
}

export function shouldPersistCaptureDraft(draft: CaptureDraft): boolean {
  return draft.text.trim().length > 0;
}

export function loadCaptureDraft(
  worldKey: string,
  storage: Storage = window.localStorage
): CaptureDraft | null {
  const rawValue = storage.getItem(buildCaptureDraftKey(worldKey));
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isCaptureDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCaptureDraft(
  worldKey: string,
  draft: CaptureDraft,
  storage: Storage = window.localStorage
): void {
  storage.setItem(buildCaptureDraftKey(worldKey), JSON.stringify(draft));
}

export function clearCaptureDraft(
  worldKey: string,
  storage: Storage = window.localStorage
): void {
  storage.removeItem(buildCaptureDraftKey(worldKey));
}

export function isCaptureSubmitShortcut(event: CaptureSubmitEvent): boolean {
  return !event.isComposing && event.key === "Enter" && (event.ctrlKey || event.metaKey);
}
