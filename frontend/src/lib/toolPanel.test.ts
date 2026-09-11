import { describe, expect, it } from "vitest";

import {
  applyToolAutoOpenRules,
  canSendToScreen,
  closeToolSection,
  createToolPanelState,
  DISABLEABLE_TOOLS,
  isToolDisabled,
  isToolOpen,
  isToolPinned,
  loadDisabledTools,
  openToolSection,
  openToolSectionByUser,
  pinToolSection,
  saveDisabledTools,
  setToolDisabled,
  toggleToolSection,
  toggleToolSectionPin,
  type ToolPanelState
} from "./toolPanel";

function fakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    }
  } as Storage;
}

const blankDisplay = {
  fullscreen: null,
  popups: [],
  updated_at: "2026-05-08T12:00:00Z"
};

describe("tool panel helpers", () => {
  it("keeps multiple accordion tools open without duplicates", () => {
    const state = openToolSection(openToolSection(createToolPanelState(["metadata"]), "actions"), "actions");

    expect(state.openTools).toEqual(["metadata", "actions"]);
    expect(state.userControlledTools).toEqual([]);
    expect(isToolOpen(state, "metadata")).toBe(true);
    expect(isToolOpen(state, "screen")).toBe(false);
  });

  it("toggles sections while respecting locked metadata edit mode", () => {
    const state: ToolPanelState = createToolPanelState(["metadata", "actions"]);

    const lockedState = toggleToolSection(state, "metadata", ["metadata"]);
    const toggledState = toggleToolSection(state, "actions");

    expect(lockedState.openTools).toEqual(["metadata", "actions"]);
    expect(lockedState.userControlledTools).toEqual(["metadata"]);
    expect(toggledState.openTools).toEqual(["metadata"]);
    expect(toggledState.userControlledTools).toEqual(["actions"]);
  });

  it("keeps only one unpinned live tool open at a time", () => {
    const state = openToolSection(openToolSection(createToolPanelState(["metadata"]), "screen"), "audio");

    expect(state.openTools).toEqual(["metadata", "audio"]);
  });

  it("keeps pinned live tools open while switching the active live tool", () => {
    const pinnedState = pinToolSection(createToolPanelState(["screen"]), "screen");
    const switchedState = openToolSection(pinnedState, "audio");

    expect(switchedState.openTools).toEqual(["screen", "audio"]);
    expect(switchedState.pinnedTools).toEqual(["screen"]);
  });

  it("opens pinned tools and unpins without closing the tool", () => {
    const pinnedState = toggleToolSectionPin(createToolPanelState(), "audio");
    const unpinnedState = toggleToolSectionPin(pinnedState, "audio");

    expect(pinnedState.openTools).toEqual(["audio"]);
    expect(pinnedState.pinnedTools).toEqual(["audio"]);
    expect(unpinnedState.openTools).toEqual(["audio"]);
    expect(unpinnedState.pinnedTools).toEqual([]);
  });

  it("keeps metadata locked while live tools collapse around it", () => {
    const state = applyToolAutoOpenRules(createToolPanelState(["audio"]), {
      activePath: null,
      displayState: {
        ...blankDisplay,
        fullscreen: {
          path: "Media/map.mp4",
          title: "Map",
          name: "map.mp4",
          media_kind: "video"
        }
      },
      metadataEditing: true
    });

    expect(state.openTools).toEqual(["metadata", "screen"]);
    expect(closeToolSection(state, "metadata", ["metadata"]).openTools).toEqual([
      "metadata",
      "screen"
    ]);
  });

  it("does not auto-open metadata for active files", () => {
    expect(
      applyToolAutoOpenRules(createToolPanelState(), {
        activePath: "NPCs/Captain Ilyra.md",
        displayState: blankDisplay,
        metadataEditing: false
      }).openTools
    ).toEqual([]);

    const manuallyClosed = toggleToolSection(createToolPanelState(["metadata"]), "metadata");
    expect(
      applyToolAutoOpenRules(manuallyClosed, {
        activePath: "README.md",
        displayState: blankDisplay,
        metadataEditing: false
      }).openTools
    ).toEqual([]);
  });

  it("auto-opens and locks metadata during metadata edits even after manual close", () => {
    const manuallyClosed = toggleToolSection(createToolPanelState(["metadata"]), "metadata");
    const reopenedState = applyToolAutoOpenRules(manuallyClosed, {
      activePath: null,
      displayState: blankDisplay,
      metadataEditing: true
    });

    expect(reopenedState.openTools).toEqual(["metadata"]);
    expect(closeToolSection(reopenedState, "metadata", ["metadata"]).openTools).toEqual(["metadata"]);
  });

  it("auto-opens screen when display content is active until the user closes it", () => {
    const state = applyToolAutoOpenRules(createToolPanelState(["metadata"]), {
      activePath: null,
      displayState: {
        ...blankDisplay,
        fullscreen: {
          path: "Media/map.mp4",
          title: "Map",
          name: "map.mp4",
          media_kind: "video"
        }
      },
      metadataEditing: false
    });

    expect(state.openTools).toEqual(["metadata", "screen"]);

    const manuallyClosed = toggleToolSection(createToolPanelState(["metadata", "screen"]), "screen");
    const preservedState = applyToolAutoOpenRules(manuallyClosed, {
      activePath: null,
      displayState: {
        ...blankDisplay,
        fullscreen: {
          path: "Media/map.mp4",
          title: "Map",
          name: "map.mp4",
          media_kind: "video"
        }
      },
      metadataEditing: false
    });

    expect(preservedState.openTools).toEqual(["metadata"]);
  });

  it("does not auto-open screen over another user-opened live tool", () => {
    const actionsState = openToolSectionByUser(createToolPanelState(["screen"]), "actions");
    const preservedState = applyToolAutoOpenRules(actionsState, {
      activePath: null,
      displayState: {
        ...blankDisplay,
        fullscreen: {
          path: "README.md",
          title: "Home",
          name: "README.md",
          media_kind: "markdown"
        }
      },
      metadataEditing: false
    });

    expect(preservedState.openTools).toEqual(["actions"]);
  });

  it("auto-opens audio when a bus has a loaded track until the user closes it", () => {
    const state = applyToolAutoOpenRules(createToolPanelState(), {
      activePath: null,
      audioActive: true,
      displayState: blankDisplay,
      metadataEditing: false
    });

    expect(state.openTools).toEqual(["audio"]);

    const manuallyClosed = toggleToolSection(createToolPanelState(["audio"]), "audio");
    const preservedState = applyToolAutoOpenRules(manuallyClosed, {
      activePath: null,
      audioActive: true,
      displayState: blankDisplay,
      metadataEditing: false
    });

    expect(preservedState.openTools).toEqual([]);
  });

  it("marks hotkey-opened actions as user controlled", () => {
    const state = openToolSectionByUser(createToolPanelState(), "actions");

    expect(state.openTools).toEqual(["actions"]);
    expect(state.userControlledTools).toEqual(["actions"]);
  });

  it("supports scripts tool sections", () => {
    const state = openToolSection(createToolPanelState(), "scripts");

    expect(isToolOpen(state, "scripts")).toBe(true);
  });

  it("supports HP tool sections without auto-opening them", () => {
    const state = openToolSection(createToolPanelState(), "hp");
    const autoState = applyToolAutoOpenRules(createToolPanelState(), {
      activePath: null,
      displayState: blankDisplay,
      metadataEditing: false
    });

    expect(isToolOpen(state, "hp")).toBe(true);
    expect(autoState.openTools).toEqual([]);
  });

  it("supports dice as a live tool section", () => {
    const state = openToolSection(openToolSection(createToolPanelState(["audio"]), "dice"), "screen");

    expect(state.openTools).toEqual(["screen"]);
    expect(isToolOpen(openToolSection(createToolPanelState(), "dice"), "dice")).toBe(true);
  });

  it("accepts all supported active media kinds for screen actions", () => {
    expect(canSendToScreen("markdown")).toBe(true);
    expect(canSendToScreen("card")).toBe(true);
    expect(canSendToScreen("csv")).toBe(true);
    expect(canSendToScreen("image")).toBe(true);
    expect(canSendToScreen("pdf")).toBe(true);
    expect(canSendToScreen("script")).toBe(false);
    expect(canSendToScreen("video")).toBe(true);
    expect(canSendToScreen("unsupported")).toBe(false);
    expect(canSendToScreen(null)).toBe(false);
  });

  it("closes unlocked sections", () => {
    expect(closeToolSection(createToolPanelState(["metadata", "screen"]), "screen").openTools).toEqual([
      "metadata"
    ]);
  });
});

