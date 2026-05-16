import { describe, expect, it } from "vitest";

import type {
  AudioTrack,
  TableSnapshotDetail,
  TableSnapshotState,
  TableSnapshotSummary,
  WorkspaceState
} from "./api";
import {
  createAudioMixerState,
  loadAudioTrack,
  setAudioBusPlaying,
  setAudioBusVolume
} from "./audio";
import type { MapState } from "./map";
import {
  applyAudioSnapshot,
  buildTableSnapshotState,
  captureAudioSnapshot,
  deleteTableSnapshotFromList,
  loadTableSnapshotState,
  saveTableSnapshotInList,
  sortTableSnapshots
} from "./tableSnapshots";
import { defaultWorkspaceLayout } from "./workspace";

function track(path: string, bus: AudioTrack["bus"]): AudioTrack {
  const name = path.split("/").at(-1) ?? path;
  return {
    path,
    name,
    title: name.replace(/\.[^.]+$/, ""),
    bus,
    playlist: null,
    extension: name.split(".").at(-1) ?? "",
    content_type: "audio/mpeg",
    size: 8,
    modified_at: "2026-05-09T12:00:00Z"
  };
}

function summary(id: string, name: string, updatedAt: string): TableSnapshotSummary {
  return { id, name, updated_at: updatedAt };
}

function mapState(): MapState {
  return {
    image_path: null,
    title: null,
    viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
    grid: { enabled: false, columns: 10, rows: 10, visible_to_players: false },
    fog_enabled: false,
    reveals: [],
    pins: [],
    presenting: false,
    updated_at: "2026-05-13T12:00:00Z"
  };
}

function workspaceState(): WorkspaceState {
  return {
    workspaceId: "default",
    workspaceName: "Default",
    tabs: [{ path: "README.md", name: "README.md", title: "Home", mediaKind: "markdown" }],
    activePath: "README.md",
    layout: defaultWorkspaceLayout("README.md"),
    favorites: [],
    recentFiles: []
  };
}

function stateData(): TableSnapshotState {
  return {
    display: {
      fullscreen: null,
      popups: [],
      updated_at: "2026-05-13T12:00:00Z"
    },
    map: mapState(),
    workspace: {
      workspace_id: "default",
      workspace_name: "Default",
      tabs: workspaceState().tabs,
      activePath: "README.md",
      layout: defaultWorkspaceLayout("README.md")
    },
    audio: {
      ambient: { track: null, playing: false, loop: true, volume: 0.7 },
      music: { track: null, playing: false, loop: true, volume: 0.7 },
      effect: { track: null, playing: false, loop: false, volume: 0.85 }
    }
  };
}

function snapshot(id: string, name: string, state: TableSnapshotState): TableSnapshotDetail {
  return {
    ...summary(id, name, "2026-05-13T12:00:00Z"),
    state
  };
}

describe("table snapshot helpers", () => {
  it("sorts snapshots by newest update and then name", () => {
    const sorted = sortTableSnapshots([
      summary("older", "B Watch", "2026-05-12T12:00:00Z"),
      summary("same-b", "B Watch", "2026-05-13T12:00:00Z"),
      summary("same-a", "A Watch", "2026-05-13T12:00:00Z")
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["same-a", "same-b", "older"]);
  });

  it("captures loaded audio with full track details", () => {
    const rain = track(".music/ambient/rain.mp3", "ambient");
    let mixer = createAudioMixerState();
    mixer = loadAudioTrack(mixer, rain);
    mixer = setAudioBusPlaying(mixer, "ambient", true);
    mixer = setAudioBusVolume(mixer, "effect", 0.3);

    expect(captureAudioSnapshot(mixer)).toEqual({
      ambient: { track: rain, playing: true, loop: true, volume: 0.7 },
      music: { track: null, playing: false, loop: true, volume: 0.7 },
      effect: { track: null, playing: false, loop: false, volume: 0.3 }
    });
  });

  it("applies restored audio snapshots directly from returned tracks", () => {
    const rain = track(".music/ambient/rain.mp3", "ambient");
    const mixer = applyAudioSnapshot(createAudioMixerState(), {
      ambient: { track: rain, playing: true, loop: false, volume: 0.4 },
      music: { track: null, playing: true, loop: true, volume: 0.9 },
      effect: { track: null, playing: true, loop: true, volume: 1.2 }
    });

    expect(mixer.ambient.track?.path).toBe(".music/ambient/rain.mp3");
    expect(mixer.ambient.playing).toBe(true);
    expect(mixer.ambient.loop).toBe(false);
    expect(mixer.ambient.volume).toBe(0.4);
    expect(mixer.music.track).toBeNull();
    expect(mixer.music.playing).toBe(false);
    expect(mixer.effect.track).toBeNull();
    expect(mixer.effect.volume).toBe(1);
  });

  it("builds a snapshot state from current display, map, workspace, and audio", () => {
    const built = buildTableSnapshotState(
      { fullscreen: null, popups: [], updated_at: "now" },
      mapState(),
      workspaceState(),
      createAudioMixerState()
    );

    expect(built.workspace).toMatchObject({
      workspace_id: "default",
      workspace_name: "Default",
      activePath: "README.md"
    });
    expect(built.map.viewport.zoom).toBe(1);
  });

  it("updates saved snapshot lists without duplicating the saved id", () => {
    const saved = summary("same", "Updated", "2026-05-13T13:00:00Z");
    const list = saveTableSnapshotInList(
      [
        summary("same", "Old", "2026-05-12T12:00:00Z"),
        summary("other", "Other", "2026-05-13T12:00:00Z")
      ],
      saved
    );

    expect(list.map((item) => item.id)).toEqual(["same", "other"]);
    expect(list[0].name).toBe("Updated");
  });

  it("returns loaded state data and removes deleted snapshots from lists", () => {
    const data = stateData();
    const loaded = snapshot("session", "Session", data);

    expect(loadTableSnapshotState(loaded)).toBe(data);
    expect(
      deleteTableSnapshotFromList(
        [
          summary("keep", "Keep", "2026-05-13T12:00:00Z"),
          summary("drop", "Drop", "2026-05-13T12:00:00Z")
        ],
        "drop"
      ).map((item) => item.id)
    ).toEqual(["keep"]);
  });
});
