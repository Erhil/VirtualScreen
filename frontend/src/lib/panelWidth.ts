const STORAGE_KEY = "virtualscreen.toolsPanelWidth";
const TREE_STORAGE_KEY = "virtualscreen.treePanelWidth";
const TOOLS_VISIBLE_STORAGE_KEY = "virtualscreen.toolsPanelVisible";
export const DEFAULT_TOOLS_PANEL_WIDTH = 340;
export const MIN_TOOLS_PANEL_WIDTH = 260;
export const MAX_TOOLS_PANEL_WIDTH = 560;
export const DEFAULT_TREE_PANEL_WIDTH = 320;
export const MIN_TREE_PANEL_WIDTH = 220;
export const MAX_TREE_PANEL_WIDTH = 520;

export function clampToolsPanelWidth(width: number): number {
  if (Number.isNaN(width)) {
    return DEFAULT_TOOLS_PANEL_WIDTH;
  }
  return Math.min(Math.max(Math.round(width), MIN_TOOLS_PANEL_WIDTH), MAX_TOOLS_PANEL_WIDTH);
}

export function loadToolsPanelWidth(storage: Storage = window.localStorage): number {
  const rawValue = storage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return DEFAULT_TOOLS_PANEL_WIDTH;
  }
  return clampToolsPanelWidth(Number(rawValue));
}

export function clampTreePanelWidth(width: number): number {
  if (Number.isNaN(width)) {
    return DEFAULT_TREE_PANEL_WIDTH;
  }
  return Math.min(Math.max(Math.round(width), MIN_TREE_PANEL_WIDTH), MAX_TREE_PANEL_WIDTH);
}

export function loadTreePanelWidth(storage: Storage = window.localStorage): number {
  const rawValue = storage.getItem(TREE_STORAGE_KEY);
  if (!rawValue) {
    return DEFAULT_TREE_PANEL_WIDTH;
  }
  return clampTreePanelWidth(Number(rawValue));
}

export function saveToolsPanelWidth(
  width: number,
  storage: Storage = window.localStorage
): number {
  const clamped = clampToolsPanelWidth(width);
  storage.setItem(STORAGE_KEY, String(clamped));
  return clamped;
}

export function saveTreePanelWidth(
  width: number,
  storage: Storage = window.localStorage
): number {
  const clamped = clampTreePanelWidth(width);
  storage.setItem(TREE_STORAGE_KEY, String(clamped));
  return clamped;
}

export function loadToolsPanelVisible(storage: Storage = window.localStorage): boolean {
  return storage.getItem(TOOLS_VISIBLE_STORAGE_KEY) !== "false";
}

export function saveToolsPanelVisible(
  visible: boolean,
  storage: Storage = window.localStorage
): boolean {
  storage.setItem(TOOLS_VISIBLE_STORAGE_KEY, visible ? "true" : "false");
  return visible;
}
