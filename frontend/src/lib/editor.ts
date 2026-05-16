import type { WorldFile } from "./api";

export type EditorMode = "preview" | "edit" | "split";
export type EditorStatus = "clean" | "dirty" | "saving" | "saved" | "conflict" | "error";

type EditorTarget = Pick<WorldFile, "extension" | "media_kind" | "path">;

type EditorHotkeyEventLike = {
  altKey: boolean;
  key: string;
};

export type EditorDraft = {
  path: string;
  mode: EditorMode;
  status: EditorStatus;
  content: string;
  originalContent: string;
  modifiedAt: string;
  hash: string;
  externalChanged: boolean;
  message: string | null;
};

export function createEditorDraft(file: WorldFile): EditorDraft {
  return {
    path: file.path,
    mode: "preview",
    status: "clean",
    content: file.content,
    originalContent: file.content,
    modifiedAt: file.modified_at,
    hash: file.hash,
    externalChanged: false,
    message: null
  };
}

export function isDraftDirty(draft: EditorDraft): boolean {
  return draft.content !== draft.originalContent;
}

export function updateDraftContent(draft: EditorDraft, content: string): EditorDraft {
  const nextDraft = { ...draft, content, message: null };
  return {
    ...nextDraft,
    status: isDraftDirty(nextDraft) ? "dirty" : "clean"
  };
}

export function setDraftMode(draft: EditorDraft, mode: EditorMode): EditorDraft {
  return { ...draft, mode };
}

export function isDmsEditorTarget(target: EditorTarget): boolean {
  const extension = target.extension?.toLowerCase();
  return extension === "dms" || target.path.toLowerCase().endsWith(".dms");
}

export function editorModesForTarget(target: EditorTarget): EditorMode[] {
  if (target.media_kind === "markdown") {
    return ["preview", "edit", "split"];
  }
  if (isDmsEditorTarget(target)) {
    return ["preview", "edit"];
  }
  return ["preview", "edit"];
}

export function supportsEditorMode(target: EditorTarget, mode: EditorMode): boolean {
  return editorModesForTarget(target).includes(mode);
}

export function normalizeEditorModeForTarget(
  target: EditorTarget,
  mode: EditorMode
): EditorMode {
  if (supportsEditorMode(target, mode)) {
    return mode;
  }
  return editorModesForTarget(target).includes("edit") ? "edit" : "preview";
}

export function shouldStopEditorHotkeyPropagation(
  event: EditorHotkeyEventLike
): boolean {
  return event.altKey && /^[0-9]$/.test(event.key);
}

export function markDraftSaving(draft: EditorDraft): EditorDraft {
  return { ...draft, status: "saving", message: null };
}

export function markDraftSaved(draft: EditorDraft, file: WorldFile): EditorDraft {
  return {
    ...draft,
    content: file.content,
    originalContent: file.content,
    modifiedAt: file.modified_at,
    hash: file.hash,
    externalChanged: false,
    status: "saved",
    message: null
  };
}

export function markDraftConflict(draft: EditorDraft, message: string): EditorDraft {
  return { ...draft, externalChanged: true, status: "conflict", message };
}

export function markDraftError(draft: EditorDraft, message: string): EditorDraft {
  return { ...draft, status: "error", message };
}

export function markDraftChangedOnDisk(draft: EditorDraft): EditorDraft {
  return {
    ...draft,
    externalChanged: true,
    message: "Changed on disk."
  };
}

export function revertDraft(draft: EditorDraft): EditorDraft {
  return {
    ...draft,
    content: draft.originalContent,
    status: "clean",
    message: null
  };
}
