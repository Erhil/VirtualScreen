import type { FastSlot } from "./api";
import type { FastSlotAction } from "./api";
import type { DisplayPopupPreset } from "./api";

type HotkeyEventLike = {
  altKey: boolean;
  key: string;
  targetTagName?: string;
};

export function sortFastSlots(slots: FastSlot[]): FastSlot[] {
  return [...slots].sort((a, b) => a.position - b.position);
}

export function replaceFastSlot(slots: FastSlot[], nextSlot: FastSlot): FastSlot[] {
  return sortFastSlots([
    ...slots.filter((slot) => slot.position !== nextSlot.position),
    nextSlot
  ]);
}

export function clearFastSlot(slots: FastSlot[], position: number): FastSlot[] {
  return sortFastSlots(slots.filter((slot) => slot.position !== position));
}

export function dispatchableHotkeyPosition(event: HotkeyEventLike): number | null {
  const tagName = event.targetTagName?.toLowerCase();
  if (tagName && ["input", "textarea", "select"].includes(tagName)) {
    return null;
  }
  if (!event.altKey) {
    return null;
  }
  if (event.key === "0") {
    return 10;
  }
  const position = Number(event.key);
  return position >= 1 && position <= 9 ? position : null;
}

function basename(path: string): string {
  return path.split("/").at(-1) || path;
}

export type FastSlotActionDraft = {
  kind: FastSlotAction["kind"] | "scenario";
  path?: string;
  preset?: DisplayPopupPreset;
  presetId?: string;
  present?: boolean;
  scenarioId?: string;
};

export type FastSlotActionBuildResult =
  | { action: FastSlotAction; error?: never }
  | { action?: never; error: string };

export function buildFastSlotAction({
  kind,
  path = "",
  preset,
  presetId = "",
  present = true,
  scenarioId = ""
}: FastSlotActionDraft): FastSlotActionBuildResult {
  const trimmedPath = path.trim();
  if (kind === "scenario") {
    return { error: "Scenario slots are deprecated. Use Run script." };
  }
  if (kind === "open_file") {
    return trimmedPath
      ? { action: { kind, path: trimmedPath } }
      : { error: "Choose a file path for Open file." };
  }
  if (kind === "screen_fullscreen" || kind === "screen_popup") {
    const action =
      trimmedPath ? { kind, path: trimmedPath } : { kind };
    return {
      action:
        kind === "screen_popup" && preset
          ? { ...action, preset }
          : action
    };
  }
  if (kind === "audio_track") {
    return trimmedPath
      ? { action: { kind, path: trimmedPath, bus: "effect", play: true } }
      : { error: "Choose an audio track path." };
  }
  if (kind === "script_run") {
    return trimmedPath
      ? { action: { kind, path: trimmedPath } }
      : { error: "Choose a DMS script path." };
  }
  if (kind === "map_preset") {
    const trimmedPresetId = presetId.trim();
    return trimmedPresetId
      ? { action: { kind, preset_id: trimmedPresetId, present } }
      : { error: "Choose a map preset id." };
  }
  const trimmedScenarioId = scenarioId.trim();
  return trimmedScenarioId
    ? { action: { kind: "scenario", scenario_id: trimmedScenarioId, inputs: {} } }
    : { error: "Choose a scenario id." };
}

export function visibleFastSlots(slots: FastSlot[]): FastSlot[] {
  return sortFastSlots(
    slots.filter((slot) => {
      if (slot.action.kind === "scenario") {
        return false;
      }
      if (slot.action.kind === "map_preset") {
        return (
          typeof slot.action.preset_id === "string" &&
          slot.action.preset_id.trim().length > 0
        );
      }
      return true;
    })
  );
}

export function fastSlotSummary(slot: FastSlot): string {
  const action = slot.action;
  switch (action.kind) {
    case "open_file":
      return `Open ${basename(action.path)}`;
    case "screen_fullscreen":
      return action.path ? `Screen ${basename(action.path)}` : "Screen current";
    case "screen_popup":
      return action.path ? `Popup ${basename(action.path)}` : "Popup current";
    case "audio_track":
      return `Effect ${basename(action.path)}`;
    case "script_run":
      return `Run ${basename(action.path)}`;
    case "map_preset":
      return `Map preset ${action.preset_id}`;
    case "scenario":
      return `Legacy scenario ${action.scenario_id}`;
  }
}
