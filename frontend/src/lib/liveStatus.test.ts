import { describe, expect, it } from "vitest";

import type { DisplayState, PrepHealthResponse, WorkspaceLayout, WorkspaceTab } from "./api";
import { createAudioMixerState, loadAudioTrack, setAudioBusPlaying } from "./audio";
import type { MapState } from "./map";
import {
  liveAudioBusSummaries,
  liveMapSummary,
  liveOutputSummary,
  livePaneSummary,
  livePopupSummary,
  livePrepHealthLabel
} from "./liveStatus";

const blankDisplay: DisplayState = {
  fullscreen: null,
  popups: [],
  updated_at: "2026-05-08T12:00:00Z"
};

const baseMap: MapState = {
  image_path: null,
  title: null,
  viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
  grid: { enabled: false, columns: 10, rows: 10, visible_to_players: true },
  fog_enabled: false,
  reveals: [],
  pins: [],
  presenting: false,
  updated_at: ""
};

const layout: WorkspaceLayout = {
  mode: "vertical_split",
  activePaneId: "secondary",
  panes: [
    { id: "main", activePath: "README.md" },
    { id: "secondary", activePath: "NPCs/Captain.md" }
  ],
  splitRatio: 0.5
};

const tabs: WorkspaceTab[] = [
  { path: "README.md", name: "README.md", title: "Home", mediaKind: "markdown" },
  { path: "NPCs/Captain.md", name: "Captain.md", title: "Captain Ilyra", mediaKind: "markdown" }
];

function prepReport(overrides: Partial<PrepHealthResponse>): PrepHealthResponse {
  return {
    checked_at: "2026-05-08T12:00:00Z",
    status: "ok",
    issue_count: 0,
    errors: 0,
    warnings: 0,
    issues: [],
    ...overrides
  };
}

describe("live status helpers", () => {
  it("summarizes player output and popups compactly", () => {
    const display: DisplayState = {
      ...blankDisplay,
      fullscreen: { path: "Media/map.png", name: "map.png", title: "City Gate", media_kind: "image" },
      popups: [
        {
          id: "visible",
          path: "Notes/Clue.md",
          name: "Clue.md",
          title: "Clue",
          media_kind: "markdown",
          created_at: "2026-05-08T12:00:00Z"
        },
        {
          id: "staged",
          path: "NPCs/Captain.md",
          name: "Captain.md",
          title: "Captain",
          media_kind: "markdown",
          created_at: "2026-05-08T12:00:00Z",
          visible: false
        }
      ]
    };

    expect(liveOutputSummary(display)).toBe("Output: City Gate");
    expect(livePopupSummary(display)).toBe("Popups: 1 visible, 1 staged");
    expect(liveOutputSummary(blankDisplay)).toBe("Output: Clear");
    expect(livePopupSummary(blankDisplay)).toBe("Popups: None");
  });

  it("summarizes map state with presenting, fog, reveals, and pins", () => {
    expect(liveMapSummary(null)).toBe("Map: No map");
    expect(liveMapSummary(baseMap)).toBe("Map: No map");
    expect(
      liveMapSummary({
        ...baseMap,
        image_path: "Maps/city.png",
        title: "City",
        presenting: true,
        fog_enabled: true,
        reveals: [{ id: "r1", x: 0, y: 0, width: 0.5, height: 0.5 }],
        pins: [
          { id: "p1", x: 0.5, y: 0.5, label: "Gate", visibility: "player" },
          { id: "p2", x: 0.2, y: 0.3, label: "Trap", visibility: "dm" }
        ]
      })
    ).toBe("Map: City presenting, fog 1 reveal, 1 player pin");
  });

  it("summarizes each audio bus", () => {
    const ambientTrack = {
      path: "Audio/rain.mp3",
      name: "rain.mp3",
      title: "Rain",
      bus: "ambient" as const,
      playlist: null,
      extension: ".mp3",
      content_type: "audio/mpeg",
      size: 10,
      modified_at: "2026-05-08T12:00:00Z"
    };
    const musicTrack = {
      ...ambientTrack,
      path: "Audio/theme.mp3",
      name: "theme.mp3",
      title: "Theme",
      bus: "music" as const
    };
    const state = setAudioBusPlaying(
      loadAudioTrack(loadAudioTrack(createAudioMixerState(), ambientTrack), musicTrack),
      "ambient",
      true
    );

    expect(liveAudioBusSummaries(state)).toEqual([
      "Ambient: Rain playing",
      "Music: Theme loaded",
      "Effect: Quiet"
    ]);
  });

  it("summarizes active pane labels and dirty files", () => {
    expect(livePaneSummary(layout, tabs, new Set(["NPCs/Captain.md"]))).toEqual([
      "Main: Home",
      "Secondary: Captain Ilyra unsaved"
    ]);
  });

  it("summarizes prep health labels", () => {
    expect(livePrepHealthLabel(null)).toBe("Prep: Not checked");
    expect(livePrepHealthLabel(prepReport({ status: "ok" }))).toBe("Prep: Ready");
    expect(livePrepHealthLabel(prepReport({ status: "warning", warnings: 2, issue_count: 2 }))).toBe(
      "Prep: 2 warnings"
    );
    expect(livePrepHealthLabel(prepReport({ status: "error", errors: 1, warnings: 1, issue_count: 2 }))).toBe(
      "Prep: 1 error, 1 warning"
    );
  });
});
