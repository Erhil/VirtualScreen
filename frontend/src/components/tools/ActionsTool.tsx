import {
  actionDraftFrom,
  actionDraftLabelHint,
  BindingActionFields,
  buildDraftAction,
  EMPTY_ACTION_DRAFT,
  pathPickerFilterForAction,
  type ActionDraft,
  type BindingActionKind
} from "./BindingActionFields";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useState } from "react";
import { useMapContext } from "../../contexts/MapContext";
import { type Translator } from "../../lang";
import { type ActionBinding, canonicalShortcutFromEvent, shortcutValidationError } from "../../lib/actionBindings";
import {
  type DisplayPopupPreset,
  type FastSlot,
  type FastSlotAction,
  type TableSnapshotSummary
} from "../../lib/api";
import { helpContextForActionsTab } from "../../lib/contextHelp";
import { buildFastSlotAction, fastSlotSummary } from "../../lib/fastSlots";
import {
  formatMidiMessageLabel,
  type MidiBinding,
  midiBindingValidationError,
  type MidiMessage
} from "../../lib/midiBindings";
import { type OpenTab } from "../../lib/tabs";
import { type ActionsToolTabId, DEFAULT_ACTIONS_TOOL_TAB } from "../../lib/toolPanel";
import { type WorldPathPickerFilter } from "../../lib/worldPathPicker";
import { InnerToolTabs } from "../InnerToolTabs";

export type TableSnapshotStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "loaded"; message: string }
  | { status: "error"; message: string };


export type MidiInputSummary = {
  id: string | null;
  name: string | null;
};

export type MidiLearnedControl = {
  input_id: string | null;
  input_name: string | null;
  message: MidiMessage;
};

export type MidiStatus =
  | { status: "unsupported"; message: string }
  | { status: "idle"; message: string | null }
  | { status: "connecting"; message: string | null }
  | { status: "connected"; message: string | null }
  | { status: "listening"; message: string | null }
  | { status: "error"; message: string };

