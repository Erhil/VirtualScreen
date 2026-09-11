import { type ReactNode } from "react";
import { useAudioContext } from "../../contexts/AudioContext";
import { useDisplayContext } from "../../contexts/DisplayContext";
import { useMapContext } from "../../contexts/MapContext";
import { type Translator } from "../../lang";
import { type ActionBinding } from "../../lib/actionBindings";
import {
  type DisplayState,
  type FastSlot,
  type HpTrackerRow,
  type PageLink,
  type PageSummary,
  type TableSnapshotSummary
} from "../../lib/api";
import { audioSummary } from "../../lib/audio";
import { type DiceHistoryEntry } from "../../lib/dice";
import { screenPrimaryMode, screenPrimaryTitle, visibleScreenPopupCount } from "../../lib/display";
import { summarizeHpTrackerRows } from "../../lib/hp";
import { type MapState } from "../../lib/map";
import { type MetadataFormState } from "../../lib/metadataEditor";
import { type MidiBinding } from "../../lib/midiBindings";
import { type OpenTab } from "../../lib/tabs";
import {
  isToolDisabled,
  isToolOpen,
  isToolPinned,
  type ScreenToolTabId,
  type ToolId,
  type ToolPanelState
} from "../../lib/toolPanel";
import { type WorldPathPickerFilter } from "../../lib/worldPathPicker";
import { AudioTool } from "../audio/AudioTool";
import {
  type LinksLoadState,
  type MetadataEditState,
  MetadataTool,
  type PageLoadState
} from "../MetadataTool";
import { ScreenTool } from "../screen/ScreenTool";
import {
  ActionsTool,
  type MidiInputSummary,
  type MidiLearnedControl,
  type MidiStatus,
  type TableSnapshotStatus
} from "./ActionsTool";
import { type DiceStatus, DiceTool } from "./DiceTool";
import { HpTool, type HpToolStatus } from "./HpTool";
import { type ScriptLoadState, type ScriptRunState, ScriptsTool } from "./ScriptsTool";

function ToolSection({
  children,
  locked = false,
  onToggle,
  onTogglePin,
  open,
  pinned = false,
  summary,
  t,
  title,
  tool
}: {
  children: ReactNode;
  locked?: boolean;
  onToggle: (tool: ToolId) => void;
  onTogglePin: (tool: ToolId) => void;
  open: boolean;
  pinned?: boolean;
  summary: string;
  t: Translator;
  title: string;
  tool: ToolId;
}) {
  return (
    <section
      className={`tool-section${open ? " tool-section-open" : ""}`}
      aria-label={t("tools.sectionLabel", { title })}
    >
      <div className="tool-section-header-row">
        <button
          aria-expanded={open}
          className="tool-section-header"
          onClick={() => onToggle(tool)}
          type="button"
        >
          <span>{title}</span>
          <small>{summary}</small>
          {locked && <em>{t("tools.editing")}</em>}
        </button>
        <button
          aria-label={`${pinned ? t("tools.unpin") : t("tools.pin")} ${title}`}
          aria-pressed={pinned}
          className="tool-pin-button"
          onClick={() => onTogglePin(tool)}
          type="button"
        >
          {pinned ? t("tools.pinned") : t("tools.pin")}
        </button>
      </div>
      {open && (
        <div className="tool-section-body" id={`tool-section-${tool}`}>
          {children}
        </div>
      )}
    </section>
  );
}

function metadataSummary(
  tab: OpenTab | null,
  pageState: PageLoadState,
  editState: MetadataEditState,
  t: Translator
): string {
  if (editState.mode === "edit") {
    return t("metadata.summary.editing");
  }
  if (!tab) {
    return t("metadata.summary.noFile");
  }
  if (pageState.status === "ready") {
    return pageState.page.page_type ?? pageState.page.title;
  }
  if (pageState.status === "error") {
    return t("metadata.summary.couldNotLoad");
  }
  return t("app.loading");
}

function screenSummary(
  displayState: DisplayState | null,
  mapState: MapState | null,
  t: Translator
): string {
  const mode = screenPrimaryMode(displayState, mapState);
  const title = screenPrimaryTitle(displayState, mapState);
  const popupCount = visibleScreenPopupCount(displayState);
  const primary =
    mode === "map"
      ? t("screen.playersSeeMap", { target: title ?? t("map.noMapLoaded") })
      : mode === "fullscreen"
        ? t("screen.playersSeeFullscreen", { target: title ?? t("screen.fullscreen") })
        : t("screen.playersSeeBlank");
  return popupCount > 0 ? t("screen.playersSeeWithPopups", { primary, count: popupCount }) : primary;
}

