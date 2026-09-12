import type { DisplayState, WorldMediaKind } from "./api";

import type { MapState } from "./map";

export type ToolId =
  | "metadata"
  | "screen"
  | "audio"
  | "dice"
  | "actions"
  | "scripts"
  | "hp";

export type ActionsToolTabId = "slots" | "state" | "keys" | "midi";

export type ScreenToolTabId = "display" | "map";

export const DEFAULT_ACTIONS_TOOL_TAB: ActionsToolTabId = "slots";

export const DEFAULT_SCREEN_TOOL_TAB: ScreenToolTabId = "display";

// Tools with their own live state that are not the document-context (metadata)
// section. The same property makes a tool exclusive-open-at-a-time among its
// peers, and makes it safe to let the DM turn off entirely: metadata is left
// out of both because `applyToolAutoOpenRules` force-opens it while editing
// and `closeToolSection` refuses to close it, so disabling it could strand a
// DM mid-edit.
export const DISABLEABLE_TOOLS: ToolId[] = ["screen", "audio", "dice", "actions", "scripts", "hp"];

const DISABLED_TOOLS_STORAGE_KEY = "virtualscreen.disabledTools";

export type ToolPanelState = {
  openTools: ToolId[];
  userControlledTools: ToolId[];
  pinnedTools: ToolId[];
  disabledTools: ToolId[];
};

export type ToolAutoOpenInput = {
  activePath: string | null;
  audioActive?: boolean;
  displayState: DisplayState | null;
  mapState?: MapState | null;
  metadataEditing: boolean;
};

function uniqueTools(tools: ToolId[]): ToolId[] {
  return Array.from(new Set(tools));
}

function sanitizeDisabledTools(disabledTools: ToolId[]): ToolId[] {
  return uniqueTools(disabledTools.filter((tool) => DISABLEABLE_TOOLS.includes(tool)));
}

export function createToolPanelState(
  openTools: ToolId[] = [],
  userControlledTools: ToolId[] = [],
  pinnedTools: ToolId[] = [],
  disabledTools: ToolId[] = []
): ToolPanelState {
  const uniqueDisabledTools = sanitizeDisabledTools(disabledTools);
  const uniquePinnedTools = uniqueTools(pinnedTools).filter(
    (tool) => !uniqueDisabledTools.includes(tool)
  );
  return {
    openTools: uniqueTools([...openTools, ...uniquePinnedTools]).filter(
      (tool) => !uniqueDisabledTools.includes(tool)
    ),
    userControlledTools: uniqueTools(userControlledTools),
    pinnedTools: uniquePinnedTools,
    disabledTools: uniqueDisabledTools
  };
}

export function loadDisabledTools(storage: Storage = window.localStorage): ToolId[] {
  const rawValue = storage.getItem(DISABLED_TOOLS_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return sanitizeDisabledTools(parsed.filter((value): value is ToolId => typeof value === "string") as ToolId[]);
  } catch {
    return [];
  }
}

