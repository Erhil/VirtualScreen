import type { DisplayState, PrepHealthReport, WorkspaceLayout, WorkspaceTab } from "./api";
import {
  AUDIO_BUSES,
  busLabel,
  displayAudioTrackTitle,
  type AudioMixerState
} from "./audio";
import type { MapState } from "./map";

function displayTitle(item: { title?: string | null; name?: string | null; path?: string | null }): string {
  return item.title ?? item.name ?? item.path ?? "Untitled";
}

export function liveOutputSummary(displayState: DisplayState | null): string {
  return `Output: ${displayState?.fullscreen ? displayTitle(displayState.fullscreen) : "Clear"}`;
}

export function livePopupSummary(displayState: DisplayState | null): string {
  const popups = displayState?.popups ?? [];
  const visible = popups.filter((popup) => popup.visible !== false).length;
  const staged = popups.length - visible;
  if (visible === 0 && staged === 0) {
    return "Popups: None";
  }
  const parts: string[] = [];
  if (visible > 0) {
    parts.push(`${visible} visible`);
  }
  if (staged > 0) {
    parts.push(`${staged} staged`);
  }
  return `Popups: ${parts.join(", ")}`;
}

export function liveMapSummary(mapState: MapState | null): string {
  if (!mapState?.image_path) {
    return "Map: No map";
  }

  const parts = [mapState.presenting ? "presenting" : "ready"];
  if (mapState.fog_enabled) {
    const revealCount = mapState.reveals.length;
    parts.push(`fog ${revealCount} reveal${revealCount === 1 ? "" : "s"}`);
  }
  const playerPins = mapState.pins.filter((pin) => pin.visibility !== "dm").length;
  if (playerPins > 0) {
    parts.push(`${playerPins} player pin${playerPins === 1 ? "" : "s"}`);
  }

  return `Map: ${mapState.title ?? mapState.image_path} ${parts.join(", ")}`;
}

export function liveAudioBusSummaries(mixer: AudioMixerState): string[] {
  return AUDIO_BUSES.map((bus) => {
    const state = mixer[bus];
    if (!state.track) {
      return `${busLabel(bus)}: Quiet`;
    }
    return `${busLabel(bus)}: ${displayAudioTrackTitle(state.track)} ${
      state.playing ? "playing" : "loaded"
    }`;
  });
}

export function livePaneSummary(
  layout: WorkspaceLayout,
  tabs: WorkspaceTab[],
  dirtyPaths: Set<string>
): string[] {
  return layout.panes
    .filter((pane) => layout.mode === "vertical_split" || pane.id === "main")
    .map((pane) => {
      const tab = tabs.find((item) => item.path === pane.activePath);
      const label = pane.id === "main" ? "Main" : "Secondary";
      if (!tab) {
        return `${label}: Empty`;
      }
      return `${label}: ${tab.title ?? tab.name}${dirtyPaths.has(tab.path) ? " unsaved" : ""}`;
    });
}

export function livePrepHealthLabel(report: PrepHealthReport | null): string {
  if (!report) {
    return "Prep: Not checked";
  }
  if (report.errors === 0 && report.warnings === 0) {
    return "Prep: Ready";
  }
  const parts: string[] = [];
  if (report.errors > 0) {
    parts.push(`${report.errors} error${report.errors === 1 ? "" : "s"}`);
  }
  if (report.warnings > 0) {
    parts.push(`${report.warnings} warning${report.warnings === 1 ? "" : "s"}`);
  }
  return `Prep: ${parts.join(", ")}`;
}