function actionsSummary(
  slots: FastSlot[],
  bindings: ActionBinding[],
  midiBindings: MidiBinding[],
  t: Translator
): string {
  const parts = [
    t("actions.summary.slots", { count: slots.length }),
    t("actions.summary.keys", { count: bindings.length }),
    t("actions.summary.midi", { count: midiBindings.length })
  ];
  return parts.join(" / ");
}

function scriptsSummary(state: ScriptLoadState, runState: ScriptRunState, t: Translator): string {
  if (runState.status === "running") {
    return t("scripts.running");
  }
  if (runState.status === "ready") {
    return runState.run.status === "cancelled" ? t("scripts.cancelled") : runState.run.status;
  }
  if (state.status === "ready") {
    return t("scripts.summary.found", { count: state.scripts.length });
  }
  if (state.status === "loading") {
    return t("scripts.scanning");
  }
  if (state.status === "error" || runState.status === "error") {
    return t("scripts.summary.error");
  }
  return t("scripts.summary.ready");
}

function hpSummary(rows: HpTrackerRow[], status: HpToolStatus, t: Translator): string {
  if (status.status === "loading") {
    return t("app.loading");
  }
  if (status.status === "saving") {
    return t("app.saving");
  }
  if (status.status === "error") {
    return t("hp.summary.error");
  }
  const summary = summarizeHpTrackerRows(rows);
  if (summary.count === 0) {
    return t("hp.summary.noRows");
  }
  return summary.down > 0
    ? t("hp.summary.rowsDown", { count: summary.count, down: summary.down })
    : t("hp.summary.rows", { count: summary.count });
}

function diceSummary(history: DiceHistoryEntry[], status: DiceStatus, t: Translator): string {
  if (status.status === "rolling") {
    return t("dice.rolling");
  }
  if (status.status === "error") {
    return t("dice.error");
  }
  return history[0] ? `${history[0].expression}: ${history[0].total}` : t("dice.ready");
}

