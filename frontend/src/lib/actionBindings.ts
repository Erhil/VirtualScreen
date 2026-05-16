import type { FastSlotAction } from "./api";

export type ActionBindingAction =
  | FastSlotAction
  | { kind: "table_snapshot_restore"; snapshot_id: string };

export type ActionBinding = {
  id: string;
  label: string;
  shortcut: string;
  action: ActionBindingAction;
};

export type KeyboardShortcutEventLike = {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
};

export type HotkeyTargetLike = {
  tagName?: string;
  isContentEditable?: boolean;
  className?: unknown;
  closest?: (selector: string) => unknown;
};

const STORAGE_PREFIX = "virtualscreen.actionBindings";
const RESERVED_KEYS = new Set(["R", "W", "L", "T", "N"]);
const EDITABLE_TAGS = new Set(["input", "textarea", "select"]);
const CODE_EDITOR_CLASS_MARKERS = ["cm-content", "cm-editor", "CodeMirror"];

function normalizeKey(key: string): string {
  if (key.length === 1) {
    return key.toUpperCase();
  }
  if (/^f\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }
  if (key === " ") {
    return "Space";
  }
  return key;
}

function shortcutParts(shortcut: string): string[] {
  return shortcut
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasModifier(shortcut: string): boolean {
  const modifiers = new Set(["Ctrl", "Alt", "Shift", "Meta"]);
  return shortcutParts(shortcut).some((part) => modifiers.has(part));
}

export function canonicalShortcutFromEvent(event: KeyboardShortcutEventLike): string {
  const key = normalizeKey(event.key);
  if (["Control", "Ctrl", "Alt", "Shift", "Meta"].includes(key)) {
    return "";
  }

  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  if (event.metaKey) {
    parts.push("Meta");
  }
  parts.push(key);
  return parts.join("+");
}

export function isReservedShortcut(shortcut: string): boolean {
  const parts = shortcutParts(shortcut);
  if (parts.length !== 2) {
    return false;
  }
  const [modifier, key] = parts;
  return (
    (modifier === "Ctrl" || modifier === "Meta") &&
    RESERVED_KEYS.has(key.toUpperCase())
  );
}

export function duplicateShortcut(
  shortcut: string,
  bindings: ActionBinding[],
  ignoredBindingId?: string
): boolean {
  const normalizedShortcut = shortcut.toLowerCase();
  return bindings.some(
    (binding) =>
      binding.id !== ignoredBindingId &&
      binding.shortcut.toLowerCase() === normalizedShortcut
  );
}

export function shortcutValidationError(
  shortcut: string,
  bindings: ActionBinding[],
  ignoredBindingId?: string
): string | null {
  if (!shortcut.trim()) {
    return "Choose a shortcut.";
  }
  if (!hasModifier(shortcut)) {
    return "Use at least one modifier.";
  }
  if (isReservedShortcut(shortcut)) {
    return "Shortcut is reserved by the browser.";
  }
  if (duplicateShortcut(shortcut, bindings, ignoredBindingId)) {
    return "Shortcut is already used.";
  }
  return null;
}

function classNameText(className: unknown): string {
  if (typeof className === "string") {
    return className;
  }
  if (
    className &&
    typeof className === "object" &&
    "baseVal" in className &&
    typeof className.baseVal === "string"
  ) {
    return className.baseVal;
  }
  return "";
}

export function isEditableHotkeyTarget(target: HotkeyTargetLike | null | undefined): boolean {
  if (!target) {
    return false;
  }
  const tagName = target.tagName?.toLowerCase();
  if (tagName && EDITABLE_TAGS.has(tagName)) {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  const classes = classNameText(target.className);
  if (CODE_EDITOR_CLASS_MARKERS.some((marker) => classes.includes(marker))) {
    return true;
  }
  return Boolean(target.closest?.(".cm-content, .cm-editor, .CodeMirror"));
}

export function bindingStorageKey(worldKey: string): string {
  return `${STORAGE_PREFIX}.${worldKey}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isActionBinding(value: unknown): value is ActionBinding {
  if (!isRecord(value) || !isRecord(value.action)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.shortcut === "string" &&
    typeof value.action.kind === "string"
  );
}

export function sortActionBindings(bindings: ActionBinding[]): ActionBinding[] {
  return [...bindings].sort((a, b) => {
    const labelOrder = a.label.localeCompare(b.label);
    return labelOrder || a.shortcut.localeCompare(b.shortcut);
  });
}

export function loadActionBindings(
  worldKey: string,
  storage: Storage = window.localStorage
): ActionBinding[] {
  const raw = storage.getItem(bindingStorageKey(worldKey));
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? sortActionBindings(parsed.filter(isActionBinding)) : [];
  } catch {
    return [];
  }
}

export function saveActionBindings(
  worldKey: string,
  bindings: ActionBinding[],
  storage: Storage = window.localStorage
): ActionBinding[] {
  const sorted = sortActionBindings(bindings);
  storage.setItem(bindingStorageKey(worldKey), JSON.stringify(sorted));
  return sorted;
}

export function clearActionBindings(
  worldKey: string,
  storage: Storage = window.localStorage
): void {
  storage.removeItem(bindingStorageKey(worldKey));
}
