import { useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent } from "react";

import {
  DEFAULT_TREE_PANEL_WIDTH,
  loadToolsPanelVisible,
  loadTreePanelWidth,
  loadToolsPanelWidth,
  saveToolsPanelVisible,
  saveTreePanelWidth,
  saveToolsPanelWidth
} from "../lib/panelWidth";

// Widths of the tree and tools panels, and whether the tools panel is visible.
export function usePanelLayout() {
  const [toolsPanelWidth, setToolsPanelWidth] = useState(() => loadToolsPanelWidth());
  const [treePanelWidth, setTreePanelWidth] = useState(() => loadTreePanelWidth());
  const [toolsPanelVisible, setToolsPanelVisible] = useState(() => loadToolsPanelVisible());

  function handleToolsResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = toolsPanelWidth;

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      setToolsPanelWidth(saveToolsPanelWidth(startWidth + startX - moveEvent.clientX));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleToolsResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    setToolsPanelWidth((width) => saveToolsPanelWidth(width + direction * 24));
  }

  function handleTreeResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = treePanelWidth;

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      setTreePanelWidth(saveTreePanelWidth(startWidth + moveEvent.clientX - startX));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleTreeResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setTreePanelWidth((width) => saveTreePanelWidth(width + direction * 24));
  }

  function handleTreeResizeReset() {
    setTreePanelWidth(saveTreePanelWidth(DEFAULT_TREE_PANEL_WIDTH));
  }

  function handleToolsPanelVisibleChange(visible: boolean) {
    setToolsPanelVisible(saveToolsPanelVisible(visible));
  }

  function toggleToolsPanel() {
    setToolsPanelVisible((visible) => saveToolsPanelVisible(!visible));
  }

  return {
    toolsPanelWidth,
    treePanelWidth,
    toolsPanelVisible,
    handleToolsResizePointerDown,
    handleToolsResizeKeyDown,
    handleTreeResizePointerDown,
    handleTreeResizeKeyDown,
    handleTreeResizeReset,
    handleToolsPanelVisibleChange,
    toggleToolsPanel
  };
}