describe("disableable tools", () => {
  it("lists exactly the live tools as disableable, excluding metadata", () => {
    expect(DISABLEABLE_TOOLS.sort()).toEqual(
      ["actions", "audio", "dice", "hp", "screen", "scripts"].sort()
    );
  });

  it("seeds disabled tools from createToolPanelState and keeps them out of open/pinned sets", () => {
    const state = createToolPanelState(["dice", "metadata"], [], ["dice"], ["dice"]);

    expect(state.disabledTools).toEqual(["dice"]);
    expect(state.openTools).toEqual(["metadata"]);
    expect(state.pinnedTools).toEqual([]);
    expect(isToolOpen(state, "dice")).toBe(false);
  });

  it("ignores metadata and unknown values passed as disabled tools", () => {
    const state = createToolPanelState([], [], [], ["metadata", "dice", "not-a-tool" as never]);

    expect(state.disabledTools).toEqual(["dice"]);
  });

  it("closes and unpins a tool the moment it is disabled", () => {
    const pinned = pinToolSection(createToolPanelState(), "audio");
    const disabled = setToolDisabled(pinned, "audio", true);

    expect(isToolDisabled(disabled, "audio")).toBe(true);
    expect(disabled.openTools).toEqual([]);
    expect(disabled.pinnedTools).toEqual([]);
    expect(isToolOpen(disabled, "audio")).toBe(false);
    expect(isToolPinned(disabled, "audio")).toBe(false);
  });

  it("leaves a disabled tool closed when re-enabled, ready to be opened again", () => {
    const disabled = setToolDisabled(createToolPanelState(["scripts"]), "scripts", true);
    const reenabled = setToolDisabled(disabled, "scripts", false);

    expect(isToolDisabled(reenabled, "scripts")).toBe(false);
    expect(reenabled.openTools).toEqual([]);
    expect(isToolOpen(openToolSection(reenabled, "scripts"), "scripts")).toBe(true);
  });

  it("refuses to disable metadata", () => {
    const state = setToolDisabled(createToolPanelState(["metadata"]), "metadata", true);

    expect(state.disabledTools).toEqual([]);
    expect(isToolOpen(state, "metadata")).toBe(true);
  });

  it("blocks every automation entry point from opening a disabled tool", () => {
    const disabled = setToolDisabled(createToolPanelState(), "hp", true);

    expect(isToolOpen(openToolSection(disabled, "hp"), "hp")).toBe(false);
    expect(isToolOpen(openToolSectionByUser(disabled, "hp"), "hp")).toBe(false);
    expect(
      isToolOpen(
        applyToolAutoOpenRules(disabled, {
          activePath: null,
          audioActive: true,
          displayState: { fullscreen: null, popups: [], updated_at: "2026-05-08T12:00:00Z" },
          metadataEditing: false
        }),
        "hp"
      )
    ).toBe(false);
  });

  it("keeps pinToolSection from pinning or reopening a disabled tool", () => {
    const disabled = setToolDisabled(createToolPanelState(), "actions", true);
    const stillDisabled = pinToolSection(disabled, "actions");

    expect(stillDisabled).toEqual(disabled);
    expect(isToolPinned(stillDisabled, "actions")).toBe(false);
  });

  it("hides a disabled tool from isToolOpen even if it lingers in openTools", () => {
    const state: ToolPanelState = {
      openTools: ["dice"],
      userControlledTools: [],
      pinnedTools: [],
      disabledTools: ["dice"]
    };

    expect(isToolOpen(state, "dice")).toBe(false);
  });

  it("round-trips the disabled set through storage, keyed separately from other values", () => {
    const storage = fakeStorage();

    expect(loadDisabledTools(storage)).toEqual([]);
    saveDisabledTools(["dice", "actions", "dice"], storage);

    expect(loadDisabledTools(storage)).toEqual(["dice", "actions"]);
  });

  it("recovers from corrupted or invalid disabled-tools storage", () => {
    const storage = fakeStorage();
    storage.setItem("virtualscreen.disabledTools", "not json");
    expect(loadDisabledTools(storage)).toEqual([]);

    storage.setItem("virtualscreen.disabledTools", JSON.stringify({ not: "an array" }));
    expect(loadDisabledTools(storage)).toEqual([]);

    storage.setItem("virtualscreen.disabledTools", JSON.stringify(["metadata", "dice", 42]));
    expect(loadDisabledTools(storage)).toEqual(["dice"]);
  });
});
