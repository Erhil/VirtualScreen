import type { ActionBindingAction } from "./actionBindings";

export type TableSnapshotRestoreAction = Extract<
  ActionBindingAction,
  { kind: "table_snapshot_restore" }
>;

type DispatchError = { error: string };
type ResolvedPath = { path: string };

export type HotkeyEventLike = {
  target?: EventTarget | null;
  targetTagName?: string | null;
  targetClassName?: string | null;
  targetIsContentEditable?: boolean;
};

function trimmed(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function targetTagName(event: HotkeyEventLike): string {
  if (event.targetTagName) {
    return event.targetTagName.toLowerCase();
  }
  const target = event.target as HTMLElement | null | undefined;
  return target?.tagName?.toLowerCase() ?? "";
}

function targetClassName(event: HotkeyEventLike): string {
  if (typeof event.targetClassName === "string") {
    return event.targetClassName;
  }
  const target = event.target as HTMLElement | null | undefined;
  return typeof target?.className === "string" ? target.className : "";
}

export function isEditableHotkeyEvent(event: HotkeyEventLike): boolean {
  const tagName = targetTagName(event);
  if (["input", "textarea", "select"].includes(tagName)) {
    return true;
  }
  if (event.targetIsContentEditable) {
    return true;
  }
  const target = event.target as HTMLElement | null | undefined;
  if (target?.isContentEditable) {
    return true;
  }
  const className = targetClassName(event);
  if (/\bcm-(content|editor)\b/.test(className)) {
    return true;
  }
  return Boolean(target?.closest?.(".cm-content, .cm-editor, [contenteditable='true']"));
}

export function isTableSnapshotRestoreAction(
  action: ActionBindingAction
): action is TableSnapshotRestoreAction {
  return action.kind === "table_snapshot_restore";
}

export function resolveScreenActionPath(
  action: Extract<ActionBindingAction, { kind: "screen_fullscreen" | "screen_popup" }>,
  activePath: string | null | undefined
): ResolvedPath | DispatchError {
  const storedPath = trimmed(action.path);
  if (storedPath) {
    return { path: storedPath };
  }
  const activeTabPath = trimmed(activePath);
  if (activeTabPath) {
    return { path: activeTabPath };
  }
  return { error: "No active page for screen action." };
}

export function normalizeDispatchAction(action: ActionBindingAction): ActionBindingAction {
  if (action.kind === "audio_track") {
    return {
      ...action,
      path: trimmed(action.path),
      bus: "effect",
      play: true
    };
  }
  if ("path" in action && typeof action.path === "string") {
    return {
      ...action,
      path: action.path.trim()
    };
  }
  if (isTableSnapshotRestoreAction(action)) {
    return {
      ...action,
      snapshot_id: action.snapshot_id.trim()
    };
  }
  return action;
}

export function validateDispatchAction(
  action: ActionBindingAction
): { action: ActionBindingAction } | DispatchError {
  const normalized = normalizeDispatchAction(action);
  if (normalized.kind === "open_file" && !normalized.path) {
    return { error: "Choose a file path for Open file." };
  }
  if (normalized.kind === "audio_track" && !normalized.path) {
    return { error: "Choose an audio track path." };
  }
  if (normalized.kind === "script_run" && !normalized.path) {
    return { error: "Choose a DMS script path." };
  }
  if (normalized.kind === "map_preset" && !normalized.preset_id) {
    return { error: "Choose a map preset id." };
  }
  if (isTableSnapshotRestoreAction(normalized) && !normalized.snapshot_id) {
    return { error: "Choose a table state snapshot." };
  }
  return { action: normalized };
}
