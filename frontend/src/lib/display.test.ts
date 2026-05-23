import { describe, expect, it } from "vitest";

import {
  buildDisplayEventsUrl,
  buildScreenDisplayEventsUrl,
  closePopup,
  displayPopupClassName,
  displayPopupPreset,
  displayPopupVisibilityLabel,
  displayPopupVisibilityStatus,
  displayTabFromItem,
  hasResidualPopupsAfterBlank,
  isDisplayPopupVisible,
  isDisplayableMediaKind,
  nextDisplayState,
  screenPrimaryMode,
  screenPrimaryTitle,
  visibleScreenPopupCount,
  visibleDisplayPopups,
  type DisplayState
} from "./display";

const state: DisplayState = {
  fullscreen: null,
  popups: [],
  updated_at: "2026-05-08T12:00:00Z"
};

describe("display helpers", () => {
  it("builds a websocket URL from the current browser origin", () => {
    expect(buildDisplayEventsUrl({ protocol: "http:", host: "localhost:5173" })).toBe(
      "ws://localhost:5173/ws/display"
    );
    expect(buildDisplayEventsUrl({ protocol: "https:", host: "table.local" })).toBe(
      "wss://table.local/ws/display"
    );
    expect(buildScreenDisplayEventsUrl({ protocol: "http:", host: "localhost:5173" })).toBe(
      "ws://localhost:5173/ws/screen/display"
    );
  });

  it("accepts playable media kinds and rejects unsupported files", () => {
    expect(isDisplayableMediaKind("video")).toBe(true);
    expect(isDisplayableMediaKind("image")).toBe(true);
    expect(isDisplayableMediaKind("pdf")).toBe(true);
    expect(isDisplayableMediaKind("unsupported")).toBe(false);
  });

  it("replaces display state from websocket events", () => {
    const next = {
      ...state,
      fullscreen: {
        path: "Media/map.mp4",
        title: "Map",
        name: "map.mp4",
        media_kind: "video" as const
      }
    };

    expect(nextDisplayState(state, next)).toEqual(next);
  });

  it("removes a popup by id", () => {
    const current: DisplayState = {
      ...state,
      popups: [
        {
          id: "first",
          path: "A.md",
          title: "A",
          name: "A.md",
          media_kind: "markdown",
          created_at: "2026-05-08T12:00:00Z"
        },
        {
          id: "second",
          path: "B.md",
          title: "B",
          name: "B.md",
          media_kind: "markdown",
          created_at: "2026-05-08T12:01:00Z"
        }
      ]
    };

    expect(closePopup(current, "first").popups.map((popup) => popup.id)).toEqual(["second"]);
  });

  it("defaults popup presets to plain", () => {
    expect(
      displayPopupPreset({
        id: "plain",
        path: "A.md",
        title: "A",
        name: "A.md",
        media_kind: "markdown",
        created_at: "2026-05-08T12:00:00Z"
      })
    ).toBe("plain");
  });

  it("maps popup presets to player-screen class names", () => {
    const basePopup = {
      id: "popup",
      path: "A.md",
      title: "A",
      name: "A.md",
      media_kind: "markdown" as const,
      created_at: "2026-05-08T12:00:00Z"
    };

    expect(displayPopupClassName({ ...basePopup, preset: "plain" })).toBe(
      "screen-popup screen-popup-plain"
    );
    expect(displayPopupClassName({ ...basePopup, preset: "note" })).toBe(
      "screen-popup screen-popup-note"
    );
    expect(displayPopupClassName({ ...basePopup, preset: "letter" })).toBe(
      "screen-popup screen-popup-letter"
    );
    expect(displayPopupClassName({ ...basePopup, preset: "portrait" })).toBe(
      "screen-popup screen-popup-portrait"
    );
    expect(displayPopupClassName({ ...basePopup, preset: "clue" })).toBe(
      "screen-popup screen-popup-clue"
    );
    expect(displayPopupClassName({ ...basePopup, preset: "custom" as "plain" })).toBe(
      "screen-popup screen-popup-plain"
    );
  });

  it("treats absent popup visibility as visible", () => {
    const visiblePopup = {
      id: "visible",
      path: "A.md",
      title: "A",
      name: "A.md",
      media_kind: "markdown" as const,
      created_at: "2026-05-08T12:00:00Z"
    };
    const stagedPopup = { ...visiblePopup, id: "staged", visible: false };

    expect(isDisplayPopupVisible(visiblePopup)).toBe(true);
    expect(isDisplayPopupVisible({ ...visiblePopup, visible: true })).toBe(true);
    expect(isDisplayPopupVisible(stagedPopup)).toBe(false);
    expect(visibleDisplayPopups([stagedPopup, visiblePopup])).toEqual([visiblePopup]);
  });

  it("labels popup visibility by player-visible state", () => {
    const popup = {
      id: "popup",
      path: "A.md",
      title: "A",
      name: "A.md",
      media_kind: "markdown" as const,
      created_at: "2026-05-08T12:00:00Z"
    };

    expect(displayPopupVisibilityStatus(popup)).toBe("visible");
    expect(displayPopupVisibilityLabel(popup)).toBe("Shown to players");
    expect(displayPopupVisibilityStatus({ ...popup, visible: false })).toBe("staged");
    expect(displayPopupVisibilityLabel({ ...popup, visible: false })).toBe("Staged (hidden)");
  });

  it("detects stale blank responses that still contain popups", () => {
    expect(hasResidualPopupsAfterBlank(state)).toBe(false);
    expect(
      hasResidualPopupsAfterBlank({
        ...state,
        popups: [
          {
            id: "stale",
            path: "A.md",
            title: "A",
            name: "A.md",
            media_kind: "markdown",
            created_at: "2026-05-08T12:00:00Z"
          }
        ]
      })
    ).toBe(true);
  });

  it("maps display items into workspace-style tabs", () => {
    expect(
      displayTabFromItem({
        path: "Media/map.mp4",
        title: "Animated Map",
        name: "map.mp4",
        media_kind: "video"
      })
    ).toEqual({
      path: "Media/map.mp4",
      name: "map.mp4",
      title: "Animated Map",
      mediaKind: "video"
    });
  });

  it("reports exactly one primary player-screen mode with popup overlays", () => {
    const fullscreenState: DisplayState = {
      ...state,
      fullscreen: {
        path: "README.md",
        title: "Home",
        name: "README.md",
        media_kind: "markdown"
      },
      popups: [
        {
          id: "visible",
          path: "A.md",
          title: "A",
          name: "A.md",
          media_kind: "markdown",
          created_at: "2026-05-08T12:00:00Z",
          preset: "plain",
          visible: true
        },
        {
          id: "staged",
          path: "B.md",
          title: "B",
          name: "B.md",
          media_kind: "markdown",
          created_at: "2026-05-08T12:01:00Z",
          preset: "plain",
          visible: false
        }
      ]
    };
    const mapState = {
      image_path: "Media/map.svg",
      title: "Encounter",
      viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
      fog_enabled: false,
      grid: { enabled: false, columns: 10, rows: 10, visible_to_players: true },
      reveals: [],
      pins: [],
      presenting: true,
      updated_at: "2026-05-08T12:02:00Z"
    };

    expect(screenPrimaryMode(null, null)).toBe("blank");
    expect(screenPrimaryMode(fullscreenState, null)).toBe("fullscreen");
    expect(screenPrimaryMode(fullscreenState, mapState)).toBe("map");
    expect(screenPrimaryTitle(fullscreenState, null)).toBe("Home");
    expect(screenPrimaryTitle(fullscreenState, mapState)).toBe("Encounter");
    expect(visibleScreenPopupCount(fullscreenState)).toBe(1);
  });
});
