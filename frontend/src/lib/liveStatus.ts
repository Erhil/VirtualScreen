import type { DisplayState, PrepHealthReport, WorkspaceLayout, WorkspaceTab } from "./api";
import type { Translator } from "../lang";
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

function countLabel(
  count: number,
  singularKey: string,
  pluralKey: string,
  singularFallback: string,
  pluralFallback: string,
  t?: Translator
): string {
  if (t) {
    return t(count === 1 ? singularKey : pluralKey, { count });
  }
  return `${count} ${count === 1 ? singularFallback : pluralFallback}`;
}

export function liveOutputSummary(displayState: DisplayState | null, t?: Translator): string {
  const value = displayState?.fullscreen ? displayTitle(displayState.fullscreen) : t?.("live.output.clear") ?? "Clear";
  return t ? t("live.output", { value }) : `Output: ${value}`;
}

export function livePopupSummary(displayState: DisplayState | null, t?: Translator): string {
  const popups = displayState?.popups ?? [];
  const visible = popups.filter((popup) => popup.visible !== false).length;
  const staged = popups.length - visible;
  if (visible === 0 && staged === 0) {
    const value = t?.("live.popups.none") ?? "None";
    return t ? t("live.popups", { value }) : `Popups: ${value}`;
  }
  const parts: string[] = [];
  if (visible > 0) {
    parts.push(t ? t("live.popups.visible", { count: visible }) : `${visible} visible`);
  }
  if (staged > 0) {
    parts.push(t ? t("live.popups.staged", { count: staged }) : `${staged} staged`);
  }
  const value = parts.join(", ");
  return t ? t("live.popups", { value }) : `Popups: ${value}`;
}

export function liveMapSummary(mapState: MapState | null, t?: Translator): string {
  if (!mapState?.image_path) {
    const value = t?.("live.map.noMap") ?? "No map";
    return t ? t("live.map", { value }) : `Map: ${value}`;
  }

  const parts = [
    mapState.presenting
      ? t?.("live.map.presenting") ?? "presenting"
      : t?.("live.map.ready") ?? "ready"
  ];
  if (mapState.fog_enabled) {
    const revealCount = mapState.reveals.length;
    parts.push(
      t
        ? t("live.map.fogReveals", { count: revealCount })
        : `fog ${revealCount} reveal${revealCount === 1 ? "" : "s"}`
    );
  }
  const playerPins = mapState.pins.filter((pin) => pin.visibility !== "dm").length;
  if (playerPins > 0) {
    parts.push(
      t
        ? t("live.map.playerPins", { count: playerPins })
        : `${playerPins} player pin${playerPins === 1 ? "" : "s"}`
    );
  }

  const value = `${mapState.title ?? mapState.image_path} ${parts.join(", ")}`;
  return t ? t("live.map", { value }) : `Map: ${value}`;
}

export function liveAudioBusSummaries(mixer: AudioMixerState, t?: Translator): string[] {
  return AUDIO_BUSES.map((bus) => {
    const state = mixer[bus];
    if (!state.track) {
      return `${busLabel(bus)}: ${t?.("live.audio.quiet") ?? "Quiet"}`;
    }
    return `${busLabel(bus)}: ${displayAudioTrackTitle(state.track)} ${
      state.playing ? t?.("live.audio.playing") ?? "playing" : t?.("live.audio.loaded") ?? "loaded"
    }`;
  });
}

export function livePaneSummary(
  layout: WorkspaceLayout,
  tabs: WorkspaceTab[],
  dirtyPaths: Set<string>,
  t?: Translator
): string[] {
  return layout.panes
    .filter((pane) => layout.mode === "vertical_split" || pane.id === "main")
    .map((pane) => {
      const tab = tabs.find((item) => item.path === pane.activePath);
      const label =
        pane.id === "main" ? t?.("live.pane.main") ?? "Main" : t?.("live.pane.secondary") ?? "Secondary";
      if (!tab) {
        return `${label}: ${t?.("live.pane.empty") ?? "Empty"}`;
      }
      return `${label}: ${tab.title ?? tab.name}${
        dirtyPaths.has(tab.path) ? ` ${t?.("live.pane.unsaved") ?? "unsaved"}` : ""
      }`;
    });
}

export function livePrepHealthLabel(report: PrepHealthReport | null, t?: Translator): string {
  if (!report) {
    const value = t?.("prep.status.notChecked") ?? "Not checked";
    return t ? t("live.prep", { value }) : `Prep: ${value}`;
  }
  if (report.errors === 0 && report.warnings === 0) {
    const value = t?.("prep.status.ready") ?? "Ready";
    return t ? t("live.prep", { value }) : `Prep: ${value}`;
  }
  const parts: string[] = [];
  if (report.errors > 0) {
    parts.push(countLabel(report.errors, "prep.count.error", "prep.count.errors", "error", "errors", t));
  }
  if (report.warnings > 0) {
    parts.push(
      countLabel(report.warnings, "prep.count.warning", "prep.count.warnings", "warning", "warnings", t)
    );
  }
  const value = parts.join(", ");
  return t ? t("live.prep", { value }) : `Prep: ${value}`;
}