export function saveDisabledTools(
  disabledTools: ToolId[],
  storage: Storage = window.localStorage
): ToolId[] {
  const sanitized = sanitizeDisabledTools(disabledTools);
  storage.setItem(DISABLED_TOOLS_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export function isToolDisabled(state: ToolPanelState, tool: ToolId): boolean {
  return state.disabledTools.includes(tool);
}

export function setToolDisabled(
  state: ToolPanelState,
  tool: ToolId,
  disabled: boolean
): ToolPanelState {
  if (!DISABLEABLE_TOOLS.includes(tool) || disabled === isToolDisabled(state, tool)) {
    return state;
  }
  if (!disabled) {
    return { ...state, disabledTools: state.disabledTools.filter((disabledTool) => disabledTool !== tool) };
  }
  return {
    ...state,
    disabledTools: [...state.disabledTools, tool],
    openTools: state.openTools.filter((openTool) => openTool !== tool),
    pinnedTools: state.pinnedTools.filter((pinnedTool) => pinnedTool !== tool)
  };
}

export function isToolOpen(state: ToolPanelState, tool: ToolId): boolean {
  return !isToolDisabled(state, tool) && state.openTools.includes(tool);
}

function isUserControlled(state: ToolPanelState, tool: ToolId): boolean {
  return state.userControlledTools.includes(tool);
}

export function isToolPinned(state: ToolPanelState, tool: ToolId): boolean {
  return state.pinnedTools.includes(tool);
}

function isLiveTool(tool: ToolId): boolean {
  return DISABLEABLE_TOOLS.includes(tool);
}

function hasOpenUserControlledLiveTool(state: ToolPanelState, targetTool: ToolId): boolean {
  return state.openTools.some(
    (tool) =>
      tool !== targetTool &&
      isLiveTool(tool) &&
      isUserControlled(state, tool) &&
      !isToolPinned(state, tool)
  );
}

function openToolsForOpening(state: ToolPanelState, tool: ToolId): ToolId[] {
  if (!isLiveTool(tool) || isToolPinned(state, tool)) {
    return state.openTools;
  }
  return state.openTools.filter(
    (openTool) => !isLiveTool(openTool) || isToolPinned(state, openTool) || openTool === tool
  );
}

function markUserControlled(state: ToolPanelState, tool: ToolId): ToolPanelState {
  if (isUserControlled(state, tool)) {
    return state;
  }
  return { ...state, userControlledTools: [...state.userControlledTools, tool] };
}

export function openToolSection(state: ToolPanelState, tool: ToolId): ToolPanelState {
  if (isToolDisabled(state, tool)) {
    return state;
  }
  const openTools = openToolsForOpening(state, tool);
  if (openTools.includes(tool)) {
    return openTools === state.openTools ? state : { ...state, openTools };
  }
  return { ...state, openTools: [...openTools, tool] };
}

export function openToolSectionByUser(state: ToolPanelState, tool: ToolId): ToolPanelState {
  return openToolSection(markUserControlled(state, tool), tool);
}

export function closeToolSection(
  state: ToolPanelState,
  tool: ToolId,
  lockedTools: ToolId[] = []
): ToolPanelState {
  if (lockedTools.includes(tool)) {
    return openToolSection(state, tool);
  }
  return {
    ...state,
    openTools: state.openTools.filter((openTool) => openTool !== tool),
    pinnedTools: state.pinnedTools.filter((pinnedTool) => pinnedTool !== tool)
  };
}

export function toggleToolSection(
  state: ToolPanelState,
  tool: ToolId,
  lockedTools: ToolId[] = []
): ToolPanelState {
  const controlledState = markUserControlled(state, tool);
  if (isToolOpen(controlledState, tool)) {
    return closeToolSection(controlledState, tool, lockedTools);
  }
  return openToolSection(controlledState, tool);
}

export function pinToolSection(state: ToolPanelState, tool: ToolId): ToolPanelState {
  if (isToolDisabled(state, tool)) {
    return state;
  }
  const pinnedState = isToolPinned(state, tool)
    ? state
    : { ...state, pinnedTools: [...state.pinnedTools, tool] };
  return isToolOpen(pinnedState, tool)
    ? pinnedState
    : { ...pinnedState, openTools: [...pinnedState.openTools, tool] };
}

export function unpinToolSection(state: ToolPanelState, tool: ToolId): ToolPanelState {
  if (!isToolPinned(state, tool)) {
    return state;
  }
  return { ...state, pinnedTools: state.pinnedTools.filter((pinnedTool) => pinnedTool !== tool) };
}

export function toggleToolSectionPin(state: ToolPanelState, tool: ToolId): ToolPanelState {
  return isToolPinned(state, tool) ? unpinToolSection(state, tool) : pinToolSection(state, tool);
}

export function applyToolAutoOpenRules(
  state: ToolPanelState,
  input: ToolAutoOpenInput
): ToolPanelState {
  let nextState = state;
  if (input.metadataEditing) {
    nextState = openToolSection(nextState, "metadata");
  }
  if (
    (input.displayState?.fullscreen || (input.displayState?.popups.length ?? 0) > 0) &&
    !isUserControlled(state, "screen") &&
    !hasOpenUserControlledLiveTool(state, "screen")
  ) {
    nextState = openToolSection(nextState, "screen");
  }
  if (
    input.audioActive &&
    !isUserControlled(state, "audio") &&
    !hasOpenUserControlledLiveTool(state, "audio")
  ) {
    nextState = openToolSection(nextState, "audio");
  }
  return nextState;
}

export function canSendToScreen(mediaKind: WorldMediaKind | null | undefined): boolean {
  return Boolean(mediaKind && !["script", "unsupported"].includes(mediaKind));
}
