import { useState } from "react";

import {
  applyToolAutoOpenRules,
  createToolPanelState,
  loadDisabledTools,
  openToolSectionByUser,
  saveDisabledTools,
  setToolDisabled,
  toggleToolSection,
  toggleToolSectionPin,
  type ToolAutoOpenInput,
  type ToolId,
  type ToolPanelState
} from "../lib/toolPanel";

// Which tool sections are open, pinned or switched off.
export function useToolPanel() {
  const [toolPanelState, setToolPanelState] = useState<ToolPanelState>(() =>
    createToolPanelState([], [], [], loadDisabledTools())
  );

  function openTool(tool: ToolId) {
    setToolPanelState((state) => openToolSectionByUser(state, tool));
  }

  function handleToolToggle(tool: ToolId, metadataEditing: boolean) {
    const lockedTools: ToolId[] = metadataEditing ? ["metadata"] : [];
    setToolPanelState((state) => toggleToolSection(state, tool, lockedTools));
  }

  function handleToolPin(tool: ToolId) {
    setToolPanelState((state) => toggleToolSectionPin(state, tool));
  }

  function handleToolDisabledChange(tool: ToolId, disabled: boolean) {
    setToolPanelState((state) => {
      const nextState = setToolDisabled(state, tool, disabled);
      saveDisabledTools(nextState.disabledTools);
      return nextState;
    });
  }

  function applyAutoOpen(input: ToolAutoOpenInput) {
    setToolPanelState((state) => applyToolAutoOpenRules(state, input));
  }

  function resetToolPanel() {
    setToolPanelState(createToolPanelState([], [], [], loadDisabledTools()));
  }

  return {
    toolPanelState,
    openTool,
    handleToolToggle,
    handleToolPin,
    handleToolDisabledChange,
    applyAutoOpen,
    resetToolPanel
  };
}
