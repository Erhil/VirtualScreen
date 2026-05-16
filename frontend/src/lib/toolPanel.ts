import type { DisplayState, WorldMediaKind } from "./api";

import type { MapState } from "./map";

export type ToolId =
  | "metadata"
  | "screen"
  | "audio"
  | "actions"
  | "scripts"
  | "hp";

export type ActionsToolTabId = "slots" | "state" | "keys" | "midi";

export type ScreenToolTabId = "display" | "map";

export const DEFAULT_ACTIONS_TOOL_TAB: ActionsToolTabId = "slots";

export const DEFAULT_SCREEN_TOOL_TAB: ScreenToolTabId = "display";

const ACTIONS_TOOL_TABS: ActionsToolTabId[] = ["slots", "state", "keys", "midi"];

const SCREEN_TOOL_TABS: ScreenToolTabId[] = ["display", "map"];

const LIVE_TOOLS: ToolId[] = ["screen", "audio", "actions", "scripts", "hp"];

export type ToolPanelState = {
  openTools: ToolId[];
  userControlledTools: ToolId[];
  pinnedTools: ToolId[];
};

export type ToolAutoOpenInput = {
  activePath: string | null;
  audioActive?: boolean;
  displayState: DisplayState | null;
  mapState?: MapState | null;
  metadataEditing: boolean;
};

export type ToolPanelLocksInput = {
  metadataEditing: boolean;
};

function uniqueTools(tools: ToolId[]): ToolId[] {
  return Array.from(new Set(tools));
}

export function createToolPanelState(
  openTools: ToolId[] = [],
  userControlledTools: ToolId[] = [],
  pinnedTools: ToolId[] = []
): ToolPanelState {
  const uniquePinnedTools = uniqueTools(pinnedTools);
  return {
    openTools: uniqueTools([...openTools, ...uniquePinnedTools]),
    userControlledTools: uniqueTools(userControlledTools),
    pinnedTools: uniquePinnedTools
  };
}

export function isToolOpen(state: ToolPanelState, tool: ToolId): boolean {
  return state.openTools.includes(tool);
}

function isUserControlled(state: ToolPanelState, tool: ToolId): boolean {
  return state.userControlledTools.includes(tool);
}

export function isToolPinned(state: ToolPanelState, tool: ToolId): boolean {
  return state.pinnedTools.includes(tool);
}

function isLiveTool(tool: ToolId): boolean {
  return LIVE_TOOLS.includes(tool);
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

export function getLockedToolSections(input: ToolPanelLocksInput): ToolId[] {
  return input.metadataEditing ? ["metadata"] : [];
}

export function selectActionsToolTab(tab: string | null | undefined): ActionsToolTabId {
  return tab && (ACTIONS_TOOL_TABS as readonly string[]).includes(tab)
    ? (tab as ActionsToolTabId)
    : DEFAULT_ACTIONS_TOOL_TAB;
}

export function selectScreenToolTab(tab: string | null | undefined): ScreenToolTabId {
  return tab && (SCREEN_TOOL_TABS as readonly string[]).includes(tab)
    ? (tab as ScreenToolTabId)
    : DEFAULT_SCREEN_TOOL_TAB;
}

export function canSendToScreen(mediaKind: WorldMediaKind | null | undefined): boolean {
  return Boolean(mediaKind && !["script", "unsupported"].includes(mediaKind));
}
