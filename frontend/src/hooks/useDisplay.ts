import { useEffect, useState } from "react";

import {
  clearDisplayPopups,
  closeDisplayPopup,
  fetchDisplayState,
  openDisplayPopup,
  setDisplayPopupVisible,
  type DisplayPopupPreset,
  type DisplayState
} from "../lib/api";
import { createDisplayEventClient } from "../lib/display";
import type { OpenTab } from "../lib/tabs";

export type UseDisplayOptions = {
  activeTab: OpenTab | null;
  authReady: boolean;
};

export function useDisplay({ activeTab, authReady }: UseDisplayOptions) {
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);

  async function refreshDisplayState() {
    setDisplayState(await fetchDisplayState());
  }

  async function handleOpenActivePopup(preset: DisplayPopupPreset = "plain", pathOverride?: string) {
    const path = pathOverride?.trim() || activeTab?.path;
    if (!path) {
      return;
    }
    try {
      setDisplayState(await openDisplayPopup(path, preset));
    } catch {
    }
  }

  async function handleStageActivePopup(preset: DisplayPopupPreset = "plain", pathOverride?: string) {
    const path = pathOverride?.trim() || activeTab?.path;
    if (!path) {
      return;
    }
    try {
      setDisplayState(await openDisplayPopup(path, preset, false));
    } catch {
    }
  }

  async function handleDisplayPopupVisibleChange(popupId: string, visible: boolean) {
    try {
      setDisplayState(await setDisplayPopupVisible(popupId, visible));
    } catch {
    }
  }

  async function handleCloseDisplayPopup(popupId: string) {
    try {
      setDisplayState(await closeDisplayPopup(popupId));
    } catch {
    }
  }

  async function handleClearDisplayPopups() {
    try {
      setDisplayState(await clearDisplayPopups());
    } catch {
    }
  }

  useEffect(() => {
    if (!authReady) {
      return;
    }
    fetchDisplayState()
      .then(setDisplayState)
      .catch(() => {});
    return createDisplayEventClient({
      onEvent: setDisplayState
    });
  }, [authReady]);

  function reset() {
    setDisplayState(null);
  }

  return {
    displayState,
    setDisplayState,
    refreshDisplayState,
    handleOpenActivePopup,
    handleStageActivePopup,
    handleDisplayPopupVisibleChange,
    handleCloseDisplayPopup,
    handleClearDisplayPopups,
    reset
  };
}

export type DisplayApi = ReturnType<typeof useDisplay>;
