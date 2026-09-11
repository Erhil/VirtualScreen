import type { Translator } from "../../lang";
import type { ActionBindingAction } from "../../lib/actionBindings";
import type { DisplayPopupPreset, FastSlotAction, TableSnapshotSummary } from "../../lib/api";
import type { MapPreset } from "../../lib/map";
import { buildFastSlotAction } from "../../lib/fastSlots";
import type { OpenTab } from "../../lib/tabs";
import type { WorldPathPickerFilter } from "../../lib/worldPathPicker";

export type BindingActionKind = FastSlotAction["kind"] | "table_snapshot_restore";

export function pathPickerFilterForAction(kind: BindingActionKind): WorldPathPickerFilter {
  if (kind === "screen_fullscreen" || kind === "screen_popup") {
    return "displayable";
  }
  if (kind === "audio_track") {
    return "audio";
  }
  if (kind === "script_run") {
    return "script";
  }
  return "any";
}

// The action half of a hotkey or MIDI binding form - the two were identical field for field.
export type ActionDraft = {
  kind: BindingActionKind;
  path: string;
  popupPreset: DisplayPopupPreset;
  mapPresetId: string;
  mapPresetPresent: boolean;
  snapshotId: string;
};

export const EMPTY_ACTION_DRAFT: ActionDraft = {
  kind: "open_file",
  path: "",
  popupPreset: "plain",
  mapPresetId: "",
  mapPresetPresent: true,
  snapshotId: ""
};

export function actionDraftFrom(action: ActionBindingAction): ActionDraft {
  return {
    kind: action.kind as BindingActionKind,
    path: "path" in action && typeof action.path === "string" ? action.path : "",
    popupPreset: action.kind === "screen_popup" && action.preset ? action.preset : "plain",
    mapPresetId: action.kind === "map_preset" ? action.preset_id : "",
    mapPresetPresent: action.kind === "map_preset" ? action.present : true,
    snapshotId: action.kind === "table_snapshot_restore" ? action.snapshot_id : ""
  };
}

// The name a binding gets when the user leaves the title empty.
export function actionDraftLabelHint(
  draft: ActionDraft,
  mapPresets: MapPreset[],
  snapshots: TableSnapshotSummary[],
  activeTab: OpenTab | null
): string | undefined {
  const snapshot = snapshots.find((item) => item.id === draft.snapshotId);
  const mapPreset = mapPresets.find((item) => item.id === draft.mapPresetId);
  const forKind =
    draft.kind === "table_snapshot_restore"
      ? snapshot?.name
      : mapPreset?.name || activeTab?.title || activeTab?.name;
  return forKind || snapshot?.name || mapPreset?.name || activeTab?.title || activeTab?.name;
}

export function buildDraftAction(
  draft: ActionDraft
): { action: ActionBindingAction } | { error: string } {
  if (draft.kind === "table_snapshot_restore") {
    return draft.snapshotId
      ? { action: { kind: "table_snapshot_restore", snapshot_id: draft.snapshotId } }
      : { error: "Choose a table state snapshot." };
  }
  const result = buildFastSlotAction({
    kind: draft.kind,
    path: draft.path,
    preset: draft.popupPreset,
    presetId: draft.mapPresetId,
    present: draft.mapPresetPresent
  });
  return result.action ? { action: result.action } : { error: result.error ?? "Could not build the action." };
}

export function BindingActionFields({
  labelPrefix,
  pickerTitle,
  pickerLabel,
  draft,
  onChange,
  mapPresets,
  snapshots,
  activeTab,
  onPickPath,
  t
}: {
  // "Keyboard binding" / "MIDI binding": every field's accessible name starts with it.
  labelPrefix: string;
  pickerTitle: string;
  pickerLabel: string;
  draft: ActionDraft;
  // Takes an updater, so a path chosen in the (asynchronous) picker lands on the current draft.
  onChange: (update: (draft: ActionDraft) => ActionDraft) => void;
  mapPresets: MapPreset[];
  snapshots: TableSnapshotSummary[];
  activeTab: OpenTab | null;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  t: Translator;
}) {
  const set = (changes: Partial<ActionDraft>) => onChange((current) => ({ ...current, ...changes }));
  const kind = draft.kind;
  return (
    <>
      <label>
        {t("actions.bindingType")}
        <select
          aria-label={`${labelPrefix} type`}
          onChange={(event) => set({ kind: event.target.value as BindingActionKind })}
          value={kind}
        >
          <option value="open_file">{t("actions.openFile")}</option>
          <option value="screen_fullscreen">{t("actions.screenFullscreen")}</option>
          <option value="screen_popup">{t("actions.screenPopup")}</option>
          <option value="audio_track">{t("actions.audioTrack")}</option>
          <option value="script_run">{t("actions.runScript")}</option>
          <option value="map_preset">{t("actions.mapPreset")}</option>
          <option value="table_snapshot_restore">{t("actions.restoreTableState")}</option>
        </select>
      </label>
      {kind === "map_preset" ? (
        <label>
          {t("actions.mapPreset")}
          <select
            aria-label={`${labelPrefix} map preset`}
            onChange={(event) => set({ mapPresetId: event.target.value })}
            value={draft.mapPresetId}
          >
            <option value="">{t("actions.choosePreset")}</option>
            {mapPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
      ) : kind === "table_snapshot_restore" ? (
        <label>
          {t("actions.tableState")}
          <select
            aria-label={`${labelPrefix} table state`}
            onChange={(event) => set({ snapshotId: event.target.value })}
            value={draft.snapshotId}
          >
            <option value="">{t("actions.chooseState")}</option>
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          {t("actions.target")}
          <div className="inline-input-action">
            <input
              aria-label={`${labelPrefix} target`}
              onChange={(event) => set({ path: event.target.value })}
              placeholder={
                kind === "screen_fullscreen" || kind === "screen_popup"
                  ? activeTab?.path ?? t("screen.pathPlaceholder")
                  : kind === "audio_track"
                    ? ".music/effects/file.mp3"
                    : kind === "script_run"
                      ? "Scripts/hello_world.dms"
                      : "README.md"
              }
              value={draft.path}
            />
            <button
              aria-label={pickerLabel}
              onClick={() =>
                onPickPath(pathPickerFilterForAction(kind), pickerTitle, (path) => set({ path }))
              }
              type="button"
            >
              {t("app.pick")}
            </button>
          </div>
        </label>
      )}
      {kind === "screen_popup" && (
        <label>
          {t("actions.preset")}
          <select
            aria-label={`${labelPrefix} popup preset`}
            onChange={(event) => set({ popupPreset: event.target.value as DisplayPopupPreset })}
            value={draft.popupPreset}
          >
            <option value="plain">{t("screen.popupPlain")}</option>
            <option value="note">{t("screen.popupNote")}</option>
            <option value="letter">{t("screen.popupLetter")}</option>
            <option value="portrait">{t("screen.popupPortrait")}</option>
            <option value="clue">{t("screen.popupClue")}</option>
          </select>
        </label>
      )}
      {kind === "map_preset" && (
        <label className="compact-inline-control">
          {t("actions.present")}
          <input
            aria-label={`${labelPrefix} presents map preset`}
            checked={draft.mapPresetPresent}
            onChange={(event) => set({ mapPresetPresent: event.target.checked })}
            type="checkbox"
          />
        </label>
      )}
    </>
  );
}
