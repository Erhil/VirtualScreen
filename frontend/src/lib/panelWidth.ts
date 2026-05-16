const STORAGE_KEY = "virtualscreen.toolsPanelWidth";
export const DEFAULT_TOOLS_PANEL_WIDTH = 340;
export const MIN_TOOLS_PANEL_WIDTH = 260;
export const MAX_TOOLS_PANEL_WIDTH = 560;

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

export function saveToolsPanelWidth(
  width: number,
  storage: Storage = window.localStorage
): number {
  const clamped = clampToolsPanelWidth(width);
  storage.setItem(STORAGE_KEY, String(clamped));
  return clamped;
}