export function ToolsPanel({
  activeTab,
  activeDocumentTab,
  actionBindings,
  actionBindingMessage,
  contentDirty,
  diceHistory,
  diceStatus,
  fileReady,
  fastSlotError,
  fastSlots,
  linksState,
  hpRows,
  hpStatus,
  metadataEditState,
  midiBindingMessage,
  midiBindings,
  midiInputs,
  midiLearnedControl,
  midiLearning,
  midiStatus,
  onActionBindingDelete,
  onActionBindingRun,
  onActionBindingSave,
  onDiceClearHistory,
  onDiceRoll,
  onHpAdd,
  onHpAdjust,
  onHpClear,
  onHpPersist,
  onHpRemove,
  onHpUpdate,
  onChangeMetadataEdit,
  onCancelScript,
  onClearFastSlot,
  onPickPath,
  onClearMidiLearned,
  onConnectMidi,
  onDeleteMidiBinding,
  onMidiBindingRun,
  onMidiBindingSave,
  onOpenBacklink,
  onOpenOutgoing,
  onReloadMetadataEdit,
  onRevertMetadataEdit,
  onSaveMetadataEdit,
  onStartMetadataEdit,
  onCancelMetadataEdit,
  onScreenToolTabChange,
  onToolPin,
  onToolToggle,
  openTools,
  pageState,
  pages,
  screenToolTab,
  onDeleteTableSnapshot,
  onLoadTableSnapshot,
  onSaveTableSnapshot,
  onSelectTableSnapshot,
  onTableSnapshotNameChange,
  onSaveFastSlot,
  onScriptRun,
  onStartMidiLearn,
  scriptRunState,
  scriptState,
  tableSnapshotName,
  tableSnapshotSelectedId,
  tableSnapshotStatus,
  tableSnapshots,
  t
}: {
  activeTab: OpenTab | null;
  activeDocumentTab: OpenTab | null;
  actionBindings: ActionBinding[];
  actionBindingMessage: string | null;
  contentDirty: boolean;
  diceHistory: DiceHistoryEntry[];
  diceStatus: DiceStatus;
  fastSlotError: string | null;
  fastSlots: FastSlot[];
  fileReady: boolean;
  linksState: LinksLoadState;
  hpRows: HpTrackerRow[];
  hpStatus: HpToolStatus;
  metadataEditState: MetadataEditState;
  midiBindingMessage: string | null;
  midiBindings: MidiBinding[];
  midiInputs: MidiInputSummary[];
  midiLearnedControl: MidiLearnedControl | null;
  midiLearning: boolean;
  midiStatus: MidiStatus;
  onActionBindingDelete: (bindingId: string) => void;
  onActionBindingRun: (binding: ActionBinding) => void;
  onActionBindingSave: (binding: ActionBinding) => void;
  onDiceClearHistory: () => void;
  onDiceRoll: (expression: string) => void;
  onHpAdd: () => void;
  onHpAdjust: (rowId: string, amount: number) => void;
  onHpClear: () => void;
  onHpPersist: () => void;
  onHpRemove: (rowId: string) => void;
  onHpUpdate: (rowId: string, updates: Partial<Omit<HpTrackerRow, "id">>) => void;
  onCancelMetadataEdit: () => void;
  onCancelScript: (runId: string) => void;
  onChangeMetadataEdit: (form: MetadataFormState) => void;
  onClearFastSlot: (position: number) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onClearMidiLearned: () => void;
  onConnectMidi: () => void;
  onDeleteMidiBinding: (bindingId: string) => void;
  onMidiBindingRun: (binding: MidiBinding) => void;
  onMidiBindingSave: (binding: MidiBinding) => void;
  onOpenBacklink: (link: PageLink) => void;
  onOpenOutgoing: (link: PageLink) => void;
  onReloadMetadataEdit: () => void;
  onRevertMetadataEdit: () => void;
  onSaveMetadataEdit: () => void;
  onStartMetadataEdit: () => void;
  onScreenToolTabChange: (tab: ScreenToolTabId) => void;
  onToolPin: (tool: ToolId) => void;
  onToolToggle: (tool: ToolId) => void;
  openTools: ToolPanelState;
  pageState: PageLoadState;
  pages: PageSummary[];
  screenToolTab: ScreenToolTabId;
  onDeleteTableSnapshot: (snapshotId: string) => void;
  onLoadTableSnapshot: (snapshotId: string) => void;
  onSaveTableSnapshot: () => void;
  onSelectTableSnapshot: (snapshotId: string) => void;
  onTableSnapshotNameChange: (name: string) => void;
  onSaveFastSlot: (slot: FastSlot) => void;
  onScriptRun: (path: string) => void;
  onStartMidiLearn: () => void;
  scriptRunState: ScriptRunState;
  scriptState: ScriptLoadState;
  tableSnapshotName: string;
  tableSnapshotSelectedId: string;
  tableSnapshotStatus: TableSnapshotStatus;
  tableSnapshots: TableSnapshotSummary[];
  t: Translator;
}) {
  const metadataLocked = metadataEditState.mode === "edit";
  const { audioMixer } = useAudioContext();
  const { visibleMapState: mapState } = useMapContext();
  const { displayState } = useDisplayContext();

  return (
    <aside className="tools-panel" aria-label={t("tools.panel")}>
      <div className="tools-heading">
        <h2>{t("tools.title")}</h2>
      </div>
      <ToolSection
        locked={metadataLocked}
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "metadata")}
        pinned={isToolPinned(openTools, "metadata")}
        summary={metadataSummary(activeTab, pageState, metadataEditState, t)}
        t={t}
        title={t("tools.metadata")}
        tool="metadata"
      >
        <MetadataTool
          contentDirty={contentDirty}
          editState={metadataEditState}
          fileReady={fileReady}
          linksState={linksState}
          onCancelEdit={onCancelMetadataEdit}
          onChangeEdit={onChangeMetadataEdit}
          onOpenBacklink={onOpenBacklink}
          onOpenOutgoing={onOpenOutgoing}
          onReloadEdit={onReloadMetadataEdit}
          onRevertEdit={onRevertMetadataEdit}
          onSaveEdit={onSaveMetadataEdit}
          onStartEdit={onStartMetadataEdit}
          pageState={pageState}
          pages={pages}
          t={t}
          tab={activeTab}
        />
      </ToolSection>
      {!isToolDisabled(openTools, "audio") && (
        <ToolSection
          onTogglePin={onToolPin}
          onToggle={onToolToggle}
          open={isToolOpen(openTools, "audio")}
          pinned={isToolPinned(openTools, "audio")}
          summary={audioSummary(audioMixer, t)}
          t={t}
          title={t("tools.audio")}
          tool="audio"
        >
          <AudioTool />
        </ToolSection>
      )}
      {!isToolDisabled(openTools, "dice") && (
        <ToolSection
          onTogglePin={onToolPin}
          onToggle={onToolToggle}
          open={isToolOpen(openTools, "dice")}
          pinned={isToolPinned(openTools, "dice")}
          summary={diceSummary(diceHistory, diceStatus, t)}
          t={t}
          title={t("tools.dice")}
          tool="dice"
        >
          <DiceTool
            history={diceHistory}
            onClearHistory={onDiceClearHistory}
            onRoll={onDiceRoll}
            status={diceStatus}
            t={t}
          />
        </ToolSection>
      )}
      {!isToolDisabled(openTools, "hp") && (
        <ToolSection
          onTogglePin={onToolPin}
          onToggle={onToolToggle}
          open={isToolOpen(openTools, "hp")}
          pinned={isToolPinned(openTools, "hp")}
          summary={hpSummary(hpRows, hpStatus, t)}
          t={t}
          title={t("tools.hp")}
          tool="hp"
        >
          <HpTool
            onAdd={onHpAdd}
            onAdjust={onHpAdjust}
            onClear={onHpClear}
            onPersist={onHpPersist}
            onRemove={onHpRemove}
            onUpdate={onHpUpdate}
            rows={hpRows}
            status={hpStatus}
            t={t}
          />
        </ToolSection>
      )}
      {!isToolDisabled(openTools, "actions") && (
        <ToolSection
          onTogglePin={onToolPin}
          onToggle={onToolToggle}
          open={isToolOpen(openTools, "actions")}
          pinned={isToolPinned(openTools, "actions")}
          summary={actionsSummary(fastSlots, actionBindings, midiBindings, t)}
          t={t}
          title={t("tools.actions")}
          tool="actions"
        >
          <ActionsTool
            activeTab={activeTab}
            actionBindings={actionBindings}
            bindingMessage={actionBindingMessage}
            message={fastSlotError}
            midiBindingMessage={midiBindingMessage}
            midiBindings={midiBindings}
            midiInputs={midiInputs}
            midiLearnedControl={midiLearnedControl}
            midiLearning={midiLearning}
            midiStatus={midiStatus}
            onClearMidiLearned={onClearMidiLearned}
            onClearSlot={onClearFastSlot}
            onConnectMidi={onConnectMidi}
            onDeleteBinding={onActionBindingDelete}
            onDeleteMidiBinding={onDeleteMidiBinding}
            onDeleteSnapshot={onDeleteTableSnapshot}
            onLoadSnapshot={onLoadTableSnapshot}
            onPickPath={onPickPath}
            onRunMidiBinding={onMidiBindingRun}
            onRunBinding={onActionBindingRun}
            onSaveBinding={onActionBindingSave}
            onSaveMidiBinding={onMidiBindingSave}
            onSaveSnapshot={onSaveTableSnapshot}
            onSaveSlot={onSaveFastSlot}
            onSelectSnapshot={onSelectTableSnapshot}
            onStartMidiLearn={onStartMidiLearn}
            onSnapshotNameChange={onTableSnapshotNameChange}
            slots={fastSlots}
            snapshotName={tableSnapshotName}
            snapshotSelectedId={tableSnapshotSelectedId}
            snapshotStatus={tableSnapshotStatus}
            snapshots={tableSnapshots}
            t={t}
          />
        </ToolSection>
      )}
      {!isToolDisabled(openTools, "scripts") && (
        <ToolSection
          onTogglePin={onToolPin}
          onToggle={onToolToggle}
          open={isToolOpen(openTools, "scripts")}
          pinned={isToolPinned(openTools, "scripts")}
          summary={scriptsSummary(scriptState, scriptRunState, t)}
          t={t}
          title={t("tools.scripts")}
          tool="scripts"
        >
          <ScriptsTool
            onCancel={onCancelScript}
            onRun={onScriptRun}
            runState={scriptRunState}
            state={scriptState}
            t={t}
          />
        </ToolSection>
      )}
      {!isToolDisabled(openTools, "screen") && (
        <ToolSection
          onTogglePin={onToolPin}
          onToggle={onToolToggle}
          open={isToolOpen(openTools, "screen")}
          pinned={isToolPinned(openTools, "screen")}
          summary={screenSummary(displayState, mapState, t)}
          t={t}
          title={t("tools.screen")}
          tool="screen"
        >
          <ScreenTool
            activeTab={activeDocumentTab}
            onTabChange={onScreenToolTabChange}
            tab={screenToolTab}
          />
        </ToolSection>
      )}
    </aside>
  );
}