export function ActionsTool({
  activeTab,
  actionBindings,
  bindingMessage,
  message,
  midiBindingMessage,
  midiBindings,
  midiInputs,
  midiLearnedControl,
  midiLearning,
  midiStatus,
  onClearMidiLearned,
  onConnectMidi,
  onDeleteBinding,
  onDeleteMidiBinding,
  onDeleteSnapshot,
  onLoadSnapshot,
  onRunBinding,
  onRunMidiBinding,
  onPickPath,
  slots,
  snapshots,
  snapshotName,
  snapshotSelectedId,
  snapshotStatus,
  onClearSlot,
  onSaveSnapshot,
  onSaveBinding,
  onSaveMidiBinding,
  onSelectSnapshot,
  onStartMidiLearn,
  onSnapshotNameChange,
  onSaveSlot,
  t
}: {
  activeTab: OpenTab | null;
  actionBindings: ActionBinding[];
  bindingMessage: string | null;
  message: string | null;
  midiBindingMessage: string | null;
  midiBindings: MidiBinding[];
  midiInputs: MidiInputSummary[];
  midiLearnedControl: MidiLearnedControl | null;
  midiLearning: boolean;
  midiStatus: MidiStatus;
  onClearMidiLearned: () => void;
  onConnectMidi: () => void;
  onDeleteBinding: (bindingId: string) => void;
  onDeleteMidiBinding: (bindingId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onLoadSnapshot: (snapshotId: string) => void;
  onRunBinding: (binding: ActionBinding) => void;
  onRunMidiBinding: (binding: MidiBinding) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  slots: FastSlot[];
  snapshots: TableSnapshotSummary[];
  snapshotName: string;
  snapshotSelectedId: string;
  snapshotStatus: TableSnapshotStatus;
  onClearSlot: (position: number) => void;
  onSaveSnapshot: () => void;
  onSaveBinding: (binding: ActionBinding) => void;
  onSaveMidiBinding: (binding: MidiBinding) => void;
  onSelectSnapshot: (snapshotId: string) => void;
  onStartMidiLearn: () => void;
  onSnapshotNameChange: (name: string) => void;
  onSaveSlot: (slot: FastSlot) => void;
  t: Translator;
}) {
  const { mapPresets } = useMapContext();
  const [position, setPosition] = useState(1);
  const [kind, setKind] = useState<FastSlotAction["kind"]>("open_file");
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [popupPreset, setPopupPreset] = useState<DisplayPopupPreset>("plain");
  const [mapPresetId, setMapPresetId] = useState("");
  const [mapPresetPresent, setMapPresetPresent] = useState(true);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [confirmLoadId, setConfirmLoadId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [bindingLabel, setBindingLabel] = useState("");
  const [bindingShortcut, setBindingShortcut] = useState("");
  const [bindingDraft, setBindingDraft] = useState<ActionDraft>(EMPTY_ACTION_DRAFT);
  const [bindingLocalMessage, setBindingLocalMessage] = useState<string | null>(null);
  const [midiBindingId, setMidiBindingId] = useState<string | null>(null);
  const [midiBindingLabel, setMidiBindingLabel] = useState("");
  const [midiDraft, setMidiDraft] = useState<ActionDraft>(EMPTY_ACTION_DRAFT);
  const [midiBindingMessageValue, setMidiBindingMessageValue] =
    useState<MidiMessage | null>(null);
  const [midiBindingInputId, setMidiBindingInputId] = useState<string | null>(null);
  const [midiBindingInputName, setMidiBindingInputName] = useState<string | null>(null);
  const [midiLocalMessage, setMidiLocalMessage] = useState<string | null>(null);
  const existing = slots.find((slot) => slot.position === position);
  const selectedMapPreset = mapPresets.find((preset) => preset.id === mapPresetId);
  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === snapshotSelectedId);
  const selectedBindingMapPreset = mapPresets.find((preset) => preset.id === bindingDraft.mapPresetId);
  const selectedBindingSnapshot = snapshots.find((snapshot) => snapshot.id === bindingDraft.snapshotId);
  const selectedMidiBindingMapPreset = mapPresets.find(
    (preset) => preset.id === midiDraft.mapPresetId
  );
  const selectedMidiBindingSnapshot = snapshots.find(
    (snapshot) => snapshot.id === midiDraft.snapshotId
  );
  const bindingStatusMessage = bindingLocalMessage || bindingMessage;
  const bindingStatusIsError =
    Boolean(bindingLocalMessage) ||
    Boolean(bindingMessage && !bindingMessage.startsWith("Saved "));
  const midiStatusMessage = midiLocalMessage || midiBindingMessage || midiStatus.message;
  const midiStatusIsError =
    Boolean(midiLocalMessage) ||
    Boolean(midiBindingMessage && !midiBindingMessage.startsWith("Saved ")) ||
    midiStatus.status === "error" ||
    midiStatus.status === "unsupported";

  useEffect(() => {
    setConfirmLoadId(null);
    setConfirmDeleteId(null);
  }, [snapshotSelectedId]);

  function resetBindingForm() {
    setBindingId(null);
    setBindingLabel("");
    setBindingShortcut("");
    setBindingDraft(EMPTY_ACTION_DRAFT);
    setBindingLocalMessage(null);
  }

  function resetMidiBindingForm() {
    setMidiBindingId(null);
    setMidiBindingLabel("");
    setMidiDraft(EMPTY_ACTION_DRAFT);
    setMidiBindingMessageValue(null);
    setMidiBindingInputId(null);
    setMidiBindingInputName(null);
    setMidiLocalMessage(null);
    onClearMidiLearned();
  }

  function editBinding(binding: ActionBinding) {
    setBindingId(binding.id);
    setBindingLabel(binding.label);
    setBindingShortcut(binding.shortcut);
    setBindingLocalMessage(null);
    setBindingDraft(actionDraftFrom(binding.action));
  }

  function editMidiBinding(binding: MidiBinding) {
    setMidiBindingId(binding.id);
    setMidiBindingLabel(binding.label);
    setMidiBindingMessageValue(binding.message);
    setMidiBindingInputId(binding.input_id);
    setMidiBindingInputName(binding.input_name);
    setMidiLocalMessage(null);
    onClearMidiLearned();
    setMidiDraft(actionDraftFrom(binding.action));
  }

  useEffect(() => {
    if (!midiLearnedControl) {
      return;
    }
    setMidiBindingMessageValue(midiLearnedControl.message);
    setMidiBindingInputId(midiLearnedControl.input_id);
    setMidiBindingInputName(midiLearnedControl.input_name);
    setMidiLocalMessage(null);
  }, [midiLearnedControl]);

  function handleBindingShortcutKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const shortcut = canonicalShortcutFromEvent(event);
    if (shortcut) {
      setBindingShortcut(shortcut);
      setBindingLocalMessage(null);
    }
  }

  function renderPathInput(
    value: string,
    onChange: (value: string) => void,
    kind: BindingActionKind | FastSlotAction["kind"],
    ariaLabel: string,
    placeholder: string,
    title: string,
    pickerLabel: string
  ) {
    return (
      <div className="inline-input-action">
        <input
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
        <button
          aria-label={pickerLabel}
          onClick={() => onPickPath(pathPickerFilterForAction(kind), title, onChange)}
          type="button"
        >
          {t("app.pick")}
        </button>
      </div>
    );
  }

  const [activeTabId, setActiveTabId] = useState<ActionsToolTabId>(DEFAULT_ACTIONS_TOOL_TAB);

  return (
    <section
      className="actions-tool"
      aria-label={t("actions.control")}
      data-help-context={helpContextForActionsTab(activeTabId)}
    >
      <InnerToolTabs
        active={activeTabId}
        ariaLabel={t("actions.toolSections")}
        onChange={setActiveTabId}
        tabs={[
          { id: "slots", label: t("actions.slots") },
          { id: "state", label: t("actions.state") },
          { id: "keys", label: t("actions.keys") },
          { id: "midi", label: t("actions.midi") }
        ]}
      />
      {activeTabId === "state" && (
      <div className="actions-subsection" aria-label={t("actions.tableStateSnapshots")} role="region">
        <h3>{t("actions.tableState")}</h3>
        <div className="compact-form-grid">
          <label>
            {t("actions.title")}
            <input
              onChange={(event) => onSnapshotNameChange(event.target.value)}
              placeholder="Tavern default"
              value={snapshotName}
            />
          </label>
          <label>
            {t("actions.saved")}
            <select
              aria-label={t("actions.savedTableState")}
              onChange={(event) => onSelectSnapshot(event.target.value)}
              value={snapshotSelectedId}
            >
              <option value="">{t("actions.chooseState")}</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedSnapshot && (
          <p className="tool-note">
            {t("actions.selected")} {selectedSnapshot.name}
          </p>
        )}
        {snapshotStatus.message && (
          <p className={`tool-note ${snapshotStatus.status === "error" ? "tool-error" : ""}`}>
            {snapshotStatus.message}
          </p>
        )}
        <div className="inline-actions">
          <button
            disabled={snapshotStatus.status === "saving" || snapshotStatus.status === "loading"}
            onClick={() => onSaveSnapshot()}
            type="button"
          >
            {t("actions.saveCurrent")}
          </button>
          <button
            disabled={!snapshotSelectedId || snapshotStatus.status === "loading"}
            onClick={() => {
              if (confirmLoadId === snapshotSelectedId) {
                onLoadSnapshot(snapshotSelectedId);
                setConfirmLoadId(null);
                return;
              }
              setConfirmLoadId(snapshotSelectedId);
            }}
            type="button"
          >
            {confirmLoadId === snapshotSelectedId ? t("actions.confirmLoad") : t("actions.load")}
          </button>
          <button
            disabled={!snapshotSelectedId || snapshotStatus.status === "loading"}
            onClick={() => {
              if (confirmDeleteId === snapshotSelectedId) {
                onDeleteSnapshot(snapshotSelectedId);
                setConfirmDeleteId(null);
                return;
              }
              setConfirmDeleteId(snapshotSelectedId);
            }}
            type="button"
          >
            {confirmDeleteId === snapshotSelectedId ? t("actions.confirmDelete") : t("app.delete")}
          </button>
        </div>
      </div>
      )}
      {activeTabId === "keys" && (
      <div className="actions-subsection" aria-label={t("actions.keyboardBindings")} role="region">
        <h3>{t("actions.keyboardBindings")}</h3>
        <div className="compact-form-grid">
          <label>
            {t("actions.title")}
            <input
              aria-label="Keyboard binding title"
              onChange={(event) => setBindingLabel(event.target.value)}
              placeholder={
                selectedBindingSnapshot?.name ||
                selectedBindingMapPreset?.name ||
                activeTab?.title ||
                activeTab?.name ||
                "Binding"
              }
              value={bindingLabel}
            />
          </label>
          <label>
            {t("actions.shortcut")}
            <input
              aria-label="Keyboard binding shortcut"
              onChange={(event) => {
                setBindingShortcut(event.target.value);
                setBindingLocalMessage(null);
              }}
              onKeyDown={handleBindingShortcutKeyDown}
              placeholder="Press Ctrl+Shift+M"
              value={bindingShortcut}
            />
          </label>
          <BindingActionFields
            activeTab={activeTab}
            draft={bindingDraft}
            labelPrefix="Keyboard binding"
            mapPresets={mapPresets}
            onChange={setBindingDraft}
            onPickPath={onPickPath}
            pickerLabel="Choose keyboard binding target"
            pickerTitle="Choose Keyboard Binding Target"
            snapshots={snapshots}
            t={t}
          />
        </div>
        {bindingStatusMessage && (
          <p className={`tool-note${bindingStatusIsError ? " tool-error" : ""}`}>
            {bindingStatusMessage}
          </p>
        )}
        <div className="inline-actions">
          <button
            onClick={() => {
              const shortcutError = shortcutValidationError(
                bindingShortcut,
                actionBindings,
                bindingId ?? undefined
              );
              if (shortcutError) {
                setBindingLocalMessage(shortcutError);
                return;
              }
              const result = buildDraftAction(bindingDraft);
              if ("error" in result) {
                setBindingLocalMessage(result.error);
                return;
              }
              const id = bindingId ?? `binding-${Date.now().toString(36)}`;
              onSaveBinding({
                id,
                label:
                  bindingLabel.trim() ||
                  actionDraftLabelHint(bindingDraft, mapPresets, snapshots, activeTab) ||
                  "Binding",
                shortcut: bindingShortcut,
                action: result.action
              });
              resetBindingForm();
            }}
            type="button"
          >
            {bindingId ? t("actions.updateBinding") : t("actions.saveBinding")}
          </button>
          <button onClick={resetBindingForm} type="button">
            {t("actions.new")}
          </button>
        </div>
        {actionBindings.length === 0 ? (
          <p className="tool-note">{t("actions.noKeyboardBindings")}</p>
        ) : (
          <div className="binding-list" aria-label={t("actions.savedKeyboardBindings")}>
            {actionBindings.map((binding) => (
              <div className="binding-row" key={binding.id}>
                <button onClick={() => onRunBinding(binding)} type="button">
                  {binding.label}
                </button>
                <kbd>{binding.shortcut}</kbd>
                <button onClick={() => editBinding(binding)} type="button">
                  {t("app.edit")}
                </button>
                <button onClick={() => onDeleteBinding(binding.id)} type="button">
                  {t("app.remove")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      {activeTabId === "midi" && (
      <div className="actions-subsection" aria-label={t("actions.midiBindings")} role="region">
        <h3>{t("actions.midiBindings")}</h3>
        <div className="inline-actions">
          <button
            disabled={midiStatus.status === "unsupported" || midiStatus.status === "connecting"}
            onClick={onConnectMidi}
            type="button"
          >
            {midiStatus.status === "connecting" ? t("actions.connecting") : t("actions.connectMidi")}
          </button>
          <button
            disabled={midiStatus.status === "unsupported" || midiStatus.status === "connecting"}
            onClick={onStartMidiLearn}
            type="button"
          >
            {midiLearning ? t("actions.listening") : t("actions.learnControl")}
          </button>
          <button
            disabled={!midiBindingMessageValue}
            onClick={() => {
              setMidiBindingMessageValue(null);
              setMidiBindingInputId(null);
              setMidiBindingInputName(null);
              onClearMidiLearned();
            }}
            type="button"
          >
            {t("actions.clearLearn")}
          </button>
        </div>
        <div className="compact-form-grid">
          <label>
            {t("actions.title")}
            <input
              aria-label="MIDI binding title"
              onChange={(event) => setMidiBindingLabel(event.target.value)}
              placeholder={
                selectedMidiBindingSnapshot?.name ||
                selectedMidiBindingMapPreset?.name ||
                activeTab?.title ||
                activeTab?.name ||
                "MIDI binding"
              }
              value={midiBindingLabel}
            />
          </label>
          <label>
            {t("actions.controlLabel")}
            <input
              aria-label="MIDI learned control"
              readOnly
              value={
                midiBindingMessageValue
                  ? formatMidiMessageLabel(midiBindingMessageValue)
                  : ""
              }
            />
          </label>
          <label>
            {t("actions.input")}
            <select
              aria-label="MIDI input"
              onChange={(event) => {
                const value = event.target.value;
                const input =
                  midiInputs.find((item) => (item.id ?? "") === value) ?? null;
                setMidiBindingInputId(input?.id ?? null);
                setMidiBindingInputName(input?.name ?? null);
              }}
              value={midiBindingInputId ?? ""}
            >
              <option value="">{t("actions.anyMidiInput")}</option>
              {midiInputs.map((input) => (
                <option key={input.id ?? input.name ?? "midi-input"} value={input.id ?? ""}>
                  {input.name ?? input.id ?? t("actions.midiInput")}
                </option>
              ))}
            </select>
          </label>
          <BindingActionFields
            activeTab={activeTab}
            draft={midiDraft}
            labelPrefix="MIDI binding"
            mapPresets={mapPresets}
            onChange={setMidiDraft}
            onPickPath={onPickPath}
            pickerLabel="Choose MIDI binding target"
            pickerTitle="Choose MIDI Binding Target"
            snapshots={snapshots}
            t={t}
          />
        </div>
        {midiStatusMessage && (
          <p className={`tool-note${midiStatusIsError ? " tool-error" : ""}`}>
            {midiStatusMessage}
          </p>
        )}
        <div className="inline-actions">
          <button
            onClick={() => {
              const result = buildDraftAction(midiDraft);
              const midiLabel =
                midiBindingLabel.trim() ||
                actionDraftLabelHint(midiDraft, mapPresets, snapshots, activeTab) ||
                "MIDI binding";
              if ("error" in result) {
                setMidiLocalMessage(result.error);
                return;
              }
              const validationError = midiBindingValidationError(
                {
                  label: midiLabel,
                  input_id: midiBindingInputId,
                  message: midiBindingMessageValue,
                  action: result.action
                },
                midiBindings,
                midiBindingId ?? undefined
              );
              if (validationError) {
                setMidiLocalMessage(validationError);
                return;
              }
              const id = midiBindingId ?? `midi-${Date.now().toString(36)}`;
              onSaveMidiBinding({
                id,
                label: midiLabel,
                input_id: midiBindingInputId,
                input_name: midiBindingInputName,
                message: midiBindingMessageValue as MidiMessage,
                action: result.action
              });
              resetMidiBindingForm();
            }}
            type="button"
          >
            {midiBindingId ? t("actions.updateMidiBinding") : t("actions.saveMidiBinding")}
          </button>
          <button onClick={resetMidiBindingForm} type="button">
            {t("actions.new")}
          </button>
        </div>
        {midiBindings.length === 0 ? (
          <p className="tool-note">{t("actions.noMidiBindings")}</p>
        ) : (
          <div className="binding-list" aria-label={t("actions.savedMidiBindings")}>
            {midiBindings.map((binding) => (
              <div className="binding-row" key={binding.id}>
                <button onClick={() => onRunMidiBinding(binding)} type="button">
                  {binding.label}
                </button>
                <kbd>{formatMidiMessageLabel(binding.message)}</kbd>
                <button
                  onClick={() => {
                    editMidiBinding(binding);
                    onStartMidiLearn();
                  }}
                  type="button"
                >
                  {t("actions.relearn")}
                </button>
                <button onClick={() => onDeleteMidiBinding(binding.id)} type="button">
                  {t("app.remove")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      {activeTabId === "slots" && (
      <div className="actions-subsection" aria-label={t("actions.fastSlots")} role="region">
        <h3>{t("actions.fastSlots")}</h3>
      <div className="compact-form-grid">
        <label>
          {t("actions.slot")}
          <select
            onChange={(event) => setPosition(Number(event.target.value))}
            value={position}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value === 10 ? "0" : value}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("actions.action")}
          <select
            onChange={(event) => setKind(event.target.value as FastSlotAction["kind"])}
            value={kind}
          >
            <option value="open_file">{t("actions.openFile")}</option>
            <option value="screen_fullscreen">{t("actions.screenFullscreen")}</option>
            <option value="screen_popup">{t("actions.screenPopup")}</option>
            <option value="audio_track">{t("actions.audioTrack")}</option>
            <option value="script_run">{t("actions.runScript")}</option>
            <option value="map_preset">{t("actions.mapPreset")}</option>
          </select>
        </label>
        <label>
          {t("actions.label")}
          <input
            onChange={(event) => setLabel(event.target.value)}
            placeholder={existing?.label ?? activeTab?.title ?? activeTab?.name ?? "Slot"}
            value={label}
          />
        </label>
        {kind === "map_preset" ? (
          <label>
            {t("actions.mapPreset")}
            <select
              aria-label="Map preset"
              onChange={(event) => setMapPresetId(event.target.value)}
              value={mapPresetId}
            >
              <option value="">{t("actions.choosePreset")}</option>
              {mapPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            {t("actions.path")}
            {renderPathInput(
              path,
              setPath,
              kind,
              "Fast slot path",
              kind === "screen_fullscreen" || kind === "screen_popup"
                ? activeTab?.path ?? t("screen.pathPlaceholder")
                : kind === "audio_track"
                  ? ".music/effects/file.mp3"
                  : kind === "script_run"
                    ? "Scripts/hello_world.dms"
                    : "README.md",
              "Choose Fast Slot Target",
              "Choose fast slot path"
            )}
          </label>
        )}
        {kind === "screen_popup" && (
          <label>
            {t("actions.preset")}
            <select
              aria-label="Popup preset"
              onChange={(event) => setPopupPreset(event.target.value as DisplayPopupPreset)}
              value={popupPreset}
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
              aria-label="Present map preset"
              checked={mapPresetPresent}
              onChange={(event) => setMapPresetPresent(event.target.checked)}
              type="checkbox"
            />
          </label>
        )}
      </div>
      {kind === "map_preset" && mapPresets.length === 0 && (
        <p className="tool-note">{t("actions.saveMapPresetFirst")}</p>
      )}
      {existing && <p className="tool-note">{t("actions.current", { summary: fastSlotSummary(existing) })}</p>}
      {(localMessage || message) && <p className="tool-note">{localMessage || message}</p>}
      <div className="inline-actions">
        <button
          onClick={() => {
            const result = buildFastSlotAction({
              kind,
              path,
              preset: popupPreset,
              presetId: mapPresetId,
              present: mapPresetPresent
            });
            if (!result.action) {
              setLocalMessage(result.error ?? "Could not build slot action.");
              return;
            }
            setLocalMessage(null);
            onSaveSlot({
              id: `slot-${position}`,
              position,
              label:
                label.trim() ||
                selectedMapPreset?.name ||
                existing?.label ||
                activeTab?.title ||
                activeTab?.name ||
                `Slot ${position}`,
              icon: null,
              action: result.action
            });
          }}
          type="button"
        >
          {t("actions.saveSlot")}
        </button>
        <button disabled={!existing} onClick={() => onClearSlot(position)} type="button">
          {t("actions.clear")}
        </button>
      </div>
      </div>
      )}
    </section>
  );
}
