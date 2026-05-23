import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject
} from "react";

import { CodeEditor } from "./CodeEditor";
import { MapCanvas, type MapCanvasTool } from "./MapCanvas";
import { UnlockScreen } from "./UnlockScreen";
import { WorldPathPicker } from "./WorldPathPicker";
import {
  addCardField,
  addCardSection,
  addCardTableColumn,
  addCardTableRow,
  builtInCardTemplates,
  computedCardFieldPreview,
  duplicateCardField,
  duplicateCardSection,
  duplicateCardTableRow,
  evaluateCardField,
  parseCard,
  removeCardField,
  removeCardSection,
  removeCardTableColumn,
  removeCardTableRow,
  serializeCard,
  defaultCardPath,
  normalizeCardTemplateCatalog,
  renderCardTemplate,
  reorderCardField,
  reorderCardSection,
  reorderCardTableRow,
  setCardSectionLayout,
  updateCardField,
  updateCardKind,
  updateCardSection,
  updateCardTableCell,
  updateCardTitle,
  type CardFieldType,
  type CardSectionLayout,
  type CardTemplate,
  type CardTemplateCatalog,
  type StructuredCard
} from "./lib/cards";
import {
  acknowledgeDmsTrust,
  activateWorkspace,
  buildMediaUrl,
  blankDisplay,
  cancelDmsRun,
  clearDisplayPopups,
  closeDisplayPopup,
  createCapture,
  createWorkspace,
  createWorld,
  createWorldFolder,
  createWorldFile,
  deleteTableSnapshot,
  deleteWorkspace,
  deleteTrash,
  duplicateWorldPath,
  fetchAppConfig,
  fetchAuthStatus,
  fetchAudioLibrary,
  fetchAudioPlaylists,
  fetchCardTemplates,
  fetchCaptureToday,
  fetchDisplayState,
  fetchDmsRun,
  fetchFastSlots,
  fetchHpTracker,
  fetchLanguageCatalog,
  fetchLlmConfig,
  fetchPage,
  fetchPageBacklinks,
  fetchPageLinks,
  fetchPages,
  fetchPrepHealth,
  fetchScripts,
  fetchTableSnapshots,
  fetchTrash,
  fetchWorkspace,
  fetchWorkspaces,
  fetchWorldFile,
  fetchWorldTree,
  fetchWorlds,
  generateLlm,
  importSystemPack,
  loginAuth,
  moveWorldPath,
  openWorld,
  openDisplayPopup,
  previewSystemPack,
  recordRecent,
  renameWorkspace,
  restoreTableSnapshot,
  restoreTrash,
  rollDice,
  runDmsScript,
  saveFavorites,
  saveFastSlots,
  saveAudioPlaylists,
  saveRecentFiles,
  saveHpTracker,
  saveTableSnapshot,
  saveWorldFile,
  saveWorkspaceLayout,
  saveWorkspaceTabs,
  searchWorld,
  setDisplayFullscreen,
  setDisplayPopupVisible,
  showActiveOnDisplay,
  submitDmsForm,
  trashWorldPath,
  updatePageMetadata,
  type PageDetail,
  type PageLink,
  type PageSummary,
  type PrepHealthIssue,
  type PrepHealthReport,
  type SearchResult,
  type SystemPackImportResponse,
  type SystemPackPreviewResponse,
  type TableSnapshotSummary,
  type TranslationCatalog,
  type DisplayState,
  type DisplayPopupPreset,
  type AudioBus,
  type AudioPlaylist,
  type AudioTrack,
  type AppConfig,
  type AuthStatus,
  type CaptureCategory,
  type CaptureTodayResponse,
  type DmsRunState,
  type DmsScriptSummary,
  type DiceRollResponse,
  type FastSlot,
  type FastSlotAction,
  type HpTrackerRow,
  type LlmConfigResponse,
  type NamedWorkspaceSummary,
  type TrashEntry,
  type WorldEntry,
  type WorldLibraryEntry,
  type WorldFile,
  type WorldLibraryState,
  type WorldMediaKind,
  type WorkspaceLayout,
  type WorkspacePaneId,
  type WorkspaceState,
  type WorkspaceTab
} from "./lib/api";
import {
  groupSystemPackPreviewRows,
  mapSystemPackImportResultSummary,
  validateSystemPackConflictDecisions,
  type SystemPackConflictDecision
} from "./lib/systemPacks";
import {
  AVAILABLE_LANGUAGES,
  createTranslator,
  isUiLanguage,
  loadStoredUiLanguage,
  resolveInitialLanguage,
  saveStoredUiLanguage,
  type Translator,
  type UiLanguage
} from "./lang";
import {
  filterPrepHealthIssues,
  prepHealthCompactStatusLabel,
  prepHealthIssueToOpenTab,
  prepHealthStatusLabel,
  sortPrepHealthIssues,
  type PrepHealthFilter
} from "./lib/prepHealth";
import {
  canonicalShortcutFromEvent,
  isEditableHotkeyTarget,
  loadActionBindings,
  saveActionBindings,
  shortcutValidationError,
  sortActionBindings,
  type ActionBinding,
  type ActionBindingAction
} from "./lib/actionBindings";
import {
  isTableSnapshotRestoreAction,
  resolveScreenActionPath,
  validateDispatchAction
} from "./lib/actionBindingDispatch";
import {
  formatMidiMessageLabel,
  isMidiSupported,
  loadMidiBindings,
  midiBindingValidationError,
  midiMessageKey,
  parseMidiMessage,
  saveMidiBindings,
  sortMidiBindings,
  type MidiBinding,
  type MidiMessage
} from "./lib/midiBindings";
import {
  AUDIO_BUSES,
  advanceAudioQueue,
  audioFadeProgress,
  audioQueueLabel,
  audioSummary,
  busLabel,
  addAudioPlaylistTrack,
  createAudioPlaylist,
  createPlaylistExpansionState,
  createAudioMixerState,
  deleteAudioPlaylist,
  displayAudioTrackTitle,
  finishAudioFade,
  groupAudioTracksByBus,
  hasLoadedAudio,
  loadAudioPlaylist,
  loadSavedAudioPlaylist,
  loadAudioTrack,
  moveAudioPlaylistTrack,
  playlistExpansionKey,
  removeAudioPlaylistTrack,
  renameAudioPlaylist,
  resolveAudioPlaylists,
  rewindAudioQueue,
  setAudioBusLoop,
  setAudioPlaylistLoop,
  setAudioBusPlaying,
  setAudioBusVolume,
  setSavedAudioPlaylistBus,
  setSavedAudioPlaylistLoop,
  startAudioFade,
  stopAllAudio,
  stopAudioBus,
  togglePlaylistExpansion,
  type AudioBusState,
  type AudioMixerState,
  type PlaylistExpansionState
} from "./lib/audio";
import {
  CAPTURE_CATEGORY_OPTIONS,
  clearCaptureDraft,
  isCaptureSubmitShortcut,
  loadCaptureDraft,
  saveCaptureDraft,
  type CaptureDraft
} from "./lib/capture";
import {
  addHpTrackerRow,
  adjustHpTrackerRow,
  clearHpTrackerRows,
  createHpTrackerRow,
  parseHpMaxValue,
  removeHpTrackerRow,
  summarizeHpTrackerRows,
  updateHpTrackerRow,
  validateHpTrackerRows
} from "./lib/hp";
import {
  addCsvColumn,
  addCsvRow,
  isRectangularCsv,
  parseCsv,
  removeCsvColumn,
  removeCsvRow,
  serializeCsv,
  updateCsvCell,
  updateCsvHeader,
  type CsvData
} from "./lib/csv";
import {
  createEditorDraft,
  editorShortcutIntent,
  isDraftDirty,
  normalizeEditorModeForTarget,
  markDraftConflict,
  markDraftChangedOnDisk,
  markDraftError,
  markDraftSaved,
  markDraftSaving,
  revertDraft,
  setDraftMode,
  supportsEditorMode,
  updateDraftContent,
  type EditorDraft,
  type EditorMode,
  type EditorShortcutIntent
} from "./lib/editor";
import { buildEditorCompletionItems } from "./lib/editorAutocomplete";
import {
  contextualManagedFilePath,
  defaultManagedFileName,
  managementErrorMessage,
  defaultManagedFilePath,
  defaultManagedFolderPath,
  affectedDescendantPaths,
  fileNameFromPath,
  hasDirtyDescendantPath,
  isDescendantPath,
  joinWorldPath,
  remapMovedWorldPath,
  remapMovedWorkspacePaths,
  removeDescendantWorkspacePaths,
  removeWorkspacePath,
  replaceWorkspacePath,
  revealWorldTreePaths,
  validateContextualFileName,
  validateManagedFolderPath,
  validateManagedFilePath,
  workspaceTabFromWorldFile,
  type ManagedFileType
} from "./lib/fileManagement";
import { linkToOpenTab } from "./lib/links";
import {
  createWorldEventClient,
  planWorldEventUpdate,
  type WorldEvent
} from "./lib/liveSync";
import {
  createDisplayEventClient,
  hasResidualPopupsAfterBlank,
  screenPrimaryMode,
  screenPrimaryTitle,
  visibleScreenPopupCount
} from "./lib/display";
import {
  addMapPin,
  addMapReveal,
  buildMapEventsUrl,
  buildMapMediaUrl,
  clearMapReveals,
  createPinPayload,
  createMapEventClient,
  deleteMapPreset,
  deleteMapReveal,
  deleteMapPin,
  fetchMapState,
  fetchMapPresets,
  isImageMapCandidate,
  loadMapPreset,
  normalizeMapPolygon,
  planViewportSync,
  presentMap,
  saveMapPreset,
  setMapFog,
  setMapGrid,
  setMapSource,
  setMapViewport,
  shouldAdoptMapState,
  stopMap,
  type MapGrid,
  type MapPinVisibility,
  type MapPoint,
  type MapPreset,
  type MapRevealPayload,
  type MapState,
  type MapViewport
} from "./lib/map";
import {
  buildFastSlotAction,
  clearFastSlot,
  dispatchableHotkeyPosition,
  fastSlotSummary,
  replaceFastSlot,
  sortFastSlots,
  visibleFastSlots
} from "./lib/fastSlots";
import { buildMetadataViewModel, treeEntryLabel } from "./lib/metadata";
import {
  addMetadataFieldRow,
  isMetadataFormDirty,
  metadataFormFromPage,
  metadataPayloadFromForm,
  removeMetadataFieldRow,
  updateMetadataFieldRow,
  validateMetadataForm,
  type MetadataFormState
} from "./lib/metadataEditor";
import {
  activateTab,
  closeTab,
  dirtyTabCloseMessage,
  openTab,
  shouldConfirmDirtyTabClose,
  type OpenTab,
  type TabState
} from "./lib/tabs";
import {
  chooseSecondaryPaneActiveTab,
  clampWorkspaceSplitRatio,
  defaultWorkspaceLayout,
  groupSearchResults,
  normalizeWorkspaceLayout,
  openFileInActivePane,
  recordRecentItem,
  retargetLayoutAfterTabClose,
  searchResultToTab,
  toggleFavorite
} from "./lib/workspace";
import { renderRichInline, renderRichMarkdown } from "./lib/richText";
import {
  COMMON_DICE_EXPRESSIONS,
  addDiceHistoryEntry,
  clearDiceHistory,
  formatDiceRollDetail,
  type DiceHistoryEntry
} from "./lib/dice";
import {
  buildDmsFormDefaults,
  dmsOutputToWorldFile,
  isScriptRunAvailable,
  isTemporaryDmsPath,
  normalizeDmsFormSchema,
  shouldPersistTab,
  type DmsFormField,
  type DmsFormValues
} from "./lib/scripts";
import {
  buildLlmContextPreview,
  buildLlmFormPrompt,
  parseUntrustedDraftCardJson,
  type LlmPromptContextSource,
  type LlmPromptFormId,
  type LlmPromptFormInput,
  type LlmPromptOutputKind
} from "./lib/llmForms";
import {
  loadToolsPanelWidth,
  saveToolsPanelWidth
} from "./lib/panelWidth";
import {
  applyAudioSnapshot,
  buildTableSnapshotState,
  deleteTableSnapshotFromList,
  saveTableSnapshotInList,
  sortTableSnapshots
} from "./lib/tableSnapshots";
import type { CodeEditorCompletion } from "./CodeEditor";
import {
  applyToolAutoOpenRules,
  canSendToScreen,
  createToolPanelState,
  DEFAULT_ACTIONS_TOOL_TAB,
  DEFAULT_SCREEN_TOOL_TAB,
  isToolPinned,
  isToolOpen,
  openToolSectionByUser,
  toggleToolSection,
  toggleToolSectionPin,
  type ActionsToolTabId,
  type ScreenToolTabId,
  type ToolId,
  type ToolPanelState
} from "./lib/toolPanel";
import { livePrepHealthLabel } from "./lib/liveStatus";
import { moveSearchResultSelection, selectedSearchResult } from "./lib/searchPalette";
import {
  flattenWorldPathPickerEntries,
  type WorldPathPickerFilter
} from "./lib/worldPathPicker";
import {
  helpContextForActionsTab,
  helpContextForMediaKind,
  resolveContextHelpTopic,
  type ContextHelpTopic
} from "./lib/contextHelp";

type LoadState = "idle" | "loading" | "ready" | "error";
type AuthGateState =
  | { status: "checking" }
  | { status: "unlocked"; auth: AuthStatus }
  | { status: "locked"; auth: AuthStatus; error: string | null }
  | { status: "unlocking"; auth: AuthStatus; error: string | null };
type FileLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; file: WorldFile }
  | { status: "removed"; message: string }
  | { status: "error"; message: string };
type PageLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; page: PageDetail }
  | { status: "error"; message: string };
type LinksLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; outgoing: PageLink[]; backlinks: PageLink[] }
  | { status: "error"; message: string };
type WorkspaceDialogState =
  | { kind: "closed" }
  | { kind: "create"; name: string; status: "idle" | "submitting"; error: string | null }
  | {
      kind: "rename";
      workspace: NamedWorkspaceSummary;
      name: string;
      status: "idle" | "submitting";
      error: string | null;
    };
type SearchLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; results: SearchResult[] }
  | { status: "error"; message: string };
type CaptureStatus =
  | { status: "idle"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };
type PrepHealthStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };
type HpToolStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };
type DiceStatus =
  | { status: "idle"; message: string | null }
  | { status: "rolling"; message: string | null }
  | { status: "ready"; message: string | null }
  | { status: "error"; message: string };

type AssistantProviderState = {
  status: "unknown" | "checking" | "ready" | "unavailable" | "error";
  provider: string | null;
  model: string | null;
  message: string | null;
};
type AssistantFieldValue = string | number | boolean;
type AssistantFieldType = "text" | "textarea" | "number" | "boolean" | "select";
type AssistantFormField = {
  name: string;
  label: string;
  input_type: AssistantFieldType;
  required: boolean;
  default: AssistantFieldValue | null;
  options: string[];
  placeholder: string | null;
};
type AssistantForm = {
  id: LlmPromptFormId;
  title: string;
  description: string | null;
  outputKind: LlmPromptOutputKind;
  fields: AssistantFormField[];
};
type AssistantFormValues = Record<string, AssistantFieldValue>;
type AssistantSaveKind = "markdown" | "card";
type AssistantResult = {
  title: string | null;
  content: string;
  provider: string | null;
  model: string | null;
};
type AssistantStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "generating"; message: string | null }
  | { status: "ready"; message: string | null }
  | { status: "copy"; message: string }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

function helpContextFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  return target.closest("[data-help-context]")?.getAttribute("data-help-context") ?? null;
}
type TableSnapshotStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "loaded"; message: string }
  | { status: "error"; message: string };
type MapActionStatus =
  | { status: "idle"; message: string | null }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };
type BindingActionKind =
  | Exclude<FastSlotAction["kind"], "scenario">
  | "table_snapshot_restore";
type MidiInputSummary = {
  id: string | null;
  name: string | null;
};
type MidiLearnedControl = {
  input_id: string | null;
  input_name: string | null;
  message: MidiMessage;
};
type MidiStatus =
  | { status: "unsupported"; message: string }
  | { status: "idle"; message: string | null }
  | { status: "connecting"; message: string | null }
  | { status: "connected"; message: string | null }
  | { status: "listening"; message: string | null }
  | { status: "error"; message: string };
type MidiInputLike = {
  id?: string;
  name?: string | null;
  onmidimessage: ((event: { data: ArrayLike<number> }) => void) | null;
};
type MidiAccessLike = {
  inputs: {
    values: () => Iterable<MidiInputLike>;
  };
};
type WorldPathPickerState =
  | { open: false }
  | {
      open: true;
      filter: WorldPathPickerFilter;
      title: string;
      onSelect: (path: string) => void;
    };
type AudioLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; tracks: AudioTrack[] }
  | { status: "error"; message: string };
type AudioPlaylistLoadState =
  | { status: "idle"; playlists: AudioPlaylist[]; message?: string | null }
  | { status: "loading"; playlists: AudioPlaylist[]; message?: string | null }
  | { status: "saving"; playlists: AudioPlaylist[]; message?: string | null }
  | { status: "ready"; playlists: AudioPlaylist[]; message?: string | null }
  | { status: "error"; playlists: AudioPlaylist[]; message: string };

const AUDIO_FADE_DURATION_MS = 2000;
type ScriptLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; scripts: DmsScriptSummary[] }
  | { status: "error"; message: string };
type ScriptRunState =
  | { status: "idle" }
  | { status: "running"; path: string; runId: string | null; run?: DmsRunState }
  | { status: "ready"; run: DmsRunState }
  | { status: "error"; message: string };
type LinkContextMenuState =
  | { open: false }
  | { open: true; link: PageLink; x: number; y: number };
type PeekState =
  | { open: false }
  | {
      open: true;
      tab: OpenTab;
      fileState: FileLoadState;
      linksState: LinksLoadState;
    };
type DmsFormDialogState =
  | { open: false }
  | {
      open: true;
      run: DmsRunState;
      fields: DmsFormField[];
      values: DmsFormValues;
    };
type DmsTrustDialogState =
  | { open: false }
  | {
      open: true;
      path: string;
    };
type DmsOutputSaveDialogState =
  | { open: false }
  | {
      open: true;
      file: WorldFile;
      path: string;
      status: "idle" | "submitting";
      error: string | null;
    };
type FileDialogState =
  | { kind: "closed" }
  | {
      kind: "create";
      fileType: ManagedFileType;
      folderPath: string;
      contextual: boolean;
      name: string;
      path: string;
      cardTemplateId: string;
      cardTitle: string;
      cardTemplateCatalog: CardTemplateCatalog;
      cardTemplateStatus: "idle" | "loading" | "ready" | "error";
      cardTemplateError: string | null;
      status: "idle" | "submitting";
      error: string | null;
    }
  | {
      kind: "create-folder";
      path: string;
      status: "idle" | "submitting";
      error: string | null;
    }
  | {
      kind: "rename";
      path: string;
      newPath: string;
      entryKind: "file" | "directory";
      status: "idle" | "submitting";
      error: string | null;
    }
  | {
      kind: "trash";
      path: string;
      entryKind: "file" | "directory";
      status: "idle" | "submitting";
      error: string | null;
    };
type FolderCreateKind = "card" | "csv" | "folder" | "markdown" | "script";
type WorldTreeContextMenuState =
  | { open: false }
  | { open: true; entry: WorldEntry; x: number; y: number };
type TrashDialogState =
  | { open: false }
  | {
      open: true;
      status: "loading" | "ready" | "submitting" | "error";
      entries: TrashEntry[];
      restorePaths: Record<string, string>;
      confirmDeletePath: string | null;
      error: string | null;
    };
type SystemPackImportStatus = "idle" | "previewing" | "ready" | "importing" | "done" | "error";
type SystemPackImportState = {
  file: File | null;
  preview: SystemPackPreviewResponse | null;
  decisions: SystemPackConflictDecision[];
  summary: SystemPackImportResponse | null;
  status: SystemPackImportStatus;
  error: string | null;
};
type WorldCreateDialogState =
  | { open: false }
  | {
      open: true;
      name: string;
      status: "idle" | "submitting";
      error: string | null;
    };
type MetadataEditState =
  | { mode: "view" }
  | {
      mode: "edit";
      form: MetadataFormState;
      status: "idle" | "saving" | "conflict" | "error";
      message: string | null;
      expectedModifiedAt: string;
      expectedHash: string;
    };

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

const DEFAULT_ASSISTANT_FORMS: AssistantForm[] = [
  {
    id: "summarize",
    title: "Summarize current/selected material",
    description: "Condense explicit notes or selected text for table use.",
    outputKind: "markdown",
    fields: [
      {
        name: "focus",
        label: "Focus",
        input_type: "textarea",
        required: false,
        default: "",
        options: [],
        placeholder: "What should the summary emphasize?"
      },
      {
        name: "audience",
        label: "Audience",
        input_type: "text",
        required: false,
        default: "",
        options: [],
        placeholder: "DM, players, table recap"
      },
      {
        name: "tone",
        label: "Tone",
        input_type: "select",
        required: false,
        default: "Concise",
        options: ["Concise", "Atmospheric", "Rules-focused"],
        placeholder: null
      }
    ]
  },
  {
    id: "rumors",
    title: "Rumors",
    description: "Create table-ready rumors from supplied truths.",
    outputKind: "markdown",
    fields: [
      {
        name: "subject",
        label: "Subject",
        input_type: "text",
        required: true,
        default: "",
        options: [],
        placeholder: "Faction, place, NPC, mystery"
      },
      {
        name: "truth",
        label: "Known truth",
        input_type: "textarea",
        required: false,
        default: "",
        options: [],
        placeholder: "Facts the rumors may distort"
      },
      {
        name: "count",
        label: "Count",
        input_type: "number",
        required: false,
        default: 6,
        options: [],
        placeholder: null
      }
    ]
  },
  {
    id: "handout-rewrite",
    title: "Handout Rewrite",
    description: "Rewrite supplied text for players.",
    outputKind: "markdown",
    fields: [
      {
        name: "sourceText",
        label: "Source text",
        input_type: "textarea",
        required: false,
        default: "",
        options: [],
        placeholder: "Paste player-facing source text or add context below"
      },
      {
        name: "audience",
        label: "Audience",
        input_type: "text",
        required: false,
        default: "Players",
        options: [],
        placeholder: null
      },
      {
        name: "tone",
        label: "Tone",
        input_type: "text",
        required: false,
        default: "",
        options: [],
        placeholder: "cryptic, formal, urgent"
      }
    ]
  },
  {
    id: "consequences",
    title: "Consequences",
    description: "Explore fallout from an explicit event.",
    outputKind: "markdown",
    fields: [
      {
        name: "event",
        label: "Event",
        input_type: "textarea",
        required: true,
        default: "",
        options: [],
        placeholder: "What happened?"
      },
      {
        name: "actors",
        label: "Actors",
        input_type: "text",
        required: false,
        default: "",
        options: [],
        placeholder: "Who cares?"
      },
      {
        name: "timeframe",
        label: "Timeframe",
        input_type: "text",
        required: false,
        default: "",
        options: [],
        placeholder: "now, next session, downtime"
      }
    ]
  },
  {
    id: "draft-card",
    title: "Draft card from form inputs",
    description: "Draft untrusted NPC, location, item, or card JSON.",
    outputKind: "card-json",
    fields: [
      {
        name: "cardKind",
        label: "Card kind",
        input_type: "select",
        required: true,
        default: "npc",
        options: ["npc", "location", "item", "card"],
        placeholder: null
      },
      {
        name: "title",
        label: "Name",
        input_type: "text",
        required: true,
        default: "",
        options: [],
        placeholder: "Assistant Draft Contact"
      },
      {
        name: "details",
        label: "Details",
        input_type: "textarea",
        required: false,
        default: "",
        options: [],
        placeholder: "Traits, hooks, secrets, stats, or constraints"
      },
      {
        name: "tags",
        label: "Tags",
        input_type: "text",
        required: false,
        default: "",
        options: [],
        placeholder: "comma-separated"
      }
    ]
  },
  {
    id: "recap",
    title: "Recap",
    description: "Turn explicit session notes into a recap.",
    outputKind: "markdown",
    fields: [
      {
        name: "sessionTitle",
        label: "Session title",
        input_type: "text",
        required: false,
        default: "",
        options: [],
        placeholder: null
      },
      {
        name: "events",
        label: "Events",
        input_type: "textarea",
        required: false,
        default: "",
        options: [],
        placeholder: "Important table events"
      },
      {
        name: "openThreads",
        label: "Open threads",
        input_type: "textarea",
        required: false,
        default: "",
        options: [],
        placeholder: "Unresolved hooks and questions"
      }
    ]
  }
];

const DEFAULT_ASSISTANT_FORM_ID = DEFAULT_ASSISTANT_FORMS[0]?.id ?? "summarize";

function normalizeAssistantProvider(config: LlmConfigResponse): AssistantProviderState {
  const ready = config.enabled && config.configured;
  return {
    status: ready ? "ready" : "unavailable",
    provider: config.provider,
    model: config.model,
    message: ready ? null : config.reason ?? "LLM assistant is not configured."
  };
}

function assistantFormDefaults(fields: AssistantFormField[]): AssistantFormValues {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.default !== null) {
        return [field.name, field.default];
      }
      if (field.input_type === "number") {
        return [field.name, 0];
      }
      if (field.input_type === "boolean") {
        return [field.name, false];
      }
      if (field.input_type === "select") {
        return [field.name, field.options[0] ?? ""];
      }
      return [field.name, ""];
    })
  );
}

function fetchAssistantProvider(): Promise<AssistantProviderState> {
  return fetchLlmConfig().then(normalizeAssistantProvider);
}

function assistantContextSources(
  context: string,
  contextPath: string | null
): LlmPromptContextSource[] {
  const text = context.trim();
  return text ? [{ label: contextPath ?? "Explicit context", text }] : [];
}

function assistantValueText(values: AssistantFormValues, name: string): string {
  const value = values[name];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : "";
}

function assistantValueNumber(values: AssistantFormValues, name: string): number | undefined {
  const value = values[name];
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function assistantDraftCardKind(value: string): "npc" | "location" | "item" | "card" {
  return value === "location" || value === "item" || value === "card" ? value : "npc";
}

function assistantPromptInput(
  form: AssistantForm,
  values: AssistantFormValues,
  context: LlmPromptContextSource[]
): LlmPromptFormInput {
  const base = { context };
  switch (form.id) {
    case "summarize":
      return {
        ...base,
        formId: "summarize",
        sourceTitle: context[0]?.label,
        audience: assistantValueText(values, "audience"),
        focus: assistantValueText(values, "focus"),
        tone: assistantValueText(values, "tone")
      };
    case "rumors":
      return {
        ...base,
        formId: "rumors",
        subject: assistantValueText(values, "subject"),
        truth: assistantValueText(values, "truth"),
        count: assistantValueNumber(values, "count"),
        tone: assistantValueText(values, "tone")
      };
    case "handout-rewrite":
      return {
        ...base,
        formId: "handout-rewrite",
        sourceTitle: context[0]?.label,
        sourceText: assistantValueText(values, "sourceText"),
        audience: assistantValueText(values, "audience"),
        tone: assistantValueText(values, "tone")
      };
    case "consequences":
      return {
        ...base,
        formId: "consequences",
        event: assistantValueText(values, "event"),
        actors: assistantValueText(values, "actors"),
        timeframe: assistantValueText(values, "timeframe"),
        stakes: assistantValueText(values, "stakes"),
        tone: assistantValueText(values, "tone")
      };
    case "draft-card":
      return {
        ...base,
        formId: "draft-card",
        cardKind: assistantDraftCardKind(assistantValueText(values, "cardKind")),
        title: assistantValueText(values, "title"),
        details: assistantValueText(values, "details"),
        tags: assistantValueText(values, "tags"),
        tone: assistantValueText(values, "tone")
      };
    case "recap":
      return {
        ...base,
        formId: "recap",
        sessionTitle: assistantValueText(values, "sessionTitle"),
        events: assistantValueText(values, "events"),
        openThreads: assistantValueText(values, "openThreads"),
        tone: assistantValueText(values, "tone")
      };
  }
}

function assistantTitleFromGeneratedText(form: AssistantForm, content: string): string | null {
  if (form.outputKind === "card-json") {
    const parsed = parseUntrustedDraftCardJson(content);
    return parsed.ok ? parsed.card.title : null;
  }
  const heading = content.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || null;
}

function generateAssistantResult(payload: {
  form: AssistantForm;
  fields: AssistantFormValues;
  context: string;
  contextPath: string | null;
}): Promise<AssistantResult> {
  const context = assistantContextSources(payload.context, payload.contextPath);
  const builtPrompt = buildLlmFormPrompt(
    assistantPromptInput(payload.form, payload.fields, context)
  );
  return generateLlm({
    form_id: builtPrompt.formId,
    prompt: builtPrompt.prompt,
    context_preview: builtPrompt.contextPreview.text
  }).then((response) => ({
    title: assistantTitleFromGeneratedText(payload.form, response.text),
    content: response.text,
    provider: response.provider ?? null,
    model: response.model ?? null
  }));
}

function assistantResultTitle(form: AssistantForm, result: AssistantResult | null): string {
  return result?.title?.trim() || form.title || "Assistant Result";
}

function assistantFileName(title: string, extension: string): string {
  const cleaned =
    title
      .replace(/[\\/:*?"<>|#]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Assistant Result";
  return `${cleaned}.${extension}`;
}

function defaultAssistantSavePath(
  form: AssistantForm,
  result: AssistantResult | null,
  kind: AssistantSaveKind
): string {
  const title = assistantResultTitle(form, result);
  return kind === "card"
    ? `Cards/${assistantFileName(title, "cs")}`
    : `Notes/${assistantFileName(title, "md")}`;
}

function defaultAssistantSaveKind(form: AssistantForm): AssistantSaveKind {
  return form.outputKind === "card-json" ? "card" : "markdown";
}

function assistantNoteContent(form: AssistantForm, result: AssistantResult): string {
  const title = assistantResultTitle(form, result);
  return `# ${title}\n\n${result.content.trim()}\n`;
}

function assistantCardContent(
  form: AssistantForm,
  values: AssistantFormValues,
  result: AssistantResult,
  contextSource: string | null
): string {
  const promptFields = form.fields
    .filter((field) => field.input_type !== "boolean" || values[field.name] === true)
    .map((field) => `${field.label}: ${String(values[field.name] ?? "")}`)
    .filter((line) => line.trim().length > 0);
  return serializeCard({
    title: assistantResultTitle(form, result),
    kind: "reference",
    tags: ["assistant"],
    sections: [
      {
        title: "Assistant",
        fields: [
          { label: "Form", value: form.title },
          ...(contextSource ? [{ label: "Context source", value: contextSource }] : []),
          { label: "Prompt", type: "long_text", value: promptFields.join("\n") },
          { label: "Result", type: "long_text", value: result.content.trim() }
        ]
      }
    ]
  });
}

function assistantSavedCardContent(
  form: AssistantForm,
  values: AssistantFormValues,
  result: AssistantResult,
  contextSource: string | null
): string {
  if (form.outputKind === "card-json") {
    const parsed = parseUntrustedDraftCardJson(result.content);
    if (!parsed.ok) {
      throw new Error(parsed.message);
    }
    return parsed.serialized;
  }
  return assistantCardContent(form, values, result, contextSource);
}

function systemPackErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "System pack import failed.";
}

function isCardPath(path: string, extension?: string | null): boolean {
  return extension?.toLowerCase() === "cs" || path.toLowerCase().endsWith(".cs");
}

function parseCardTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const CARD_FIELD_TYPE_OPTIONS: Array<{ value: CardFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select" },
  { value: "world_link", label: "World link" },
  { value: "computed", label: "Computed" }
];

const CARD_SECTION_LAYOUT_OPTIONS: Array<{ value: CardSectionLayout; label: string }> = [
  { value: "fields", label: "List" },
  { value: "grid", label: "Grid" },
  { value: "table", label: "Table" }
];

function cardFieldDisplayValue(field: { type?: CardFieldType; value: string }): string {
  if (field.type === "computed") {
    return "";
  }
  if (field.type === "boolean") {
    return field.value === "true" ? "Yes" : "No";
  }
  if (field.type === "world_link") {
    const value = field.value.trim();
    if (!value) {
      return "";
    }
    return value.startsWith("[[") || value.includes("](") ? value : `[[${value}]]`;
  }
  return field.value;
}

function cardSectionLayoutValue(layout: CardSectionLayout | undefined): CardSectionLayout {
  return layout ?? "fields";
}

function updateCardTableColumnName(
  card: StructuredCard,
  sectionIndex: number,
  columnIndex: number,
  nextName: string
): StructuredCard {
  const section = card.sections[sectionIndex];
  const columns = section?.columns ?? [];
  const previousName = columns[columnIndex];
  if (!section || previousName === undefined) {
    return card;
  }
  const nextColumns = columns.map((column, index) => (index === columnIndex ? nextName : column));
  return updateCardSection(card, sectionIndex, {
    columns: nextColumns,
    rows: (section.rows ?? []).map((row) => {
      const nextRow = { ...row };
      nextRow[nextName] = row[previousName] ?? "";
      if (nextName !== previousName) {
        delete nextRow[previousName];
      }
      return nextRow;
    })
  });
}

const DEFAULT_CARD_TITLE = "New Card";
const DEFAULT_CARD_TEMPLATE_ID = "custom";
const DEFAULT_CARD_TEMPLATE_CATALOG: CardTemplateCatalog = {
  templates: builtInCardTemplates,
  warnings: []
};

function cardTitleFromPath(path: string): string {
  const name = path.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
  return name.replace(/\.cs$/i, "").trim() || DEFAULT_CARD_TITLE;
}

function createFileDialogState(
  fileType: ManagedFileType,
  folderPath: string,
  contextual = false
): Extract<FileDialogState, { kind: "create" }> {
  const cardTitle = DEFAULT_CARD_TITLE;
  const name = defaultManagedFileName(fileType);
  return {
    kind: "create",
    fileType,
    folderPath,
    contextual,
    name,
    path:
      fileType === "card"
        ? defaultCardPath(folderPath, cardTitle)
        : contextual
          ? contextualManagedFilePath(folderPath, name, fileType)
          : defaultManagedFilePath(folderPath, fileType),
    cardTemplateId: DEFAULT_CARD_TEMPLATE_ID,
    cardTitle,
    cardTemplateCatalog: DEFAULT_CARD_TEMPLATE_CATALOG,
    cardTemplateStatus: fileType === "card" ? "loading" : "idle",
    cardTemplateError: null,
    status: "idle",
    error: null
  };
}

function cardTemplateLabel(template: CardTemplate): string {
  return `${template.name} (${template.kind}${template.source === "world" ? ", world" : ""})`;
}

function selectedCardTemplate(
  state: Extract<FileDialogState, { kind: "create" }>
): CardTemplate {
  return (
    state.cardTemplateCatalog.templates.find(
      (template) => template.id === state.cardTemplateId
    ) ??
    state.cardTemplateCatalog.templates.find(
      (template) => template.id === DEFAULT_CARD_TEMPLATE_ID
    ) ??
    builtInCardTemplates[0]
  );
}

function parseCardJson(
  content: string
): { ok: true; card: StructuredCard } | { ok: false; message: string } {
  try {
    return { ok: true, card: parseCard(content) };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Card content is not valid JSON."
    };
  }
}

const TEXT_EXTENSIONS: Record<string, WorldMediaKind> = {
  cs: "card",
  csv: "csv",
  dms: "script",
  markdown: "markdown",
  md: "markdown",
  txt: "text"
};

const IMAGE_EXTENSIONS = new Set(["gif", "jpeg", "jpg", "png", "svg"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const VIDEO_EXTENSIONS = new Set(["mp4"]);

function normalizeDialogPath(path: string): string {
  return path.trim().replace(/\\/g, "/");
}

function collectDirectoryPaths(entry: WorldEntry): string[] {
  if (entry.kind !== "directory") {
    return [];
  }

  return [entry.path, ...entry.children.flatMap(collectDirectoryPaths)];
}

function buildEditorCompletions(
  pages: PageSummary[],
  tree: WorldEntry | null,
  audioTracks: AudioTrack[]
): CodeEditorCompletion[] {
  return buildEditorCompletionItems({ pages, tree, audioTracks });
}

function mediaKindForEntry(entry: WorldEntry): OpenTab["mediaKind"] {
  const extension = (entry.extension ?? "").toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (PDF_EXTENSIONS.has(extension)) {
    return "pdf";
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  return TEXT_EXTENSIONS[extension] ?? "unsupported";
}

function mediaKindForPath(path: string): OpenTab["mediaKind"] {
  const extension = path.split(".").at(-1)?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (PDF_EXTENSIONS.has(extension)) {
    return "pdf";
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }
  return TEXT_EXTENSIONS[extension] ?? "unsupported";
}

function workspaceTabFromPath(path: string, pages: PageSummary[]): WorkspaceTab {
  const page = pages.find((pageItem) => pageItem.path === path);
  const name = path.split("/").at(-1) || path;
  return {
    path,
    name,
    title: page?.title ?? null,
    mediaKind: mediaKindForPath(path)
  };
}

function workspaceTabToOpenTab(tab: WorkspaceTab): OpenTab {
  return {
    path: tab.path,
    name: tab.name,
    title: tab.title,
    mediaKind: tab.mediaKind
  };
}

function openTabToWorkspaceTab(tab: OpenTab): WorkspaceTab {
  return {
    path: tab.path,
    name: tab.name,
    title: tab.title ?? null,
    mediaKind: tab.mediaKind
  };
}

function managedTypeForFile(file: WorldFile): ManagedFileType | null {
  if (
    file.media_kind === "markdown" ||
    file.media_kind === "csv" ||
    file.media_kind === "script" ||
    file.media_kind === "card"
  ) {
    return file.media_kind;
  }
  return null;
}

function isEditableFile(file: WorldFile): boolean {
  if (isTemporaryDmsPath(file.path)) {
    return false;
  }
  return managedTypeForFile(file) !== null || isCardPath(file.path, file.extension);
}

function canSaveEditorDraft(file: WorldFile, draft: EditorDraft): boolean {
  if (!isDraftDirty(draft) || draft.status === "saving" || draft.externalChanged) {
    return false;
  }
  if (file.media_kind === "csv" && !isRectangularCsv(parseCsv(draft.content))) {
    return false;
  }
  if (isCardPath(file.path, file.extension) && !parseCardJson(draft.content).ok) {
    return false;
  }
  return true;
}

function tabFromFileWithPages(file: WorldFile, pages: PageSummary[]): WorkspaceTab {
  const tab = workspaceTabFromWorldFile(file);
  const page = pages.find((pageItem) => pageItem.path === file.path);
  const detail = page as Partial<PageDetail> | undefined;
  const explicitTitle =
    detail?.metadata && Object.keys(detail.metadata).length > 0 ? page?.title ?? null : null;
  return {
    ...tab,
    title:
      file.media_kind === "markdown" || file.media_kind === "card"
        ? page?.title ?? tab.title
        : explicitTitle ?? tab.title
  };
}

function splitMarkdownFrontmatter(content: string): { frontmatter: string; body: string } {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: "", body: content };
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { frontmatter: "", body: content };
  }

  const bodyStart = endIndex + 5;
  return {
    frontmatter: normalized.slice(0, bodyStart),
    body: normalized.slice(bodyStart)
  };
}

function replaceMarkdownBody(content: string, body: string): string {
  const parts = splitMarkdownFrontmatter(content);
  return `${parts.frontmatter}${body}`;
}

function canHavePageLinks(tab: OpenTab): boolean {
  return (
    tab.mediaKind === "markdown" ||
    tab.mediaKind === "card" ||
    tab.mediaKind === "csv" ||
    tab.mediaKind === "text"
  );
}

function hasPageSavePreconditions(page: PageDetail): boolean {
  return page.modified_at.trim() !== "" && page.hash.trim() !== "";
}

function worldEntryContainsFilter(entry: WorldEntry, filter: string): boolean {
  const matches =
    entry.name.toLowerCase().includes(filter) ||
    entry.path.toLowerCase().includes(filter) ||
    (entry.title ?? "").toLowerCase().includes(filter);
  if (entry.kind === "file") {
    return matches;
  }
  return matches || entry.children.some((child) => worldEntryContainsFilter(child, filter));
}

function RichHtml({
  className,
  helpContext,
  html,
  links,
  onDiceRoll,
  onContextLink,
  onOpenLink,
  onPeekLink,
  tabIndex
}: {
  className?: string;
  helpContext?: string;
  html: string;
  links: PageLink[];
  onDiceRoll?: (expression: string) => void;
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
  tabIndex?: number;
}) {
  function linkFromEvent(event: MouseEvent<HTMLElement>): PageLink | null {
    const target = event.target instanceof Element ? event.target : null;
    const linkElement = target?.closest("[data-world-link-index]");
    if (!linkElement) {
      return null;
    }
    const index = Number(linkElement.getAttribute("data-world-link-index"));
    return links[index] ?? null;
  }

  function diceExpressionFromEvent(event: MouseEvent<HTMLElement>): string | null {
    const target = event.target instanceof Element ? event.target : null;
    const linkElement = target?.closest("[data-dice-expression]");
    return linkElement?.getAttribute("data-dice-expression") ?? null;
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    const diceExpression = diceExpressionFromEvent(event);
    if (diceExpression && onDiceRoll) {
      event.preventDefault();
      onDiceRoll(diceExpression);
      return;
    }
    const link = linkFromEvent(event);
    if (link) {
      event.preventDefault();
      if ((event.altKey || event.shiftKey) && onPeekLink) {
        onPeekLink(link);
        return;
      }
      onOpenLink(link);
    }
  }

  function handleAuxClick(event: MouseEvent<HTMLElement>) {
    if (event.button !== 1) {
      return;
    }
    const link = linkFromEvent(event);
    if (link && onPeekLink) {
      event.preventDefault();
      onPeekLink(link);
    }
  }

  function handleContextMenu(event: MouseEvent<HTMLElement>) {
    const link = linkFromEvent(event);
    if (link && onContextLink) {
      event.preventDefault();
      onContextLink(link, event);
    }
  }

  return (
    <div
      className={className}
      data-help-context={helpContext}
      dangerouslySetInnerHTML={{ __html: html }}
      onAuxClick={handleAuxClick}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      tabIndex={tabIndex}
    />
  );
}

function MarkdownViewer({
  file,
  content,
  links,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink
}: {
  file: WorldFile;
  content?: string;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  return (
    <RichHtml
      className="markdown-viewer"
      helpContext="document-markdown"
      html={renderRichMarkdown(content ?? file.content, links, file.path)}
      links={links}
      onContextLink={onContextLink}
      onDiceRoll={onDiceRoll}
      onOpenLink={onOpenLink}
      onPeekLink={onPeekLink}
      tabIndex={0}
    />
  );
}

function CsvViewer({
  file,
  content,
  links,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink
}: {
  file: WorldFile;
  content?: string;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  const data = parseCsv(content ?? file.content);

  if (data.headers.length === 0) {
    return <div className="empty-surface">CSV file is empty.</div>;
  }

  return (
    <div className="table-wrap" data-help-context="document-csv" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {data.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {data.headers.map((header, cellIndex) => (
                <td key={`${header}-${cellIndex}`}>
                  <RichHtml
                    className="rich-inline"
                    html={renderRichInline(row[cellIndex] ?? "", links, file.path)}
                    links={links}
                    onContextLink={onContextLink}
                    onDiceRoll={onDiceRoll}
                    onOpenLink={onOpenLink}
                    onPeekLink={onPeekLink}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CsvEditor({
  data,
  onChange
}: {
  data: CsvData;
  onChange: (data: CsvData) => void;
}) {
  return (
    <div className="csv-editor" data-help-context="document-csv">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {data.headers.map((header, columnIndex) => (
                <th key={`header-${columnIndex}`}>
                  <input
                    aria-label={`Header ${columnIndex + 1}`}
                    onChange={(event) =>
                      onChange(updateCsvHeader(data, columnIndex, event.target.value))
                    }
                    value={header}
                  />
                  <button
                    aria-label={`Remove column ${columnIndex + 1}`}
                    className="table-compact-control"
                    disabled={data.headers.length <= 1}
                    onClick={() => onChange(removeCsvColumn(data, columnIndex))}
                    type="button"
                  >
                    x
                  </button>
                </th>
              ))}
              <th aria-label="Column controls" className="table-control-cell">
                <button
                  aria-label="Add Column"
                  className="table-compact-control"
                  onClick={() => onChange(addCsvColumn(data))}
                  type="button"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {data.headers.map((header, columnIndex) => (
                  <td key={`${header}-${rowIndex}-${columnIndex}`}>
                    <input
                      aria-label={`Cell ${rowIndex + 1}-${columnIndex + 1}`}
                      onChange={(event) =>
                        onChange(updateCsvCell(data, rowIndex, columnIndex, event.target.value))
                      }
                      value={row[columnIndex] ?? ""}
                    />
                  </td>
                ))}
                <td>
                  <button
                    aria-label={`Remove row ${rowIndex + 1}`}
                    className="table-compact-control"
                    onClick={() => onChange(removeCsvRow(data, rowIndex))}
                    type="button"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="table-footer-control" colSpan={data.headers.length + 1}>
                <button
                  aria-label="Add Row"
                  className="table-compact-control"
                  onClick={() => onChange(addCsvRow(data))}
                  type="button"
                >
                  +
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!isRectangularCsv(data) && <p className="editor-message">CSV rows must be rectangular.</p>}
    </div>
  );
}

function CardViewer({
  card,
  file,
  links,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink
}: {
  card: StructuredCard;
  file: WorldFile;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  const title = card.title.trim() || file.name.replace(/\.cs$/i, "");
  const kind = card.kind.trim() || "card";

  function sectionSummary(section: StructuredCard["sections"][number]): string {
    if (section.layout === "table") {
      const count = section.rows?.length ?? 0;
      return count === 1 ? "1 row" : `${count} rows`;
    }
    const count = section.fields.length;
    return count === 1 ? "1 field" : `${count} fields`;
  }

  function renderFieldList(section: StructuredCard["sections"][number]) {
    if (section.fields.length === 0) {
      return <p className="card-empty">No fields.</p>;
    }
    return (
      <dl className={`card-field-list${section.layout === "grid" ? " card-field-grid" : ""}`}>
        {section.fields.map((field, fieldIndex) => (
          <div className="card-field-row" key={`${field.label}-${fieldIndex}`}>
            <dt>{field.label.trim() || "Untitled field"}</dt>
            <dd>
              {field.type === "computed" ? (
                (() => {
                  const result = evaluateCardField(card, field);
                  return result?.ok ? (
                    <span className="card-field-value card-computed-value">{result.display}</span>
                  ) : (
                    <span className="card-formula-error" role="note">
                      {result?.message ?? "Formula error."}
                    </span>
                  );
                })()
              ) : (
                <RichHtml
                  className="rich-inline card-field-value"
                  html={renderRichInline(cardFieldDisplayValue(field), links, file.path)}
                  links={links}
                  onContextLink={onContextLink}
                  onDiceRoll={onDiceRoll}
                  onOpenLink={onOpenLink}
                  onPeekLink={onPeekLink}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderTable(section: StructuredCard["sections"][number]) {
    const columns = section.columns ?? [];
    const rows = section.rows ?? [];
    if (columns.length === 0 || rows.length === 0) {
      return <p className="card-empty">No rows.</p>;
    }
    return (
      <div className="card-table-wrap">
        <table className="card-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={column}>
                    <RichHtml
                      className="rich-inline card-field-value"
                      html={renderRichInline(row[column] ?? "", links, file.path)}
                      links={links}
                      onContextLink={onContextLink}
                      onDiceRoll={onDiceRoll}
                      onOpenLink={onOpenLink}
                      onPeekLink={onPeekLink}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <article className="card-surface card-viewer" data-help-context="document-card" tabIndex={0}>
      <header className="card-header">
        <div>
          <h1>{title}</h1>
          <span className="card-kind">{kind}</span>
        </div>
        {card.tags.length > 0 && (
          <ul className="card-tags" aria-label="Card tags">
            {card.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </header>

      {card.sections.length === 0 ? (
        <p className="card-empty">No sections.</p>
      ) : (
        card.sections.map((section, sectionIndex) => (
          <details className="card-section" key={`${section.title}-${sectionIndex}`} open>
            <summary>
              <span>{section.title.trim() || "Untitled section"}</span>
              <span className="card-section-count">{sectionSummary(section)}</span>
            </summary>
            {section.layout === "table" ? renderTable(section) : renderFieldList(section)}
          </details>
        ))
      )}
    </article>
  );
}

function CardEditor({
  card,
  onChange,
  onPickWorldPath
}: {
  card: StructuredCard;
  onChange: (card: StructuredCard) => void;
  onPickWorldPath?: (onSelect: (path: string) => void) => void;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  function toggleSectionCollapsed(sectionIndex: number) {
    setCollapsedSections((state) => {
      const next = new Set(state);
      if (next.has(sectionIndex)) {
        next.delete(sectionIndex);
      } else {
        next.add(sectionIndex);
      }
      return next;
    });
  }

  function renderFieldValueControl(
    sectionIndex: number,
    fieldIndex: number,
    field: StructuredCard["sections"][number]["fields"][number]
  ) {
    const ariaLabel = `Field value ${sectionIndex + 1}-${fieldIndex + 1}`;
    if (field.type === "computed") {
      return (
        <input
          aria-label={`Field formula ${sectionIndex + 1}-${fieldIndex + 1}`}
          onChange={(event) =>
            onChange(
              updateCardField(card, sectionIndex, fieldIndex, { formula: event.target.value })
            )
          }
          placeholder="ability_mod(WIS)"
          value={field.formula ?? ""}
        />
      );
    }
    if (field.type === "long_text") {
      return (
        <textarea
          aria-label={ariaLabel}
          onChange={(event) =>
            onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
          }
          value={field.value}
        />
      );
    }
    if (field.type === "boolean") {
      return (
        <select
          aria-label={ariaLabel}
          onChange={(event) =>
            onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
          }
          value={field.value === "true" ? "true" : "false"}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    if (field.type === "number") {
      return (
        <input
          aria-label={ariaLabel}
          onChange={(event) =>
            onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
          }
          type="number"
          value={field.value}
        />
      );
    }
    if (field.type === "world_link") {
      return (
        <div className="inline-input-action">
          <input
            aria-label={ariaLabel}
            onChange={(event) =>
              onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
            }
            value={field.value}
          />
          <button
            aria-label={`Choose field value ${sectionIndex + 1}-${fieldIndex + 1} path`}
            disabled={!onPickWorldPath}
            onClick={() =>
              onPickWorldPath?.((path) =>
                onChange(
                  updateCardField(card, sectionIndex, fieldIndex, {
                    value: `[[${path.replace(/\.md$/i, "").replace(/\.markdown$/i, "")}]]`
                  })
                )
              )
            }
            type="button"
          >
            Pick
          </button>
        </div>
      );
    }
    return (
      <input
        aria-label={ariaLabel}
        onChange={(event) =>
          onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
        }
        value={field.value}
      />
    );
  }

  function renderFields(section: StructuredCard["sections"][number], sectionIndex: number) {
    return (
      <>
        <div className="card-editor-fields">
          {section.fields.map((field, fieldIndex) => (
            <div className="card-editor-field" key={`field-${sectionIndex}-${fieldIndex}`}>
              <label>
                <span>Key</span>
                <input
                  aria-label={`Field name ${sectionIndex + 1}-${fieldIndex + 1}`}
                  onChange={(event) =>
                    onChange(
                      updateCardField(card, sectionIndex, fieldIndex, {
                        label: event.target.value
                      })
                    )
                  }
                  value={field.label}
                />
              </label>
              <label>
                <span>Type</span>
                <select
                  aria-label={`Field type ${sectionIndex + 1}-${fieldIndex + 1}`}
                  onChange={(event) => {
                    const nextType = event.target.value as CardFieldType;
                    onChange(
                      updateCardField(card, sectionIndex, fieldIndex, {
                        type: nextType,
                        ...(nextType === "computed"
                          ? {
                              value: "",
                              formula: field.formula ?? "0",
                              format: field.format ?? "plain"
                            }
                          : {})
                      })
                    );
                  }}
                  value={field.type ?? "text"}
                >
                  {CARD_FIELD_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{field.type === "computed" ? "Formula" : "Value"}</span>
                {renderFieldValueControl(sectionIndex, fieldIndex, field)}
              </label>
              {field.type === "computed" && (
                <>
                  <label>
                    <span>Format</span>
                    <select
                      aria-label={`Field format ${sectionIndex + 1}-${fieldIndex + 1}`}
                      onChange={(event) =>
                        onChange(
                          updateCardField(card, sectionIndex, fieldIndex, {
                            format: event.target.value as "plain" | "signed"
                          })
                        )
                      }
                      value={field.format ?? "plain"}
                    >
                      <option value="plain">Plain</option>
                      <option value="signed">Signed</option>
                    </select>
                  </label>
                  <p className="card-editor-computed-preview">
                    Preview: {computedCardFieldPreview(card, field)}
                  </p>
                </>
              )}
              {field.type === "select" && (
                <label>
                  <span>Options</span>
                  <input
                    aria-label={`Field options ${sectionIndex + 1}-${fieldIndex + 1}`}
                    onChange={(event) =>
                      onChange(
                        updateCardField(card, sectionIndex, fieldIndex, {
                          options: parseCardTags(event.target.value)
                        })
                      )
                    }
                    value={(field.options ?? []).join(", ")}
                  />
                </label>
              )}
              <button
                onClick={() => onChange(duplicateCardField(card, sectionIndex, fieldIndex))}
                type="button"
              >
                Duplicate
              </button>
              <button
                disabled={fieldIndex === 0}
                onClick={() => onChange(reorderCardField(card, sectionIndex, fieldIndex, fieldIndex - 1))}
                type="button"
              >
                Up
              </button>
              <button
                disabled={fieldIndex >= section.fields.length - 1}
                onClick={() => onChange(reorderCardField(card, sectionIndex, fieldIndex, fieldIndex + 1))}
                type="button"
              >
                Down
              </button>
              <button
                className="button-danger-subtle"
                onClick={() => onChange(removeCardField(card, sectionIndex, fieldIndex))}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => onChange(addCardField(card, sectionIndex))}
          type="button"
        >
          Add Field
        </button>
      </>
    );
  }

  function renderTable(section: StructuredCard["sections"][number], sectionIndex: number) {
    const columns = section.columns ?? [];
    const rows = section.rows ?? [];
    return (
      <div className="card-editor-table">
        <div className="card-table-wrap">
          <table className="card-table card-editor-table-grid">
            <thead>
              <tr>
                {columns.map((column, columnIndex) => (
                  <th key={`column-${sectionIndex}-${columnIndex}`}>
                    <div className="table-header-control">
                      <input
                        aria-label={`Table column ${sectionIndex + 1}-${columnIndex + 1}`}
                        onChange={(event) =>
                          onChange(
                            updateCardTableColumnName(
                              card,
                              sectionIndex,
                              columnIndex,
                              event.target.value
                            )
                          )
                        }
                        value={column}
                      />
                      <button
                        aria-label={`Remove table column ${sectionIndex + 1}-${columnIndex + 1}`}
                        className="table-compact-control"
                        onClick={() => onChange(removeCardTableColumn(card, sectionIndex, column))}
                        type="button"
                      >
                        x
                      </button>
                    </div>
                  </th>
                ))}
                <th className="table-control-cell">
                  <button
                    aria-label={`Add table column ${sectionIndex + 1}`}
                    className="table-compact-control"
                    onClick={() => onChange(addCardTableColumn(card, sectionIndex, "New Column"))}
                    type="button"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {columns.map((column, columnIndex) => (
                    <td key={column}>
                      <input
                        aria-label={`Table cell ${sectionIndex + 1}-${rowIndex + 1}-${columnIndex + 1}`}
                        onChange={(event) =>
                          onChange(
                            updateCardTableCell(
                              card,
                              sectionIndex,
                              rowIndex,
                              column,
                              event.target.value
                            )
                          )
                        }
                        value={row[column] ?? ""}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      onClick={() => onChange(duplicateCardTableRow(card, sectionIndex, rowIndex))}
                      type="button"
                    >
                      Duplicate
                    </button>
                    <button
                      disabled={rowIndex === 0}
                      onClick={() => onChange(reorderCardTableRow(card, sectionIndex, rowIndex, rowIndex - 1))}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      disabled={rowIndex >= rows.length - 1}
                      onClick={() => onChange(reorderCardTableRow(card, sectionIndex, rowIndex, rowIndex + 1))}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      aria-label={`Remove table row ${sectionIndex + 1}-${rowIndex + 1}`}
                      className="button-danger-subtle table-compact-control"
                      onClick={() => onChange(removeCardTableRow(card, sectionIndex, rowIndex))}
                      type="button"
                    >
                      x
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="table-footer-control" colSpan={columns.length + 1}>
                  <button
                    aria-label={`Add table row ${sectionIndex + 1}`}
                    className="table-compact-control"
                    onClick={() => onChange(addCardTableRow(card, sectionIndex))}
                    type="button"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  return (
    <form
      className="card-surface card-editor"
      data-help-context="document-card"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="card-editor-grid">
        <label>
          <span>Title</span>
          <input
            aria-label="Card title"
            onChange={(event) => onChange(updateCardTitle(card, event.target.value))}
            value={card.title}
          />
        </label>
        <label>
          <span>Kind</span>
          <input
            aria-label="Card kind"
            onChange={(event) => onChange(updateCardKind(card, event.target.value))}
            value={card.kind}
          />
        </label>
        <label>
          <span>Tags</span>
          <input
            aria-label="Card tags"
            onChange={(event) => onChange({ ...card, tags: parseCardTags(event.target.value) })}
            value={card.tags.join(", ")}
          />
        </label>
      </div>

      <div className="card-editor-actions">
        <button
          onClick={() => onChange(addCardSection(card))}
          type="button"
        >
          Add Section
        </button>
      </div>

      {card.sections.length === 0 ? (
        <p className="card-empty">No sections.</p>
      ) : (
        card.sections.map((section, sectionIndex) => (
          <section className="card-editor-section" key={`section-${sectionIndex}`}>
            <div className="card-editor-section-header">
              <label>
                <span>Section</span>
                <input
                  aria-label={`Section ${sectionIndex + 1} title`}
                  onChange={(event) =>
                    onChange(updateCardSection(card, sectionIndex, { title: event.target.value }))
                  }
                  value={section.title}
                />
              </label>
              <label>
                <span>Layout</span>
                <select
                  aria-label={`Section ${sectionIndex + 1} layout`}
                  onChange={(event) =>
                    onChange(
                      setCardSectionLayout(
                        card,
                        sectionIndex,
                        event.target.value as CardSectionLayout
                      )
                    )
                  }
                  value={cardSectionLayoutValue(section.layout)}
                >
                  {CARD_SECTION_LAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-expanded={!collapsedSections.has(sectionIndex)}
                onClick={() => toggleSectionCollapsed(sectionIndex)}
                type="button"
              >
                {collapsedSections.has(sectionIndex) ? "Expand" : "Collapse"}
              </button>
              <button
                onClick={() => onChange(duplicateCardSection(card, sectionIndex))}
                type="button"
              >
                Duplicate Section
              </button>
              <button
                disabled={sectionIndex === 0}
                onClick={() => onChange(reorderCardSection(card, sectionIndex, sectionIndex - 1))}
                type="button"
              >
                Up
              </button>
              <button
                disabled={sectionIndex >= card.sections.length - 1}
                onClick={() => onChange(reorderCardSection(card, sectionIndex, sectionIndex + 1))}
                type="button"
              >
                Down
              </button>
              <button
                className="button-danger-subtle"
                onClick={() => onChange(removeCardSection(card, sectionIndex))}
                type="button"
              >
                Remove Section
              </button>
            </div>

            {!collapsedSections.has(sectionIndex) &&
              (section.layout === "table"
                ? renderTable(section, sectionIndex)
                : renderFields(section, sectionIndex))}
          </section>
        ))
      )}
    </form>
  );
}

function InvalidCardState({
  message,
  rawEditor
}: {
  message: string;
  rawEditor?: ReactNode;
}) {
  return (
    <div className="card-surface card-invalid">
      <h2>Invalid Card</h2>
      <p>{message}</p>
      {rawEditor ? (
        <>
          <p>Repair the raw JSON to return to the structured editor.</p>
          <div className="card-raw-recovery">{rawEditor}</div>
        </>
      ) : (
        <p>Switch to Edit to repair the raw JSON.</p>
      )}
    </div>
  );
}

function TextViewer({ file }: { file: WorldFile }) {
  return (
    <pre className="text-viewer" data-help-context="document-media" tabIndex={0}>
      {file.content}
    </pre>
  );
}

function DocumentChrome({
  draft,
  file,
  onReload,
  onCancelScript,
  onRequestEdit,
  onRunScript,
  onSaveTemporary,
  scriptRunState,
  t
}: {
  draft: EditorDraft | null;
  file: WorldFile | null;
  onReload: () => void;
  onCancelScript: (runId: string) => void;
  onRequestEdit: () => void;
  onRunScript: () => void;
  onSaveTemporary: () => void;
  scriptRunState: ScriptRunState;
  t: Translator;
}) {
  if (!file) {
    return null;
  }

  const editable = Boolean(draft && isEditableFile(file));
  if (!editable || !draft) {
    if (isTemporaryDmsPath(file.path)) {
      return (
        <section className="document-chrome" aria-label={t("document.status")}>
          <div className="document-state">
            <strong>{t("document.temporaryOutput")}</strong>
            <span>{t("document.saveOutputHint")}</span>
          </div>
          <button className="document-action" onClick={onSaveTemporary} type="button">
            {t("document.saveAs")}
          </button>
        </section>
      );
    }
    return (
      <section className="document-chrome document-chrome-readonly" aria-label={t("document.status")}>
        <div className="document-state">
          <strong>{t("document.preview")}</strong>
          <span>{t("document.fileActionsHint")}</span>
        </div>
      </section>
    );
  }

  const dirty = isDraftDirty(draft);
  const csvValid = file.media_kind !== "csv" || isRectangularCsv(parseCsv(draft.content));
  const cardValid = !isCardPath(file.path, file.extension) || parseCardJson(draft.content).ok;
  const saving = draft.status === "saving";
  const changedOnDisk = draft.externalChanged;
  const runningScript =
    scriptRunState.status === "running" &&
    scriptRunState.path === file.path &&
    Boolean(scriptRunState.runId);
  const scriptRun = isScriptRunAvailable({
    dirty,
    mediaKind: file.media_kind,
    running: runningScript,
    saving
  });
  const statusText =
    changedOnDisk
      ? t("document.changedOnDisk")
      : draft.status === "conflict"
        ? draft.message ?? t("document.conflict")
        : draft.status === "error"
          ? draft.message ?? t("document.saveError")
          : file.media_kind === "script" && !scriptRun.available
            ? scriptRun.reason
            : !cardValid
              ? t("document.invalidCardJson")
              : !csvValid
                ? t("document.invalidCsv")
                : draft.message
                  ? draft.message
                  : dirty
                    ? t("document.unsaved")
                    : draft.status === "saved"
                      ? t("document.saved")
                      : t("document.clean");
  const shortcutText =
    file.media_kind === "markdown"
      ? t("document.markdownShortcuts")
      : t("document.defaultShortcuts");
  const handleChromeDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (draft.mode === "edit" || target?.closest("button,a,input,textarea,select")) {
      return;
    }
    onRequestEdit();
  };

  return (
    <section className="document-chrome" aria-label={t("document.status")} onDoubleClickCapture={handleChromeDoubleClick}>
      <div className="document-state">
        <strong>
          {draft.mode === "split"
            ? t("document.splitPreview")
            : draft.mode === "edit"
              ? t("document.editing")
              : t("document.preview")}
        </strong>
        <span
          className={`editor-status ${
            changedOnDisk ? "editor-status-external" : `editor-status-${draft.status}`
          }`}
          title={shortcutText}
        >
          {statusText}
        </span>
      </div>
      <div className="document-actions">
      {file.media_kind === "script" && (
        runningScript && scriptRunState.status === "running" && scriptRunState.runId ? (
          <button className="document-action" onClick={() => onCancelScript(scriptRunState.runId!)} type="button">
            {t("document.cancel")}
          </button>
        ) : (
          <button
            className="document-action"
            disabled={!scriptRun.available}
            onClick={onRunScript}
            title={scriptRun.available ? t("document.runScript") : scriptRun.reason}
            type="button"
          >
            {t("document.run")}
          </button>
        )
      )}
      {(draft.status === "conflict" || changedOnDisk) && (
        <button className="document-action" disabled={saving} onClick={onReload} type="button">
          {t("document.reloadFromDisk")}
        </button>
      )}
      </div>
    </section>
  );
}

function FileViewer({
  tab,
  loadState,
  completions,
  draft,
  links,
  onContextLink,
  onCsvDraftChange,
  onDiceRoll,
  onDraftContentChange,
  onOpenLink,
  onPickWorldPath,
  onPeekLink
}: {
  tab: OpenTab;
  loadState: FileLoadState;
  completions: CodeEditorCompletion[];
  draft: EditorDraft | null;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onCsvDraftChange: (data: CsvData) => void;
  onDiceRoll?: (expression: string) => void;
  onDraftContentChange: (content: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPickWorldPath?: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  if (loadState.status === "removed") {
    return (
      <div className="empty-surface" data-help-context="document-empty">
        <h2>File Removed</h2>
        <p>{loadState.message}</p>
      </div>
    );
  }

  if (tab.mediaKind === "unsupported") {
    return (
      <div className="empty-surface" data-help-context="document-empty">
        <h2>Unsupported File</h2>
        <p>{tab.name} cannot be previewed yet.</p>
      </div>
    );
  }

  if (tab.mediaKind === "image") {
    return (
      <div className="media-viewer" data-help-context="document-media" tabIndex={0}>
        <img alt={tab.name} src={buildMediaUrl(tab.path)} />
      </div>
    );
  }

  if (tab.mediaKind === "video") {
    return (
      <div className="media-viewer" data-help-context="document-media" tabIndex={0}>
        <video aria-label={tab.name} controls src={buildMediaUrl(tab.path)} />
      </div>
    );
  }

  if (tab.mediaKind === "pdf") {
    return (
      <div className="pdf-viewer" data-help-context="document-media" tabIndex={0}>
        <iframe aria-label={tab.name} src={buildMediaUrl(tab.path)} title={tab.name} />
      </div>
    );
  }

  if (loadState.status === "loading" || loadState.status === "idle") {
    return <div className="empty-surface" data-help-context="document-empty">Loading {tab.name}...</div>;
  }

  if (loadState.status === "error") {
    return (
      <div className="empty-surface" data-help-context="document-empty">
        <h2>Could Not Open File</h2>
        <p>{loadState.message}</p>
      </div>
    );
  }

  if (isCardPath(loadState.file.path, loadState.file.extension)) {
    const content = draft?.content ?? loadState.file.content;
    const parsed = parseCardJson(content);

    if (!parsed.ok) {
      return (
        <div data-help-context="document-card">
          <InvalidCardState
            message={parsed.message}
            rawEditor={
              draft?.mode === "edit" ? (
                <CodeEditor
                  ariaLabel="Raw card JSON editor"
                  language="text"
                  onChange={onDraftContentChange}
                  value={draft.content}
                />
              ) : undefined
            }
          />
        </div>
      );
    }

    if (draft?.mode === "edit") {
      return (
        <CardEditor
          card={parsed.card}
          onChange={(card) => onDraftContentChange(serializeCard(card))}
          onPickWorldPath={(onSelect) => onPickWorldPath?.("any", "Choose World Link", onSelect)}
        />
      );
    }

    return (
      <CardViewer
        card={parsed.card}
        file={loadState.file}
          links={links}
          onContextLink={onContextLink}
          onDiceRoll={onDiceRoll}
          onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );
  }

  if (loadState.file.media_kind === "markdown") {
    const body = splitMarkdownFrontmatter(draft?.content ?? loadState.file.content).body;
    const editor = draft ? (
      <CodeEditor
        ariaLabel="Markdown editor"
        completions={completions}
        language="markdown"
        onChange={(value) => onDraftContentChange(replaceMarkdownBody(draft.content, value))}
        value={body}
      />
    ) : null;
    const preview = (
      <MarkdownViewer
        content={draft?.content}
        file={loadState.file}
        links={links}
        onContextLink={onContextLink}
        onDiceRoll={onDiceRoll}
        onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );

    if (draft?.mode === "edit") {
      return (
        <section className="document-help-surface" data-help-context="document-markdown">
          {editor}
        </section>
      );
    }

    if (draft?.mode === "split") {
      return (
        <div className="markdown-split-view">
          <section aria-label="Markdown editor pane" data-help-context="document-markdown">{editor}</section>
          <section aria-label="Markdown preview pane" data-help-context="document-markdown">{preview}</section>
        </div>
      );
    }

    return preview;
  }

  if (loadState.file.media_kind === "csv") {
    if (draft?.mode === "edit") {
      return <CsvEditor data={parseCsv(draft.content)} onChange={onCsvDraftChange} />;
    }

    return (
      <CsvViewer
        content={draft?.content}
        file={loadState.file}
        links={links}
        onContextLink={onContextLink}
        onDiceRoll={onDiceRoll}
        onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );
  }

  if (loadState.file.media_kind === "script") {
    if (draft?.mode === "edit") {
      return (
        <section className="document-help-surface" data-help-context="document-dms">
          <CodeEditor
            ariaLabel="DMS editor"
            completions={completions}
            language="python"
            onChange={onDraftContentChange}
            value={draft.content}
          />
        </section>
      );
    }

    return <pre className="text-viewer" data-help-context="document-dms" tabIndex={0}>{draft?.content ?? loadState.file.content}</pre>;
  }

  return <TextViewer file={loadState.file} />;
}

function MetadataEditForm({
  contentDirty,
  fileReady,
  page,
  state,
  onCancel,
  onChange,
  onReload,
  onSave,
  onRevert
}: {
  contentDirty: boolean;
  fileReady: boolean;
  page: PageDetail;
  state: Extract<MetadataEditState, { mode: "edit" }>;
  onCancel: () => void;
  onChange: (form: MetadataFormState) => void;
  onReload: () => void;
  onSave: () => void;
  onRevert: () => void;
}) {
  const validation = validateMetadataForm(state.form);
  const dirty = isMetadataFormDirty(state.form, page);
  const saving = state.status === "saving";
  const disabled = saving || !fileReady || contentDirty;

  return (
    <form
      className="metadata-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <label>
        Title
        <input
          aria-label="Metadata title"
          onChange={(event) => onChange({ ...state.form, title: event.target.value })}
          value={state.form.title}
        />
      </label>
      <label>
        Type
        <input
          aria-label="Metadata type"
          onChange={(event) => onChange({ ...state.form, type: event.target.value })}
          value={state.form.type}
        />
      </label>
      <label>
        Tags
        <input
          aria-label="Metadata tags"
          onChange={(event) => onChange({ ...state.form, tagsText: event.target.value })}
          value={state.form.tagsText}
        />
      </label>
      <label>
        Aliases
        <input
          aria-label="Metadata aliases"
          onChange={(event) => onChange({ ...state.form, aliasesText: event.target.value })}
          value={state.form.aliasesText}
        />
      </label>
      <section className="metadata-fields" aria-label="Custom Fields">
        <h3>Custom Fields</h3>
        {state.form.fields.map((field, index) => (
          <div className="metadata-field-row" key={`field-${index}`}>
            <input
              aria-label={`Field ${index + 1} key`}
              onChange={(event) =>
                onChange(updateMetadataFieldRow(state.form, index, { key: event.target.value }))
              }
              placeholder="Key"
              value={field.key}
            />
            <input
              aria-label={`Field ${index + 1} value`}
              onChange={(event) =>
                onChange(updateMetadataFieldRow(state.form, index, { value: event.target.value }))
              }
              placeholder="Value"
              value={field.value}
            />
            <button
              aria-label={`Remove field ${index + 1}`}
              onClick={() => onChange(removeMetadataFieldRow(state.form, index))}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={() => onChange(addMetadataFieldRow(state.form))} type="button">
          Add Field
        </button>
      </section>
      {(validation || state.message || contentDirty) && (
        <p className={`metadata-form-message metadata-form-message-${state.status}`}>
          {contentDirty
            ? "Save or revert content before editing metadata."
            : validation ?? state.message}
        </p>
      )}
      <div className="metadata-form-actions">
        <button disabled={disabled || !dirty || Boolean(validation)} type="submit">
          {saving ? "Saving..." : "Save Metadata"}
        </button>
        <button disabled={saving} onClick={onRevert} type="button">
          Revert
        </button>
        {state.status === "conflict" && (
          <button disabled={saving} onClick={onReload} type="button">
            Reload metadata
          </button>
        )}
        <button disabled={saving} onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

function MetadataTool({
  tab,
  pageState,
  linksState,
  pages,
  editState,
  fileReady,
  contentDirty,
  onOpenOutgoing,
  onOpenBacklink,
  onStartEdit,
  onChangeEdit,
  onCancelEdit,
  onRevertEdit,
  onSaveEdit,
  onReloadEdit,
  t
}: {
  tab: OpenTab | null;
  pageState: PageLoadState;
  linksState: LinksLoadState;
  pages: PageSummary[];
  editState: MetadataEditState;
  fileReady: boolean;
  contentDirty: boolean;
  onOpenOutgoing: (link: PageLink) => void;
  onOpenBacklink: (link: PageLink) => void;
  onStartEdit: () => void;
  onChangeEdit: (form: MetadataFormState) => void;
  onCancelEdit: () => void;
  onRevertEdit: () => void;
  onSaveEdit: () => void;
  onReloadEdit: () => void;
  t: Translator;
}) {
  if (pageState.status === "loading" || pageState.status === "idle") {
    return (
      <section className="metadata-tool" aria-label={t("metadata.title")} data-help-context="metadata">
        {tab ? <p>{t("metadata.loading")}</p> : <p>{t("metadata.selectFile")}</p>}
      </section>
    );
  }

  if (pageState.status === "error") {
    return (
      <section className="metadata-tool" aria-label={t("metadata.title")} data-help-context="metadata">
        <div className="metadata-empty">
          <h3>{t("metadata.loadError")}</h3>
          <p>{pageState.message}</p>
        </div>
      </section>
    );
  }

  const entries = buildMetadataViewModel(pageState.page);
  const outgoing = linksState.status === "ready" ? linksState.outgoing : [];
  const backlinks = linksState.status === "ready" ? linksState.backlinks : [];
  const linksError = linksState.status === "error" ? linksState.message : null;

  return (
    <section className="metadata-tool" aria-label={t("metadata.title")} data-help-context="metadata">
      <div className="metadata-heading">
        {editState.mode === "view" && (
          <button
            disabled={!fileReady || contentDirty}
            onClick={onStartEdit}
            type="button"
          >
            {t("metadata.edit")}
          </button>
        )}
      </div>
      {editState.mode === "edit" ? (
        <MetadataEditForm
          contentDirty={contentDirty}
          fileReady={fileReady}
          onCancel={onCancelEdit}
          onChange={onChangeEdit}
          onReload={onReloadEdit}
          onRevert={onRevertEdit}
          onSave={onSaveEdit}
          page={pageState.page}
          state={editState}
        />
      ) : (
        <>
          <dl>
            {entries.map((entry) => (
              <div className="metadata-row" key={entry.label}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
          <section className="link-section" aria-label={t("metadata.outgoingLinks")}>
            <h3>{t("metadata.outgoingLinks")}</h3>
            {linksError && <p>{linksError}</p>}
            {linksState.status === "loading" && <p>{t("metadata.loadingLinks")}</p>}
            {linksState.status !== "loading" && outgoing.length === 0 && <p>{t("app.none")}</p>}
            {outgoing.map((link, index) => (
              <button
                className="panel-link"
                disabled={!link.resolved}
                key={`${link.source_path}-${link.raw_target}-${link.link_type}-${index}`}
                onClick={() => onOpenOutgoing(link)}
                type="button"
              >
                {link.target_kind === "markdown" ? link.target_title ?? link.label : link.label}
              </button>
            ))}
          </section>
          <section className="link-section" aria-label={t("metadata.backlinks")}>
            <h3>{t("metadata.backlinks")}</h3>
            {linksState.status === "loading" && <p>{t("metadata.loadingBacklinks")}</p>}
            {linksState.status !== "loading" && backlinks.length === 0 && <p>{t("app.none")}</p>}
            {backlinks.map((link) => {
              const sourcePage = pages.find((page) => page.path === link.source_path);
              return (
                <button
                  className="panel-link"
                  key={`${link.source_path}-${link.raw_target}`}
                  onClick={() => onOpenBacklink(link)}
                  type="button"
                >
                  {sourcePage?.title ?? link.source_path}
                </button>
              );
            })}
          </section>
        </>
      )}
    </section>
  );
}
function WorldTree({
  dragPath,
  dropPath,
  entry,
  expandedPaths,
  favoritePaths,
  filter,
  menuPath,
  onAdd,
  onContextEntry,
  onDragEnd,
  onDragStart,
  onDragTarget,
  onDropEntry,
  onOpen,
  onToggle,
  onMenuToggle,
  t
}: {
  dragPath: string | null;
  dropPath: string | null;
  entry: WorldEntry;
  expandedPaths: Set<string>;
  favoritePaths: Set<string>;
  filter: string;
  menuPath: string | null;
  onAdd: (folderPath: string, kind: FolderCreateKind) => void;
  onContextEntry: (entry: WorldEntry, event: MouseEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragStart: (entry: WorldEntry, event: DragEvent<HTMLElement>) => void;
  onDragTarget: (path: string | null) => void;
  onDropEntry: (entry: WorldEntry, event: DragEvent<HTMLElement>) => void;
  onToggle: (path: string) => void;
  onMenuToggle: (path: string | null) => void;
  onOpen: (entry: WorldEntry) => void;
  t: Translator;
}) {
  const normalizedFilter = filter.trim().toLowerCase();
  const entryMatches =
    !normalizedFilter ||
    entry.name.toLowerCase().includes(normalizedFilter) ||
    entry.path.toLowerCase().includes(normalizedFilter) ||
    (entry.title ?? "").toLowerCase().includes(normalizedFilter);

  if (entry.kind === "file") {
    if (!entryMatches) {
      return null;
    }
    const label = treeEntryLabel(entry);
    const favorite = favoritePaths.has(entry.path);
    return (
      <li>
        <button
          className={`tree-item file-item${favorite ? " tree-item-favorite" : ""}`}
          draggable
          onClick={() => onOpen(entry)}
          onContextMenu={(event) => onContextEntry(entry, event)}
          onDragEnd={onDragEnd}
          onDragStart={(event) => onDragStart(entry, event)}
          type="button"
        >
          <span className="tree-label">
            <span>{label.primary}</span>
            {label.secondary && <small>{label.secondary}</small>}
          </span>
          {favorite && <span className="tree-favorite-mark">{t("world.tree.favorite")}</span>}
        </button>
      </li>
    );
  }

  const matchingChildren = normalizedFilter
    ? entry.children.filter((child) => worldEntryContainsFilter(child, normalizedFilter))
    : entry.children;
  if (!entryMatches && matchingChildren.length === 0) {
    return null;
  }
  const expanded = normalizedFilter ? true : expandedPaths.has(entry.path);
  const addLabel = entry.path === "" ? t("world.tree.addRoot") : t("world.tree.addFolder", { name: entry.name });

  return (
    <li>
      <div
        className={`tree-folder-row${dropPath === entry.path ? " tree-drop-target" : ""}`}
        onDragLeave={() => {
          if (dropPath === entry.path) {
            onDragTarget(null);
          }
        }}
        onDragOver={(event) => {
          if (dragPath && dragPath !== entry.path && !isDescendantPath(entry.path, dragPath)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            onDragTarget(entry.path);
          }
        }}
        onDrop={(event) => onDropEntry(entry, event)}
      >
        <button
          aria-expanded={expanded}
          className="tree-item folder-item"
          draggable={entry.path !== ""}
          onClick={() => onToggle(entry.path)}
          onContextMenu={(event) => onContextEntry(entry, event)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => {
            if (dragPath && dragPath !== entry.path && !isDescendantPath(entry.path, dragPath)) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              onDragTarget(entry.path);
            }
          }}
          onDragStart={(event) => onDragStart(entry, event)}
          onDrop={(event) => onDropEntry(entry, event)}
          type="button"
        >
          <span aria-hidden>{expanded ? "v" : ">"}</span>
          {entry.path === "" ? entry.name : entry.name}
        </button>
        <button
          aria-label={addLabel}
          className="tree-add-button"
          onClick={() => onMenuToggle(menuPath === entry.path ? null : entry.path)}
          type="button"
        >
          +
        </button>
        {menuPath === entry.path && (
          <div className="tree-add-menu" role="menu">
            <button onClick={() => onAdd(entry.path, "markdown")} type="button">
              {t("world.tree.newMarkdown")}
            </button>
              <button onClick={() => onAdd(entry.path, "card")} type="button">
                {t("world.tree.newCard")}
              </button>
              <button onClick={() => onAdd(entry.path, "csv")} type="button">
                {t("world.tree.newCsv")}
              </button>
              <button onClick={() => onAdd(entry.path, "script")} type="button">
                {t("world.tree.newScript")}
              </button>
              <button onClick={() => onAdd(entry.path, "folder")} type="button">
                {t("world.tree.newFolder")}
              </button>
          </div>
        )}
      </div>
      {expanded && (
        <ul>
          {matchingChildren.map((child) => (
            <WorldTree
              entry={child}
              dragPath={dragPath}
              dropPath={dropPath}
              expandedPaths={expandedPaths}
              favoritePaths={favoritePaths}
              filter={filter}
              key={child.path}
              menuPath={menuPath}
              onAdd={onAdd}
              onContextEntry={onContextEntry}
              onDragEnd={onDragEnd}
              onDragStart={onDragStart}
              onDragTarget={onDragTarget}
              onDropEntry={onDropEntry}
              onMenuToggle={onMenuToggle}
              onOpen={onOpen}
              onToggle={onToggle}
              t={t}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function WorldTreeContextMenu({
  state,
  favorite,
  onClose,
  onDuplicate,
  onOpen,
  onOpenNewTab,
  onRename,
  onToggleFavorite,
  onTrash,
  t
}: {
  state: WorldTreeContextMenuState;
  favorite: boolean;
  onClose: (restoreFocus?: boolean) => void;
  onDuplicate: (entry: WorldEntry) => void;
  onOpen: (entry: WorldEntry) => void;
  onOpenNewTab: (entry: WorldEntry) => void;
  onRename: (entry: WorldEntry) => void;
  onToggleFavorite: (entry: WorldEntry) => void;
  onTrash: (entry: WorldEntry) => void;
  t: Translator;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!state.open) {
      return;
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      const target = event.target instanceof Node ? event.target : null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      onClose(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose, state.open]);

  if (!state.open) {
    return null;
  }
  const entry = state.entry;
  const isRoot = entry.path === "";
  return (
    <div
      className="tree-context-menu"
      ref={menuRef}
      role="menu"
      style={{ left: state.x, top: state.y }}
    >
      {entry.kind === "file" && (
        <>
          <button
            onClick={() => {
              onOpen(entry);
              onClose();
            }}
            type="button"
          >
            {t("world.menu.open")}
          </button>
          <button
            onClick={() => {
              onOpenNewTab(entry);
              onClose();
            }}
            type="button"
          >
            {t("world.menu.openNewTab")}
          </button>
          <button
            aria-pressed={favorite}
            onClick={() => {
              onToggleFavorite(entry);
              onClose();
            }}
            type="button"
          >
          {favorite ? t("world.menu.unfavorite") : t("world.menu.favorite")}
          </button>
        </>
      )}
      {!isRoot && (
        <>
          <button
            onClick={() => {
              onRename(entry);
              onClose();
            }}
            type="button"
          >
          {t("world.menu.rename")}
          </button>
          <button
            onClick={() => {
              onDuplicate(entry);
              onClose();
            }}
            type="button"
          >
          {t("world.menu.duplicate")}
          </button>
          <button
            className="danger-action"
            onClick={() => {
              onTrash(entry);
              onClose();
            }}
            type="button"
          >
          {t("world.menu.trash")}
          </button>
        </>
      )}
    </div>
  );
}

function QuickFileList({
  title,
  items,
  onOpen,
  collapsible = false,
  defaultOpen = true,
  emptyLabel = "None"
}: {
  title: string;
  items: WorkspaceTab[];
  onOpen: (tab: WorkspaceTab) => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const visible = !collapsible || open;

  return (
    <section className="quick-section" aria-label={title}>
      {collapsible ? (
        <button
          aria-expanded={open}
          className="quick-heading quick-heading-button"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span className="section-label">{title}</span>
          <span className="quick-count">{items.length}</span>
        </button>
      ) : (
        <div className="quick-heading">
          <span className="section-label">{title}</span>
          <span className="quick-count">{items.length}</span>
        </div>
      )}
      {visible && items.length === 0 ? (
        <p>{emptyLabel}</p>
      ) : null}
      {visible && items.length > 0 ? (
        <div className="quick-list">
          {items.map((item) => (
            <button
              className="quick-item"
              key={item.path}
              onClick={() => onOpen(item)}
              type="button"
            >
              <span>{item.title ?? item.name}</span>
              <small>{item.path}</small>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function WorkspaceControls({
  currentId,
  currentName,
  layout,
  prepStatus,
  summaries,
  onActivate,
  onCapture,
  onDelete,
  onHelp,
  onNewCard,
  onNew,
  onPrepCheck,
  onSearch,
  searchButtonRef,
  onRename,
  onModeChange,
  t
}: {
  currentId: string;
  currentName: string;
  layout: WorkspaceLayout;
  prepStatus: string;
  summaries: NamedWorkspaceSummary[];
  onActivate: (workspaceId: string) => void;
  onCapture: () => void;
  onDelete: () => void;
  onHelp: () => void;
  onNewCard: () => void;
  onNew: () => void;
  onPrepCheck: () => void;
  onSearch: () => void;
  searchButtonRef: RefObject<HTMLButtonElement | null>;
  onRename: () => void;
  onModeChange: (mode: WorkspaceLayout["mode"]) => void;
  t: Translator;
}) {
  return (
    <section className="workspace-controls" aria-label={t("workspace.controls")} data-help-context="document-empty">
      <label>
        {t("workspace.workspace")}
        <select
          aria-label={t("workspace.select")}
          onChange={(event) => onActivate(event.target.value)}
          value={currentId}
        >
          {summaries.length === 0 ? (
            <option value={currentId}>{currentName}</option>
          ) : (
            summaries.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))
          )}
        </select>
      </label>
      <button onClick={onNew} type="button">
        {t("workspace.new")}
      </button>
      <button onClick={onRename} type="button">
        {t("workspace.rename")}
      </button>
      <button disabled={currentId === "default"} onClick={onDelete} type="button">
        {t("workspace.delete")}
      </button>
      <button onClick={onSearch} ref={searchButtonRef} type="button">
        {t("workspace.search")}
      </button>
      <button onClick={onCapture} type="button">
        {t("workspace.capture")}
      </button>
      <button onClick={onNewCard} type="button">
        {t("workspace.newCard")}
      </button>
      <button onClick={onPrepCheck} type="button">
        {t("workspace.prepCheckStatus", { status: prepStatus })}
      </button>
      <button
        aria-label={t("help.open")}
        className="workspace-help-button"
        onClick={onHelp}
        title={t("help.open")}
        type="button"
      >
        {t("help.openShort")}
      </button>
      <div className="workspace-layout-toggle" role="group" aria-label={t("workspace.layout")}>
        <button
          aria-pressed={layout.mode === "single"}
          onClick={() => onModeChange("single")}
          type="button"
        >
          {t("workspace.single")}
        </button>
        <button
          aria-pressed={layout.mode === "vertical_split"}
          onClick={() => onModeChange("vertical_split")}
          type="button"
        >
          {t("workspace.split")}
        </button>
      </div>
    </section>
  );
}

function SettingsDialog({
  availableLanguages,
  language,
  onClose,
  onImportComplete,
  onLanguageChange,
  open,
  t
}: {
  availableLanguages: AppConfig["available_languages"];
  language: UiLanguage;
  onClose: () => void;
  onImportComplete: () => Promise<void>;
  onLanguageChange: (language: UiLanguage) => void;
  open: boolean;
  t: Translator;
}) {
  const [packState, setPackState] = useState<SystemPackImportState>({
    file: null,
    preview: null,
    decisions: [],
    summary: null,
    status: "idle",
    error: null
  });
  const conflictValidation = packState.preview
    ? validateSystemPackConflictDecisions(packState.preview.rows, packState.decisions)
    : { valid: false, errors: {} };
  const previewGroups = packState.preview
    ? groupSystemPackPreviewRows(packState.preview.rows)
    : null;
  const packHasInvalidRows = (previewGroups?.invalid.length ?? 0) > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (document.querySelector("[data-context-help-dialog='true']")) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setPackState({
        file: null,
        preview: null,
        decisions: [],
        summary: null,
        status: "idle",
        error: null
      });
    }
  }, [open]);

  async function handlePackFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPackState({
        file: null,
        preview: null,
        decisions: [],
        summary: null,
        status: "idle",
        error: null
      });
      return;
    }
    setPackState({
      file,
      preview: null,
      decisions: [],
      summary: null,
      status: "previewing",
      error: null
    });
    try {
      const preview = await previewSystemPack(file);
      setPackState({
        file,
        preview,
        decisions: [],
        summary: null,
        status: "ready",
        error: null
      });
    } catch (error) {
      setPackState({
        file,
        preview: null,
        decisions: [],
        summary: null,
        status: "error",
        error: systemPackErrorMessage(error)
      });
    }
  }

  function updatePackDecision(nextDecision: SystemPackConflictDecision) {
    setPackState((state) => ({
      ...state,
      decisions: state.decisions.some((decision) => decision.target_path === nextDecision.target_path)
        ? state.decisions.map((decision) =>
            decision.target_path === nextDecision.target_path ? nextDecision : decision
          )
        : [...state.decisions, nextDecision],
      summary: null,
      status: state.status === "done" ? "ready" : state.status,
      error: null
    }));
  }

  async function handleImportPack() {
    if (!packState.file || !packState.preview || !conflictValidation.valid) {
      return;
    }
    setPackState((state) => ({ ...state, status: "importing", error: null }));
    try {
      const summary = await importSystemPack({
        file: packState.file,
        decisions: packState.decisions
      });
      await onImportComplete();
      setPackState((state) => ({
        ...state,
        summary,
        status: "done",
        error: null
      }));
    } catch (error) {
      setPackState((state) => ({
        ...state,
        status: "error",
        error: systemPackErrorMessage(error)
      }));
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" onMouseDown={onClose} role="presentation">
      <section
        aria-label={t("app.settingsTitle")}
        className="file-dialog settings-dialog"
        data-help-context="settings"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("app.settingsTitle")}</h2>
          <button aria-label={t("app.closeSettings")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <label>
          {t("app.language")}
          <select
            autoFocus
            onChange={(event) => {
              if (isUiLanguage(event.target.value)) {
                onLanguageChange(event.target.value);
              }
            }}
            value={language}
          >
            {availableLanguages.map((option) => (
              <option key={option.code} value={option.code}>
                {option.native_label}
              </option>
            ))}
          </select>
        </label>
        <section className="settings-pack-import" aria-label={t("contentPack.importTitle")}>
          <h3>{t("contentPack.importTitle")}</h3>
          <label>
            {t("contentPack.chooseZip")}
            <input accept=".zip,application/zip" onChange={handlePackFileChange} type="file" />
          </label>
          <p>{t("contentPack.dmsSkipped")}</p>
          {packState.status === "previewing" && <p>{t("contentPack.previewing")}</p>}
          {packState.error && <p className="form-error">{packState.error}</p>}
          {packState.preview && previewGroups && (
            <div className="settings-pack-preview">
              <h4>
                {packState.preview.manifest.name} {packState.preview.manifest.version}
              </h4>
              <div className="settings-pack-counts" aria-label={t("contentPack.preview")}>
                {(["ready", "conflict", "skipped", "invalid"] as const).map((status) => (
                  <span key={status}>
                    {t(`contentPack.status.${status}`)}: {packState.preview?.counts[status] ?? 0}
                  </span>
                ))}
              </div>
              {packState.preview.rows.length > 0 && (
                <ul>
                  {packState.preview.rows.map((row) => (
                    <li key={row.id}>
                      <span>
                        <strong>{row.target_path}</strong>
                        <small>{t(`contentPack.status.${row.status}`)}</small>
                      </span>
                      {row.status === "skipped" && row.target_path.toLowerCase().endsWith(".dms") && (
                        <small>{t("contentPack.dmsSkipped")}</small>
                      )}
                      {row.message && <small>{row.message}</small>}
                    </li>
                  ))}
                </ul>
              )}
              {previewGroups.conflict.length > 0 && (
                <div className="settings-pack-conflicts">
                  <h4>{t("contentPack.conflicts")}</h4>
                  {previewGroups.conflict.map((row) => {
                    const decision = packState.decisions.find(
                      (item) => item.target_path === row.target_path
                    );
                    return (
                      <div className="settings-pack-conflict" key={row.id}>
                        <label>
                          {row.target_path}
                          <select
                            onChange={(event) =>
                              updatePackDecision({
                                target_path: row.target_path,
                                decision: event.target.value as SystemPackConflictDecision["decision"],
                                rename_target_path:
                                  event.target.value === "rename"
                                    ? decision?.rename_target_path ?? row.target_path
                                    : undefined
                              })
                            }
                            value={decision?.decision ?? ""}
                          >
                            <option disabled value="">
                              {t("contentPack.decision.choose")}
                            </option>
                            <option value="skip">{t("contentPack.decision.skip")}</option>
                            <option value="overwrite">{t("contentPack.decision.replace")}</option>
                            <option value="rename">{t("contentPack.decision.rename")}</option>
                          </select>
                        </label>
                        {decision?.decision === "rename" && (
                          <label>
                            {t("contentPack.renameTarget")}
                            <input
                              onChange={(event) =>
                                updatePackDecision({
                                  ...decision,
                                  rename_target_path: event.target.value
                                })
                              }
                              value={decision.rename_target_path ?? ""}
                            />
                          </label>
                        )}
                        {conflictValidation.errors[row.target_path] && (
                          <small className="form-error">
                            {conflictValidation.errors[row.target_path]}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!conflictValidation.valid && (
                <p className="form-error">{t("contentPack.unresolvedConflicts")}</p>
              )}
              {packHasInvalidRows && <p className="form-error">{t("contentPack.invalidRows")}</p>}
            </div>
          )}
          {packState.summary && (
            <div className="settings-pack-summary">
              <strong>{t("contentPack.summary")}</strong>
              <p>
                {t("contentPack.summaryCounts", mapSystemPackImportResultSummary(packState.summary))}
              </p>
              <p>{t("contentPack.refreshAfterImport")}</p>
            </div>
          )}
          <button
            disabled={
              !packState.file ||
              !packState.preview ||
              packHasInvalidRows ||
              !conflictValidation.valid ||
              packState.status === "previewing" ||
              packState.status === "importing" ||
              packState.status === "done"
            }
            onClick={() => void handleImportPack()}
            type="button"
          >
            {packState.status === "importing" ? t("contentPack.importing") : t("contentPack.import")}
          </button>
        </section>
        <div className="dialog-actions">
          <button onClick={onClose} type="button">
            {t("app.close")}
          </button>
        </div>
      </section>
    </div>
  );
}

function ContextHelpDialog({
  onClose,
  open,
  t,
  topic
}: {
  onClose: () => void;
  open: boolean;
  t: Translator;
  topic: ContextHelpTopic | null;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open]);

  if (!open || !topic) {
    return null;
  }

  const shortcuts = topic.shortcutKeys
    .map((key) => t(key))
    .filter((value) => value && !value.startsWith("[["));

  return (
    <div className="dialog-overlay" onMouseDown={onClose} role="presentation">
      <section
        aria-label={t("help.open")}
        className="file-dialog context-help-dialog"
        data-context-help-dialog="true"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t(topic.titleKey)}</h2>
          <button aria-label={t("help.close")} autoFocus onClick={onClose} type="button">
            x
          </button>
        </div>
        <ul className="context-help-list">
          {topic.bodyKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        {shortcuts.length > 0 && (
          <section className="context-help-shortcuts" aria-label={t("help.shortcuts")}>
            <h3>{t("help.shortcuts")}</h3>
            <ul>
              {shortcuts.map((shortcut) => (
                <li key={shortcut}>{shortcut}</li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </div>
  );
}

function localizedWorldPathPickerFilterLabel(t: Translator, filter: WorldPathPickerFilter): string {
  if (filter === "any") {
    return t("pathPicker.allPaths");
  }
  if (filter === "displayable") {
    return t("pathPicker.displayablePaths");
  }
  return t("pathPicker.kindPaths", { kind: filter });
}

function worldSelectorLabel(world: WorldLibraryEntry, worlds: WorldLibraryEntry[]): string {
  const duplicateName = worlds.some((item) => item.id !== world.id && item.name === world.name);
  return duplicateName ? `${world.name} - ${world.path}` : world.name;
}

function WorldSelector({
  state,
  onOpenWorld,
  t
}: {
  state: WorldLibraryState | null;
  onOpenWorld: (id: string) => void;
  t: Translator;
}) {
  const currentId = state?.worlds.find((world) => world.path === state.current?.path)?.id ?? "";
  const recentIds = new Set(state?.recent.map((world) => world.id) ?? []);
  const libraryWorlds = state?.worlds.filter((world) => !recentIds.has(world.id)) ?? [];

  return (
    <div className="world-selector">
      <select
        aria-label={t("world.select")}
        disabled={!state || state.worlds.length === 0}
        onChange={(event) => {
          if (event.target.value) {
            onOpenWorld(event.target.value);
          }
        }}
        value={currentId}
      >
        <option value="">{t("world.select")}</option>
        {state?.recent.length ? (
          <optgroup label={t("world.recent")}>
            {state.recent.map((world) => (
              <option key={`recent-${world.id}`} value={world.id}>
                {worldSelectorLabel(world, state.worlds)}
              </option>
            ))}
          </optgroup>
        ) : null}
        {libraryWorlds.length ? (
          <optgroup label={t("world.library")}>
            {libraryWorlds.map((world) => (
              <option key={world.id} value={world.id}>
                {worldSelectorLabel(world, state?.worlds ?? [])}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}

function WorldOpenDialog({
  state,
  onClose,
  onOpenWorld,
  onRefresh,
  t
}: {
  state: WorldLibraryState | null;
  onClose: () => void;
  onOpenWorld: (id: string) => void;
  onRefresh: () => void;
  t: Translator;
}) {
  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label={t("world.openFolderTitle")} className="file-dialog world-dialog" role="dialog">
        <div className="dialog-header">
          <h2>{t("world.openFolderTitle")}</h2>
          <button aria-label={t("world.closeOpenFolder")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <p className="dialog-note">{state?.worlds_root ?? t("world.libraryNotLoaded")}</p>
        <button className="panel-action" onClick={onRefresh} type="button">
          {t("world.scanWorlds")}
        </button>
        {state && state.worlds.length === 0 ? <p>{t("world.noWorlds")}</p> : null}
        {state && state.worlds.length > 0 ? (
          <div className="world-dialog-list">
            {state.worlds.map((world) => (
              <button
                className="world-dialog-item"
                key={world.id}
                onClick={() => onOpenWorld(world.id)}
                type="button"
              >
                <span>{world.name}</span>
                <small>{world.path}</small>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function WorldCreateDialog({
  state,
  onClose,
  onNameChange,
  onSubmit,
  t
}: {
  state: WorldCreateDialogState;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label={t("world.addTitle")} className="file-dialog world-dialog" role="dialog">
        <div className="dialog-header">
          <h2>{t("world.addTitle")}</h2>
          <button aria-label={t("world.closeAdd")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <label>
          {t("world.name")}
          <input
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
            value={state.name}
          />
        </label>
        {state.error && <p className="dialog-error">{state.error}</p>}
        <div className="dialog-actions">
          <button disabled={state.status === "submitting"} onClick={onClose} type="button">
            {t("app.cancel")}
          </button>
          <button disabled={state.status === "submitting"} onClick={onSubmit} type="button">
            {state.status === "submitting" ? t("world.creating") : t("world.create")}
          </button>
        </div>
      </section>
    </div>
  );
}

function WorkspaceDialog({
  state,
  onClose,
  onNameChange,
  onSubmit
}: {
  state: WorkspaceDialogState;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
}) {
  if (state.kind === "closed") {
    return null;
  }

  const title = state.kind === "create" ? "New Workspace" : "Rename Workspace";

  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label={title} className="file-dialog world-dialog" role="dialog">
        <div className="dialog-header">
          <h2>{title}</h2>
          <button aria-label={`Close ${title}`} onClick={onClose} type="button">
            x
          </button>
        </div>
        <label>
          Workspace name
          <input
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
            value={state.name}
          />
        </label>
        {state.error && <p className="dialog-error">{state.error}</p>}
        <div className="dialog-actions">
          <button disabled={state.status === "submitting"} onClick={onClose} type="button">
            Cancel
          </button>
          <button disabled={state.status === "submitting"} onClick={onSubmit} type="button">
            {state.status === "submitting" ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TrashManagerDialog({
  state,
  onClose,
  onDelete,
  onRestore,
  onRestorePathChange,
  onSetConfirmDelete
}: {
  state: TrashDialogState;
  onClose: () => void;
  onDelete: (entry: TrashEntry) => void;
  onRestore: (entry: TrashEntry) => void;
  onRestorePathChange: (entry: TrashEntry, path: string) => void;
  onSetConfirmDelete: (path: string | null) => void;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label="Trash" className="file-dialog trash-dialog" role="dialog">
        <div className="dialog-header">
          <h2>Trash</h2>
          <button aria-label="Close Trash" onClick={onClose} type="button">
            x
          </button>
        </div>
        {state.status === "loading" && <p>Loading trash...</p>}
        {state.error && <p className="dialog-error">{state.error}</p>}
        {state.status !== "loading" && state.entries.length === 0 && <p>Trash is empty.</p>}
        {state.entries.length > 0 && (
          <div className="trash-list">
            {state.entries.map((entry) => (
              <section className="trash-entry" key={entry.trashed_path}>
                <div>
                  <strong>{entry.name}</strong>
                  <small>{entry.original_path}</small>
                </div>
                <label>
                  Restore path
                  <input
                    aria-label={`Restore path ${entry.name}`}
                    onChange={(event) => onRestorePathChange(entry, event.target.value)}
                    value={state.restorePaths[entry.trashed_path] ?? entry.original_path}
                  />
                </label>
                <div className="trash-actions">
                  <button
                    disabled={state.status === "submitting"}
                    onClick={() => onRestore(entry)}
                    type="button"
                  >
                    Restore
                  </button>
                  {state.confirmDeletePath === entry.trashed_path ? (
                    <button
                      className="danger-button"
                      disabled={state.status === "submitting"}
                      onClick={() => onDelete(entry)}
                      type="button"
                    >
                      Confirm Delete Forever
                    </button>
                  ) : (
                    <button
                      disabled={state.status === "submitting"}
                      onClick={() => onSetConfirmDelete(entry.trashed_path)}
                      type="button"
                    >
                      Delete Forever
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InnerToolTabs<T extends string>({
  active,
  ariaLabel,
  onChange,
  tabs
}: {
  active: T;
  ariaLabel: string;
  onChange: (tab: T) => void;
  tabs: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="inner-tool-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          aria-selected={active === tab.id}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ScreenTool({
  activeTab,
  displayState,
  mapActionStatus,
  mapPresets,
  mapState,
  onBlank,
  onClearPopups,
  onClosePopup,
  onPopupVisibleChange,
  onOpenPopup,
  onStagePopup,
  onClearAndShowFullscreen,
  onShowFullscreen,
  onMapClearReveals,
  onMapDeletePin,
  onMapDeletePreset,
  onMapFogChange,
  onMapGridChange,
  onMapLoadSource,
  onMapLoadPreset,
  onMapPinCreate,
  onMapPresent,
  onMapRevealCreate,
  onMapSavePreset,
  onMapStop,
  onMapUndoReveal,
  onMapUseActiveImage,
  onMapViewportCommit,
  onMapViewportPreview,
  onTabChange,
  onPickPath,
  tab,
  t
}: {
  activeTab: OpenTab | null;
  displayState: DisplayState | null;
  mapActionStatus: MapActionStatus;
  mapPresets: MapPreset[];
  mapState: MapState | null;
  onBlank: () => void;
  onClearPopups: () => void;
  onClosePopup: (popupId: string) => void;
  onPopupVisibleChange: (popupId: string, visible: boolean) => void;
  onOpenPopup: (preset: DisplayPopupPreset, path?: string) => void;
  onStagePopup: (preset: DisplayPopupPreset, path?: string) => void;
  onClearAndShowFullscreen: (path?: string) => void;
  onShowFullscreen: (path?: string) => void;
  onMapClearReveals: () => void;
  onMapDeletePin: (pinId: string) => void;
  onMapDeletePreset: (presetId: string) => void;
  onMapFogChange: (enabled: boolean) => void;
  onMapGridChange: (grid: MapGrid) => void;
  onMapLoadSource: (path: string) => void;
  onMapLoadPreset: (presetId: string) => void;
  onMapPinCreate: (point: MapPoint, label: string, visibility: MapPinVisibility) => void;
  onMapPresent: () => void;
  onMapRevealCreate: (reveal: MapRevealPayload) => void;
  onMapSavePreset: (name: string, state: MapState) => void;
  onMapStop: () => void;
  onMapUndoReveal: () => void;
  onMapUseActiveImage: () => void;
  onMapViewportCommit: (viewport: MapViewport) => void;
  onMapViewportPreview: (viewport: MapViewport) => void;
  onTabChange: (tab: ScreenToolTabId) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  tab: ScreenToolTabId;
  t: Translator;
}) {
  const displayable = canSendToScreen(activeTab?.mediaKind);
  const [popupPreset, setPopupPreset] = useState<DisplayPopupPreset>("plain");
  const [displayTargetPath, setDisplayTargetPath] = useState("");
  const activeTargetLabel = activeTab?.title ?? activeTab?.name ?? t("screen.activeFile");
  const targetPath = displayTargetPath.trim();
  const targetLabel = targetPath || activeTargetLabel;
  const canUseTarget = Boolean(targetPath) || displayable;
  const visiblePopups = displayState?.popups.filter((popup) => popup.visible !== false) ?? [];
  const stagedPopups = displayState?.popups.filter((popup) => popup.visible === false) ?? [];
  const primaryMode = screenPrimaryMode(displayState, mapState);
  const primaryTitle = screenPrimaryTitle(displayState, mapState);
  const primaryStatus =
    primaryMode === "map"
      ? t("screen.playersSeeMap", { target: primaryTitle ?? t("map.noMapLoaded") })
      : primaryMode === "fullscreen"
        ? t("screen.playersSeeFullscreen", { target: primaryTitle ?? t("screen.fullscreen") })
        : t("screen.playersSeeBlank");

  function renderPopupList(popups: DisplayState["popups"], empty: string) {
    if (popups.length === 0) {
      return <p>{empty}</p>;
    }
    return (
      <div className="screen-popup-list">
        {popups.map((popup) => (
          <div className="screen-popup-item" key={popup.id}>
            <span>{popup.title ?? popup.name}</span>
            <small>{popup.preset ?? t("screen.popupPresetPlain")}</small>
            {popup.visible === false ? (
              <button onClick={() => onPopupVisibleChange(popup.id, true)} type="button">
                {t("screen.showPopupToPlayers")}
              </button>
            ) : (
              <button onClick={() => onPopupVisibleChange(popup.id, false)} type="button">
                {t("screen.hidePopupFromPlayers")}
              </button>
            )}
            <button className="button-danger-subtle" onClick={() => onClosePopup(popup.id)} type="button">
              {t("app.close")}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label={t("screen.control")}
      className="screen-tool"
      data-help-context={tab === "map" ? "screen-map" : "screen-display"}
    >
      <InnerToolTabs
        active={tab}
        ariaLabel={t("screen.sections")}
        onChange={onTabChange}
        tabs={[
          { id: "display", label: t("screen.display") },
          { id: "map", label: t("screen.map") }
        ]}
      />
      {tab === "map" ? (
        <MapTool
          activeTab={activeTab}
          actionStatus={mapActionStatus}
          onClearReveals={onMapClearReveals}
          onDeletePin={onMapDeletePin}
          onDeletePreset={onMapDeletePreset}
          onFogChange={onMapFogChange}
          onGridChange={onMapGridChange}
          onLoadSource={onMapLoadSource}
          onLoadPreset={onMapLoadPreset}
          onPinCreate={onMapPinCreate}
          onPickPath={onPickPath}
          onPresent={onMapPresent}
          onRevealCreate={onMapRevealCreate}
          onSavePreset={onMapSavePreset}
          onStop={onMapStop}
          onUndoReveal={onMapUndoReveal}
          onUseActiveImage={onMapUseActiveImage}
          onViewportCommit={onMapViewportCommit}
          onViewportPreview={onMapViewportPreview}
          presets={mapPresets}
          state={mapState}
          t={t}
        />
      ) : (
        <>
      <label>
        {t("screen.fullscreenPath")}
        <div className="inline-input-action">
          <input
            aria-label={t("screen.fullscreenPath")}
            onChange={(event) => setDisplayTargetPath(event.target.value)}
            placeholder={activeTab?.path ?? t("screen.pathPlaceholder")}
            value={displayTargetPath}
          />
          <button
            aria-label={t("screen.chooseTarget")}
            onClick={() => onPickPath("displayable", t("screen.chooseTarget"), setDisplayTargetPath)}
            type="button"
          >
            {t("screen.pick")}
          </button>
        </div>
      </label>
      <div className="screen-actions">
        <button disabled={!canUseTarget} onClick={() => onShowFullscreen(targetPath || undefined)} type="button">
          {targetPath ? t("screen.showPathFullscreen") : t("screen.showActiveFullscreen", { target: targetLabel })}
        </button>
        <button disabled={!canUseTarget} onClick={() => onOpenPopup(popupPreset, targetPath || undefined)} type="button">
          {targetPath ? t("screen.openPopup", { target: targetLabel }) : t("screen.openActivePopup", { target: targetLabel })}
        </button>
        <button disabled={!canUseTarget} onClick={() => onStagePopup(popupPreset, targetPath || undefined)} type="button">
          {targetPath ? t("screen.stagePopup", { target: targetLabel }) : t("screen.stageActivePopup", { target: targetLabel })}
        </button>
        <button className="button-danger-subtle" disabled={!canUseTarget} onClick={() => onClearAndShowFullscreen(targetPath || undefined)} type="button">
          {t("screen.clearShow", { target: targetLabel })}
        </button>
        <button className="button-danger-subtle" onClick={onBlank} type="button">
          {t("screen.blank")}
        </button>
        <button className="button-danger-subtle" onClick={onClearPopups} type="button">
          {t("screen.clearPopups")}
        </button>
        <a href="/screen" rel="noreferrer" target="_blank">
          {t("screen.openPlayer")}
        </a>
      </div>
      <label className="compact-inline-control">
        {t("screen.popupPreset")}
        <select
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
      {!canUseTarget && <p>{t("screen.selectTarget")}</p>}
      <section className="screen-state" aria-label={t("screen.current")}>
        <h3>{t("screen.current")}</h3>
        <p>{primaryStatus}</p>
        {visiblePopups.length > 0 ? (
          <small>{t("screen.playersVisiblePopups", { count: visiblePopups.length })}</small>
        ) : null}
      </section>
      <section className="screen-state" aria-label={t("screen.popups")}>
        <h3>{t("screen.popups")}</h3>
        <h4>{t("screen.visible")}</h4>
        {renderPopupList(visiblePopups, t("screen.noVisiblePopups"))}
        <h4>{t("screen.staged")}</h4>
        {renderPopupList(stagedPopups, t("screen.noStagedPopups"))}
      </section>
        </>
      )}
    </section>
  );
}

function MapTool({
  activeTab,
  actionStatus,
  presets,
  state,
  onClearReveals,
  onDeletePin,
  onDeletePreset,
  onFogChange,
  onGridChange,
  onLoadSource,
  onLoadPreset,
  onPinCreate,
  onPickPath,
  onPresent,
  onRevealCreate,
  onSavePreset,
  onStop,
  onUndoReveal,
  onUseActiveImage,
  onViewportCommit,
  onViewportPreview,
  t
}: {
  activeTab: OpenTab | null;
  actionStatus: MapActionStatus;
  presets: MapPreset[];
  state: MapState | null;
  onClearReveals: () => void;
  onDeletePin: (pinId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onFogChange: (enabled: boolean) => void;
  onGridChange: (grid: MapGrid) => void;
  onLoadSource: (path: string) => void;
  onLoadPreset: (presetId: string) => void;
  onPinCreate: (point: MapPoint, label: string, visibility: MapPinVisibility) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onPresent: () => void;
  onRevealCreate: (reveal: MapRevealPayload) => void;
  onSavePreset: (name: string, state: MapState) => void;
  onStop: () => void;
  onUndoReveal: () => void;
  onUseActiveImage: () => void;
  onViewportCommit: (viewport: MapViewport) => void;
  onViewportPreview: (viewport: MapViewport) => void;
  t: Translator;
}) {
  const currentMap = state ?? {
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
  const [sourcePath, setSourcePath] = useState(currentMap.image_path ?? "");
  const [presetName, setPresetName] = useState("");
  const [draftMap, setDraftMap] = useState<MapState>(currentMap);
  const [tool, setTool] = useState<MapCanvasTool>("pan");
  const [polygonPoints, setPolygonPoints] = useState<MapPoint[]>([]);
  const [mapPanel, setMapPanel] = useState<"live" | "setup">("live");
  const [pinLabel, setPinLabel] = useState("Pin");
  const [pinVisibility, setPinVisibility] = useState<MapPinVisibility>("player");
  const activeImage = Boolean(activeTab && isImageMapCandidate(activeTab.mediaKind));
  const shownMap = draftMap;
  const hasMap = Boolean(shownMap.image_path);

  useEffect(() => {
    setSourcePath(currentMap.image_path ?? "");
  }, [currentMap.image_path]);

  useEffect(() => {
    setDraftMap(currentMap);
  }, [state]);

  useEffect(() => {
    setPolygonPoints([]);
  }, [currentMap.image_path, tool]);

  function handleFogChange(enabled: boolean) {
    setDraftMap((map) => ({ ...map, fog_enabled: enabled }));
    onFogChange(enabled);
  }

  function handleGridChange(grid: MapGrid) {
    setDraftMap((map) => ({ ...map, grid }));
    onGridChange(grid);
  }

  function selectTool(nextTool: MapCanvasTool) {
    setTool(nextTool);
  }

  function handlePolygonCommit() {
    const points = normalizeMapPolygon(polygonPoints);
    if (!points) {
      return;
    }
    onRevealCreate({
      action: tool === "hide-polygon" ? "hide" : "reveal",
      shape: "polygon",
      points
    });
    setPolygonPoints([]);
  }

  const polygonToolActive = tool === "reveal-polygon" || tool === "hide-polygon";
  const polygonReady = Boolean(normalizeMapPolygon(polygonPoints));

  return (
    <section aria-label={t("map.control")} className="map-tool" data-help-context="screen-map">
      <InnerToolTabs
        active={mapPanel}
        ariaLabel={t("map.controls")}
        onChange={setMapPanel}
        tabs={[
          { id: "live", label: t("map.live") },
          { id: "setup", label: t("map.setup") }
        ]}
      />
      <div className="map-tool-status" aria-live="polite">
        <p>{shownMap.image_path ? t("map.current", { map: shownMap.title ?? shownMap.image_path }) : t("map.noMapLoaded")}</p>
        {actionStatus.message && (
          <p className={actionStatus.status === "error" ? "map-tool-error" : "map-tool-message"}>
            {actionStatus.message}
          </p>
        )}
      </div>
      {mapPanel === "live" ? (
        <>
      <div className="map-tool-actions">
        <button disabled={!activeImage} onClick={onUseActiveImage} type="button">
          {t("map.useActiveImage")}
        </button>
        <button disabled={!shownMap.image_path} onClick={onPresent} type="button">
          {t("map.present")}
        </button>
        <button disabled={!shownMap.presenting} onClick={onStop} type="button">
          {t("map.stop")}
        </button>
      </div>
      <div className="map-tool-row">
        <label className="compact-inline-control">
          {t("map.fog")}
          <input
            aria-label={t("map.fog")}
            checked={shownMap.fog_enabled}
            disabled={!hasMap}
            onChange={(event) => handleFogChange(event.target.checked)}
            type="checkbox"
          />
        </label>
        <button disabled={!hasMap || shownMap.reveals.length === 0} onClick={onClearReveals} type="button">
          {t("map.clearReveals")}
        </button>
        <button disabled={!hasMap || shownMap.reveals.length === 0} onClick={onUndoReveal} type="button">
          {t("map.undoReveal")}
        </button>
      </div>
      <div className="map-tool-modes" role="group" aria-label={t("map.mode")}>
        <button aria-pressed={tool === "pan"} disabled={!hasMap} onClick={() => selectTool("pan")} type="button">
          {t("map.pan")}
        </button>
        <button aria-pressed={tool === "reveal"} disabled={!hasMap} onClick={() => selectTool("reveal")} type="button">
          {t("map.revealBox")}
        </button>
        <button aria-pressed={tool === "hide"} disabled={!hasMap} onClick={() => selectTool("hide")} type="button">
          {t("map.hideBox")}
        </button>
        <button
          aria-pressed={tool === "reveal-polygon"}
          disabled={!hasMap}
          onClick={() => selectTool("reveal-polygon")}
          type="button"
        >
          {t("map.revealPolygon")}
        </button>
        <button
          aria-pressed={tool === "hide-polygon"}
          disabled={!hasMap}
          onClick={() => selectTool("hide-polygon")}
          type="button"
        >
          {t("map.hidePolygon")}
        </button>
        <button aria-pressed={tool === "pin"} disabled={!hasMap} onClick={() => selectTool("pin")} type="button">
          {t("map.pin")}
        </button>
        <button aria-pressed={tool === "measure"} disabled={!hasMap} onClick={() => selectTool("measure")} type="button">
          {t("map.measure")}
        </button>
      </div>
      {polygonToolActive && (
        <div className="map-polygon-controls" aria-label={t("map.polygonControls")}>
          <span>{t("map.polygonPoints", { count: polygonPoints.length })}</span>
          <button disabled={!polygonReady} onClick={handlePolygonCommit} type="button">
            {t("map.commitPolygon")}
          </button>
          <button disabled={polygonPoints.length === 0} onClick={() => setPolygonPoints([])} type="button">
            {t("app.cancel")}
          </button>
        </div>
      )}
      {tool === "pin" && (
        <div className="map-pin-controls">
          <label>
            {t("map.pinLabel")}
            <input
              aria-label={t("map.pinLabel")}
              onChange={(event) => setPinLabel(event.target.value)}
              value={pinLabel}
            />
          </label>
          <label>
            {t("map.visibility")}
            <select
              aria-label={t("map.pinVisibility")}
              onChange={(event) => setPinVisibility(event.target.value as MapPinVisibility)}
              value={pinVisibility}
            >
              <option value="player">{t("map.players")}</option>
              <option value="dm">{t("map.dmOnly")}</option>
            </select>
          </label>
        </div>
      )}
      <MapCanvas
        className="map-tool-canvas"
        mediaUrlBuilder={buildMapMediaUrl}
        onPinCreate={(point) => onPinCreate(point, pinLabel, pinVisibility)}
        onPolygonPointAdd={(point) => setPolygonPoints((points) => [...points, point])}
        onRevealCreate={onRevealCreate}
        onViewportCommit={onViewportCommit}
        onViewportPreview={onViewportPreview}
        polygonPoints={polygonPoints}
        state={shownMap}
        tool={tool}
      />
      {shownMap.pins.length > 0 && (
        <section className="map-pin-list" aria-label={t("map.pins")}>
          {shownMap.pins.map((pin) => (
            <div className="map-pin-row" key={pin.id}>
              <span>{pin.label}</span>
              <small>{pin.visibility === "dm" ? t("map.dmOnly") : t("map.players")}</small>
              <button onClick={() => onDeletePin(pin.id)} type="button">
                {t("map.removePin")}
              </button>
            </div>
          ))}
        </section>
      )}
        </>
      ) : (
        <>
      <div className="map-tool-actions">
        <button disabled={!activeImage} onClick={onUseActiveImage} type="button">
          {t("map.useActiveImage")}
        </button>
      </div>
      <label>
        {t("map.imagePath")}
        <div className="inline-input-action">
          <input
            aria-label={t("map.imagePath")}
            onChange={(event) => setSourcePath(event.target.value)}
            placeholder="Media/sample-map.svg"
            value={sourcePath}
          />
          <button
            aria-label={t("map.chooseImage")}
            onClick={() => onPickPath("image", t("map.chooseImageTitle"), setSourcePath)}
            type="button"
          >
            {t("app.pick")}
          </button>
          <button disabled={!sourcePath.trim()} onClick={() => onLoadSource(sourcePath)} type="button">
            {t("map.load")}
          </button>
        </div>
      </label>
      <section className="map-presets" aria-label={t("map.presets")}>
        <label>
          {t("map.presetName")}
          <div className="inline-input-action">
            <input
              aria-label={t("map.presetName")}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder={t("map.presetPlaceholder")}
              value={presetName}
            />
            <button
              disabled={!shownMap.image_path || !presetName.trim()}
              onClick={() => {
                onSavePreset(presetName, shownMap);
                setPresetName("");
              }}
              type="button"
            >
              {t("map.savePreset")}
            </button>
          </div>
        </label>
        {presets.length > 0 ? (
          <div className="map-preset-list">
            {presets.map((preset) => (
              <div className="map-preset-row" key={preset.id}>
                <button
                  aria-label={t("map.loadPreset", { name: preset.name })}
                  onClick={() => onLoadPreset(preset.id)}
                  type="button"
                >
                  {preset.name}
                </button>
                <button
                  aria-label={t("map.deletePreset", { name: preset.name })}
                  className="button-danger-subtle"
                  onClick={() => onDeletePreset(preset.id)}
                  type="button"
                >
                  {t("app.delete")}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <div className="map-grid-controls" aria-label={t("map.grid")}>
        <label className="compact-inline-control">
          {t("map.gridShort")}
          <input
            aria-label={t("map.gridEnabled")}
            checked={shownMap.grid.enabled}
            onChange={(event) => handleGridChange({ ...shownMap.grid, enabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          {t("map.columns")}
          <input
            aria-label={t("map.gridColumns")}
            min={1}
            max={200}
            onChange={(event) =>
              handleGridChange({ ...shownMap.grid, columns: Number(event.target.value) })
            }
            type="number"
            value={shownMap.grid.columns}
          />
        </label>
        <label>
          {t("map.rows")}
          <input
            aria-label={t("map.gridRows")}
            min={1}
            max={200}
            onChange={(event) =>
              handleGridChange({ ...shownMap.grid, rows: Number(event.target.value) })
            }
            type="number"
            value={shownMap.grid.rows}
          />
        </label>
        <label className="compact-inline-control">
          {t("map.gridPlayers")}
          <input
            aria-label={t("map.gridVisiblePlayers")}
            checked={shownMap.grid.visible_to_players}
            onChange={(event) =>
              handleGridChange({ ...shownMap.grid, visible_to_players: event.target.checked })
            }
            type="checkbox"
          />
        </label>
      </div>
        </>
      )}
    </section>
  );
}

function SearchTool({
  inputRef,
  query,
  state,
  t,
  onOpenOtherPane,
  onOpenResult,
  onPeekResult,
  onQueryChange,
  onShowResult,
  onStageResult
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  state: SearchLoadState;
  t: Translator;
  onOpenOtherPane: (result: SearchResult) => void;
  onOpenResult: (result: SearchResult) => void;
  onPeekResult: (result: SearchResult) => void;
  onQueryChange: (query: string) => void;
  onShowResult: (result: SearchResult) => void;
  onStageResult: (result: SearchResult) => void;
}) {
  const groups = state.status === "ready" ? groupSearchResults(state.results) : [];
  const results = groups.flatMap((group) => group.results);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [query, state.status]);

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (["ArrowDown", "ArrowUp", "Home", "End", "Escape"].includes(event.key)) {
      event.preventDefault();
      setSelectedIndex((index) => moveSearchResultSelection(index, event.key, results.length));
      return;
    }
    if (event.key === "Enter") {
      const selected = selectedSearchResult(results, selectedIndex);
      if (selected) {
        event.preventDefault();
        onOpenResult(selected);
      }
    }
  }

  return (
    <section aria-label={t("search.title")} className="search-tool">
      <label htmlFor="world-search">{t("search.world")}</label>
      <input
        id="world-search"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder={t("search.placeholder")}
        ref={inputRef}
        type="search"
        value={query}
      />
      <div className="search-results">
        {state.status === "idle" && <p>{t("search.idle")}</p>}
        {state.status === "loading" && <p>{t("search.loading")}</p>}
        {state.status === "error" && <p>{state.message}</p>}
        {state.status === "ready" && groups.length === 0 && <p>{t("search.noResults")}</p>}
        {groups.map((group) => (
          <section aria-label={`${group.label} Results`} key={group.label}>
            <h3>{group.label}</h3>
            {group.results.map((result) => {
              const resultIndex = results.findIndex((item) => item.path === result.path);
              return (
              <article
                aria-label={`${result.title} ${result.path}`}
                aria-selected={selectedIndex === resultIndex}
                className="search-result"
                key={result.path}
              >
                <button
                  className="search-result-main"
                  onClick={() => onOpenResult(result)}
                  type="button"
                >
                  <span>{result.title}</span>
                  <small>{result.path}</small>
                  {result.tags.length > 0 && <em>{result.tags.join(", ")}</em>}
                  {result.snippet && <p>{result.snippet}</p>}
                </button>
                <div className="search-result-actions">
                  <button onClick={() => onOpenResult(result)} type="button">
                    {t("search.open")}
                  </button>
                  <button onClick={() => onOpenOtherPane(result)} type="button">
                    {t("search.otherPane")}
                  </button>
                  <button onClick={() => onPeekResult(result)} type="button">
                    {t("search.peek")}
                  </button>
                  <button onClick={() => onStageResult(result)} type="button">
                    {t("search.stage")}
                  </button>
                  <button onClick={() => onShowResult(result)} type="button">
                    {t("search.showOnScreen")}
                  </button>
                </div>
              </article>
            )})}
          </section>
        ))}
      </div>
    </section>
  );
}

function AudioBusPlayer({
  bus,
  state,
  onEnded,
  onFadeFinish
}: {
  bus: AudioBus;
  state: AudioBusState;
  onEnded: (bus: AudioBus) => void;
  onFadeFinish: (bus: AudioBus) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.loop = state.playlistMode ? false : state.loop;
    if (state.track && state.playing) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [state.loop, state.playing, state.playlistMode, state.track?.path]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    let frame = 0;
    let cancelled = false;

    const applyVolume = (now: number) => {
      const fade = audioFadeProgress(state, now);
      audio.volume = Math.min(Math.max(state.volume * fade.factor, 0), 1);
      if (state.fadeStatus !== "idle" && fade.progress < 1 && !cancelled) {
        frame = window.requestAnimationFrame(applyVolume);
        return;
      }
      if (state.fadeStatus !== "idle" && !cancelled) {
        onFadeFinish(bus);
      }
    };

    applyVolume(performance.now());

    return () => {
      cancelled = true;
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    bus,
    onFadeFinish,
    state.fadeDurationMs,
    state.fadeStartedAtMs,
    state.fadeStatus,
    state.volume
  ]);

  if (!state.track) {
    return null;
  }

  return (
    <audio
      aria-label={`${busLabel(bus)} audio`}
      onEnded={() => onEnded(bus)}
      ref={audioRef}
      src={buildMediaUrl(state.track.path)}
    />
  );
}

function AudioPlaybackHost({
  mixer,
  onEnded,
  onFadeFinish
}: {
  mixer: AudioMixerState;
  onEnded: (bus: AudioBus) => void;
  onFadeFinish: (bus: AudioBus) => void;
}) {
  return (
    <div className="audio-playback-host">
      {AUDIO_BUSES.map((bus) => (
        <AudioBusPlayer
          bus={bus}
          key={bus}
          onEnded={onEnded}
          onFadeFinish={onFadeFinish}
          state={mixer[bus]}
        />
      ))}
    </div>
  );
}

function AudioTool({
  expansionState,
  mixer,
  onFadeIn,
  onFadeOut,
  onLoadTrack,
  onLoadPlaylist,
  onSavedPlaylistAddCurrentTrack,
  onSavedPlaylistAddTrack,
  onSavedPlaylistBusChange,
  onSavedPlaylistCreate,
  onSavedPlaylistDelete,
  onSavedPlaylistLoopChange,
  onSavedPlaylistMoveTrack,
  onSavedPlaylistPlay,
  onSavedPlaylistRemoveTrack,
  onSavedPlaylistRename,
  onLoopChange,
  onNextTrack,
  onPickPath,
  onPlayingChange,
  onPlaylistLoopChange,
  onPlaylistToggle,
  onPreviousTrack,
  onQueryChange,
  onStopAll,
  onStopBus,
  onVolumeChange,
  query,
  audioLibraryTracks,
  savedPlaylistsState,
  state,
  t
}: {
  expansionState: PlaylistExpansionState;
  mixer: AudioMixerState;
  onFadeIn: (bus: AudioBus) => void;
  onFadeOut: (bus: AudioBus) => void;
  onLoadTrack: (track: AudioTrack) => void;
  onLoadPlaylist: (bus: AudioBus, playlist: string | null, tracks: AudioTrack[]) => void;
  onSavedPlaylistAddCurrentTrack: (playlistId: string) => void;
  onSavedPlaylistAddTrack: (playlistId: string, path: string) => void;
  onSavedPlaylistBusChange: (playlistId: string, bus: AudioBus) => void;
  onSavedPlaylistCreate: (name: string, bus: AudioBus) => void;
  onSavedPlaylistDelete: (playlistId: string) => void;
  onSavedPlaylistLoopChange: (playlistId: string, loop: boolean) => void;
  onSavedPlaylistMoveTrack: (playlistId: string, index: number, direction: -1 | 1) => void;
  onSavedPlaylistPlay: (playlistId: string) => void;
  onSavedPlaylistRemoveTrack: (playlistId: string, path: string) => void;
  onSavedPlaylistRename: (playlistId: string, name: string) => void;
  onLoopChange: (bus: AudioBus, loop: boolean) => void;
  onNextTrack: (bus: AudioBus) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onPlayingChange: (bus: AudioBus, playing: boolean) => void;
  onPlaylistLoopChange: (bus: AudioBus, loop: boolean) => void;
  onPlaylistToggle: (bus: AudioBus, playlist: string | null) => void;
  onPreviousTrack: (bus: AudioBus) => void;
  onQueryChange: (query: string) => void;
  onStopAll: () => void;
  onStopBus: (bus: AudioBus) => void;
  onVolumeChange: (bus: AudioBus, volume: number) => void;
  query: string;
  audioLibraryTracks: AudioTrack[];
  savedPlaylistsState: AudioPlaylistLoadState;
  state: AudioLoadState;
  t: Translator;
}) {
  const libraryTracks = state.status === "ready" ? state.tracks : [];
  const savedLibraryTracks = audioLibraryTracks.length > 0 ? audioLibraryTracks : libraryTracks;
  const groupsByBus = groupAudioTracksByBus(libraryTracks);
  const resolvedSavedPlaylists = resolveAudioPlaylists(
    savedPlaylistsState.playlists,
    savedLibraryTracks
  );
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistBus, setNewPlaylistBus] = useState<AudioBus>("ambient");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [trackPathDrafts, setTrackPathDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setRenameDrafts((current) => {
      const next: Record<string, string> = {};
      for (const playlist of savedPlaylistsState.playlists) {
        next[playlist.id] = current[playlist.id] ?? playlist.name;
      }
      return next;
    });
  }, [savedPlaylistsState.playlists]);

  function audioBusName(bus: AudioBus): string {
    return t(`audio.busName.${bus}`);
  }

  function handleCreatePlaylist() {
    onSavedPlaylistCreate(newPlaylistName, newPlaylistBus);
    setNewPlaylistName("");
  }

  function handleAddTrack(playlistId: string) {
    const path = trackPathDrafts[playlistId]?.trim() ?? "";
    if (!path) {
      return;
    }
    onSavedPlaylistAddTrack(playlistId, path);
    setTrackPathDrafts((drafts) => ({ ...drafts, [playlistId]: "" }));
  }

  return (
    <section aria-label={t("audio.control")} className="audio-tool" data-help-context="audio">
      <label className="audio-search-label" htmlFor="audio-search">
        {t("audio.search")}
        <input
          id="audio-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("audio.searchPlaceholder")}
          type="search"
          value={query}
        />
      </label>
      <section className="audio-saved-playlists" aria-label={t("audio.savedPlaylists")}>
        <div className="audio-saved-heading">
          <h3>{t("audio.savedPlaylists")}</h3>
          {savedPlaylistsState.status === "loading" && <small>{t("audio.savedLoading")}</small>}
          {savedPlaylistsState.status === "saving" && <small>{t("audio.savedSaving")}</small>}
          {savedPlaylistsState.status === "ready" && savedPlaylistsState.message && (
            <small>{savedPlaylistsState.message}</small>
          )}
          {savedPlaylistsState.status === "error" && <small>{savedPlaylistsState.message}</small>}
        </div>
        <div className="audio-saved-create-row">
          <input
            aria-label={t("audio.savedPlaylistName")}
            onChange={(event) => setNewPlaylistName(event.target.value)}
            placeholder={t("audio.savedPlaylistNamePlaceholder")}
            type="text"
            value={newPlaylistName}
          />
          <select
            aria-label={t("audio.savedPlaylistBus")}
            onChange={(event) => setNewPlaylistBus(event.target.value as AudioBus)}
            value={newPlaylistBus}
          >
            {AUDIO_BUSES.map((bus) => (
              <option key={bus} value={bus}>
                {audioBusName(bus)}
              </option>
            ))}
          </select>
          <button onClick={handleCreatePlaylist} type="button">
            {t("audio.savedNew")}
          </button>
        </div>
        {savedPlaylistsState.status !== "loading" && resolvedSavedPlaylists.length === 0 && (
          <p>{t("audio.savedEmpty")}</p>
        )}
        {resolvedSavedPlaylists.map((playlist) => {
          const currentTrack = mixer[playlist.bus].track;
          const renameDraft = renameDrafts[playlist.id] ?? playlist.name;
          const trackPathDraft = trackPathDrafts[playlist.id] ?? "";
          return (
            <section
              aria-label={t("audio.savedPlaylistRegion", { name: playlist.name })}
              className="audio-saved-playlist"
              key={playlist.id}
            >
              <div className="audio-saved-title-row">
                <input
                  aria-label={t("audio.renameSavedPlaylist", { name: playlist.name })}
                  onChange={(event) =>
                    setRenameDrafts((drafts) => ({
                      ...drafts,
                      [playlist.id]: event.target.value
                    }))
                  }
                  value={renameDraft}
                />
                <button
                  disabled={renameDraft.trim() === playlist.name}
                  onClick={() => onSavedPlaylistRename(playlist.id, renameDraft)}
                  type="button"
                >
                  {t("audio.rename")}
                </button>
                <button
                  disabled={playlist.tracks.length === 0}
                  onClick={() => onSavedPlaylistPlay(playlist.id)}
                  type="button"
                >
                  {t("audio.playSaved")}
                </button>
                <button onClick={() => onSavedPlaylistDelete(playlist.id)} type="button">
                  {t("audio.deleteSaved")}
                </button>
              </div>
              <div className="audio-saved-options-row">
                <label>
                  {t("audio.savedPlaylistBus")}
                  <select
                    aria-label={t("audio.savedPlaylistBusFor", { name: playlist.name })}
                    onChange={(event) =>
                      onSavedPlaylistBusChange(playlist.id, event.target.value as AudioBus)
                    }
                    value={playlist.bus}
                  >
                    {AUDIO_BUSES.map((bus) => (
                      <option key={bus} value={bus}>
                        {audioBusName(bus)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("audio.savedLoop")}
                  <input
                    checked={playlist.loop}
                    onChange={(event) =>
                      onSavedPlaylistLoopChange(playlist.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>
                <button
                  disabled={!currentTrack}
                  onClick={() => onSavedPlaylistAddCurrentTrack(playlist.id)}
                  type="button"
                >
                  {t("audio.addCurrent")}
                </button>
              </div>
              <div className="audio-saved-add-row">
                <input
                  aria-label={t("audio.addTrackPath", { name: playlist.name })}
                  onChange={(event) =>
                    setTrackPathDrafts((drafts) => ({
                      ...drafts,
                      [playlist.id]: event.target.value
                    }))
                  }
                  placeholder=".music/..."
                  type="text"
                  value={trackPathDraft}
                />
                <button
                  onClick={() =>
                    onPickPath("audio", t("audio.chooseSavedTrack"), (path) =>
                      setTrackPathDrafts((drafts) => ({
                        ...drafts,
                        [playlist.id]: path
                      }))
                    )
                  }
                  type="button"
                >
                  {t("app.pick")}
                </button>
                <button disabled={!trackPathDraft.trim()} onClick={() => handleAddTrack(playlist.id)} type="button">
                  {t("audio.addTrack")}
                </button>
              </div>
              {playlist.track_paths.length === 0 ? (
                <p>{t("audio.noSavedTracks")}</p>
              ) : (
                <ol className="audio-saved-track-list">
                  {playlist.track_paths.map((path, index) => {
                    const track = playlist.tracks.find((candidate) => candidate.path === path);
                    return (
                      <li className={track ? "" : "audio-track-missing"} key={`${playlist.id}:${path}`}>
                        <span title={path}>
                          {track ? displayAudioTrackTitle(track) : t("audio.missingTrack", { path })}
                        </span>
                        <div className="audio-saved-track-actions">
                          <button
                            aria-label={t("audio.moveTrackUp", { path })}
                            disabled={index === 0}
                            onClick={() => onSavedPlaylistMoveTrack(playlist.id, index, -1)}
                            type="button"
                          >
                            ↑
                          </button>
                          <button
                            aria-label={t("audio.moveTrackDown", { path })}
                            disabled={index === playlist.track_paths.length - 1}
                            onClick={() => onSavedPlaylistMoveTrack(playlist.id, index, 1)}
                            type="button"
                          >
                            ↓
                          </button>
                          <button
                            aria-label={t("audio.removeTrack", { path })}
                            onClick={() => onSavedPlaylistRemoveTrack(playlist.id, path)}
                            type="button"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </section>
      <div className="audio-buses">
        {AUDIO_BUSES.map((bus) => {
          const busState = mixer[bus];
          const groups = groupsByBus[bus];
          const busName = audioBusName(bus);
          return (
            <section className="audio-bus" aria-label={t("audio.bus", { bus: busName })} key={bus}>
              <div className="audio-bus-heading">
                <h3>{t("audio.currentBus", { bus: busName })}</h3>
                <span>
                  {t("audio.currentTrack", {
                    track: busState.track ? displayAudioTrackTitle(busState.track) : t("audio.empty")
                  })}
                </span>
              </div>
              {busState.track && (
                <div className="audio-queue-line">
                  <span>{t("audio.queueState", { queue: audioQueueLabel(busState) })}</span>
                  {busState.fadeStatus !== "idle" && (
                    <small>{busState.fadeStatus === "fading_in" ? t("audio.fadingIn") : t("audio.fadingOut")}</small>
                  )}
                </div>
              )}
              <div className="audio-player-row">
                <div className="audio-bus-actions">
                  <button
                    disabled={!busState.track}
                    onClick={() => onPlayingChange(bus, !busState.playing)}
                    type="button"
                  >
                    {busState.playing ? t("audio.pause") : t("audio.play")}
                  </button>
                  <button disabled={!busState.track} onClick={() => onStopBus(bus)} type="button">
                    {t("audio.stop")}
                  </button>
                  <button
                    disabled={!busState.playlistMode}
                    onClick={() => onPreviousTrack(bus)}
                    type="button"
                  >
                    {t("audio.prev")}
                  </button>
                  <button
                    disabled={!busState.playlistMode}
                    onClick={() => onNextTrack(bus)}
                    type="button"
                  >
                    {t("audio.next")}
                  </button>
                  <button disabled={!busState.track} onClick={() => onFadeIn(bus)} type="button">
                    {t("audio.fadeIn")}
                  </button>
                  <button
                    disabled={!busState.track || !busState.playing}
                    onClick={() => onFadeOut(bus)}
                    type="button"
                  >
                    {t("audio.fadeOut")}
                  </button>
                  <label>
                    {t("audio.track")}
                    <input
                      checked={busState.loop}
                      onChange={(event) => onLoopChange(bus, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                  <label>
                    {t("audio.queue")}
                    <input
                      checked={busState.playlistLoop}
                      onChange={(event) => onPlaylistLoopChange(bus, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                </div>
                <label className="audio-volume">
                  <span>{t("audio.volume")}</span>
                  <input
                    aria-label={t("audio.busVolume", { bus: busName })}
                    max="1"
                    min="0"
                    onChange={(event) => onVolumeChange(bus, Number(event.target.value))}
                    step="0.01"
                    type="range"
                    value={busState.volume}
                  />
                </label>
              </div>
              <div className="audio-playlists" aria-label={t("audio.playlists", { bus: busName })}>
                {state.status === "idle" && <p>{t("audio.openLibrary")}</p>}
                {state.status === "loading" && <p>{t("audio.scanning")}</p>}
                {state.status === "error" && <p>{state.message}</p>}
                {state.status === "ready" && groups.length === 0 && <p>{t("audio.noTracks")}</p>}
                {groups.map((group) => {
                  const expanded = expansionState[playlistExpansionKey(bus, group.playlist)] ?? false;
                  return (
                    <section className="audio-playlist" key={group.playlist ?? "tracks"}>
                      <div className="audio-playlist-title-row">
                        <button
                          aria-expanded={expanded}
                          className="audio-playlist-header"
                          onClick={() => onPlaylistToggle(bus, group.playlist)}
                          type="button"
                        >
                          <span>{group.playlist ?? t("audio.tracks")}</span>
                          <small>{group.tracks.length}</small>
                        </button>
                        <button
                          aria-label={t("audio.queuePlaylist", { bus: busName, playlist: group.playlist ?? t("audio.tracks") })}
                          className="audio-playlist-play"
                          onClick={() => onLoadPlaylist(bus, group.playlist, group.tracks)}
                          type="button"
                        >
                          {t("audio.loadQueue")}
                        </button>
                      </div>
                      {expanded && (
                        <div className="audio-track-list">
                          {group.tracks.map((track) => (
                            <button
                              className="audio-result"
                              key={track.path}
                              onClick={() => onLoadTrack(track)}
                              title={track.path}
                              type="button"
                            >
                              {displayAudioTrackTitle(track)}
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <button className="audio-stop-all" onClick={onStopAll} type="button">
        {t("audio.stopAll")}
      </button>
    </section>
  );
}

function FastSlotBar({
  slots,
  t,
  onTrigger
}: {
  slots: FastSlot[];
  t: Translator;
  onTrigger: (slot: FastSlot) => void;
}) {
  const slotByPosition = new Map(slots.map((slot) => [slot.position, slot]));

  return (
    <nav className="fast-slot-bar" aria-label={t("fastSlots.title")}>
      {Array.from({ length: 10 }, (_, index) => index + 1).map((position) => {
        const slot = slotByPosition.get(position);
        const keyLabel = position === 10 ? "0" : String(position);
        return (
          <button
            aria-label={
              slot
                ? t("fastSlots.slot", { position: keyLabel, label: slot.label })
                : t("fastSlots.slotEmpty", { position: keyLabel })
            }
            className={`fast-slot${slot ? " fast-slot-assigned" : ""}`}
            disabled={!slot}
            key={position}
            onClick={() => slot && onTrigger(slot)}
            title={slot ? fastSlotSummary(slot) : `Alt+${position === 10 ? 0 : position}`}
            type="button"
          >
            <span>{keyLabel}</span>
            <strong>{slot?.icon ?? slot?.label ?? t("fastSlots.empty")}</strong>
          </button>
        );
      })}
    </nav>
  );
}

function LinkContextMenu({
  state,
  onClose,
  onCopyPath,
  onOpen,
  onOpenOtherPane,
  onPeek,
  onShowPopup,
  onStagePopup
}: {
  state: LinkContextMenuState;
  onClose: () => void;
  onCopyPath: (link: PageLink) => void;
  onOpen: (link: PageLink) => void;
  onOpenOtherPane: (link: PageLink) => void;
  onPeek: (link: PageLink) => void;
  onShowPopup: (link: PageLink) => void;
  onStagePopup: (link: PageLink) => void;
}) {
  if (!state.open) {
    return null;
  }
  const disabled = !state.link.resolved || !state.link.target_path;
  return (
    <div
      className="link-context-menu"
      role="menu"
      style={{ left: state.x, top: state.y }}
    >
      <button disabled={disabled} onClick={() => { onOpen(state.link); onClose(); }} type="button">
        Open
      </button>
      <button disabled={disabled} onClick={() => { onOpenOtherPane(state.link); onClose(); }} type="button">
        Open Other Pane
      </button>
      <button disabled={disabled} onClick={() => { onPeek(state.link); onClose(); }} type="button">
        Peek
      </button>
      <button disabled={disabled} onClick={() => { onStagePopup(state.link); onClose(); }} type="button">
        Stage on Screen
      </button>
      <button disabled={disabled} onClick={() => { onShowPopup(state.link); onClose(); }} type="button">
        Show on Screen
      </button>
      <button onClick={() => { onCopyPath(state.link); onClose(); }} type="button">
        Copy Path
      </button>
    </div>
  );
}

function PeekDialog({
  state,
  completions,
  onClose,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink
}: {
  state: PeekState;
  completions: CodeEditorCompletion[];
  onClose: () => void;
  onContextLink: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink: (link: PageLink) => void;
}) {
  if (!state.open) {
    return null;
  }
  return (
    <div className="peek-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label={`Peek ${state.tab.title ?? state.tab.name}`}
        className="peek-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{state.tab.title ?? state.tab.name}</h2>
          <button aria-label="Close peek" onClick={onClose} type="button">
            x
          </button>
        </div>
        <FileViewer
          completions={completions}
          draft={null}
          links={state.linksState.status === "ready" ? state.linksState.outgoing : []}
          loadState={state.fileState}
          onContextLink={onContextLink}
          onCsvDraftChange={() => {}}
          onDiceRoll={onDiceRoll}
          onDraftContentChange={() => {}}
          onOpenLink={onOpenLink}
          onPeekLink={onPeekLink}
          tab={state.tab}
        />
      </section>
    </div>
  );
}

function ActionsTool({
  activeTab,
  actionBindings,
  bindingMessage,
  mapPresets,
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
  mapPresets: MapPreset[];
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
  const [bindingKind, setBindingKind] = useState<BindingActionKind>("open_file");
  const [bindingPath, setBindingPath] = useState("");
  const [bindingPopupPreset, setBindingPopupPreset] =
    useState<DisplayPopupPreset>("plain");
  const [bindingMapPresetId, setBindingMapPresetId] = useState("");
  const [bindingMapPresetPresent, setBindingMapPresetPresent] = useState(true);
  const [bindingSnapshotId, setBindingSnapshotId] = useState("");
  const [bindingLocalMessage, setBindingLocalMessage] = useState<string | null>(null);
  const [midiBindingId, setMidiBindingId] = useState<string | null>(null);
  const [midiBindingLabel, setMidiBindingLabel] = useState("");
  const [midiBindingKind, setMidiBindingKind] = useState<BindingActionKind>("open_file");
  const [midiBindingPath, setMidiBindingPath] = useState("");
  const [midiBindingPopupPreset, setMidiBindingPopupPreset] =
    useState<DisplayPopupPreset>("plain");
  const [midiBindingMapPresetId, setMidiBindingMapPresetId] = useState("");
  const [midiBindingMapPresetPresent, setMidiBindingMapPresetPresent] = useState(true);
  const [midiBindingSnapshotId, setMidiBindingSnapshotId] = useState("");
  const [midiBindingMessageValue, setMidiBindingMessageValue] =
    useState<MidiMessage | null>(null);
  const [midiBindingInputId, setMidiBindingInputId] = useState<string | null>(null);
  const [midiBindingInputName, setMidiBindingInputName] = useState<string | null>(null);
  const [midiLocalMessage, setMidiLocalMessage] = useState<string | null>(null);
  const existing = slots.find((slot) => slot.position === position);
  const selectedMapPreset = mapPresets.find((preset) => preset.id === mapPresetId);
  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === snapshotSelectedId);
  const selectedBindingMapPreset = mapPresets.find((preset) => preset.id === bindingMapPresetId);
  const selectedBindingSnapshot = snapshots.find((snapshot) => snapshot.id === bindingSnapshotId);
  const selectedMidiBindingMapPreset = mapPresets.find(
    (preset) => preset.id === midiBindingMapPresetId
  );
  const selectedMidiBindingSnapshot = snapshots.find(
    (snapshot) => snapshot.id === midiBindingSnapshotId
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
    setBindingKind("open_file");
    setBindingPath("");
    setBindingPopupPreset("plain");
    setBindingMapPresetId("");
    setBindingMapPresetPresent(true);
    setBindingSnapshotId("");
    setBindingLocalMessage(null);
  }

  function resetMidiBindingForm() {
    setMidiBindingId(null);
    setMidiBindingLabel("");
    setMidiBindingKind("open_file");
    setMidiBindingPath("");
    setMidiBindingPopupPreset("plain");
    setMidiBindingMapPresetId("");
    setMidiBindingMapPresetPresent(true);
    setMidiBindingSnapshotId("");
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
    const action = binding.action;
    setBindingKind(action.kind as BindingActionKind);
    setBindingPath("path" in action && typeof action.path === "string" ? action.path : "");
    setBindingPopupPreset(
      action.kind === "screen_popup" && action.preset ? action.preset : "plain"
    );
    setBindingMapPresetId(action.kind === "map_preset" ? action.preset_id : "");
    setBindingMapPresetPresent(action.kind === "map_preset" ? action.present : true);
    setBindingSnapshotId(
      action.kind === "table_snapshot_restore" ? action.snapshot_id : ""
    );
  }

  function editMidiBinding(binding: MidiBinding) {
    setMidiBindingId(binding.id);
    setMidiBindingLabel(binding.label);
    setMidiBindingMessageValue(binding.message);
    setMidiBindingInputId(binding.input_id);
    setMidiBindingInputName(binding.input_name);
    setMidiLocalMessage(null);
    onClearMidiLearned();
    const action = binding.action;
    setMidiBindingKind(action.kind as BindingActionKind);
    setMidiBindingPath("path" in action && typeof action.path === "string" ? action.path : "");
    setMidiBindingPopupPreset(
      action.kind === "screen_popup" && action.preset ? action.preset : "plain"
    );
    setMidiBindingMapPresetId(action.kind === "map_preset" ? action.preset_id : "");
    setMidiBindingMapPresetPresent(action.kind === "map_preset" ? action.present : true);
    setMidiBindingSnapshotId(
      action.kind === "table_snapshot_restore" ? action.snapshot_id : ""
    );
  }

  function buildBindingAction(): { action: ActionBindingAction; labelHint?: string } | { error: string } {
    if (bindingKind === "table_snapshot_restore") {
      if (!bindingSnapshotId) {
        return { error: "Choose a table state snapshot." };
      }
      return {
        action: { kind: "table_snapshot_restore", snapshot_id: bindingSnapshotId },
        labelHint: selectedBindingSnapshot?.name
      };
    }

    const result = buildFastSlotAction({
      kind: bindingKind,
      path: bindingPath,
      preset: bindingPopupPreset,
      presetId: bindingMapPresetId,
      present: bindingMapPresetPresent
    });
    if (!result.action) {
      return { error: result.error ?? "Could not build binding action." };
    }
    return {
      action: result.action,
      labelHint:
        selectedBindingMapPreset?.name ||
        activeTab?.title ||
        activeTab?.name
    };
  }

  function buildMidiBindingAction(): { action: ActionBindingAction; labelHint?: string } | { error: string } {
    if (midiBindingKind === "table_snapshot_restore") {
      if (!midiBindingSnapshotId) {
        return { error: "Choose a table state snapshot." };
      }
      return {
        action: { kind: "table_snapshot_restore", snapshot_id: midiBindingSnapshotId },
        labelHint: selectedMidiBindingSnapshot?.name
      };
    }

    const result = buildFastSlotAction({
      kind: midiBindingKind,
      path: midiBindingPath,
      preset: midiBindingPopupPreset,
      presetId: midiBindingMapPresetId,
      present: midiBindingMapPresetPresent
    });
    if (!result.action) {
      return { error: result.error ?? "Could not build MIDI action." };
    }
    return {
      action: result.action,
      labelHint:
        selectedMidiBindingMapPreset?.name ||
        activeTab?.title ||
        activeTab?.name
    };
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
          <label>
            {t("actions.bindingType")}
            <select
              aria-label="Keyboard binding type"
              onChange={(event) => setBindingKind(event.target.value as BindingActionKind)}
              value={bindingKind}
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
          {bindingKind === "map_preset" ? (
            <label>
              {t("actions.mapPreset")}
              <select
                aria-label="Keyboard binding map preset"
                onChange={(event) => setBindingMapPresetId(event.target.value)}
                value={bindingMapPresetId}
              >
                <option value="">{t("actions.choosePreset")}</option>
                {mapPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          ) : bindingKind === "table_snapshot_restore" ? (
            <label>
              {t("actions.tableState")}
              <select
                aria-label="Keyboard binding table state"
                onChange={(event) => setBindingSnapshotId(event.target.value)}
                value={bindingSnapshotId}
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
              {renderPathInput(
                bindingPath,
                setBindingPath,
                bindingKind,
                "Keyboard binding target",
                bindingKind === "screen_fullscreen" || bindingKind === "screen_popup"
                  ? activeTab?.path ?? t("screen.pathPlaceholder")
                  : bindingKind === "audio_track"
                    ? ".music/effects/file.mp3"
                    : bindingKind === "script_run"
                      ? "Scripts/hello_world.dms"
                      : "README.md",
                "Choose Keyboard Binding Target",
                "Choose keyboard binding target"
              )}
            </label>
          )}
          {bindingKind === "screen_popup" && (
            <label>
              {t("actions.preset")}
              <select
                aria-label="Keyboard binding popup preset"
                onChange={(event) => setBindingPopupPreset(event.target.value as DisplayPopupPreset)}
                value={bindingPopupPreset}
              >
                <option value="plain">{t("screen.popupPlain")}</option>
                <option value="note">{t("screen.popupNote")}</option>
                <option value="letter">{t("screen.popupLetter")}</option>
                <option value="portrait">{t("screen.popupPortrait")}</option>
                <option value="clue">{t("screen.popupClue")}</option>
              </select>
            </label>
          )}
          {bindingKind === "map_preset" && (
            <label className="compact-inline-control">
              {t("actions.present")}
              <input
                aria-label="Keyboard binding presents map preset"
                checked={bindingMapPresetPresent}
                onChange={(event) => setBindingMapPresetPresent(event.target.checked)}
                type="checkbox"
              />
            </label>
          )}
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
              const result = buildBindingAction();
              if ("error" in result) {
                setBindingLocalMessage(result.error);
                return;
              }
              const id = bindingId ?? `binding-${Date.now().toString(36)}`;
              onSaveBinding({
                id,
                label:
                  bindingLabel.trim() ||
                  result.labelHint ||
                  selectedBindingSnapshot?.name ||
                  selectedBindingMapPreset?.name ||
                  activeTab?.title ||
                  activeTab?.name ||
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
          <label>
            {t("actions.bindingType")}
            <select
              aria-label="MIDI binding type"
              onChange={(event) => setMidiBindingKind(event.target.value as BindingActionKind)}
              value={midiBindingKind}
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
          {midiBindingKind === "map_preset" ? (
            <label>
              {t("actions.mapPreset")}
              <select
                aria-label="MIDI binding map preset"
                onChange={(event) => setMidiBindingMapPresetId(event.target.value)}
                value={midiBindingMapPresetId}
              >
                <option value="">{t("actions.choosePreset")}</option>
                {mapPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          ) : midiBindingKind === "table_snapshot_restore" ? (
            <label>
              {t("actions.tableState")}
              <select
                aria-label="MIDI binding table state"
                onChange={(event) => setMidiBindingSnapshotId(event.target.value)}
                value={midiBindingSnapshotId}
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
              {renderPathInput(
                midiBindingPath,
                setMidiBindingPath,
                midiBindingKind,
                "MIDI binding target",
                midiBindingKind === "screen_fullscreen" || midiBindingKind === "screen_popup"
                  ? activeTab?.path ?? t("screen.pathPlaceholder")
                  : midiBindingKind === "audio_track"
                    ? ".music/effects/file.mp3"
                    : midiBindingKind === "script_run"
                      ? "Scripts/hello_world.dms"
                      : "README.md",
                "Choose MIDI Binding Target",
                "Choose MIDI binding target"
              )}
            </label>
          )}
          {midiBindingKind === "screen_popup" && (
            <label>
              {t("actions.preset")}
              <select
                aria-label="MIDI binding popup preset"
                onChange={(event) =>
                  setMidiBindingPopupPreset(event.target.value as DisplayPopupPreset)
                }
                value={midiBindingPopupPreset}
              >
                <option value="plain">{t("screen.popupPlain")}</option>
                <option value="note">{t("screen.popupNote")}</option>
                <option value="letter">{t("screen.popupLetter")}</option>
                <option value="portrait">{t("screen.popupPortrait")}</option>
                <option value="clue">{t("screen.popupClue")}</option>
              </select>
            </label>
          )}
          {midiBindingKind === "map_preset" && (
            <label className="compact-inline-control">
              {t("actions.present")}
              <input
                aria-label="MIDI binding presents map preset"
                checked={midiBindingMapPresetPresent}
                onChange={(event) => setMidiBindingMapPresetPresent(event.target.checked)}
                type="checkbox"
              />
            </label>
          )}
        </div>
        {midiStatusMessage && (
          <p className={`tool-note${midiStatusIsError ? " tool-error" : ""}`}>
            {midiStatusMessage}
          </p>
        )}
        <div className="inline-actions">
          <button
            onClick={() => {
              const result = buildMidiBindingAction();
              if ("error" in result) {
                setMidiLocalMessage(result.error);
                return;
              }
              const validationError = midiBindingValidationError(
                {
                  label:
                    midiBindingLabel.trim() ||
                    result.labelHint ||
                    selectedMidiBindingSnapshot?.name ||
                    selectedMidiBindingMapPreset?.name ||
                    activeTab?.title ||
                    activeTab?.name ||
                    "MIDI binding",
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
                label:
                  midiBindingLabel.trim() ||
                  result.labelHint ||
                  selectedMidiBindingSnapshot?.name ||
                  selectedMidiBindingMapPreset?.name ||
                  activeTab?.title ||
                  activeTab?.name ||
                  "MIDI binding",
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

function AssistantTool({
  activeDocumentLabel,
  canUseActiveDocument,
  context,
  contextSource,
  form,
  forms,
  onCheckProvider,
  onContextChange,
  onCopy,
  onFieldChange,
  onFormChange,
  onGenerate,
  onSave,
  onSaveKindChange,
  onSavePathChange,
  onUseActiveDocument,
  provider,
  result,
  saveKind,
  savePath,
  status,
  t,
  values
}: {
  activeDocumentLabel: string;
  canUseActiveDocument: boolean;
  context: string;
  contextSource: string | null;
  form: AssistantForm;
  forms: AssistantForm[];
  onCheckProvider: () => void;
  onContextChange: (context: string) => void;
  onCopy: () => void;
  onFieldChange: (name: string, value: AssistantFieldValue) => void;
  onFormChange: (formId: string) => void;
  onGenerate: () => void;
  onSave: () => void;
  onSaveKindChange: (kind: AssistantSaveKind) => void;
  onSavePathChange: (path: string) => void;
  onUseActiveDocument: () => void;
  provider: AssistantProviderState;
  result: AssistantResult | null;
  saveKind: AssistantSaveKind;
  savePath: string;
  status: AssistantStatus;
  t: Translator;
  values: AssistantFormValues;
}) {
  const busy =
    provider.status === "checking" ||
    status.status === "loading" ||
    status.status === "generating" ||
    status.status === "saving";
  const fullContextPreview = buildLlmContextPreview(
    assistantContextSources(context, contextSource)
  );
  const contextPreview = fullContextPreview.text
    ? fullContextPreview.text.slice(0, 420)
    : t("llm.contextEmpty");
  const providerLabel =
    provider.status === "ready"
      ? [provider.provider, provider.model].filter(Boolean).join(" / ") || t("llm.providerStatus.ready")
      : localizedOrFallback(t, `llm.providerStatus.${provider.status}`, provider.status);
  const providerMessage =
    provider.status === "unavailable" ? t("llm.configUnavailable") : provider.message;
  const providerStatusCard = (
    <div className={`assistant-provider assistant-provider-${provider.status}`}>
      <div>
        <span>{t("llm.provider")}</span>
        <strong>{providerLabel}</strong>
        {providerMessage && <small>{providerMessage}</small>}
      </div>
      <button disabled={busy} onClick={onCheckProvider} type="button">
        {t("llm.checkProvider")}
      </button>
    </div>
  );

  if (provider.status !== "ready") {
    return (
      <section aria-label={t("llm.title")} className="assistant-tool assistant-tool-compact" data-help-context="assistant">
        {providerStatusCard}
      </section>
    );
  }

  return (
    <section aria-label={t("llm.title")} className="assistant-tool" data-help-context="assistant">
      {providerStatusCard}
      <label>
        {t("llm.form")}
        <select
          disabled={busy}
          onChange={(event) => onFormChange(event.target.value)}
          value={form.id}
        >
          {forms.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {form.description && <p className="tool-note">{form.description}</p>}
      <div className="assistant-fields">
        {form.fields.map((field) => {
          const value = values[field.name] ?? field.default ?? "";
          return (
            <label key={field.name}>
              {field.label}
              {field.input_type === "boolean" ? (
                <input
                  checked={Boolean(value)}
                  disabled={busy}
                  onChange={(event) => onFieldChange(field.name, event.target.checked)}
                  type="checkbox"
                />
              ) : field.input_type === "select" ? (
                <select
                  disabled={busy}
                  onChange={(event) => onFieldChange(field.name, event.target.value)}
                  value={String(value)}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {assistantOptionLabel(field.name, option, t)}
                    </option>
                  ))}
                </select>
              ) : field.input_type === "textarea" ? (
                <textarea
                  disabled={busy}
                  onChange={(event) => onFieldChange(field.name, event.target.value)}
                  placeholder={field.placeholder ?? undefined}
                  rows={2}
                  value={String(value)}
                />
              ) : (
                <input
                  disabled={busy}
                  onChange={(event) =>
                    onFieldChange(
                      field.name,
                      field.input_type === "number"
                        ? Number(event.target.value)
                        : event.target.value
                    )
                  }
                  placeholder={field.placeholder ?? undefined}
                  type={field.input_type === "number" ? "number" : "text"}
                  value={String(value)}
                />
              )}
            </label>
          );
        })}
      </div>
      <label>
        {t("llm.explicitContext")}
        <textarea
          disabled={busy}
          onChange={(event) => onContextChange(event.target.value)}
          placeholder={t("llm.contextPlaceholder")}
          rows={2}
          value={context}
        />
      </label>
      <div className="assistant-context-row">
        <button disabled={busy || !canUseActiveDocument} onClick={onUseActiveDocument} type="button">
          {t("llm.useActiveDocument")}
        </button>
        <small>{contextSource ?? activeDocumentLabel}</small>
      </div>
      <section className="assistant-preview" aria-label={t("llm.contextPreview")}>
        <strong>{t("llm.contextPreview")}</strong>
        <p>{contextPreview}</p>
        {fullContextPreview.trimmed && (
          <small>{t("llm.contextTrimmed", { count: fullContextPreview.includedCharacters })}</small>
        )}
      </section>
      <button
        className="assistant-generate"
        disabled={busy || provider.status !== "ready"}
        onClick={onGenerate}
        type="button"
      >
        {status.status === "generating" ? t("llm.generating") : t("llm.generate")}
      </button>
      {result && (
        <section className="assistant-result" aria-label={t("llm.temporaryResult")}>
          <div>
            <strong>{t("llm.temporaryResult")}</strong>
            {(result.provider || result.model) && (
              <small>{[result.provider, result.model].filter(Boolean).join(" / ")}</small>
            )}
          </div>
          <pre>{result.content}</pre>
          <div className="assistant-save-grid">
            <label>
              {t("llm.saveAs")}
              <select
                disabled={status.status === "saving"}
                onChange={(event) => onSaveKindChange(event.target.value as AssistantSaveKind)}
                value={saveKind}
              >
                <option value="markdown">{t("llm.saveAsNote")}</option>
                <option value="card">{t("llm.saveAsCard")}</option>
              </select>
            </label>
            <label>
              {t("llm.savePath")}
              <input
                disabled={status.status === "saving"}
                onChange={(event) => onSavePathChange(event.target.value)}
                value={savePath}
              />
            </label>
          </div>
          <div className="assistant-actions">
            <button disabled={status.status === "saving"} onClick={onCopy} type="button">
              {t("app.copy")}
            </button>
            <button disabled={status.status === "saving"} onClick={onSave} type="button">
              {status.status === "saving"
                ? t("app.saving")
                : saveKind === "card"
                  ? t("llm.saveCard")
                  : t("llm.saveNote")}
            </button>
          </div>
        </section>
      )}
      {status.message && (
        <p className={`assistant-status assistant-status-${status.status}`}>{status.message}</p>
      )}
    </section>
  );
}

function ScriptsTool({
  onCancel,
  onRun,
  runState,
  state,
  t
}: {
  onCancel: (runId: string) => void;
  onRun: (path: string) => void;
  runState: ScriptRunState;
  state: ScriptLoadState;
  t: Translator;
}) {
  const runningRunId = runState.status === "running" ? runState.runId : null;
  return (
    <section className="scenarios-tool" aria-label={t("scripts.title")} data-help-context="scripts">
      {state.status === "idle" && <p>{t("scripts.openToScan")}</p>}
      {state.status === "loading" && <p>{t("scripts.scanning")}</p>}
      {state.status === "error" && <p className="inline-error">{state.message}</p>}
      <details className="script-reference">
        <summary>{t("scripts.commandReference")}</summary>
        <div className="script-command-list">
          <code>{'form({"name": "text"})'}</code>
          <code>{'choose_file("Pick a page")'}</code>
          <code>{'roll("1d20+3")'}</code>
          <code>{'table("Tables/random-events.csv")'}</code>
          <code>{'screen_fs("README.md")'}</code>
          <code>{'screen_pu("NPCs/Captain Ilyra.md")'}</code>
          <code>{'audio_play(".music/effects/file.mp3")'}</code>
          <code>{'map_preset("Session setup")'}</code>
          <code>{'map_load("Media/sample-map.svg", present=True)'}</code>
          <code>{'card_template("npc", "Captain Mira")'}</code>
          <code>{'create_card("Cards/Mira.cs", card)'}</code>
          <code>{'render_md("# Result")'}</code>
          <code>{'create_note("Notes/new.md", "# New")'}</code>
          <code>{'append_note("README.md", "\\nMore")'}</code>
        </div>
      </details>
      {state.status === "ready" && state.scripts.length === 0 && <p>{t("scripts.none")}</p>}
      {state.status === "ready" &&
        state.scripts.map((script) => (
          <section className="scenario-card script-row" key={script.path}>
            <div className="scenario-heading script-row-main">
              <strong>{script.title}</strong>
              <small>{script.path}</small>
            </div>
            <button
              disabled={runState.status === "running" && runState.path === script.path}
              onClick={() => onRun(script.path)}
              type="button"
            >
              {runState.status === "running" && runState.path === script.path
                ? t("scripts.running")
                : t("scripts.run")}
            </button>
          </section>
        ))}
      {runState.status === "running" && (
        <section className="scenario-output" aria-label={t("scripts.latestRun")}>
          <strong>{t("scripts.running")}</strong>
          <small>{runState.path}</small>
          {runningRunId && (
            <button onClick={() => onCancel(runningRunId)} type="button">
              {t("scripts.cancel")}
            </button>
          )}
        </section>
      )}
      {runState.status === "ready" && (
        <section className="scenario-output" aria-label={t("scripts.latestRun")}>
          <strong>{runState.run.status}</strong>
          {runState.run.stderr && <pre>{runState.run.stderr}</pre>}
          {runState.run.stdout && <pre>{runState.run.stdout}</pre>}
          {runState.run.outputs.length > 0 && (
            <small>{runState.run.outputs.length} output tab opened</small>
          )}
          {runState.run.status === "cancelled" && <small>{t("scripts.cancelled")}</small>}
        </section>
      )}
      {runState.status === "error" && <p className="inline-error">{runState.message}</p>}
    </section>
  );
}

function CaptureTool({
  draft,
  onCategoryChange,
  onOpenLog,
  onPersistDraft,
  onSave,
  onTextChange,
  status,
  t,
  today
}: {
  draft: CaptureDraft;
  onCategoryChange: (category: CaptureCategory) => void;
  onOpenLog: () => void;
  onPersistDraft: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  status: CaptureStatus;
  t: Translator;
  today: CaptureTodayResponse | null;
}) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (!isCaptureSubmitShortcut(event)) {
      return;
    }
    event.preventDefault();
    onSave();
  }

  return (
    <section aria-label={t("capture.title")} className="capture-tool" data-help-context="capture">
      <div className="capture-category-chips" role="group" aria-label={t("capture.title")}>
        {CAPTURE_CATEGORY_OPTIONS.map((option) => (
          <button
            aria-pressed={draft.category === option.value}
            disabled={status.status === "saving"}
            key={option.value}
            onBlur={onPersistDraft}
            onClick={() => onCategoryChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <label>
        {t("capture.text")} <small>{t("capture.shortcut")}</small>
        <textarea
          autoFocus
          disabled={status.status === "saving"}
          onBlur={onPersistDraft}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("capture.placeholder")}
          rows={4}
          value={draft.text}
        />
      </label>
      <div className="capture-actions">
        <button disabled={status.status === "saving"} onClick={onSave} type="button">
          {status.status === "saving" ? t("capture.saving") : t("capture.save")}
        </button>
        <button disabled={!today?.exists} onClick={onOpenLog} type="button">
          {t("capture.openLog")}
        </button>
      </div>
      <p className={`capture-status capture-status-${status.status}`}>
        {status.message ?? (today?.exists ? today.path : t("capture.noLog"))}
      </p>
    </section>
  );
}

function SearchDialog({
  inputRef,
  onClose,
  onOpenOtherPane,
  onOpenResult,
  onPeekResult,
  onQueryChange,
  onShowResult,
  onStageResult,
  open,
  query,
  state,
  t
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onOpenOtherPane: (result: SearchResult) => void;
  onOpenResult: (result: SearchResult) => void;
  onPeekResult: (result: SearchResult) => void;
  onQueryChange: (query: string) => void;
  onShowResult: (result: SearchResult) => void;
  onStageResult: (result: SearchResult) => void;
  open: boolean;
  query: string;
  state: SearchLoadState;
  t: Translator;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={t("search.title")}
        className="file-dialog tool-dialog"
        data-help-context="search"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("search.title")}</h2>
          <button aria-label={t("search.close")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <SearchTool
          inputRef={inputRef}
          onOpenOtherPane={onOpenOtherPane}
          onOpenResult={onOpenResult}
          onPeekResult={onPeekResult}
          onQueryChange={onQueryChange}
          onShowResult={onShowResult}
          onStageResult={onStageResult}
          query={query}
          state={state}
          t={t}
        />
      </section>
    </div>
  );
}

function CaptureDialog({
  draft,
  onCategoryChange,
  onClose,
  onOpenLog,
  onPersistDraft,
  onSave,
  onTextChange,
  open,
  status,
  today,
  t
}: {
  draft: CaptureDraft;
  onCategoryChange: (category: CaptureCategory) => void;
  onClose: () => void;
  onOpenLog: () => void;
  onPersistDraft: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  open: boolean;
  status: CaptureStatus;
  today: CaptureTodayResponse | null;
  t: Translator;
}) {
  if (!open) {
    return null;
  }

  function handleClose() {
    onPersistDraft();
    onClose();
  }

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={handleClose}>
      <section
        aria-label={t("capture.title")}
        className="file-dialog tool-dialog"
        data-help-context="capture"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("capture.title")}</h2>
          <button aria-label={t("capture.close")} onClick={handleClose} type="button">
            x
          </button>
        </div>
        <CaptureTool
          draft={draft}
          onCategoryChange={onCategoryChange}
          onOpenLog={onOpenLog}
          onPersistDraft={onPersistDraft}
          onSave={onSave}
          onTextChange={onTextChange}
          status={status}
          t={t}
          today={today}
        />
      </section>
    </div>
  );
}

const PREP_HEALTH_FILTERS: Array<{ id: PrepHealthFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "errors", label: "Errors" },
  { id: "warnings", label: "Warnings" },
  { id: "links", label: "Links" },
  { id: "dms", label: "DMS" }
];

function prepHealthKindLabel(issue: PrepHealthIssue, t?: Translator): string {
  if (issue.kind === "missing_embed") {
    return t?.("prep.kind.missingEmbed") ?? "Missing embed";
  }
  if (issue.kind === "missing_dms_reference") {
    return t?.("prep.kind.missingDmsReference") ?? "DMS reference";
  }
  if (issue.kind === "dms_parse_error") {
    return t?.("prep.kind.dmsParseError") ?? "DMS parse";
  }
  return t?.("prep.kind.brokenLink") ?? "Broken link";
}

function PrepHealthDialog({
  filter,
  onClose,
  onCopyTarget,
  onFilterChange,
  onOpenSource,
  onRun,
  open,
  report,
  status,
  t
}: {
  filter: PrepHealthFilter;
  onClose: () => void;
  onCopyTarget: (target: string) => void;
  onFilterChange: (filter: PrepHealthFilter) => void;
  onOpenSource: (issue: PrepHealthIssue) => void;
  onRun: () => void;
  open: boolean;
  report: PrepHealthReport | null;
  status: PrepHealthStatus;
  t: Translator;
}) {
  if (!open) {
    return null;
  }

  const filteredIssues = report
    ? filterPrepHealthIssues(sortPrepHealthIssues(report.issues), filter)
    : [];

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={t("prep.title")}
        className="file-dialog prep-health-dialog tool-dialog"
        data-help-context="prep-health"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("prep.title")}</h2>
          <button aria-label={t("prep.close")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <div className="prep-health-summary">
          <div>
            <strong>{report ? prepHealthStatusLabel(report.status, t) : t("prep.status.notChecked")}</strong>
            <span>
              {report
                ? prepHealthCompactStatusLabel(report, { status: "idle" }, t)
                : t("prep.runDescription")}
            </span>
          </div>
          <button disabled={status.status === "loading"} onClick={onRun} type="button">
            {status.status === "loading" ? t("prep.checking") : t("prep.run")}
          </button>
        </div>
        {status.message && (
          <p className={status.status === "error" ? "dialog-error" : "dialog-note"}>
            {status.message}
          </p>
        )}
        {report && (
          <>
            <div className="prep-health-filters" role="tablist" aria-label={t("prep.filters.label")}>
              {PREP_HEALTH_FILTERS.map((item) => (
                <button
                  aria-selected={filter === item.id}
                  key={item.id}
                  onClick={() => onFilterChange(item.id)}
                  role="tab"
                  type="button"
                >
                  {localizedOrFallback(t, `prep.filter.${item.id}`, item.label)}
                </button>
              ))}
            </div>
            {filteredIssues.length === 0 ? (
              <p className="dialog-note">{t("prep.noIssues")}</p>
            ) : (
              <div className="prep-health-issues" aria-label={t("prep.issues")}>
                {filteredIssues.map((issue) => (
                  <article className="prep-health-issue" key={issue.id}>
                    <div>
                      <strong>{prepHealthKindLabel(issue, t)}</strong>
                      <span>{issue.source_path}</span>
                    </div>
                    <p>{issue.message}</p>
                    <small>
                      {t("prep.target")} {issue.raw_target || t("prep.scriptSyntax")}
                      {issue.command ? ` / ${issue.command}` : ""}
                    </small>
                    <div className="prep-health-actions">
                      <button onClick={() => onOpenSource(issue)} type="button">
                        {t("prep.openSource")}
                      </button>
                      <button
                        disabled={!issue.raw_target}
                        onClick={() => onCopyTarget(issue.raw_target)}
                        type="button"
                      >
                        {t("prep.copyTarget")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function HpTool({
  onAdd,
  onAdjust,
  onClear,
  onPersist,
  onRemove,
  onUpdate,
  rows,
  status,
  t
}: {
  onAdd: () => void;
  onAdjust: (rowId: string, amount: number) => void;
  onClear: () => void;
  onPersist: () => void;
  onRemove: (rowId: string) => void;
  onUpdate: (rowId: string, updates: Partial<Omit<HpTrackerRow, "id">>) => void;
  rows: HpTrackerRow[];
  status: HpToolStatus;
  t: Translator;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const disabled = status.status === "loading" || status.status === "saving";

  return (
    <section aria-label={t("hp.title")} className="hp-tool" data-help-context="hp">
      <div className="hp-tool-actions">
        <button disabled={disabled} onClick={onAdd} type="button">
          {t("hp.add")}
        </button>
        <button disabled={disabled || rows.length === 0} onClick={onPersist} type="button">
          {status.status === "saving" ? t("app.saving") : t("hp.save")}
        </button>
        <button
          disabled={disabled || rows.length === 0}
          onClick={() => {
            if (confirmClear) {
              onClear();
              setConfirmClear(false);
              return;
            }
            setConfirmClear(true);
          }}
          type="button"
        >
          {confirmClear ? t("hp.confirmClear") : t("hp.clear")}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="tool-note">{t("hp.empty")}</p>
      ) : (
        <div className="hp-rows">
          {rows.map((row) => (
            <article className="hp-row" key={row.id}>
              <div className="hp-row-main">
                <input
                  aria-label={`Name for ${row.name || "HP row"}`}
                  disabled={disabled}
                  onChange={(event) => onUpdate(row.id, { name: event.target.value })}
                  placeholder={t("hp.name")}
                  value={row.name}
                />
                <input
                  aria-label={`Current HP for ${row.name || "HP row"}`}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate(row.id, { current_hp: Number(event.target.value) })
                  }
                  type="number"
                  value={row.current_hp}
                />
                <span className="hp-separator">/</span>
                <input
                  aria-label={`Max HP for ${row.name || "HP row"}`}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate(row.id, { max_hp: parseHpMaxValue(event.target.value) })
                  }
                  placeholder={t("hp.max")}
                  type="number"
                  value={row.max_hp ?? ""}
                />
                <button disabled={disabled} onClick={() => onRemove(row.id)} type="button">
                  x
                </button>
              </div>
              <div className="hp-row-actions">
                {[-5, -1, 1, 5].map((amount) => (
                  <button
                    disabled={disabled}
                    key={amount}
                    onClick={() => onAdjust(row.id, amount)}
                    type="button"
                  >
                    {amount > 0 ? `+${amount}` : amount}
                  </button>
                ))}
              </div>
              <input
                aria-label={`Status for ${row.name || "HP row"}`}
                disabled={disabled}
                maxLength={120}
                onChange={(event) => onUpdate(row.id, { status: event.target.value })}
                placeholder={t("hp.status")}
                value={row.status}
              />
              <details className="hp-notes">
                <summary>{t("hp.notes")}</summary>
                <textarea
                  aria-label={`Notes for ${row.name || "HP row"}`}
                  disabled={disabled}
                  maxLength={500}
                  onChange={(event) => onUpdate(row.id, { notes: event.target.value })}
                  rows={2}
                  value={row.notes}
                />
              </details>
            </article>
          ))}
        </div>
      )}
      <p className={`capture-status capture-status-${status.status}`}>
        {status.message ??
          (status.status === "loading"
            ? t("app.loading")
            : status.status === "saving"
              ? t("app.saving")
              : t("hp.workspace"))}
      </p>
    </section>
  );
}

function DiceTool({
  history,
  onClearHistory,
  onRoll,
  status,
  t
}: {
  history: DiceHistoryEntry[];
  onClearHistory: () => void;
  onRoll: (expression: string) => void;
  status: DiceStatus;
  t: Translator;
}) {
  const [expression, setExpression] = useState("");
  const rolling = status.status === "rolling";
  const latest = history[0] ?? null;

  function submitRoll(nextExpression = expression) {
    const trimmed = nextExpression.trim();
    if (!trimmed || rolling) {
      return;
    }
    onRoll(trimmed);
  }

  return (
    <section aria-label={t("dice.title")} className="dice-tool" data-help-context="dice">
      <div className="dice-common" aria-label={t("dice.common")}>
        {COMMON_DICE_EXPRESSIONS.map((diceExpression) => (
          <button
            className="dice-chip"
            disabled={rolling}
            key={diceExpression}
            onClick={() => {
              setExpression(diceExpression);
              submitRoll(diceExpression);
            }}
            title={t("dice.rollLink", { expression: diceExpression })}
            type="button"
          >
            {diceExpression.replace(/^1/, "")}
          </button>
        ))}
      </div>
      <form
        className="dice-roll-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitRoll();
        }}
      >
        <label>
          <span>{t("dice.expression")}</span>
          <input
            aria-label={t("dice.expression")}
            onChange={(event) => setExpression(event.target.value)}
            placeholder={t("dice.expressionPlaceholder")}
            value={expression}
          />
        </label>
        <button disabled={rolling || expression.trim().length === 0} type="submit">
          {rolling ? t("dice.rolling") : t("dice.roll")}
        </button>
      </form>
      {status.status === "error" && (
        <p className="dice-status dice-status-error" role="alert">
          {status.message}
        </p>
      )}
      {latest && (
        <div className="dice-result" aria-label={t("dice.result")}>
          <strong>{latest.total}</strong>
          <span>{formatDiceRollDetail(latest)}</span>
        </div>
      )}
      <div className="dice-history-header">
        <h3>{t("dice.history")}</h3>
        <button disabled={history.length === 0} onClick={onClearHistory} type="button">
          {t("dice.clearHistory")}
        </button>
      </div>
      {history.length === 0 ? (
        <p className="muted">{t("dice.emptyHistory")}</p>
      ) : (
        <ol aria-label={t("dice.history")} className="dice-history">
          {history.map((entry) => (
            <li key={entry.id}>
              <span>{entry.expression}</span>
              <strong>{entry.total}</strong>
              <small>{entry.dice.results.join(", ")}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

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

function pathPickerFilterForAction(kind: BindingActionKind | FastSlotAction["kind"]): WorldPathPickerFilter {
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

function localizedOrFallback(t: Translator, key: string, fallback: string): string {
  const value = t(key);
  return value.startsWith("[[") ? fallback : value;
}

function assistantOptionLabel(fieldName: string, option: string, t: Translator): string {
  const key = `llm.option.${fieldName}.${option.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return localizedOrFallback(t, key, option);
}

function assistantSummary(
  provider: AssistantProviderState,
  result: AssistantResult | null,
  status: AssistantStatus,
  t?: Translator
): string {
  if (status.status === "generating") {
    return t?.("llm.generating") ?? "Generating";
  }
  if (status.status === "saving") {
    return t?.("app.saving") ?? "Saving";
  }
  if (status.status === "error") {
    return t?.("llm.providerStatus.error") ?? "Error";
  }
  if (result) {
    return t?.("llm.temporaryResult") ?? "Temporary result";
  }
  if (provider.status === "checking") {
    return t?.("llm.summary.checkingProvider") ?? "Checking provider";
  }
  if (provider.status === "ready") {
    return (
      [provider.provider, provider.model].filter(Boolean).join(" / ") ||
      t?.("llm.summary.providerReady") ||
      "Provider ready"
    );
  }
  if (provider.status === "unavailable" || provider.status === "error") {
    return t?.("llm.providerStatus.unavailable") ?? "Provider unavailable";
  }
  return t?.("llm.summary.dmOnly") ?? "DM only";
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

function mergeLoadedWorkspaceTabs(
  currentState: TabState,
  workspaceTabs: OpenTab[],
  workspaceActivePath: string | null
): TabState {
  if (currentState.tabs.length === 0 && currentState.activePath === null) {
    return { tabs: workspaceTabs, activePath: workspaceActivePath };
  }

  const tabsByPath = new Map(workspaceTabs.map((tab) => [tab.path, tab]));
  for (const tab of currentState.tabs) {
    tabsByPath.set(tab.path, tab);
  }
  const tabs = Array.from(tabsByPath.values());
  const activePath =
    currentState.activePath && tabs.some((tab) => tab.path === currentState.activePath)
      ? currentState.activePath
      : workspaceActivePath && tabs.some((tab) => tab.path === workspaceActivePath)
        ? workspaceActivePath
        : tabs[0]?.path ?? null;
  return { tabs, activePath };
}

function workspaceStateToTabState(workspace: WorkspaceState): TabState {
  const tabs = workspace.tabs.map(workspaceTabToOpenTab);
  const activePath =
    workspace.activePath && tabs.some((tab) => tab.path === workspace.activePath)
      ? workspace.activePath
      : tabs[0]?.path ?? null;
  return { tabs, activePath };
}

function activePathForPane(layout: WorkspaceLayout, paneId: WorkspacePaneId): string | null {
  return layout.panes.find((pane) => pane.id === paneId)?.activePath ?? null;
}

function layoutWithMode(
  layout: WorkspaceLayout,
  mode: WorkspaceLayout["mode"],
  tabs: OpenTab[]
): WorkspaceLayout {
  if (mode === "single") {
    return {
      ...layout,
      mode: "single",
      activePaneId: "main",
      panes: layout.panes.map((pane) =>
        pane.id === "main" ? pane : { ...pane, activePath: null }
      )
    };
  }

  const mainPath = activePathForPane(layout, "main") ?? tabs[0]?.path ?? null;
  const secondaryPath =
    activePathForPane(layout, "secondary") ??
    chooseSecondaryPaneActiveTab(tabs.map(openTabToWorkspaceTab), mainPath);

  return {
    ...layout,
    mode: "vertical_split",
    panes: [
      { id: "main", activePath: mainPath },
      { id: "secondary", activePath: secondaryPath }
    ]
  };
}

function ToolsPanel({
  activeTab,
  assistantActiveDocumentLabel,
  assistantCanUseActiveDocument,
  assistantContext,
  assistantContextSource,
  assistantForm,
  assistantForms,
  assistantProvider,
  assistantResult,
  assistantSaveKind,
  assistantSavePath,
  assistantStatus,
  assistantValues,
  actionBindings,
  actionBindingMessage,
  audioExpansionState,
  audioLibraryTracks,
  audioMixer,
  audioQuery,
  audioState,
  audioPlaylistState,
  contentDirty,
  displayState,
  diceHistory,
  diceStatus,
  fileReady,
  fastSlotError,
  fastSlots,
  linksState,
  hpRows,
  hpStatus,
  mapActionStatus,
  mapPresets,
  mapState,
  metadataEditState,
  midiBindingMessage,
  midiBindings,
  midiInputs,
  midiLearnedControl,
  midiLearning,
  midiStatus,
  onBlankDisplay,
  onAssistantCheckProvider,
  onAssistantContextChange,
  onAssistantCopy,
  onAssistantFieldChange,
  onAssistantFormChange,
  onAssistantGenerate,
  onAssistantSave,
  onAssistantSaveKindChange,
  onAssistantSavePathChange,
  onAssistantUseActiveDocument,
  onActionBindingDelete,
  onActionBindingRun,
  onActionBindingSave,
  onAudioFadeIn,
  onAudioFadeOut,
  onAudioLoadTrack,
  onAudioLoadPlaylist,
  onAudioLoopChange,
  onAudioNextTrack,
  onAudioPlaylistLoopChange,
  onAudioPlaylistToggle,
  onAudioPlayingChange,
  onAudioPreviousTrack,
  onAudioQueryChange,
  onAudioStopAll,
  onAudioStopBus,
  onAudioVolumeChange,
  onSavedAudioPlaylistAddCurrentTrack,
  onSavedAudioPlaylistAddTrack,
  onSavedAudioPlaylistBusChange,
  onSavedAudioPlaylistCreate,
  onSavedAudioPlaylistDelete,
  onSavedAudioPlaylistLoopChange,
  onSavedAudioPlaylistMoveTrack,
  onSavedAudioPlaylistPlay,
  onSavedAudioPlaylistRemoveTrack,
  onSavedAudioPlaylistRename,
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
  onClearDisplayPopups,
  onCloseDisplayPopup,
  onDisplayPopupVisibleChange,
  onClearFastSlot,
  onPickPath,
  onMapClearReveals,
  onMapDeletePin,
  onMapDeletePreset,
  onMapFogChange,
  onMapGridChange,
  onMapLoadSource,
  onMapLoadPreset,
  onMapPinCreate,
  onMapPresent,
  onMapRevealCreate,
  onMapSavePreset,
  onMapStop,
  onMapUndoReveal,
  onMapUseActiveImage,
  onMapViewportCommit,
  onMapViewportPreview,
  onClearMidiLearned,
  onConnectMidi,
  onDeleteMidiBinding,
  onMidiBindingRun,
  onMidiBindingSave,
  onOpenBacklink,
  onOpenDisplayPopup,
  onStageDisplayPopup,
  onOpenOutgoing,
  onReloadMetadataEdit,
  onRevertMetadataEdit,
  onSaveMetadataEdit,
  onClearAndShowFullscreen,
  onShowFullscreen,
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
  assistantActiveDocumentLabel: string;
  assistantCanUseActiveDocument: boolean;
  assistantContext: string;
  assistantContextSource: string | null;
  assistantForm: AssistantForm;
  assistantForms: AssistantForm[];
  assistantProvider: AssistantProviderState;
  assistantResult: AssistantResult | null;
  assistantSaveKind: AssistantSaveKind;
  assistantSavePath: string;
  assistantStatus: AssistantStatus;
  assistantValues: AssistantFormValues;
  actionBindings: ActionBinding[];
  actionBindingMessage: string | null;
  audioExpansionState: PlaylistExpansionState;
  audioLibraryTracks: AudioTrack[];
  audioMixer: AudioMixerState;
  audioQuery: string;
  audioState: AudioLoadState;
  audioPlaylistState: AudioPlaylistLoadState;
  contentDirty: boolean;
  displayState: DisplayState | null;
  diceHistory: DiceHistoryEntry[];
  diceStatus: DiceStatus;
  fastSlotError: string | null;
  fastSlots: FastSlot[];
  fileReady: boolean;
  linksState: LinksLoadState;
  hpRows: HpTrackerRow[];
  hpStatus: HpToolStatus;
  mapActionStatus: MapActionStatus;
  mapPresets: MapPreset[];
  mapState: MapState | null;
  metadataEditState: MetadataEditState;
  midiBindingMessage: string | null;
  midiBindings: MidiBinding[];
  midiInputs: MidiInputSummary[];
  midiLearnedControl: MidiLearnedControl | null;
  midiLearning: boolean;
  midiStatus: MidiStatus;
  onBlankDisplay: () => void;
  onAssistantCheckProvider: () => void;
  onAssistantContextChange: (context: string) => void;
  onAssistantCopy: () => void;
  onAssistantFieldChange: (name: string, value: AssistantFieldValue) => void;
  onAssistantFormChange: (formId: string) => void;
  onAssistantGenerate: () => void;
  onAssistantSave: () => void;
  onAssistantSaveKindChange: (kind: AssistantSaveKind) => void;
  onAssistantSavePathChange: (path: string) => void;
  onAssistantUseActiveDocument: () => void;
  onActionBindingDelete: (bindingId: string) => void;
  onActionBindingRun: (binding: ActionBinding) => void;
  onActionBindingSave: (binding: ActionBinding) => void;
  onAudioFadeIn: (bus: AudioBus) => void;
  onAudioFadeOut: (bus: AudioBus) => void;
  onAudioLoadTrack: (track: AudioTrack) => void;
  onAudioLoadPlaylist: (bus: AudioBus, playlist: string | null, tracks: AudioTrack[]) => void;
  onAudioLoopChange: (bus: AudioBus, loop: boolean) => void;
  onAudioNextTrack: (bus: AudioBus) => void;
  onAudioPlaylistLoopChange: (bus: AudioBus, loop: boolean) => void;
  onAudioPlaylistToggle: (bus: AudioBus, playlist: string | null) => void;
  onAudioPlayingChange: (bus: AudioBus, playing: boolean) => void;
  onAudioPreviousTrack: (bus: AudioBus) => void;
  onAudioQueryChange: (query: string) => void;
  onAudioStopAll: () => void;
  onAudioStopBus: (bus: AudioBus) => void;
  onAudioVolumeChange: (bus: AudioBus, volume: number) => void;
  onSavedAudioPlaylistAddCurrentTrack: (playlistId: string) => void;
  onSavedAudioPlaylistAddTrack: (playlistId: string, path: string) => void;
  onSavedAudioPlaylistBusChange: (playlistId: string, bus: AudioBus) => void;
  onSavedAudioPlaylistCreate: (name: string, bus: AudioBus) => void;
  onSavedAudioPlaylistDelete: (playlistId: string) => void;
  onSavedAudioPlaylistLoopChange: (playlistId: string, loop: boolean) => void;
  onSavedAudioPlaylistMoveTrack: (playlistId: string, index: number, direction: -1 | 1) => void;
  onSavedAudioPlaylistPlay: (playlistId: string) => void;
  onSavedAudioPlaylistRemoveTrack: (playlistId: string, path: string) => void;
  onSavedAudioPlaylistRename: (playlistId: string, name: string) => void;
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
  onClearDisplayPopups: () => void;
  onCloseDisplayPopup: (popupId: string) => void;
  onDisplayPopupVisibleChange: (popupId: string, visible: boolean) => void;
  onClearFastSlot: (position: number) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onMapClearReveals: () => void;
  onMapDeletePin: (pinId: string) => void;
  onMapDeletePreset: (presetId: string) => void;
  onMapFogChange: (enabled: boolean) => void;
  onMapGridChange: (grid: MapGrid) => void;
  onMapLoadSource: (path: string) => void;
  onMapLoadPreset: (presetId: string) => void;
  onMapPinCreate: (point: MapPoint, label: string, visibility: MapPinVisibility) => void;
  onMapPresent: () => void;
  onMapRevealCreate: (reveal: MapRevealPayload) => void;
  onMapSavePreset: (name: string, state: MapState) => void;
  onMapStop: () => void;
  onMapUndoReveal: () => void;
  onMapUseActiveImage: () => void;
  onMapViewportCommit: (viewport: MapViewport) => void;
  onMapViewportPreview: (viewport: MapViewport) => void;
  onClearMidiLearned: () => void;
  onConnectMidi: () => void;
  onDeleteMidiBinding: (bindingId: string) => void;
  onMidiBindingRun: (binding: MidiBinding) => void;
  onMidiBindingSave: (binding: MidiBinding) => void;
  onOpenBacklink: (link: PageLink) => void;
  onOpenDisplayPopup: (preset: DisplayPopupPreset, path?: string) => void;
  onStageDisplayPopup: (preset: DisplayPopupPreset, path?: string) => void;
  onOpenOutgoing: (link: PageLink) => void;
  onReloadMetadataEdit: () => void;
  onRevertMetadataEdit: () => void;
  onSaveMetadataEdit: () => void;
  onClearAndShowFullscreen: (path?: string) => void;
  onShowFullscreen: (path?: string) => void;
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
      <ToolSection
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "assistant")}
        pinned={isToolPinned(openTools, "assistant")}
        summary={assistantSummary(assistantProvider, assistantResult, assistantStatus, t)}
        t={t}
        title={t("tools.assistant")}
        tool="assistant"
      >
        <AssistantTool
          activeDocumentLabel={assistantActiveDocumentLabel}
          canUseActiveDocument={assistantCanUseActiveDocument}
          context={assistantContext}
          contextSource={assistantContextSource}
          form={assistantForm}
          forms={assistantForms}
          onCheckProvider={onAssistantCheckProvider}
          onContextChange={onAssistantContextChange}
          onCopy={onAssistantCopy}
          onFieldChange={onAssistantFieldChange}
          onFormChange={onAssistantFormChange}
          onGenerate={onAssistantGenerate}
          onSave={onAssistantSave}
          onSaveKindChange={onAssistantSaveKindChange}
          onSavePathChange={onAssistantSavePathChange}
          onUseActiveDocument={onAssistantUseActiveDocument}
          provider={assistantProvider}
          result={assistantResult}
          saveKind={assistantSaveKind}
          savePath={assistantSavePath}
          status={assistantStatus}
          t={t}
          values={assistantValues}
        />
      </ToolSection>
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
        <AudioTool
          audioLibraryTracks={audioLibraryTracks}
          expansionState={audioExpansionState}
          mixer={audioMixer}
          onFadeIn={onAudioFadeIn}
          onFadeOut={onAudioFadeOut}
          onLoadTrack={onAudioLoadTrack}
          onLoadPlaylist={onAudioLoadPlaylist}
          onSavedPlaylistAddCurrentTrack={onSavedAudioPlaylistAddCurrentTrack}
          onSavedPlaylistAddTrack={onSavedAudioPlaylistAddTrack}
          onSavedPlaylistBusChange={onSavedAudioPlaylistBusChange}
          onSavedPlaylistCreate={onSavedAudioPlaylistCreate}
          onSavedPlaylistDelete={onSavedAudioPlaylistDelete}
          onSavedPlaylistLoopChange={onSavedAudioPlaylistLoopChange}
          onSavedPlaylistMoveTrack={onSavedAudioPlaylistMoveTrack}
          onSavedPlaylistPlay={onSavedAudioPlaylistPlay}
          onSavedPlaylistRemoveTrack={onSavedAudioPlaylistRemoveTrack}
          onSavedPlaylistRename={onSavedAudioPlaylistRename}
          onLoopChange={onAudioLoopChange}
          onNextTrack={onAudioNextTrack}
          onPickPath={onPickPath}
          onPlaylistLoopChange={onAudioPlaylistLoopChange}
          onPlaylistToggle={onAudioPlaylistToggle}
          onPlayingChange={onAudioPlayingChange}
          onPreviousTrack={onAudioPreviousTrack}
          onQueryChange={onAudioQueryChange}
          onStopAll={onAudioStopAll}
          onStopBus={onAudioStopBus}
          onVolumeChange={onAudioVolumeChange}
          query={audioQuery}
          savedPlaylistsState={audioPlaylistState}
          state={audioState}
          t={t}
        />
      </ToolSection>
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
          mapPresets={mapPresets}
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
          activeTab={activeTab}
          displayState={displayState}
          mapActionStatus={mapActionStatus}
          mapPresets={mapPresets}
          mapState={mapState}
          onBlank={onBlankDisplay}
          onClearPopups={onClearDisplayPopups}
          onClosePopup={onCloseDisplayPopup}
          onPopupVisibleChange={onDisplayPopupVisibleChange}
          onOpenPopup={onOpenDisplayPopup}
          onStagePopup={onStageDisplayPopup}
          onClearAndShowFullscreen={onClearAndShowFullscreen}
          onShowFullscreen={onShowFullscreen}
          onMapClearReveals={onMapClearReveals}
          onMapDeletePin={onMapDeletePin}
          onMapDeletePreset={onMapDeletePreset}
          onMapFogChange={onMapFogChange}
          onMapGridChange={onMapGridChange}
          onMapLoadSource={onMapLoadSource}
          onMapLoadPreset={onMapLoadPreset}
          onMapPinCreate={onMapPinCreate}
          onPickPath={onPickPath}
          onMapPresent={onMapPresent}
          onMapRevealCreate={onMapRevealCreate}
          onMapSavePreset={onMapSavePreset}
          onMapStop={onMapStop}
          onMapUndoReveal={onMapUndoReveal}
          onMapUseActiveImage={onMapUseActiveImage}
          onMapViewportCommit={onMapViewportCommit}
          onMapViewportPreview={onMapViewportPreview}
          onTabChange={onScreenToolTabChange}
          tab={screenToolTab}
          t={t}
        />
      </ToolSection>
    </aside>
  );
}

function FileManagementDialog({
  state,
  onCardTemplateChange,
  onCardTitleChange,
  onClose,
  onFileTypeChange,
  onPathChange,
  onSubmit
}: {
  state: FileDialogState;
  onCardTemplateChange: (templateId: string) => void;
  onCardTitleChange: (title: string) => void;
  onClose: () => void;
  onFileTypeChange: (fileType: ManagedFileType) => void;
  onPathChange: (path: string) => void;
  onSubmit: () => void;
}) {
  if (state.kind === "closed") {
    return null;
  }

  const submitting = state.status === "submitting";
  const title =
    state.kind === "create"
      ? state.fileType === "card"
        ? "New Card"
        : "New File"
      : state.kind === "create-folder"
        ? "New Folder"
      : state.kind === "rename"
        ? state.entryKind === "directory"
          ? "Rename Folder"
          : "Rename File"
        : state.entryKind === "directory"
          ? "Move Folder to Trash"
          : "Move to Trash";
  const submitLabel =
    state.kind === "create"
      ? state.fileType === "card"
        ? "Create Card"
        : "Create File"
      : state.kind === "create-folder"
        ? "Create Folder"
      : state.kind === "rename"
        ? state.entryKind === "directory"
          ? "Rename Folder"
          : "Rename File"
      : "Move to Trash";
  const selectedTemplate =
    state.kind === "create" && state.fileType === "card"
      ? selectedCardTemplate(state)
      : null;

  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label={title} className="file-dialog" role="dialog">
        <div className="dialog-header">
          <h2>{title}</h2>
          <button aria-label={`Close ${title}`} onClick={onClose} type="button">
            x
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {state.kind === "create" && !state.contextual && (
            <label>
              File type
              <select
                onChange={(event) => onFileTypeChange(event.target.value as ManagedFileType)}
                value={state.fileType}
              >
                <option value="markdown">Markdown</option>
                <option value="card">Card</option>
                <option value="csv">CSV</option>
                <option value="script">DMS Script</option>
              </select>
            </label>
          )}
          {state.kind === "create" && state.contextual && (
            <>
              <label>
                Name
                <input
                  autoFocus
                  onChange={(event) => onPathChange(event.target.value)}
                  value={state.name}
                />
              </label>
              <p className="dialog-hint">Will create: {state.path}</p>
            </>
          )}
          {state.kind === "create" && state.fileType === "card" && (
            <>
              <label>
                Card template
                <select
                  onChange={(event) => onCardTemplateChange(event.target.value)}
                  value={state.cardTemplateId}
                >
                  {state.cardTemplateCatalog.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {cardTemplateLabel(template)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedTemplate?.description && (
                <p className="dialog-hint">{selectedTemplate.description}</p>
              )}
              {state.cardTemplateStatus === "loading" && (
                <p className="dialog-hint">Loading card templates...</p>
              )}
              {state.cardTemplateStatus === "error" && state.cardTemplateError && (
                <p className="dialog-error">{state.cardTemplateError}</p>
              )}
              {state.cardTemplateCatalog.warnings.length > 0 && (
                <p className="dialog-hint">
                  {state.cardTemplateCatalog.warnings.length} template warning
                  {state.cardTemplateCatalog.warnings.length === 1 ? "" : "s"}.
                </p>
              )}
              {!state.contextual && (
                <label>
                  Card title
                  <input
                    onChange={(event) => onCardTitleChange(event.target.value)}
                    value={state.cardTitle}
                  />
                </label>
              )}
            </>
          )}
          {state.kind !== "trash" && !(state.kind === "create" && state.contextual) && (
            <label>
              {state.kind === "create-folder" ||
              (state.kind === "rename" && state.entryKind === "directory")
                ? "New folder path"
                : "New file path"}
              <input
                autoFocus
                onChange={(event) => onPathChange(event.target.value)}
                value={
                  state.kind === "create" || state.kind === "create-folder"
                    ? state.path
                    : state.newPath
                }
              />
            </label>
          )}
          {state.kind === "trash" && (
            <p>
              Move <strong>{state.path}</strong> to trash?
              {state.entryKind === "directory" ? " This includes everything inside it." : ""}
            </p>
          )}
          {state.error && <p className="dialog-error">{state.error}</p>}
          <div className="dialog-actions">
            <button disabled={submitting} type="button" onClick={onClose}>
              Cancel
            </button>
            <button disabled={submitting} type="submit">
              {submitting ? "Working..." : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DmsTrustDialog({
  onCancel,
  onConfirm,
  state,
  t
}: {
  onCancel: () => void;
  onConfirm: () => void;
  state: DmsTrustDialogState;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="dialog-overlay" onMouseDown={onCancel} role="presentation">
      <section
        aria-label={t("scripts.trustTitle")}
        className="file-dialog dms-trust-dialog"
        data-help-context="document-dms"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("scripts.trustTitle")}</h2>
          <button aria-label={t("app.cancel")} onClick={onCancel} type="button">
            x
          </button>
        </div>
        <p>{t("scripts.trustWarning")}</p>
        <div className="form-field">
          <span>{t("scripts.trustPath")}</span>
          <code>{state.path}</code>
        </div>
        <div className="dialog-actions">
          <button onClick={onCancel} type="button">
            {t("app.cancel")}
          </button>
          <button onClick={onConfirm} type="button">
            {t("scripts.trustConfirm")}
          </button>
        </div>
      </section>
    </div>
  );
}

function DmsFormDialog({
  fileOptions,
  onChange,
  onClose,
  onSubmit,
  state,
  t
}: {
  fileOptions: string[];
  onChange: (name: string, value: string | number | boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
  state: DmsFormDialogState;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation">
      <section
        aria-label={t("scripts.formDialog")}
        className="file-dialog"
        data-help-context="document-dms"
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("scripts.formTitle")}</h2>
          <button aria-label={t("scripts.closeFormDialog")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {state.fields.map((field) => (
            <label key={field.name}>
              {field.label}
              {field.input_type === "boolean" ? (
                <input
                  checked={Boolean(state.values[field.name])}
                  onChange={(event) => onChange(field.name, event.target.checked)}
                  type="checkbox"
                />
              ) : field.input_type === "select" ? (
                <select
                  onChange={(event) => onChange(field.name, event.target.value)}
                  value={String(state.values[field.name] ?? "")}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.input_type === "file" ? (
                <>
                  <input
                    list={`dms-file-options-${field.name}`}
                    onChange={(event) => onChange(field.name, event.target.value)}
                    type="text"
                    value={String(state.values[field.name] ?? "")}
                  />
                  <datalist id={`dms-file-options-${field.name}`}>
                    {fileOptions.map((path) => (
                      <option key={path} value={path} />
                    ))}
                  </datalist>
                </>
              ) : (
                <input
                  onChange={(event) =>
                    onChange(
                      field.name,
                      field.input_type === "number"
                        ? Number(event.target.value)
                        : event.target.value
                    )
                  }
                  type={field.input_type === "number" ? "number" : "text"}
                  value={String(state.values[field.name] ?? "")}
                />
              )}
            </label>
          ))}
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              {t("app.cancel")}
            </button>
            <button type="submit">{t("app.continue")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DmsOutputSaveDialog({
  onChange,
  onClose,
  onSubmit,
  state,
  t
}: {
  onChange: (path: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  state: DmsOutputSaveDialogState;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }
  const submitting = state.status === "submitting";

  return (
    <div className="dialog-overlay" role="presentation">
      <section
        aria-label={t("scripts.saveOutputDialog")}
        className="file-dialog"
        data-help-context="document-dms"
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("scripts.saveOutputTitle")}</h2>
          <button aria-label={t("scripts.closeSaveOutputDialog")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label>
            {t("scripts.outputWorldPath")}
            <input
              onChange={(event) => onChange(event.target.value)}
              type="text"
              value={state.path}
            />
          </label>
          {state.error && <p className="dialog-error">{state.error}</p>}
          <div className="dialog-actions">
            <button disabled={submitting} onClick={onClose} type="button">
              {t("app.cancel")}
            </button>
            <button disabled={submitting} type="submit">
              {submitting ? t("app.saving") : t("app.save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function App() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(() =>
    resolveInitialLanguage({ stored: loadStoredUiLanguage() })
  );
  const [uiCatalog, setUiCatalog] = useState<TranslationCatalog | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [contextHelpTopic, setContextHelpTopic] = useState<ContextHelpTopic | null>(null);
  const contextHelpReturnFocusRef = useRef<HTMLElement | null>(null);
  const lastHelpContextRef = useRef<string | null>(null);
  const [authState, setAuthState] = useState<AuthGateState>({ status: "checking" });
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [worldLibrary, setWorldLibrary] = useState<WorldLibraryState | null>(null);
  const [worldTree, setWorldTree] = useState<WorldEntry | null>(null);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const workspaceReadyRef = useRef(false);
  const [workspaces, setWorkspaces] = useState<NamedWorkspaceSummary[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState("default");
  const currentWorkspaceIdRef = useRef("default");
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState("Default");
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>(() =>
    defaultWorkspaceLayout()
  );
  const workspaceLayoutRef = useRef<WorkspaceLayout>(defaultWorkspaceLayout());
  const [workspaceDialog, setWorkspaceDialog] = useState<WorkspaceDialogState>({
    kind: "closed"
  });
  const [favorites, setFavorites] = useState<WorkspaceTab[]>([]);
  const [recentFiles, setRecentFiles] = useState<WorkspaceTab[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([""]));
  const [tabState, setTabState] = useState<TabState>({ tabs: [], activePath: null });
  const tabStateRef = useRef<TabState>({ tabs: [], activePath: null });
  const [fileStates, setFileStates] = useState<Record<string, FileLoadState>>({});
  const [pageStates, setPageStates] = useState<Record<string, PageLoadState>>({});
  const [linksStates, setLinksStates] = useState<Record<string, LinksLoadState>>({});
  const [editorDrafts, setEditorDrafts] = useState<Record<string, EditorDraft>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const [toolPanelState, setToolPanelState] = useState<ToolPanelState>(() =>
    createToolPanelState(["assistant"])
  );
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [prepHealthDialogOpen, setPrepHealthDialogOpen] = useState(false);
  const [pathPickerState, setPathPickerState] = useState<WorldPathPickerState>({
    open: false
  });
  const [screenToolTab, setScreenToolTab] = useState<ScreenToolTabId>(DEFAULT_SCREEN_TOOL_TAB);
  const [toolsPanelWidth, setToolsPanelWidth] = useState(() => loadToolsPanelWidth());
  const [treeFilter, setTreeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchLoadState>({ status: "idle" });
  const [searchRevision, setSearchRevision] = useState(0);
  const [captureToday, setCaptureToday] = useState<CaptureTodayResponse | null>(null);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft>({
    category: "idea",
    text: ""
  });
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    status: "idle",
    message: null
  });
  const [prepHealthReport, setPrepHealthReport] = useState<PrepHealthReport | null>(null);
  const [prepHealthFilter, setPrepHealthFilter] = useState<PrepHealthFilter>("all");
  const [prepHealthStatus, setPrepHealthStatus] = useState<PrepHealthStatus>({
    status: "idle",
    message: null
  });
  const [hpRows, setHpRows] = useState<HpTrackerRow[]>([]);
  const [hpStatus, setHpStatus] = useState<HpToolStatus>({ status: "idle", message: null });
  const [audioQuery, setAudioQuery] = useState("");
  const [audioState, setAudioState] = useState<AudioLoadState>({ status: "idle" });
  const [audioAutocompleteTracks, setAudioAutocompleteTracks] = useState<AudioTrack[]>([]);
  const [audioMixer, setAudioMixer] = useState<AudioMixerState>(() => createAudioMixerState());
  const [audioPlaylistState, setAudioPlaylistState] = useState<AudioPlaylistLoadState>({
    status: "idle",
    playlists: []
  });
  const [audioPlaylistExpansion, setAudioPlaylistExpansion] =
    useState<PlaylistExpansionState>({});
  const [diceHistory, setDiceHistory] = useState<DiceHistoryEntry[]>([]);
  const [diceStatus, setDiceStatus] = useState<DiceStatus>({ status: "idle", message: null });
  const [fastSlots, setFastSlots] = useState<FastSlot[]>([]);
  const [fastSlotError, setFastSlotError] = useState<string | null>(null);
  const [actionBindings, setActionBindings] = useState<ActionBinding[]>([]);
  const [actionBindingMessage, setActionBindingMessage] = useState<string | null>(null);
  const [midiBindings, setMidiBindings] = useState<MidiBinding[]>([]);
  const [midiBindingMessage, setMidiBindingMessage] = useState<string | null>(null);
  const [midiInputs, setMidiInputs] = useState<MidiInputSummary[]>([]);
  const [midiLearnedControl, setMidiLearnedControl] = useState<MidiLearnedControl | null>(null);
  const [midiLearning, setMidiLearning] = useState(false);
  const [midiStatus, setMidiStatus] = useState<MidiStatus>(() =>
    isMidiSupported(typeof navigator === "undefined" ? null : navigator)
      ? { status: "idle", message: "MIDI is not connected." }
      : { status: "unsupported", message: "Web MIDI is not available in this browser." }
  );
  const [tableSnapshots, setTableSnapshots] = useState<TableSnapshotSummary[]>([]);
  const [tableSnapshotName, setTableSnapshotName] = useState("");
  const [selectedTableSnapshotId, setSelectedTableSnapshotId] = useState("");
  const [tableSnapshotStatus, setTableSnapshotStatus] = useState<TableSnapshotStatus>({
    status: "idle",
    message: null
  });
  const [scriptState, setScriptState] = useState<ScriptLoadState>({ status: "idle" });
  const [scriptRunState, setScriptRunState] = useState<ScriptRunState>({ status: "idle" });
  const [assistantProvider, setAssistantProvider] = useState<AssistantProviderState>({
    status: "unknown",
    provider: null,
    model: null,
    message: null
  });
  const assistantForms = DEFAULT_ASSISTANT_FORMS;
  const [assistantFormId, setAssistantFormId] = useState(DEFAULT_ASSISTANT_FORM_ID);
  const [assistantValues, setAssistantValues] = useState<AssistantFormValues>(() =>
    assistantFormDefaults(DEFAULT_ASSISTANT_FORMS[0]?.fields ?? [])
  );
  const [assistantContext, setAssistantContext] = useState("");
  const [assistantContextSource, setAssistantContextSource] = useState<string | null>(null);
  const [assistantResult, setAssistantResult] = useState<AssistantResult | null>(null);
  const [assistantSaveKind, setAssistantSaveKind] =
    useState<AssistantSaveKind>("markdown");
  const [assistantSavePath, setAssistantSavePath] = useState(
    defaultAssistantSavePath(DEFAULT_ASSISTANT_FORMS[0], null, "markdown")
  );
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>({
    status: "idle",
    message: null
  });
  const cancelledDmsRuns = useRef<Set<string>>(new Set());
  const [trustedScriptPaths, setTrustedScriptPaths] = useState<Set<string>>(() => new Set());
  const [linkContextMenu, setLinkContextMenu] = useState<LinkContextMenuState>({ open: false });
  const [peekState, setPeekState] = useState<PeekState>({ open: false });
  const [dmsTrustDialog, setDmsTrustDialog] = useState<DmsTrustDialogState>({ open: false });
  const [dmsFormDialog, setDmsFormDialog] = useState<DmsFormDialogState>({ open: false });
  const [dmsOutputSaveDialog, setDmsOutputSaveDialog] = useState<DmsOutputSaveDialogState>({
    open: false
  });
  const [fileDialog, setFileDialog] = useState<FileDialogState>({ kind: "closed" });
  const [folderMenuPath, setFolderMenuPath] = useState<string | null>(null);
  const [worldTreeContextMenu, setWorldTreeContextMenu] =
    useState<WorldTreeContextMenuState>({ open: false });
  const worldTreeContextTriggerRef = useRef<HTMLElement | null>(null);
  const [worldTreeDragPath, setWorldTreeDragPath] = useState<string | null>(null);
  const [worldTreeDropPath, setWorldTreeDropPath] = useState<string | null>(null);
  const [worldTreeStatus, setWorldTreeStatus] = useState<string | null>(null);
  const [trashDialog, setTrashDialog] = useState<TrashDialogState>({ open: false });
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [mapActionStatus, setMapActionStatus] = useState<MapActionStatus>({
    status: "idle",
    message: null
  });
  const [mapPresets, setMapPresets] = useState<MapPreset[]>([]);
  const [localMapViewport, setLocalMapViewport] = useState<MapViewport | null>(null);
  const [worldOpenDialog, setWorldOpenDialog] = useState(false);
  const [worldCreateDialog, setWorldCreateDialog] = useState<WorldCreateDialogState>({
    open: false
  });
  const [metadataEdits, setMetadataEdits] = useState<Record<string, MetadataEditState>>({});
  const fastSlotsRevision = useRef(0);
  const mapViewportSyncRef = useRef({ lastSyncedAt: 0 });
  const hpEditVersionRef = useRef(0);
  const hpRowsRef = useRef<HpTrackerRow[]>([]);
  const audioPlaylistsRef = useRef<AudioPlaylist[]>([]);
  const audioPlaylistSaveRevisionRef = useRef(0);
  const midiBindingsRef = useRef<MidiBinding[]>([]);
  const midiInputsRef = useRef<MidiInputLike[]>([]);
  const midiLearningRef = useRef(false);
  const midiTriggerRef = useRef<(binding: MidiBinding) => void>(() => {});
  const captureDraftRef = useRef<CaptureDraft>(captureDraft);
  const captureWorldKeyRef = useRef("default");
  const searchToolOpen = searchDialogOpen;
  const captureToolOpen = captureDialogOpen;
  const pathPickerOpen = pathPickerState.open;
  const captureWorldKey = worldLibrary?.current?.id ?? worldLibrary?.current?.path ?? "default";
  const actionBindingWorldKey = captureWorldKey;
  const midiBindingWorldKey = captureWorldKey;
  const audioToolOpen = isToolOpen(toolPanelState, "audio");
  const scriptsToolOpen = isToolOpen(toolPanelState, "scripts");
  const actionsToolOpen = isToolOpen(toolPanelState, "actions");
  const screenToolOpen = isToolOpen(toolPanelState, "screen");
  const pathPickerCandidates = flattenWorldPathPickerEntries(
    worldTree,
    audioState.status === "ready" ? audioState.tracks : audioAutocompleteTracks
  );
  const t = useMemo(() => createTranslator(uiCatalog ?? undefined), [uiCatalog]);
  const localizedAssistantForms = useMemo(
    () =>
      assistantForms.map((form) => ({
        ...form,
        title: t(`llm.forms.${form.id}.title`),
        description: t(`llm.forms.${form.id}.description`),
        fields: form.fields.map((field) => ({
          ...field,
          label: localizedOrFallback(t, `llm.field.${field.name}`, field.label)
        }))
      })),
    [assistantForms, t]
  );
  const availableLanguageOptions = appConfig?.available_languages ?? AVAILABLE_LANGUAGES;

  function adoptMapState(nextMapState: MapState) {
    setMapState((current) => (shouldAdoptMapState(current, nextMapState) ? nextMapState : current));
  }

  function mapActionErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  async function fetchFullAudioLibraryTracks(): Promise<AudioTrack[]> {
    if (audioAutocompleteTracks.length > 0) {
      return audioAutocompleteTracks;
    }
    const tracks = await fetchAudioLibrary();
    setAudioAutocompleteTracks(tracks);
    return tracks;
  }

  function applyLanguage(language: UiLanguage, catalog: TranslationCatalog, persist: boolean) {
    setUiLanguage(language);
    setUiCatalog(catalog);
    if (persist) {
      saveStoredUiLanguage(language);
    }
  }

  function loadLanguage(language: UiLanguage, persist = false) {
    fetchLanguageCatalog(language)
      .then((catalog) => applyLanguage(language, catalog, persist))
      .catch(() => {
        if (language !== "en") {
          void fetchLanguageCatalog("en")
            .then((catalog) => applyLanguage("en", catalog, persist))
            .catch(() => {
              setUiLanguage("en");
              setUiCatalog(null);
            });
          return;
        }
        setUiLanguage("en");
        setUiCatalog(null);
      });
  }

  function handleLanguageChange(language: UiLanguage) {
    loadLanguage(language, true);
  }

  function closeSettingsDialog() {
    setSettingsDialogOpen(false);
    window.setTimeout(() => settingsButtonRef.current?.focus(), 0);
  }

  useEffect(() => {
    let mounted = true;
    fetchAppConfig()
      .then((config) => {
        if (!mounted) {
          return;
        }
        setAppConfig(config);
        loadLanguage(
          resolveInitialLanguage({
            stored: loadStoredUiLanguage(),
            configured: config.language,
            available: config.available_languages
          })
        );
      })
      .catch(() => {
        if (mounted) {
          loadLanguage(resolveInitialLanguage({ stored: loadStoredUiLanguage() }));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchAuthStatus()
      .then((status) => {
        if (!mounted) {
          return;
        }
        setAuthState(
          !status.enabled || status.authenticated
            ? { status: "unlocked", auth: status }
            : { status: "locked", auth: status, error: null }
        );
      })
      .catch(() => {
        if (mounted) {
          setAuthState({
            status: "unlocked",
            auth: { enabled: false, authenticated: true }
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (authState.status !== "unlocked") {
      return;
    }
    let mounted = true;

    async function loadStatus() {
      const fastSlotsRevisionAtStart = fastSlotsRevision.current;
      const hpRevisionAtStart = hpEditVersionRef.current;
      setLoadState("loading");
      try {
        const [
          nextWorldLibrary,
          nextWorldTree,
          nextPages,
          workspace,
          hpState,
          nextWorkspaces,
          nextDisplayState,
          nextFastSlots,
          nextMapState,
          nextTableSnapshots
        ] = await Promise.all([
          fetchWorlds(),
          fetchWorldTree(),
          fetchPages(),
          fetchWorkspace(),
          fetchHpTracker(),
          fetchWorkspaces(),
          fetchDisplayState(),
          fetchFastSlots(),
          fetchMapState(),
          fetchTableSnapshots()
        ]);
        if (!mounted) {
          return;
        }
        const workspaceTabs = workspace.tabs.map(workspaceTabToOpenTab);
        const activePath =
          workspace.activePath && workspaceTabs.some((tab) => tab.path === workspace.activePath)
            ? workspace.activePath
            : workspaceTabs[0]?.path ?? null;
        setWorldLibrary(nextWorldLibrary);
        setWorldTree(nextWorldTree);
        setPages(nextPages);
        setWorkspaces(nextWorkspaces);
        setCurrentWorkspaceId(workspace.workspaceId);
        setCurrentWorkspaceName(workspace.workspaceName);
        if (hpEditVersionRef.current === hpRevisionAtStart) {
          hpRowsRef.current = hpState.rows;
          setHpRows(hpState.rows);
          setHpStatus({ status: "idle", message: null });
        }
        setFavorites(workspace.favorites);
        setRecentFiles(workspace.recentFiles);
        setDisplayState(nextDisplayState);
        adoptMapState(nextMapState);
        const sortedTableSnapshots = sortTableSnapshots(nextTableSnapshots);
        setTableSnapshots(sortedTableSnapshots);
        setSelectedTableSnapshotId(sortedTableSnapshots[0]?.id ?? "");
        setTableSnapshotStatus({ status: "idle", message: null });
        setWorkspaceLayout(normalizeWorkspaceLayout(workspace.layout, workspace.tabs));
        if (fastSlotsRevision.current === fastSlotsRevisionAtStart) {
          setFastSlots(visibleFastSlots(nextFastSlots));
        }
        setTabState((currentState) =>
          mergeLoadedWorkspaceTabs(currentState, workspaceTabs, activePath)
        );
        setExpandedPaths(new Set(collectDirectoryPaths(nextWorldTree)));
        setWorkspaceReady(true);
        setLoadState("ready");
      } catch {
        if (mounted) {
          setLoadState("error");
        }
      }
    }

    void loadStatus();

    return () => {
      mounted = false;
    };
  }, [authState.status]);

  useEffect(() => {
    workspaceReadyRef.current = workspaceReady;
  }, [workspaceReady]);

  useEffect(() => {
    currentWorkspaceIdRef.current = currentWorkspaceId;
  }, [currentWorkspaceId]);

  useEffect(() => {
    captureDraftRef.current = captureDraft;
  }, [captureDraft]);

  useEffect(() => {
    captureWorldKeyRef.current = captureWorldKey;
    const savedDraft = loadCaptureDraft(captureWorldKey);
    setCaptureDraft(savedDraft ?? { category: "idea", text: "" });
    setCaptureStatus({ status: "idle", message: null });
    setCaptureToday(null);
  }, [captureWorldKey]);

  useEffect(() => {
    setActionBindings(loadActionBindings(actionBindingWorldKey));
    setActionBindingMessage(null);
  }, [actionBindingWorldKey]);

  useEffect(() => {
    const loaded = loadMidiBindings(midiBindingWorldKey);
    setMidiBindings(loaded);
    midiBindingsRef.current = loaded;
    setMidiBindingMessage(null);
    setMidiLearnedControl(null);
    setMidiLearning(false);
    midiLearningRef.current = false;
  }, [midiBindingWorldKey]);

  useEffect(() => {
    midiBindingsRef.current = midiBindings;
  }, [midiBindings]);

  useEffect(() => {
    midiLearningRef.current = midiLearning;
  }, [midiLearning]);

  useEffect(() => {
    midiTriggerRef.current = (binding: MidiBinding) => {
      void handleMidiBindingTrigger(binding);
    };
  });

  useEffect(() => {
    return () => {
      midiInputsRef.current.forEach((input) => {
        input.onmidimessage = null;
      });
    };
  }, []);

  useEffect(() => {
    function persistBeforeUnload() {
      const draft = captureDraftRef.current;
      if (draft.text.trim()) {
        saveCaptureDraft(captureWorldKeyRef.current, draft);
      } else {
        clearCaptureDraft(captureWorldKeyRef.current);
      }
    }

    window.addEventListener("beforeunload", persistBeforeUnload);
    return () => window.removeEventListener("beforeunload", persistBeforeUnload);
  }, []);

  useEffect(() => {
    if (authState.status !== "unlocked" || !captureToolOpen) {
      return;
    }
    let cancelled = false;
    fetchCaptureToday()
      .then((today) => {
        if (!cancelled) {
          setCaptureToday(today);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCaptureStatus({ status: "error", message: "Could not load capture log." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authState.status, captureToolOpen, captureWorldKey]);

  useEffect(() => {
    workspaceLayoutRef.current = workspaceLayout;
  }, [workspaceLayout]);

  useEffect(() => {
    tabStateRef.current = tabState;
  }, [tabState]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearchDialog();
        return;
      }
      const position = dispatchableHotkeyPosition({
        altKey: event.altKey,
        key: event.key,
        targetTagName:
          event.target instanceof HTMLElement ? event.target.tagName : undefined
      });
      if (position) {
        const slot = fastSlots.find((item) => item.position === position);
        if (slot) {
          event.preventDefault();
          void handleFastSlotTrigger(slot);
          return;
        }
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (isEditableHotkeyTarget(target)) {
        return;
      }
      const shortcut = canonicalShortcutFromEvent(event);
      if (!shortcut) {
        return;
      }
      const binding = actionBindings.find(
        (item) => item.shortcut.toLowerCase() === shortcut.toLowerCase()
      );
      if (binding) {
        event.preventDefault();
        void handleActionBindingTrigger(binding);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actionBindings, fastSlots, tabState.activePath]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    const scheduledWorkspaceId = currentWorkspaceId;
    const timeout = window.setTimeout(() => {
      if (currentWorkspaceIdRef.current !== scheduledWorkspaceId) {
        return;
      }
      const persistedTabs = tabState.tabs.filter(shouldPersistTab);
      const activePath = persistedTabs.some((tab) => tab.path === tabState.activePath)
        ? tabState.activePath
        : persistedTabs[0]?.path ?? null;
      void saveWorkspaceTabs(
        persistedTabs.map(openTabToWorkspaceTab),
        activePath
      ).catch(() => {});
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [currentWorkspaceId, tabState, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    const layout = normalizeWorkspaceLayout(
      workspaceLayout,
      tabState.tabs.map(openTabToWorkspaceTab)
    );
    const scheduledWorkspaceId = currentWorkspaceId;
    const timeout = window.setTimeout(() => {
      if (currentWorkspaceIdRef.current !== scheduledWorkspaceId) {
        return;
      }
      void saveWorkspaceLayout(layout).catch(() => {});
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [currentWorkspaceId, tabState.tabs, workspaceLayout, workspaceReady]);

  useEffect(() => {
    if (!searchToolOpen) {
      return;
    }

    const query = searchQuery.trim();
    if (!query) {
      setSearchState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setSearchState({ status: "loading" });
    const timeout = window.setTimeout(() => {
      searchWorld({ q: query, limit: 20 })
        .then((results) => {
          if (!cancelled) {
            setSearchState({ status: "ready", results });
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : "Unknown error";
            setSearchState({ status: "error", message });
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchToolOpen, searchQuery, searchRevision]);

  useEffect(() => {
    if (!audioToolOpen) {
      return;
    }

    let cancelled = false;
    setAudioState({ status: "loading" });
    const timeout = window.setTimeout(() => {
      fetchAudioLibrary({ q: audioQuery.trim() || undefined })
        .then((tracks) => {
          if (!cancelled) {
            setAudioState({ status: "ready", tracks });
            setAudioPlaylistExpansion((current) =>
              createPlaylistExpansionState(
                groupAudioTracksByBus(tracks),
                audioQuery.trim(),
                current
              )
            );
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : "Unknown error";
            setAudioState({ status: "error", message });
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [audioToolOpen, audioQuery, worldLibrary?.current?.id]);

  useEffect(() => {
    if (!pathPickerOpen || !pathPickerState.open || pathPickerState.filter !== "audio") {
      return;
    }
    if (audioState.status === "ready" || audioState.status === "loading") {
      return;
    }
    let cancelled = false;
    setAudioState({ status: "loading" });
    fetchAudioLibrary()
      .then((tracks) => {
        if (!cancelled) {
          setAudioState({ status: "ready", tracks });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";
          setAudioState({ status: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [audioState.status, pathPickerOpen, pathPickerState]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    let cancelled = false;
    setAudioPlaylistState({ status: "loading", playlists: [] });
    fetchAudioPlaylists()
      .then((response) => {
        if (!cancelled) {
          audioPlaylistsRef.current = response.playlists;
          setAudioPlaylistState({
            status: "ready",
            playlists: response.playlists
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";
          audioPlaylistsRef.current = [];
          setAudioPlaylistState({ status: "error", playlists: [], message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceReady, worldLibrary?.current?.id]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    let cancelled = false;
    fetchAudioLibrary()
      .then((tracks) => {
        if (!cancelled) {
          setAudioAutocompleteTracks(tracks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAudioAutocompleteTracks([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceReady, worldLibrary?.current?.id]);

  useEffect(() => {
    if (!scriptsToolOpen) {
      return;
    }

    let cancelled = false;
    setScriptState({ status: "loading" });
    fetchScripts()
      .then((scripts) => {
        if (cancelled) {
          return;
        }
        setScriptState({ status: "ready", scripts });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";
          setScriptState({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scriptsToolOpen, worldLibrary?.current?.id]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    let cancelled = false;
    setAssistantProvider((provider) => ({ ...provider, status: "checking" }));
    fetchAssistantProvider()
      .then((provider) => {
        if (!cancelled) {
          setAssistantProvider(provider);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAssistantProvider({
            status: "unavailable",
            provider: null,
            model: null,
            message:
              error instanceof Error
                ? error.message
                : "Assistant provider status is not available."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceReady, worldLibrary?.current?.id]);

  useEffect(() => {
    if (!screenToolOpen && !actionsToolOpen) {
      return;
    }
    fetchMapState()
      .then(adoptMapState)
      .catch(() => {});
    fetchMapPresets()
      .then((response) => setMapPresets(response.presets))
      .catch(() => {});
  }, [actionsToolOpen, screenToolOpen, worldLibrary?.current?.id]);

  const normalizedWorkspaceLayout = normalizeWorkspaceLayout(
    workspaceLayout,
    tabState.tabs.map(openTabToWorkspaceTab)
  );
  const activeTab = tabState.tabs.find((tab) => tab.path === tabState.activePath) ?? null;
  const mainPaneTab =
    tabState.tabs.find(
      (tab) => tab.path === activePathForPane(normalizedWorkspaceLayout, "main")
    ) ?? activeTab;
  const secondaryPaneTab =
    tabState.tabs.find(
      (tab) => tab.path === activePathForPane(normalizedWorkspaceLayout, "secondary")
    ) ?? null;
  const visiblePaneTabs =
    normalizedWorkspaceLayout.mode === "vertical_split" && secondaryPaneTab
      ? [mainPaneTab, secondaryPaneTab].filter(
          (tab, index, tabs): tab is OpenTab =>
            Boolean(tab) && tabs.findIndex((item) => item?.path === tab?.path) === index
        )
      : mainPaneTab
        ? [mainPaneTab]
        : [];
  const dirtyPaths = new Set(
    Object.entries(editorDrafts)
      .filter(([, draft]) => isDraftDirty(draft))
      .map(([path]) => path)
  );
  const hasDirtyDrafts = dirtyPaths.size > 0;
  const favoritePaths = new Set(favorites.map((favorite) => favorite.path));
  const idleFileState: FileLoadState = { status: "idle" };
  const idlePageState: PageLoadState = { status: "idle" };
  const idleLinksState: LinksLoadState = { status: "idle" };
  const activeFileState = activeTab
    ? fileStates[activeTab.path] ?? idleFileState
    : idleFileState;
  const activePageState = activeTab
    ? pageStates[activeTab.path] ?? idlePageState
    : idlePageState;
  const activeLinksState = activeTab
    ? linksStates[activeTab.path] ?? idleLinksState
    : idleLinksState;
  const activeDraft = activeTab ? editorDrafts[activeTab.path] ?? null : null;
  const activeMetadataEdit: MetadataEditState = activeTab
    ? metadataEdits[activeTab.path] ?? { mode: "view" }
    : { mode: "view" };
  const activeContentDirty = activeDraft ? isDraftDirty(activeDraft) : false;
  const selectedAssistantForm =
    localizedAssistantForms.find((form) => form.id === assistantFormId) ??
    localizedAssistantForms[0] ??
    DEFAULT_ASSISTANT_FORMS[0];
  const assistantCanUseActiveDocument =
    activeFileState.status === "ready" && isEditableFile(activeFileState.file);
  const assistantActiveDocumentLabel = activeTab
    ? activeTab.title ?? activeTab.name
    : "No active document";
  const visiblePanePathKey = visiblePaneTabs.map((tab) => tab.path).join("\u0000");

  function openContextHelp(context: string | null = null, restoreFocusTo?: HTMLElement | null) {
    const topic = resolveContextHelpTopic({
      activeMediaKind: activeTab?.mediaKind ?? null,
      focusedContext: context ?? lastHelpContextRef.current
    });
    if (!topic) {
      return;
    }
    contextHelpReturnFocusRef.current =
      restoreFocusTo ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setContextHelpTopic(topic);
  }

  function closeContextHelp() {
    setContextHelpTopic(null);
    window.requestAnimationFrame(() => contextHelpReturnFocusRef.current?.focus());
  }

  function closeWorldTreeContextMenu(restoreFocus = false) {
    setWorldTreeContextMenu({ open: false });
    if (restoreFocus) {
      window.requestAnimationFrame(() => worldTreeContextTriggerRef.current?.focus());
    }
  }

  useEffect(() => {
    setToolPanelState((state) =>
      applyToolAutoOpenRules(state, {
        activePath: activeTab?.path ?? null,
        audioActive: hasLoadedAudio(audioMixer),
        displayState,
        mapState,
        metadataEditing: activeMetadataEdit.mode === "edit"
      })
    );
  }, [activeTab?.path, activeMetadataEdit.mode, audioMixer, displayState, mapState]);

  useEffect(() => {
    if (searchToolOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchToolOpen]);

  useEffect(() => {
    function handleFocusIn(event: FocusEvent) {
      const context = helpContextFromTarget(event.target);
      if (context) {
        lastHelpContextRef.current = context;
      }
    }

    window.addEventListener("focusin", handleFocusIn);
    return () => window.removeEventListener("focusin", handleFocusIn);
  }, []);

  useEffect(() => {
    function handleHelpKeyDown(event: KeyboardEvent) {
      if (event.key !== "F1" || contextHelpTopic) {
        return;
      }
      const context = helpContextFromTarget(event.target);
      const topic = resolveContextHelpTopic({
        activeMediaKind: activeTab?.mediaKind ?? null,
        focusedContext: context ?? lastHelpContextRef.current
      });
      if (!topic) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      contextHelpReturnFocusRef.current =
        event.target instanceof HTMLElement
          ? event.target
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      setContextHelpTopic(topic);
    }

    window.addEventListener("keydown", handleHelpKeyDown, true);
    return () => window.removeEventListener("keydown", handleHelpKeyDown, true);
  }, [activeTab?.mediaKind, contextHelpTopic]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setLinkContextMenu({ open: false });
      closeWorldTreeContextMenu(true);
      setPeekState({ open: false });
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    function handleEditorKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }
      const shortcut = Boolean(event.ctrlKey || event.metaKey);
      const key = event.key.toLowerCase();
      if (!shortcut || (key !== "s" && event.code !== "KeyS" && event.key !== "\\")) {
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("[role='dialog'],[role='menu']")) {
        return;
      }
      if (!activeDraft || activeFileState.status !== "ready" || !isEditableFile(activeFileState.file)) {
        return;
      }
      const intent = editorShortcutIntent(event, {
        dirty: isDraftDirty(activeDraft),
        mode: activeDraft.mode,
        supportsSplit: supportsEditorMode(activeFileState.file, "split")
      });
      if (!intent) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      runEditorShortcutIntent(activeFileState.file, activeDraft, intent);
    }

    window.addEventListener("keydown", handleEditorKeyDown, true);
    return () => window.removeEventListener("keydown", handleEditorKeyDown, true);
  }, [activeDraft, activeFileState]);

  useEffect(() => {
    if (!hasDirtyDrafts) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDirtyDrafts]);

  const syncStateRef = useRef({
    activeContentDirty,
    activeDraft,
    activeMetadataEdit,
    activePageState,
    activeTab,
    tabState
  });
  const localWritePathsRef = useRef<Set<string>>(new Set());
  syncStateRef.current = {
    activeContentDirty,
    activeDraft,
    activeMetadataEdit,
    activePageState,
    activeTab,
    tabState
  };

  function markLocalWrite(paths: string[]) {
    for (const path of paths) {
      localWritePathsRef.current.add(path);
    }
    window.setTimeout(() => {
      for (const path of paths) {
        localWritePathsRef.current.delete(path);
      }
    }, 15000);
  }

  function unmarkLocalWrite(paths: string[]) {
    for (const path of paths) {
      localWritePathsRef.current.delete(path);
    }
  }

  function discardLocalWriteEvent(event: WorldEvent): WorldEvent | null {
    const localPaths = localWritePathsRef.current;
    const paths = event.paths.filter((path) => {
      if (localPaths.has(path)) {
        return false;
      }
      return true;
    });
    const deletedPaths = event.deleted_paths.filter((path) => {
      if (localPaths.has(path)) {
        return false;
      }
      return true;
    });

    if (paths.length === 0 && deletedPaths.length === 0) {
      return null;
    }
    return { ...event, paths, deleted_paths: deletedPaths };
  }

  useEffect(() => {
    for (const tab of visiblePaneTabs) {
      if (
        isTemporaryDmsPath(tab.path) ||
        tab.mediaKind === "image" ||
        tab.mediaKind === "pdf" ||
        tab.mediaKind === "video" ||
        tab.mediaKind === "unsupported"
      ) {
        continue;
      }

      const currentState = fileStates[tab.path];
      if (
        currentState?.status === "loading" ||
        currentState?.status === "ready" ||
        currentState?.status === "removed"
      ) {
        continue;
      }

      setFileStates((states) => ({
        ...states,
        [tab.path]: { status: "loading" }
      }));

      fetchWorldFile(tab.path)
        .then((file) => {
          setFileStates((states) => ({
            ...states,
            [tab.path]: { status: "ready", file }
          }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error";
          setFileStates((states) => ({
            ...states,
            [tab.path]: { status: "error", message }
          }));
        });
    }
  }, [visiblePanePathKey, fileStates]);

  useEffect(() => {
    if (activeFileState.status !== "ready" || !isEditableFile(activeFileState.file)) {
      return;
    }

    const file = activeFileState.file;
    setEditorDrafts((drafts) => {
      const currentDraft = drafts[file.path];
      if (!currentDraft) {
        return { ...drafts, [file.path]: createEditorDraft(file) };
      }
      if (localWritePathsRef.current.has(file.path)) {
        return drafts;
      }
      if (currentDraft.status === "saving" || currentDraft.status === "saved") {
        return drafts;
      }

      if (
        currentDraft.hash !== file.hash &&
        !isDraftDirty(currentDraft) &&
        currentDraft.status !== "conflict"
      ) {
        return { ...drafts, [file.path]: createEditorDraft(file) };
      }

      return drafts;
    });
  }, [activeFileState]);

  useEffect(() => {
    for (const tab of visiblePaneTabs) {
      if (isTemporaryDmsPath(tab.path)) {
        continue;
      }

      const currentState = pageStates[tab.path];
      if (
        currentState?.status === "loading" ||
        currentState?.status === "ready" ||
        currentState?.status === "error"
      ) {
        continue;
      }

      setPageStates((states) => ({
        ...states,
        [tab.path]: { status: "loading" }
      }));

      fetchPage(tab.path)
        .then((page) => {
          setPageStates((states) => ({
            ...states,
            [tab.path]: { status: "ready", page }
          }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error";
          setPageStates((states) => ({
            ...states,
            [tab.path]: { status: "error", message }
          }));
        });
    }
  }, [visiblePanePathKey, pageStates]);

  useEffect(() => {
    for (const tab of visiblePaneTabs) {
      if (isTemporaryDmsPath(tab.path) || !canHavePageLinks(tab)) {
        continue;
      }

      const currentState = linksStates[tab.path];
      if (
        currentState?.status === "loading" ||
        currentState?.status === "ready" ||
        currentState?.status === "error"
      ) {
        continue;
      }

      setLinksStates((states) => ({
        ...states,
        [tab.path]: { status: "loading" }
      }));

      Promise.all([fetchPageLinks(tab.path), fetchPageBacklinks(tab.path)])
        .then(([outgoing, backlinks]) => {
          setLinksStates((states) => ({
            ...states,
            [tab.path]: { status: "ready", outgoing, backlinks }
          }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error";
          setLinksStates((states) => ({
            ...states,
            [tab.path]: { status: "error", message }
          }));
        });
    }
  }, [visiblePanePathKey, linksStates]);

  function persistRecent(tab: WorkspaceTab) {
    setRecentFiles((items) => recordRecentItem(items, tab));
    void recordRecent(tab)
      .then((workspace) => setRecentFiles(workspace.recentFiles))
      .catch(() => {});
  }

  function openWorkspaceTab(tab: WorkspaceTab) {
    clearFailedDerivedFileState(tab.path);
    setTabState((state) => {
      const nextState = openTab(state, workspaceTabToOpenTab(tab));
      setWorkspaceLayout((layout) =>
        openFileInActivePane(
          normalizeWorkspaceLayout(layout, nextState.tabs.map(openTabToWorkspaceTab)),
          tab.path
        )
      );
      return nextState;
    });
    persistRecent(tab);
  }

  function handleActivateTab(path: string) {
    clearFailedDerivedFileState(path);
    setWorkspaceLayout((layout) =>
      openFileInActivePane(
        normalizeWorkspaceLayout(layout, tabState.tabs.map(openTabToWorkspaceTab)),
        path
      )
    );
    setTabState((state) => activateTab(state, path));
  }

  function confirmDiscardDirtyTab(path: string): boolean {
    if (!shouldConfirmDirtyTabClose(path, dirtyPaths)) {
      return true;
    }
    const tab = tabState.tabs.find((item) => item.path === path);
    return window.confirm(
      tab
        ? dirtyTabCloseMessage(tab)
        : "Close this file without saving changes?"
    );
  }

  function confirmDiscardDirtyDrafts(message: string): boolean {
    return !hasDirtyDrafts || window.confirm(message);
  }

  function handleCloseTab(path: string) {
    if (!confirmDiscardDirtyTab(path)) {
      return;
    }
    setEditorDrafts((drafts) => {
      if (!drafts[path]) {
        return drafts;
      }
      const nextDrafts = { ...drafts };
      delete nextDrafts[path];
      return nextDrafts;
    });
    setTabState((state) => {
      const nextState = closeTab(state, path);
      setWorkspaceLayout((layout) =>
        retargetLayoutAfterTabClose(
          normalizeWorkspaceLayout(layout, state.tabs.map(openTabToWorkspaceTab)),
          nextState.tabs.map(openTabToWorkspaceTab),
          path
        )
      );
      return nextState;
    });
  }

  function handleActivatePane(paneId: WorkspacePaneId, path: string | null) {
    setWorkspaceLayout((layout) => ({ ...layout, activePaneId: paneId }));
    if (path) {
      setTabState((state) => activateTab(state, path));
    }
  }

  function openResolvedLink(link: PageLink) {
    const tab = linkToOpenTab(link);
    if (tab) {
      openWorkspaceTab(openTabToWorkspaceTab(tab));
    }
  }

  function openLinkInOtherPane(link: PageLink) {
    const tab = linkToOpenTab(link);
    if (!tab) {
      return;
    }
    const targetPane: WorkspacePaneId =
      normalizedWorkspaceLayout.activePaneId === "main" ? "secondary" : "main";
    setWorkspaceLayout((layout) => ({
      ...layout,
      mode: "vertical_split",
      activePaneId: targetPane,
      panes: layout.panes.map((pane) =>
        pane.id === targetPane ? { ...pane, activePath: tab.path } : pane
      )
    }));
    openWorkspaceTab(openTabToWorkspaceTab(tab));
  }

  function openPeekTab(tab: OpenTab) {
    const peekTab = tab;
    setPeekState({
      open: true,
      tab: peekTab,
      fileState: canHavePageLinks(peekTab) ? { status: "loading" } : { status: "idle" },
      linksState: { status: "idle" }
    });
    if (!canHavePageLinks(peekTab)) {
      return;
    }
    Promise.all([
      fetchWorldFile(peekTab.path),
      fetchPageLinks(peekTab.path),
      fetchPageBacklinks(peekTab.path)
    ])
      .then(([file, outgoing, backlinks]) => {
        setPeekState((current) =>
          current.open && current.tab.path === peekTab.path
            ? {
                open: true,
                tab: peekTab,
                fileState: { status: "ready", file },
                linksState: { status: "ready", outgoing, backlinks }
              }
            : current
        );
      })
      .catch((error: unknown) => {
        setPeekState((current) =>
          current.open && current.tab.path === peekTab.path
            ? {
                open: true,
                tab: peekTab,
                fileState: {
                  status: "error",
                  message: error instanceof Error ? error.message : "Could not load preview."
                },
                linksState: { status: "idle" }
              }
            : current
        );
      });
  }

  function openLinkPeek(link: PageLink) {
    const tab = linkToOpenTab(link);
    if (tab) {
      openPeekTab(tab);
    }
  }

  function handleDiceClearHistory() {
    setDiceHistory((history) => clearDiceHistory(history));
    setDiceStatus({ status: "idle", message: null });
  }

  function handleDiceRoll(expression: string) {
    const trimmed = expression.trim();
    if (!trimmed) {
      return;
    }
    setToolPanelState((state) => openToolSectionByUser(state, "dice"));
    setDiceStatus({ status: "rolling", message: null });
    rollDice(trimmed)
      .then((roll: DiceRollResponse) => {
        const entry: DiceHistoryEntry = {
          ...roll,
          id: `${roll.rolled_at}-${roll.expression}-${Math.random().toString(36).slice(2)}`
        };
        setDiceHistory((history) => addDiceHistoryEntry(history, entry));
        setDiceStatus({ status: "ready", message: null });
      })
      .catch((error: unknown) => {
        setDiceStatus({
          status: "error",
          message: error instanceof Error ? error.message : t("dice.error")
        });
      });
  }

  function handleLinkContext(link: PageLink, event: MouseEvent<HTMLElement>) {
    setLinkContextMenu({ open: true, link, x: event.clientX, y: event.clientY });
  }

  function openBacklink(link: PageLink) {
    const sourcePage = pages.find((page) => page.path === link.source_path);
    openWorkspaceTab({
      path: link.source_path,
      name: link.source_path.split("/").filter(Boolean).at(-1) ?? link.source_path,
      title: sourcePage?.title ?? null,
      mediaKind: "markdown"
    });
  }

  function tabForEntry(entry: WorldEntry): WorkspaceTab {
    const mediaKind = mediaKindForEntry(entry);
    const pageTitle =
      entry.title ??
      (mediaKind === "markdown" ? pages.find((page) => page.path === entry.path)?.title : null) ??
      null;
    return {
      path: entry.path,
      name: entry.name,
      title: pageTitle,
      mediaKind
    };
  }

  function handleOpenEntry(entry: WorldEntry) {
    if (entry.kind !== "file") {
      return;
    }

    openWorkspaceTab(tabForEntry(entry));
  }

  function handleWorldTreeContextEntry(entry: WorldEntry, event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    worldTreeContextTriggerRef.current = event.currentTarget;
    setFolderMenuPath(null);
    setWorldTreeContextMenu({
      open: true,
      entry,
      x: Math.min(event.clientX, Math.max(8, window.innerWidth - 190)),
      y: Math.min(event.clientY, Math.max(8, window.innerHeight - 190))
    });
  }

  function handleWorldTreeRename(entry: WorldEntry) {
    if (entry.path === "") {
      return;
    }
    setFileDialog({
      kind: "rename",
      path: entry.path,
      newPath: entry.path,
      entryKind: entry.kind,
      status: "idle",
      error: null
    });
  }

  async function handleWorldTreeDuplicate(entry: WorldEntry) {
    if (entry.path === "") {
      return;
    }
    const validation = treeOperationBlockedByDirty(entry.path);
    if (validation) {
      setWorldTreeStatus(validation);
      return;
    }
    markLocalWrite([entry.path]);
    try {
      const duplicated = await duplicateWorldPath({ path: entry.path });
      await refreshWorldStructure(duplicated.affected_paths);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [duplicated.path]));
      setWorldTreeStatus(`Duplicated ${entry.path} to ${duplicated.path}.`);
    } catch (error: unknown) {
      unmarkLocalWrite([entry.path]);
      setWorldTreeStatus(managementErrorMessage(error));
    }
  }

  function handleWorldTreeTrash(entry: WorldEntry) {
    if (entry.path === "") {
      return;
    }
    setFileDialog({
      kind: "trash",
      path: entry.path,
      entryKind: entry.kind,
      status: "idle",
      error: null
    });
  }

  function handleWorldTreeDragStart(entry: WorldEntry, event: DragEvent<HTMLElement>) {
    if (entry.path === "") {
      event.preventDefault();
      return;
    }
    setWorldTreeDragPath(entry.path);
    setWorldTreeDropPath(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entry.path);
  }

  function handleWorldTreeDragEnd() {
    setWorldTreeDragPath(null);
    setWorldTreeDropPath(null);
  }

  async function handleWorldTreeDrop(targetEntry: WorldEntry, event: DragEvent<HTMLElement>) {
    if (targetEntry.kind !== "directory") {
      return;
    }
    event.preventDefault();
    const sourcePath = worldTreeDragPath ?? event.dataTransfer.getData("text/plain");
    handleWorldTreeDragEnd();
    if (!sourcePath || sourcePath === targetEntry.path || isDescendantPath(targetEntry.path, sourcePath)) {
      return;
    }
    const currentParent = sourcePath.split("/").slice(0, -1).join("/");
    if (currentParent === targetEntry.path) {
      return;
    }
    const validation = treeOperationBlockedByDirty(sourcePath);
    if (validation) {
      setWorldTreeStatus(validation);
      return;
    }
    const targetPath = joinWorldPath(targetEntry.path, fileNameFromPath(sourcePath));
    markLocalWrite([sourcePath, targetPath]);
    try {
      const moved = await moveWorldPath({ path: sourcePath, new_path: targetPath });
      await refreshWorldStructure([sourcePath, moved.path, ...moved.affected_paths]);
      applyMovedPathToWorkspaceState(sourcePath, moved.path);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [moved.path]));
      setWorldTreeStatus(`Moved ${sourcePath} to ${moved.path}.`);
    } catch (error: unknown) {
      unmarkLocalWrite([sourcePath, targetPath]);
      setWorldTreeStatus(managementErrorMessage(error));
    }
  }

  function handleOpenSearchResult(result: SearchResult) {
    openWorkspaceTab(searchResultToTab(result));
  }

  function handleOpenSearchResultOtherPane(result: SearchResult) {
    const tab = searchResultToTab(result);
    const targetPane: WorkspacePaneId =
      normalizedWorkspaceLayout.activePaneId === "main" ? "secondary" : "main";
    setWorkspaceLayout((layout) => ({
      ...layout,
      mode: "vertical_split",
      activePaneId: targetPane,
      panes: layout.panes.map((pane) =>
        pane.id === targetPane ? { ...pane, activePath: tab.path } : pane
      )
    }));
    openWorkspaceTab(tab);
  }

  function handlePeekSearchResult(result: SearchResult) {
    openPeekTab(workspaceTabToOpenTab(searchResultToTab(result)));
  }

  function handleStageSearchResult(result: SearchResult) {
    void openDisplayPopup(result.path, "plain", false).then(setDisplayState).catch(() => {});
  }

  function handleShowSearchResult(result: SearchResult) {
    void openDisplayPopup(result.path).then(setDisplayState).catch(() => {});
  }

  async function refreshWorkspaceSummaries() {
    const summaries = await fetchWorkspaces();
    setWorkspaces(summaries);
    return summaries;
  }

  function applyWorkspaceState(workspace: WorkspaceState) {
    const nextTabState = workspaceStateToTabState(workspace);
    setCurrentWorkspaceId(workspace.workspaceId);
    setCurrentWorkspaceName(workspace.workspaceName);
    setFavorites(workspace.favorites);
    setRecentFiles(workspace.recentFiles);
    setTabState(nextTabState);
    setWorkspaceLayout(normalizeWorkspaceLayout(workspace.layout, workspace.tabs));
  }

  async function refreshHpTracker() {
    setHpStatus({ status: "loading", message: null });
    try {
      const state = await fetchHpTracker();
      hpEditVersionRef.current = 0;
      hpRowsRef.current = state.rows;
      setHpRows(state.rows);
      setHpStatus({ status: "idle", message: null });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setHpStatus({ status: "error", message });
    }
  }

  async function flushCurrentWorkspaceState() {
    if (!workspaceReadyRef.current) {
      return;
    }
    const latestTabState = tabStateRef.current;
    const latestWorkspaceLayout = workspaceLayoutRef.current;
    const persistedTabs = latestTabState.tabs.filter(shouldPersistTab);
    const workspaceTabs = persistedTabs.map(openTabToWorkspaceTab);
    const activePath = persistedTabs.some((tab) => tab.path === latestTabState.activePath)
      ? latestTabState.activePath
      : persistedTabs[0]?.path ?? null;
    const layout = normalizeWorkspaceLayout(latestWorkspaceLayout, workspaceTabs);
    await Promise.all([
      saveWorkspaceTabs(workspaceTabs, activePath),
      saveWorkspaceLayout(layout)
    ]).catch(() => {});
  }

  async function handleActivateWorkspace(workspaceId: string) {
    if (!workspaceId) {
      return;
    }
    await flushCurrentWorkspaceState();
    const workspace = await activateWorkspace(workspaceId);
    applyWorkspaceState(workspace);
    await refreshHpTracker();
    await refreshWorkspaceSummaries();
  }

  async function handleSubmitWorkspaceDialog() {
    if (workspaceDialog.kind === "closed") {
      return;
    }
    const name = workspaceDialog.name.trim();
    if (!name) {
      setWorkspaceDialog({ ...workspaceDialog, name, error: "Workspace name is required." });
      return;
    }
    if (name.length > 60) {
      setWorkspaceDialog({ ...workspaceDialog, name, error: "Use 60 characters or fewer." });
      return;
    }

    setWorkspaceDialog({ ...workspaceDialog, name, status: "submitting", error: null });
    try {
      if (workspaceDialog.kind === "create") {
        const workspace = await createWorkspace(name);
        applyWorkspaceState(workspace);
        await refreshHpTracker();
      } else {
        await flushCurrentWorkspaceState();
        const renamed = await renameWorkspace(workspaceDialog.workspace.id, name);
        if (renamed.id === currentWorkspaceId) {
          setCurrentWorkspaceName(renamed.name);
        }
      }
      await refreshWorkspaceSummaries();
      setWorkspaceDialog({ kind: "closed" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setWorkspaceDialog({ ...workspaceDialog, name, status: "idle", error: message });
    }
  }

  async function handleDeleteCurrentWorkspace() {
    if (currentWorkspaceId === "default") {
      return;
    }
    const targetId = currentWorkspaceId;
    const fallback = workspaces.find((workspace) => workspace.id === "default") ??
      workspaces.find((workspace) => workspace.id !== targetId);
    if (!fallback) {
      return;
    }
    try {
      const fallbackWorkspace = await activateWorkspace(fallback.id);
      applyWorkspaceState(fallbackWorkspace);
      await refreshHpTracker();
      const summaries = await deleteWorkspace(targetId);
      setWorkspaces(summaries);
    } catch {
      // Keep the selector stable; backend explains delete failures in focused API tests.
    }
  }

  function handleWorkspaceModeChange(mode: WorkspaceLayout["mode"]) {
    const nextLayout = layoutWithMode(
      normalizeWorkspaceLayout(workspaceLayout, tabState.tabs.map(openTabToWorkspaceTab)),
      mode,
      tabState.tabs
    );
    setWorkspaceLayout(nextLayout);
  }

  function handlePaneResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const container = event.currentTarget.parentElement;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const ratio = clampWorkspaceSplitRatio((moveEvent.clientX - rect.left) / rect.width);
      setWorkspaceLayout((layout) => ({ ...layout, splitRatio: ratio }));
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  async function handleAuthUnlock(token: string) {
    if (authState.status !== "locked" && authState.status !== "unlocking") {
      return;
    }
    setAuthState({ status: "unlocking", auth: authState.auth, error: null });
    try {
      const nextStatus = await loginAuth(token);
      if (nextStatus.authenticated) {
        setAuthState({ status: "unlocked", auth: nextStatus });
      } else {
        setAuthState({ status: "locked", auth: nextStatus, error: "Invalid access code." });
      }
    } catch {
      setAuthState({ status: "locked", auth: authState.auth, error: "Invalid access code." });
    }
  }

  function saveFastSlotList(nextSlots: FastSlot[]) {
    const sorted = sortFastSlots(nextSlots);
    fastSlotsRevision.current += 1;
    setFastSlots(sorted);
    void saveFastSlots(sorted)
      .then((savedSlots) => {
        const visibleSavedSlots = visibleFastSlots(savedSlots);
        setFastSlots(visibleSavedSlots.length > 0 || sorted.length === 0 ? visibleSavedSlots : sorted);
      })
      .catch(() => {});
  }

  function handleSaveFastSlot(slot: FastSlot) {
    setFastSlotError(null);
    saveFastSlotList(replaceFastSlot(fastSlots, slot));
  }

  function handleClearFastSlot(position: number) {
    setFastSlotError(null);
    saveFastSlotList(clearFastSlot(fastSlots, position));
  }

  function saveActionBindingList(nextBindings: ActionBinding[]) {
    const saved = saveActionBindings(actionBindingWorldKey, nextBindings);
    setActionBindings(saved);
  }

  function handleSaveActionBinding(binding: ActionBinding) {
    setActionBindingMessage(`Saved ${binding.label}`);
    saveActionBindingList(sortActionBindings([
      binding,
      ...actionBindings.filter((item) => item.id !== binding.id)
    ]));
  }

  function handleDeleteActionBinding(bindingId: string) {
    setActionBindingMessage(null);
    saveActionBindingList(actionBindings.filter((binding) => binding.id !== bindingId));
  }

  async function handleSaveTableSnapshot() {
    const name = tableSnapshotName.trim();
    if (!name) {
      setTableSnapshotStatus({ status: "error", message: "Snapshot name is required." });
      return;
    }
    if (name.length > 80) {
      setTableSnapshotStatus({ status: "error", message: "Use 80 characters or fewer." });
      return;
    }

    setTableSnapshotStatus({ status: "saving", message: "Saving..." });
    try {
      await flushCurrentWorkspaceState();
      const [workspace, display, map] = await Promise.all([
        fetchWorkspace(),
        fetchDisplayState(),
        fetchMapState()
      ]);
      const saved = await saveTableSnapshot({
        name,
        state: buildTableSnapshotState(display, map, workspace, audioMixer)
      });
      setTableSnapshots((snapshots) => saveTableSnapshotInList(snapshots, saved));
      setSelectedTableSnapshotId(saved.id);
      setTableSnapshotStatus({ status: "saved", message: `Saved ${saved.name}` });
    } catch (error: unknown) {
      setTableSnapshotStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not save table state."
      });
    }
  }

  async function handleLoadTableSnapshot(snapshotId: string) {
    if (!snapshotId) {
      setTableSnapshotStatus({ status: "error", message: "Choose a saved state first." });
      return;
    }
    setTableSnapshotStatus({ status: "loading", message: "Loading..." });
    try {
      const restored = await restoreTableSnapshot(snapshotId);
      setDisplayState(restored.display);
      adoptMapState(restored.map);
      setLocalMapViewport(null);
      mapViewportSyncRef.current.lastSyncedAt = 0;
      applyWorkspaceState(restored.workspace);
      setAudioMixer((state) => applyAudioSnapshot(state, restored.audio));
      setTableSnapshots((snapshots) =>
        saveTableSnapshotInList(snapshots, restored.snapshot)
      );
      setSelectedTableSnapshotId(restored.snapshot.id);
      await Promise.all([refreshWorkspaceSummaries(), refreshHpTracker()]);
      setTableSnapshotStatus({
        status: "loaded",
        message: `Loaded ${restored.snapshot.name}`
      });
    } catch (error: unknown) {
      setTableSnapshotStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load table state."
      });
    }
  }

  async function handleDeleteTableSnapshot(snapshotId: string) {
    if (!snapshotId) {
      setTableSnapshotStatus({ status: "error", message: "Choose a saved state first." });
      return;
    }
    setTableSnapshotStatus({ status: "loading", message: "Deleting..." });
    try {
      await deleteTableSnapshot(snapshotId);
      setTableSnapshots((snapshots) => deleteTableSnapshotFromList(snapshots, snapshotId));
      setSelectedTableSnapshotId((currentId) => (currentId === snapshotId ? "" : currentId));
      setTableSnapshotStatus({ status: "saved", message: "Deleted table state." });
    } catch (error: unknown) {
      setTableSnapshotStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not delete table state."
      });
    }
  }

  function openDmsOutputTabs(run: DmsRunState) {
    for (const output of run.outputs) {
      const file = dmsOutputToWorldFile(output);
      setFileStates((states) => ({
        ...states,
        [file.path]: { status: "ready", file }
      }));
      setTabState((state) =>
        {
          const nextState = openTab(state, {
          path: file.path,
          name: file.name,
          title: file.name,
          mediaKind: file.media_kind
          });
          setWorkspaceLayout((layout) =>
            openFileInActivePane(
              normalizeWorkspaceLayout(layout, nextState.tabs.map(openTabToWorkspaceTab)),
              file.path
            )
          );
          return nextState;
        }
      );
    }
  }

  async function loadMapPresetForAutomation(presetId: string, present: boolean) {
    let nextMapState = await loadMapPreset(presetId);
    if (present) {
      nextMapState = await presentMap();
      setDisplayState(await fetchDisplayState());
    } else if (nextMapState.presenting) {
      nextMapState = await stopMap();
    }
    adoptMapState(nextMapState);
  }

  async function applyDmsEffects(run: DmsRunState) {
    for (const effect of run.effects) {
      if (effect.kind === "screen_fullscreen") {
        setDisplayState(await setDisplayFullscreen(effect.path));
        adoptMapState(await fetchMapState());
        setScreenToolTab("display");
      } else if (effect.kind === "screen_popup") {
        setDisplayState(await openDisplayPopup(effect.path));
        setScreenToolTab("display");
      } else if (effect.kind === "map_load") {
        let nextMapState = await setMapSource(effect.path);
        if (effect.present) {
          nextMapState = await presentMap();
          setDisplayState(await fetchDisplayState());
        }
        adoptMapState(nextMapState);
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_preset") {
        await loadMapPresetForAutomation(effect.preset_id, effect.present);
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_present") {
        adoptMapState(await presentMap());
        setDisplayState(await fetchDisplayState());
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_stop") {
        adoptMapState(await stopMap());
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_fog") {
        adoptMapState(await setMapFog(effect.enabled));
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "audio_play") {
        const tracks = await fetchFullAudioLibraryTracks();
        const track = tracks.find((item) => item.path === effect.path);
        if (track) {
          const busTrack = { ...track, bus: effect.bus };
          setAudioMixer((state) =>
            setAudioBusVolume(
              setAudioBusPlaying(loadAudioTrack(state, busTrack), effect.bus, true),
              effect.bus,
              effect.volume / 100
            )
          );
          setToolPanelState((state) => openToolSectionByUser(state, "audio"));
        }
      }
    }
  }

  async function waitForDmsRun(run: DmsRunState): Promise<DmsRunState> {
    let current = run;
    while (current.status === "running") {
      if (cancelledDmsRuns.current.has(current.run_id)) {
        return {
          ...current,
          status: "cancelled",
          stderr: current.stderr || "Cancelled."
        };
      }
      setScriptRunState({
        status: "running",
        path: current.path,
        runId: current.run_id,
        run: current
      });
      await delay(250);
      current = await fetchDmsRun(current.run_id);
    }
    return current;
  }

  async function handleDmsRunResult(run: DmsRunState) {
    const finalRun = run.status === "running" ? await waitForDmsRun(run) : run;
    setScriptRunState({ status: "ready", run: finalRun });
    if (finalRun.status === "waiting_for_form" && finalRun.form_request) {
      const fields = normalizeDmsFormSchema(finalRun.form_request.schema);
      setDmsFormDialog({
        open: true,
        run: finalRun,
        fields,
        values: buildDmsFormDefaults(fields)
      });
      return;
    }
    setDmsFormDialog({ open: false });
    if (finalRun.status === "success") {
      await refreshWorldStructure([]);
      setFileStates((states) =>
        Object.fromEntries(
          Object.entries(states).filter(([path]) => isTemporaryDmsPath(path))
        )
      );
      setPageStates({});
      setLinksStates({});
      openDmsOutputTabs(finalRun);
      await applyDmsEffects(finalRun);
    }
  }

  async function runTrustedDmsScript(path: string) {
    cancelledDmsRuns.current.clear();
    setScriptRunState({ status: "running", path, runId: null });
    setToolPanelState((state) => openToolSectionByUser(state, "scripts"));
    try {
      await handleDmsRunResult(await runDmsScript(path));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setScriptRunState({ status: "error", message });
    }
  }

  async function handleRunDmsScript(path: string) {
    if (!trustedScriptPaths.has(path)) {
      setDmsTrustDialog({ open: true, path });
      setToolPanelState((state) => openToolSectionByUser(state, "scripts"));
      return;
    }
    await runTrustedDmsScript(path);
  }

  async function handleConfirmDmsTrust() {
    if (!dmsTrustDialog.open) {
      return;
    }
    const path = dmsTrustDialog.path;
    try {
      await acknowledgeDmsTrust();
      setTrustedScriptPaths((paths) => new Set(paths).add(path));
      setDmsTrustDialog({ open: false });
      await runTrustedDmsScript(path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setDmsTrustDialog({ open: false });
      setScriptRunState({ status: "error", message });
      setToolPanelState((state) => openToolSectionByUser(state, "scripts"));
    }
  }

  function handleCancelDmsTrust() {
    setDmsTrustDialog({ open: false });
  }

  function handleDmsFormChange(name: string, value: string | number | boolean) {
    setDmsFormDialog((state) =>
      state.open
        ? { ...state, values: { ...state.values, [name]: value } }
        : state
    );
  }

  async function handleDmsFormSubmit() {
    if (!dmsFormDialog.open) {
      return;
    }
    setScriptRunState({
      status: "running",
      path: dmsFormDialog.run.path,
      runId: dmsFormDialog.run.run_id,
      run: dmsFormDialog.run
    });
    try {
      await handleDmsRunResult(
        await submitDmsForm(dmsFormDialog.run.run_id, dmsFormDialog.values)
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setScriptRunState({ status: "error", message });
    }
  }

  async function handleCancelDmsScript(runId: string) {
    cancelledDmsRuns.current.add(runId);
    try {
      await handleDmsRunResult(await cancelDmsRun(runId));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setScriptRunState({ status: "error", message });
    }
  }

  async function executeActionBindingAction(
    action: ActionBindingAction,
    reportError: (message: string | null) => void
  ) {
    reportError(null);
    const validation = validateDispatchAction(action);
    if ("error" in validation) {
      reportError(validation.error);
      setToolPanelState((state) => openToolSectionByUser(state, "actions"));
      return;
    }
    const validatedAction = validation.action;
    if (isTableSnapshotRestoreAction(validatedAction)) {
      await handleLoadTableSnapshot(validatedAction.snapshot_id);
      return;
    }
    if (validatedAction.kind === "scenario") {
      reportError("Legacy scenario slots are deprecated. Create a Run script slot.");
      setToolPanelState((state) => openToolSectionByUser(state, "actions"));
      return;
    }
    const dispatchAction = validatedAction;
    if (dispatchAction.kind === "open_file") {
      openWorkspaceTab(workspaceTabFromPath(dispatchAction.path, pages));
      return;
    }
    if (dispatchAction.kind === "screen_fullscreen") {
      const resolved = resolveScreenActionPath(dispatchAction, activeTab?.path);
      if ("error" in resolved) {
        reportError(resolved.error);
        setToolPanelState((state) => openToolSectionByUser(state, "actions"));
        return;
      }
      setDisplayState(await setDisplayFullscreen(resolved.path));
      adoptMapState(await fetchMapState());
      setScreenToolTab("display");
      setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      return;
    }
    if (dispatchAction.kind === "screen_popup") {
      const resolved = resolveScreenActionPath(dispatchAction, activeTab?.path);
      if ("error" in resolved) {
        reportError(resolved.error);
        setToolPanelState((state) => openToolSectionByUser(state, "actions"));
        return;
      }
      setDisplayState(await openDisplayPopup(resolved.path, dispatchAction.preset ?? "plain"));
      setScreenToolTab("display");
      setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      return;
    }
    if (dispatchAction.kind === "audio_track") {
      const tracks = await fetchFullAudioLibraryTracks();
      const track = tracks.find((item) => item.path === dispatchAction.path);
      if (track) {
        const effectTrack = { ...track, bus: "effect" as const };
        setAudioMixer((state) =>
          setAudioBusPlaying(loadAudioTrack(state, effectTrack), "effect", true)
        );
        setToolPanelState((state) => openToolSectionByUser(state, "audio"));
      } else {
        reportError("Audio track was not found.");
        setToolPanelState((state) => openToolSectionByUser(state, "actions"));
      }
      return;
    }
    if (dispatchAction.kind === "script_run") {
      await handleRunDmsScript(dispatchAction.path);
      return;
    }
    if (dispatchAction.kind === "map_preset") {
      await loadMapPresetForAutomation(dispatchAction.preset_id, dispatchAction.present);
      setScreenToolTab("map");
      setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      return;
    }
  }

  async function handleFastSlotTrigger(slot: FastSlot) {
    await executeActionBindingAction(slot.action, setFastSlotError);
  }

  async function handleActionBindingTrigger(binding: ActionBinding) {
    await executeActionBindingAction(binding.action, (message) => {
      setActionBindingMessage(message);
      if (message) {
        setToolPanelState((state) => openToolSectionByUser(state, "actions"));
      }
    });
  }

  function handleSaveMidiBinding(binding: MidiBinding) {
    setMidiBindings((current) => {
      const next = saveMidiBindings(
        midiBindingWorldKey,
        sortMidiBindings([
          ...current.filter((item) => item.id !== binding.id),
          binding
        ])
      );
      midiBindingsRef.current = next;
      return next;
    });
    setMidiBindingMessage(`Saved ${binding.label}`);
  }

  function handleDeleteMidiBinding(bindingId: string) {
    setMidiBindings((current) => {
      const next = saveMidiBindings(
        midiBindingWorldKey,
        current.filter((binding) => binding.id !== bindingId)
      );
      midiBindingsRef.current = next;
      return next;
    });
    setMidiBindingMessage("Removed MIDI binding.");
  }

  async function handleMidiBindingTrigger(binding: MidiBinding) {
    await executeActionBindingAction(binding.action, (message) => {
      setMidiBindingMessage(message);
      if (message) {
        setToolPanelState((state) => openToolSectionByUser(state, "actions"));
      }
    });
  }

  function handleClearMidiLearned() {
    setMidiLearnedControl(null);
    setMidiLearning(false);
    midiLearningRef.current = false;
  }

  function handleMidiInputMessage(input: MidiInputLike, data: ArrayLike<number>) {
    const message = parseMidiMessage(data);
    if (!message) {
      return;
    }
    const inputId = input.id ?? null;
    const inputName = input.name ?? null;
    if (midiLearningRef.current) {
      setMidiLearnedControl({ input_id: inputId, input_name: inputName, message });
      setMidiLearning(false);
      midiLearningRef.current = false;
      setMidiStatus({
        status: "connected",
        message: `Learned ${formatMidiMessageLabel(message)} from ${inputName || inputId || "MIDI input"}.`
      });
      return;
    }
    if (isEditableHotkeyTarget(document.activeElement as HTMLElement | null)) {
      return;
    }
    const messageKey = midiMessageKey(message);
    const binding = midiBindingsRef.current.find(
      (item) =>
        (item.input_id === null || item.input_id === inputId) &&
        midiMessageKey(item.message) === messageKey
    );
    if (binding) {
      midiTriggerRef.current(binding);
    }
  }

  async function handleConnectMidi() {
    if (!isMidiSupported(typeof navigator === "undefined" ? null : navigator)) {
      setMidiStatus({
        status: "unsupported",
        message: "Web MIDI is not available in this browser."
      });
      return;
    }
    setMidiStatus({ status: "connecting", message: "Requesting MIDI access..." });
    try {
      const requestMIDIAccess = (
        navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccessLike> }
      ).requestMIDIAccess;
      if (!requestMIDIAccess) {
        throw new Error("Web MIDI is not available.");
      }
      const access = await requestMIDIAccess.call(navigator);
      midiInputsRef.current.forEach((input) => {
        input.onmidimessage = null;
      });
      const inputs = Array.from(access.inputs.values());
      midiInputsRef.current = inputs;
      setMidiInputs(
        inputs.map((input) => ({
          id: input.id ?? null,
          name: input.name ?? null
        }))
      );
      inputs.forEach((input) => {
        input.onmidimessage = (event) => handleMidiInputMessage(input, event.data);
      });
      setMidiStatus({
        status: "connected",
        message:
          inputs.length > 0
            ? `Connected to ${inputs.map((input) => input.name || input.id || "MIDI input").join(", ")}.`
            : "MIDI connected, but no inputs were found."
      });
    } catch (error: unknown) {
      setMidiStatus({
        status: "error",
        message: error instanceof Error ? error.message : "MIDI permission was denied."
      });
    }
  }

  async function handleStartMidiLearn() {
    if (midiStatus.status === "unsupported") {
      return;
    }
    if (midiInputsRef.current.length === 0) {
      await handleConnectMidi();
      if (midiInputsRef.current.length === 0) {
        return;
      }
    }
    setMidiLearnedControl(null);
    setMidiBindingMessage(null);
    setMidiLearning(true);
    midiLearningRef.current = true;
    setMidiStatus({ status: "listening", message: "Listening for a MIDI note or control..." });
  }

  function handleOpenDmsOutputSaveDialog() {
    if (activeFileState.status !== "ready" || !isTemporaryDmsPath(activeFileState.file.path)) {
      return;
    }
    setDmsOutputSaveDialog({
      open: true,
      file: activeFileState.file,
      path: activeFileState.file.name,
      status: "idle",
      error: null
    });
  }

  function handleDmsOutputSavePathChange(path: string) {
    setDmsOutputSaveDialog((state) =>
      state.open ? { ...state, path, error: null } : state
    );
  }

  async function handleAssistantCheckProvider() {
    setAssistantProvider((provider) => ({ ...provider, status: "checking" }));
    try {
      setAssistantProvider(await fetchAssistantProvider());
    } catch (error: unknown) {
      setAssistantProvider({
        status: "unavailable",
        provider: null,
        model: null,
        message: error instanceof Error ? error.message : "Assistant provider status is not available."
      });
    }
  }

  function handleAssistantFormChange(formId: string) {
    const form =
      localizedAssistantForms.find((item) => item.id === formId) ??
      localizedAssistantForms[0] ??
      DEFAULT_ASSISTANT_FORMS[0];
    setAssistantFormId(form.id);
    setAssistantValues(assistantFormDefaults(form.fields));
    setAssistantResult(null);
    setAssistantStatus({ status: "idle", message: null });
    const nextSaveKind = defaultAssistantSaveKind(form);
    setAssistantSaveKind(nextSaveKind);
    setAssistantSavePath(defaultAssistantSavePath(form, null, nextSaveKind));
  }

  function handleAssistantFieldChange(name: string, value: AssistantFieldValue) {
    setAssistantValues((values) => ({ ...values, [name]: value }));
    setAssistantStatus({ status: "idle", message: null });
  }

  function handleAssistantContextChange(context: string) {
    setAssistantContext(context);
    setAssistantContextSource(null);
    setAssistantStatus({ status: "idle", message: null });
  }

  function handleAssistantUseActiveDocument() {
    if (!activeTab || activeFileState.status !== "ready" || !assistantCanUseActiveDocument) {
      setAssistantStatus({ status: "error", message: "Open a loaded text document first." });
      return;
    }
    const content = activeDraft?.content ?? activeFileState.file.content;
    setAssistantContext(content);
    setAssistantContextSource(activeTab.path);
    setAssistantStatus({ status: "idle", message: `Context set from ${activeTab.path}.` });
  }

  async function handleAssistantGenerate() {
    const missing = selectedAssistantForm.fields.find((field) => {
      if (!field.required) {
        return false;
      }
      const value = assistantValues[field.name] ?? field.default ?? "";
      return typeof value === "string" ? value.trim().length === 0 : value === null;
    });
    if (missing) {
      setAssistantStatus({ status: "error", message: `Fill in ${missing.label}.` });
      return;
    }
    setAssistantStatus({ status: "generating", message: null });
    setAssistantResult(null);
    try {
      const result = await generateAssistantResult({
        form: selectedAssistantForm,
        fields: assistantValues,
        context: assistantContext.trim(),
        contextPath: assistantContextSource
      });
      setAssistantResult(result);
      setAssistantSavePath(defaultAssistantSavePath(selectedAssistantForm, result, assistantSaveKind));
      if (result.provider || result.model) {
        setAssistantProvider((provider) => ({
          ...provider,
          status: "ready",
          provider: result.provider ?? provider.provider,
          model: result.model ?? provider.model
        }));
      }
      setAssistantStatus({ status: "ready", message: "Temporary result is ready." });
    } catch (error: unknown) {
      setAssistantStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Assistant generation failed."
      });
    }
  }

  async function handleAssistantCopy() {
    if (!assistantResult) {
      return;
    }
    if (!navigator.clipboard) {
      setAssistantStatus({ status: "error", message: "Clipboard is not available." });
      return;
    }
    try {
      await navigator.clipboard.writeText(assistantResult.content);
      setAssistantStatus({ status: "copy", message: "Copied." });
    } catch (error: unknown) {
      setAssistantStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Copy failed."
      });
    }
  }

  function handleAssistantSaveKindChange(kind: AssistantSaveKind) {
    setAssistantSaveKind(kind);
    setAssistantSavePath(defaultAssistantSavePath(selectedAssistantForm, assistantResult, kind));
    setAssistantStatus({ status: "idle", message: null });
  }

  async function handleAssistantSave() {
    if (!assistantResult) {
      return;
    }
    const path = normalizeDialogPath(assistantSavePath);
    const fileType = assistantSaveKind === "card" ? "card" : "markdown";
    const validation = validateManagedFilePath(path, fileType);
    if (validation) {
      setAssistantSavePath(path);
      setAssistantStatus({ status: "error", message: validation });
      return;
    }

    setAssistantStatus({ status: "saving", message: null });
    markLocalWrite([path]);
    try {
      const content =
        assistantSaveKind === "card"
          ? assistantSavedCardContent(
              selectedAssistantForm,
              assistantValues,
              assistantResult,
              assistantContextSource
            )
          : assistantNoteContent(selectedAssistantForm, assistantResult);
      const createdFile = await createWorldFile({
        path,
        file_type: fileType,
        content
      });
      const nextPages = await refreshWorldStructure([createdFile.path]);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [createdFile.path]));
      const tab = tabFromFileWithPages(createdFile, nextPages);
      setFileStates((states) => ({
        ...states,
        [createdFile.path]: { status: "ready", file: createdFile }
      }));
      setEditorDrafts((drafts) => ({
        ...drafts,
        [createdFile.path]: createEditorDraft(createdFile)
      }));
      openWorkspaceTab(tab);
      setAssistantSavePath(createdFile.path);
      setAssistantStatus({ status: "saved", message: `Saved ${createdFile.path}.` });
    } catch (error: unknown) {
      unmarkLocalWrite([path]);
      setAssistantStatus({
        status: "error",
        message: managementErrorMessage(error)
      });
    }
  }

  async function handleSaveDmsOutput() {
    if (!dmsOutputSaveDialog.open) {
      return;
    }
    const path = normalizeDialogPath(dmsOutputSaveDialog.path);
    const fileType: ManagedFileType =
      dmsOutputSaveDialog.file.media_kind === "csv" ? "csv" : "markdown";
    const validation = validateManagedFilePath(path, fileType);
    if (validation) {
      setDmsOutputSaveDialog((state) =>
        state.open ? { ...state, error: validation } : state
      );
      return;
    }

    setDmsOutputSaveDialog((state) =>
      state.open ? { ...state, status: "submitting", error: null } : state
    );
    try {
      const createdFile = await createWorldFile({
        path,
        file_type: fileType,
        content: dmsOutputSaveDialog.file.content
      });
      const nextPages = await refreshWorldStructure([createdFile.path]);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [createdFile.path]));
      const tab = tabFromFileWithPages(createdFile, nextPages);
      setFileStates((states) => {
        const nextStates = { ...states };
        delete nextStates[dmsOutputSaveDialog.file.path];
        nextStates[createdFile.path] = { status: "ready", file: createdFile };
        return nextStates;
      });
      setTabState((state) =>
        openTab(
          {
            tabs: state.tabs.filter((tab) => tab.path !== dmsOutputSaveDialog.file.path),
            activePath:
              state.activePath === dmsOutputSaveDialog.file.path
                ? null
                : state.activePath
          },
          workspaceTabToOpenTab(tab)
        )
      );
      setDmsOutputSaveDialog({ open: false });
    } catch (error: unknown) {
      setDmsOutputSaveDialog((state) =>
        state.open
          ? { ...state, status: "idle", error: managementErrorMessage(error) }
          : state
      );
    }
  }

  function handleWorldTreeToggleFavorite(entry: WorldEntry) {
    if (entry.kind !== "file") {
      return;
    }

    const nextFavorites = toggleFavorite(favorites, tabForEntry(entry));
    setFavorites(nextFavorites);
    void saveFavorites(nextFavorites)
      .then((workspace) => setFavorites(workspace.favorites))
      .catch(() => {});
  }

  function handleStartMetadataEdit() {
    if (!activeTab || activePageState.status !== "ready") {
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: {
        mode: "edit",
        form: metadataFormFromPage(activePageState.page),
        status: "idle",
        message: null,
        expectedModifiedAt: activePageState.page.modified_at,
        expectedHash: activePageState.page.hash
      }
    }));
  }

  function handleChangeMetadataEdit(form: MetadataFormState) {
    if (!activeTab || activeMetadataEdit.mode !== "edit") {
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: { ...activeMetadataEdit, form, status: "idle", message: null }
    }));
  }

  function handleCancelMetadataEdit() {
    if (!activeTab) {
      return;
    }

    setMetadataEdits((states) => {
      const nextStates = { ...states };
      delete nextStates[activeTab.path];
      return nextStates;
    });
  }

  function handleRevertMetadataEdit() {
    if (!activeTab || activePageState.status !== "ready" || activeMetadataEdit.mode !== "edit") {
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: {
        ...activeMetadataEdit,
        form: metadataFormFromPage(activePageState.page),
        status: "idle",
        message: null,
        expectedModifiedAt: activePageState.page.modified_at,
        expectedHash: activePageState.page.hash
      }
    }));
  }

  async function handleReloadMetadataEdit() {
    if (!activeTab) {
      return;
    }
    const path = activeTab.path;
    handleCancelMetadataEdit();
    clearDerivedFileState(path);
    if (
      activeTab.mediaKind !== "image" &&
      activeTab.mediaKind !== "pdf" &&
      activeTab.mediaKind !== "video" &&
      activeTab.mediaKind !== "unsupported"
    ) {
      await handleReloadActiveFile();
    }
  }

  async function handleSaveMetadataEdit() {
    if (
      !activeTab ||
      activeMetadataEdit.mode !== "edit" ||
      activePageState.status !== "ready"
    ) {
      return;
    }

    const validation = validateMetadataForm(activeMetadataEdit.form);
    if (
      validation ||
      activeContentDirty ||
      !activeMetadataEdit.expectedModifiedAt ||
      !activeMetadataEdit.expectedHash
    ) {
      setMetadataEdits((states) => ({
        ...states,
        [activeTab.path]: {
          ...activeMetadataEdit,
          status: "error",
          message:
            validation ??
            (activeContentDirty
              ? "Save or revert content before editing metadata."
              : "Reload metadata before saving.")
        }
      }));
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: { ...activeMetadataEdit, status: "saving", message: null }
    }));

    markLocalWrite([activeTab.path]);
    try {
      const response = await updatePageMetadata(activeTab.path, {
        metadata: metadataPayloadFromForm(activeMetadataEdit.form),
        expected_modified_at: activeMetadataEdit.expectedModifiedAt,
        expected_hash: activeMetadataEdit.expectedHash
      });
      const nextPages = await refreshWorldStructure([activeTab.path]);
      const replacement = tabFromFileWithPages(response.file, [response.page, ...nextPages]);

      setFileStates((states) => ({
        ...states,
        [activeTab.path]: { status: "ready", file: response.file }
      }));
      setPageStates((states) => ({
        ...states,
        [activeTab.path]: { status: "ready", page: response.page }
      }));
      setEditorDrafts((drafts) => {
        const currentDraft = drafts[activeTab.path];
        if (currentDraft && isDraftDirty(currentDraft)) {
          return drafts;
        }
        return { ...drafts, [activeTab.path]: createEditorDraft(response.file) };
      });
      const titledTabs = tabState.tabs.map((tab) =>
        tab.path === activeTab.path ? { ...tab, title: response.page.title } : tab
      );
      const persistedTitledTabs = titledTabs.filter(shouldPersistTab);
      const persistedActivePath = persistedTitledTabs.some((tab) => tab.path === tabState.activePath)
        ? tabState.activePath
        : persistedTitledTabs[0]?.path ?? null;
      setTabState((state) => ({
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.path === activeTab.path ? { ...tab, title: response.page.title } : tab
        )
      }));
      void saveWorkspaceTabs(
        persistedTitledTabs.map(openTabToWorkspaceTab),
        persistedActivePath
      ).catch(() => {});
      replaceWorkspaceCollections(activeTab.path, replacement);
      setMetadataEdits((states) => {
        const nextStates = { ...states };
        delete nextStates[activeTab.path];
        return nextStates;
      });
    } catch (error: unknown) {
      unmarkLocalWrite([activeTab.path]);
      const message = error instanceof Error ? error.message : "Unknown error";
      setMetadataEdits((states) => ({
        ...states,
        [activeTab.path]: {
          ...activeMetadataEdit,
          status: message.includes("409") ? "conflict" : "error",
          message: message.includes("409") ? "World file changed on disk." : message
        }
      }));
    }
  }

  function handleFolderAdd(folderPath: string, kind: FolderCreateKind) {
    setFolderMenuPath(null);
    if (kind === "folder") {
      setFileDialog({
        kind: "create-folder",
        path: defaultManagedFolderPath(folderPath),
        status: "idle",
        error: null
      });
      return;
    }

    const nextState = createFileDialogState(kind, folderPath, true);
    setFileDialog(nextState);
    if (kind === "card") {
      void loadCardTemplateCatalog(nextState.cardTemplateId);
    }
  }

  function handleOpenNewCardDialog() {
    const nextState = createFileDialogState("card", "");
    setFileDialog(nextState);
    void loadCardTemplateCatalog(nextState.cardTemplateId);
  }

  async function loadCardTemplateCatalog(preferredTemplateId: string) {
    try {
      const catalog = normalizeCardTemplateCatalog(await fetchCardTemplates());
      setFileDialog((state) => {
        if (state.kind !== "create" || state.fileType !== "card") {
          return state;
        }
        return {
          ...state,
          cardTemplateCatalog: catalog,
          cardTemplateId: catalog.templates.some(
            (template) => template.id === preferredTemplateId
          )
            ? preferredTemplateId
            : catalog.templates[0]?.id ?? DEFAULT_CARD_TEMPLATE_ID,
          cardTemplateStatus: "ready",
          cardTemplateError: null
        };
      });
    } catch (error: unknown) {
      setFileDialog((state) =>
        state.kind === "create" && state.fileType === "card"
          ? {
              ...state,
              cardTemplateCatalog: DEFAULT_CARD_TEMPLATE_CATALOG,
              cardTemplateStatus: "error",
              cardTemplateError:
                error instanceof Error ? error.message : "Card templates could not load."
            }
          : state
      );
    }
  }

  function treePathValidation(path: string, entryKind: "file" | "directory"): string | null {
    if (entryKind === "directory") {
      return validateManagedFolderPath(path);
    }
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return "Enter a world-relative path.";
    }
    if (trimmedPath.startsWith("/") || /^[a-z]:/i.test(trimmedPath)) {
      return "Use a world-relative path.";
    }
    if (trimmedPath.split(/[\\/]/).some((part) => part === "..")) {
      return "Path cannot contain parent-directory traversal.";
    }
    if (trimmedPath.replace(/\\/g, "/").split("/")[0] === ".virtualscreen") {
      return "VirtualScreen internal paths cannot be managed.";
    }
    if (trimmedPath.replace(/\\/g, "/").split("/")[0] === ".music") {
      return "Music library paths cannot be managed here.";
    }
    return null;
  }

  function treeOperationBlockedByDirty(path: string): string | null {
    return hasDirtyDescendantPath(dirtyPaths, path)
      ? "Save or revert dirty open files before reorganizing this world path."
      : null;
  }

  function remapLoadedFileRecords<T>(records: Record<string, T>, oldPath: string, newPath: string) {
    const nextRecords: Record<string, T> = {};
    Object.entries(records).forEach(([path, value]) => {
      nextRecords[remapMovedWorldPath(path, oldPath, newPath)] = value;
    });
    return nextRecords;
  }

  function removeLoadedFileRecords<T>(records: Record<string, T>, deletedPath: string) {
    const nextRecords: Record<string, T> = {};
    Object.entries(records).forEach(([path, value]) => {
      if (!isDescendantPath(path, deletedPath)) {
        nextRecords[path] = value;
      }
    });
    return nextRecords;
  }

  function applyMovedPathToWorkspaceState(oldPath: string, newPath: string) {
    setFileStates((states) => remapLoadedFileRecords(states, oldPath, newPath));
    setPageStates((states) => remapLoadedFileRecords(states, oldPath, newPath));
    setLinksStates((states) => remapLoadedFileRecords(states, oldPath, newPath));
    setEditorDrafts((drafts) => remapLoadedFileRecords(drafts, oldPath, newPath));
    setTabState((state) => {
      const tabs = remapMovedWorkspacePaths(state.tabs.map(openTabToWorkspaceTab), oldPath, newPath)
        .map(workspaceTabToOpenTab);
      return {
        tabs,
        activePath: state.activePath
          ? remapMovedWorldPath(state.activePath, oldPath, newPath)
          : state.activePath
      };
    });
    setWorkspaceLayout((layout) => ({
      ...layout,
      panes: layout.panes.map((pane) => ({
        ...pane,
        activePath: pane.activePath
          ? remapMovedWorldPath(pane.activePath, oldPath, newPath)
          : pane.activePath
      }))
    }));
    const nextFavorites = remapMovedWorkspacePaths(favorites, oldPath, newPath);
    const nextRecentFiles = remapMovedWorkspacePaths(recentFiles, oldPath, newPath);
    setFavorites(nextFavorites);
    setRecentFiles(nextRecentFiles);
    void saveFavorites(nextFavorites)
      .then((workspace) => setFavorites(workspace.favorites))
      .catch(() => {});
    void saveRecentFiles(nextRecentFiles)
      .then((workspace) => setRecentFiles(workspace.recentFiles))
      .catch(() => {});
  }

  function applyTrashedPathToWorkspaceState(path: string) {
    setFileStates((states) => removeLoadedFileRecords(states, path));
    setPageStates((states) => removeLoadedFileRecords(states, path));
    setLinksStates((states) => removeLoadedFileRecords(states, path));
    setEditorDrafts((drafts) => removeLoadedFileRecords(drafts, path));
    setTabState((state) => {
      const removedPaths = affectedDescendantPaths(
        state.tabs.map((tab) => tab.path),
        path
      );
      let nextState = state;
      removedPaths.forEach((removedPath) => {
        nextState = closeTab(nextState, removedPath);
      });
      return nextState;
    });
    setWorkspaceLayout((layout) => ({
      ...layout,
      panes: layout.panes.map((pane) => ({
        ...pane,
        activePath:
          pane.activePath && isDescendantPath(pane.activePath, path) ? null : pane.activePath
      }))
    }));
    const nextFavorites = removeDescendantWorkspacePaths(favorites, path);
    const nextRecentFiles = removeDescendantWorkspacePaths(recentFiles, path);
    setFavorites(nextFavorites);
    setRecentFiles(nextRecentFiles);
    void saveFavorites(nextFavorites)
      .then((workspace) => setFavorites(workspace.favorites))
      .catch(() => {});
    void saveRecentFiles(nextRecentFiles)
      .then((workspace) => setRecentFiles(workspace.recentFiles))
      .catch(() => {});
  }

  function handleFileDialogPathChange(path: string) {
    setFileDialog((state) => {
      if (state.kind === "create") {
        if (state.contextual) {
          const nextPath =
            state.fileType === "card"
              ? defaultCardPath(state.folderPath, cardTitleFromPath(contextualManagedFilePath(state.folderPath, path, state.fileType)))
              : contextualManagedFilePath(state.folderPath, path, state.fileType);
          return {
            ...state,
            name: path,
            path: nextPath,
            cardTitle:
              state.fileType === "card"
                ? cardTitleFromPath(nextPath)
                : state.cardTitle,
            error: null
          };
        }
        return {
          ...state,
          path,
          folderPath: path.split("/").slice(0, -1).join("/"),
          cardTitle:
            state.fileType === "card" && state.cardTitle === DEFAULT_CARD_TITLE
              ? cardTitleFromPath(path)
              : state.cardTitle,
          error: null
        };
      }
      if (state.kind === "create-folder") {
        return { ...state, path, error: null };
      }
      if (state.kind === "rename") {
        return { ...state, newPath: path, error: null };
      }
      return state;
    });
  }

  function handleFileDialogTypeChange(fileType: ManagedFileType) {
    setFileDialog((state) => {
      if (state.kind !== "create") {
        return state;
      }
      const folderPath = state.folderPath || state.path.split("/").slice(0, -1).join("/");
      const nextState = createFileDialogState(fileType, folderPath, state.contextual);
      if (fileType === "card") {
        void loadCardTemplateCatalog(nextState.cardTemplateId);
      }
      return nextState;
    });
  }

  function handleFileDialogCardTemplateChange(cardTemplateId: string) {
    setFileDialog((state) =>
      state.kind === "create" ? { ...state, cardTemplateId, error: null } : state
    );
  }

  function handleFileDialogCardTitleChange(cardTitle: string) {
    setFileDialog((state) => {
      if (state.kind !== "create") {
        return state;
      }
      const folderPath = state.folderPath || state.path.split("/").slice(0, -1).join("/");
      return {
        ...state,
        cardTitle,
        path: defaultCardPath(folderPath, cardTitle),
        error: null
      };
    });
  }

  function handleDraftModeChange(mode: EditorMode) {
    if (!activeTab || !activeDraft || activeFileState.status !== "ready") {
      return;
    }

    const nextMode = normalizeEditorModeForTarget(activeFileState.file, mode);
    setEditorDrafts((drafts) => ({
      ...drafts,
      [activeTab.path]: setDraftMode(activeDraft, nextMode)
    }));
  }

  function handleDraftContentChange(content: string) {
    if (!activeTab || !activeDraft) {
      return;
    }

    setEditorDrafts((drafts) => ({
      ...drafts,
      [activeTab.path]: updateDraftContent(activeDraft, content)
    }));
  }

  function handleCsvDraftChange(data: CsvData) {
    handleDraftContentChange(serializeCsv(data));
  }

  function clearDerivedFileStates(paths: string[]) {
    setPageStates((states) => {
      const nextStates = { ...states };
      paths.forEach((path) => {
        delete nextStates[path];
      });
      return nextStates;
    });
    setLinksStates((states) => {
      const nextStates = { ...states };
      paths.forEach((path) => {
        delete nextStates[path];
      });
      return nextStates;
    });
  }

  function clearDerivedFileState(path: string) {
    clearDerivedFileStates([path]);
  }

  function clearFailedDerivedFileState(path: string) {
    setPageStates((states) => {
      if (states[path]?.status !== "error") {
        return states;
      }
      const nextStates = { ...states };
      delete nextStates[path];
      return nextStates;
    });
    setLinksStates((states) => {
      if (states[path]?.status !== "error") {
        return states;
      }
      const nextStates = { ...states };
      delete nextStates[path];
      return nextStates;
    });
  }

  async function refreshWorldStructure(pathsToClear: string[] = []) {
    const [nextWorldTree, nextPages] = await Promise.all([fetchWorldTree(), fetchPages()]);
    const pageTitles = new Map(nextPages.map((page) => [page.path, page.title]));
    setWorldTree(nextWorldTree);
    setPages(nextPages);
    setTabState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        pageTitles.has(tab.path) ? { ...tab, title: pageTitles.get(tab.path) ?? tab.title } : tab
      )
    }));
    setFavorites((items) =>
      items.map((tab) =>
        pageTitles.has(tab.path) ? { ...tab, title: pageTitles.get(tab.path) ?? tab.title } : tab
      )
    );
    setRecentFiles((items) =>
      items.map((tab) =>
        pageTitles.has(tab.path) ? { ...tab, title: pageTitles.get(tab.path) ?? tab.title } : tab
      )
    );
    if (pathsToClear.length > 0) {
      clearDerivedFileStates(pathsToClear);
    }
    return nextPages;
  }

  async function refreshWorldAfterSave(path: string) {
    const nextPages = await refreshWorldStructure([path]);

    const page = nextPages.find((pageItem) => pageItem.path === path);
    if (page) {
      setTabState((state) => ({
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.path === path ? { ...tab, title: page.title } : tab
        )
      }));
    }
  }

  function replaceWorkspaceCollections(oldPath: string, replacement: WorkspaceTab) {
    const nextFavorites = replaceWorkspacePath(favorites, oldPath, replacement);
    const nextRecentFiles = replaceWorkspacePath(recentFiles, oldPath, replacement);
    setFavorites(nextFavorites);
    setRecentFiles(nextRecentFiles);
    void saveFavorites(nextFavorites)
      .then((workspace) => setFavorites(workspace.favorites))
      .catch(() => {});
    void saveRecentFiles(nextRecentFiles)
      .then((workspace) => setRecentFiles(workspace.recentFiles))
      .catch(() => {});
  }

  async function handleCreateFileDialog(
    state: Extract<FileDialogState, { kind: "create" }>
  ) {
    const path = normalizeDialogPath(state.path);
    const contextualNameError = state.contextual
      ? validateContextualFileName(state.name)
      : null;
    if (contextualNameError) {
      setFileDialog({ ...state, path, error: contextualNameError, status: "idle" });
      return;
    }
    if (state.fileType === "card" && !state.cardTitle.trim()) {
      setFileDialog({ ...state, path, error: "Enter a card title.", status: "idle" });
      return;
    }
    const validation = validateManagedFilePath(path, state.fileType);
    if (validation) {
      setFileDialog({ ...state, path, error: validation, status: "idle" });
      return;
    }

    setFileDialog({ ...state, path, status: "submitting", error: null });
    markLocalWrite([path]);
    try {
      const createdFile = await createWorldFile({
        path,
        file_type: state.fileType,
        content:
          state.fileType === "card"
            ? serializeCard(renderCardTemplate(selectedCardTemplate(state), state.cardTitle))
            : undefined
      });
      const nextPages = await refreshWorldStructure([createdFile.path]);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [createdFile.path]));
      const tab = tabFromFileWithPages(createdFile, nextPages);
      setFileStates((states) => ({
        ...states,
        [createdFile.path]: { status: "ready", file: createdFile }
      }));
      setEditorDrafts((drafts) => ({
        ...drafts,
        [createdFile.path]: createEditorDraft(createdFile)
      }));
      openWorkspaceTab(tab);
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([path]);
      setFileDialog({
        ...state,
        path,
        status: "idle",
        error: managementErrorMessage(error)
      });
    }
  }

  async function handleCreateFolderDialog(
    state: Extract<FileDialogState, { kind: "create-folder" }>
  ) {
    const path = normalizeDialogPath(state.path);
    const validation = validateManagedFolderPath(path);
    if (validation) {
      setFileDialog({ ...state, path, error: validation, status: "idle" });
      return;
    }

    setFileDialog({ ...state, path, status: "submitting", error: null });
    markLocalWrite([path]);
    try {
      const folder = await createWorldFolder({ path });
      await refreshWorldStructure([folder.path]);
      setExpandedPaths((paths) => new Set([...revealWorldTreePaths(paths, [folder.path]), folder.path]));
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([path]);
      setFileDialog({
        ...state,
        path,
        status: "idle",
        error: managementErrorMessage(error)
      });
    }
  }

  async function handleRenameFileDialog(
    state: Extract<FileDialogState, { kind: "rename" }>
  ) {
    const newPath = normalizeDialogPath(state.newPath);
    const validation =
      treeOperationBlockedByDirty(state.path) ?? treePathValidation(newPath, state.entryKind);
    if (
      !validation &&
      state.entryKind === "file" &&
      fileNameFromPath(state.path).split(".").at(-1)?.toLowerCase() !==
        fileNameFromPath(newPath).split(".").at(-1)?.toLowerCase()
    ) {
      setFileDialog({ ...state, newPath, status: "idle", error: "File extension cannot change." });
      return;
    }
    if (validation) {
      setFileDialog({ ...state, newPath, status: "idle", error: validation });
      return;
    }

    setFileDialog({ ...state, newPath, status: "submitting", error: null });
    markLocalWrite([state.path, newPath]);
    try {
      const moved = await moveWorldPath({
        path: state.path,
        new_path: newPath
      });
      await refreshWorldStructure([state.path, moved.path, ...moved.affected_paths]);
      applyMovedPathToWorkspaceState(state.path, moved.path);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [moved.path]));
      setWorldTreeStatus(`Moved ${state.path} to ${moved.path}.`);
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([state.path, newPath]);
      setFileDialog({
        ...state,
        newPath,
        status: "idle",
        error: managementErrorMessage(error)
      });
    }
  }

  async function handleTrashFileDialog(
    state: Extract<FileDialogState, { kind: "trash" }>
  ) {
    const validation = treeOperationBlockedByDirty(state.path);
    if (validation) {
      setFileDialog({ ...state, status: "idle", error: validation });
      return;
    }

    setFileDialog({ ...state, status: "submitting", error: null });
    markLocalWrite([state.path]);
    try {
      const trashed = await trashWorldPath({ path: state.path });
      await refreshWorldStructure([state.path, ...trashed.deleted_paths]);
      applyTrashedPathToWorkspaceState(state.path);
      setWorldTreeStatus(`Moved ${state.path} to trash.`);
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([state.path]);
      setFileDialog({
        ...state,
        status: "idle",
        error: managementErrorMessage(error)
      });
    }
  }

  async function loadTrashDialog() {
    setTrashDialog({
      open: true,
      status: "loading",
      entries: [],
      restorePaths: {},
      confirmDeletePath: null,
      error: null
    });
    try {
      const entries = await fetchTrash();
      setTrashDialog({
        open: true,
        status: "ready",
        entries,
        restorePaths: Object.fromEntries(
          entries.map((entry) => [entry.trashed_path, entry.original_path])
        ),
        confirmDeletePath: null,
        error: null
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setTrashDialog({
        open: true,
        status: "error",
        entries: [],
        restorePaths: {},
        confirmDeletePath: null,
        error: message
      });
    }
  }

  function handleTrashRestorePathChange(entry: TrashEntry, path: string) {
    setTrashDialog((state) =>
      state.open
        ? {
            ...state,
            restorePaths: { ...state.restorePaths, [entry.trashed_path]: path },
            error: null
          }
        : state
    );
  }

  async function handleRestoreTrashEntry(entry: TrashEntry) {
    if (!trashDialog.open) {
      return;
    }
    const restorePath = normalizeDialogPath(
      trashDialog.restorePaths[entry.trashed_path] ?? entry.original_path
    );
    const validation = validateManagedFilePath(restorePath) ?? null;
    if (validation && entry.kind === "file") {
      setTrashDialog({ ...trashDialog, error: validation });
      return;
    }

    setTrashDialog({ ...trashDialog, status: "submitting", error: null });
    markLocalWrite([restorePath]);
    try {
      await restoreTrash({
        trashed_path: entry.trashed_path,
        ...(restorePath !== entry.original_path ? { restore_path: restorePath } : {})
      });
      await refreshWorldStructure([restorePath]);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [restorePath]));
      await loadTrashDialog();
    } catch (error: unknown) {
      unmarkLocalWrite([restorePath]);
      setTrashDialog({
        ...trashDialog,
        status: "ready",
        error: managementErrorMessage(error)
      });
    }
  }

  async function handleDeleteTrashEntry(entry: TrashEntry) {
    if (!trashDialog.open) {
      return;
    }
    setTrashDialog({ ...trashDialog, status: "submitting", error: null });
    try {
      await deleteTrash({ trashed_path: entry.trashed_path });
      await loadTrashDialog();
    } catch (error: unknown) {
      setTrashDialog({
        ...trashDialog,
        status: "ready",
        error: managementErrorMessage(error)
      });
    }
  }

  function handleSubmitFileDialog() {
    if (fileDialog.kind === "create") {
      void handleCreateFileDialog(fileDialog);
    } else if (fileDialog.kind === "create-folder") {
      void handleCreateFolderDialog(fileDialog);
    } else if (fileDialog.kind === "rename") {
      void handleRenameFileDialog(fileDialog);
    } else if (fileDialog.kind === "trash") {
      void handleTrashFileDialog(fileDialog);
    }
  }

  async function handleSaveDraft() {
    if (!activeTab || !activeDraft || activeFileState.status !== "ready") {
      return;
    }

    if (activeDraft.externalChanged) {
      setEditorDrafts((drafts) => ({
        ...drafts,
        [activeTab.path]: markDraftConflict(activeDraft, "World file changed on disk.")
      }));
      return;
    }

    setEditorDrafts((drafts) => ({
      ...drafts,
      [activeTab.path]: markDraftSaving(activeDraft)
    }));

    markLocalWrite([activeTab.path]);
    try {
      const savedFile = await saveWorldFile(activeTab.path, {
        content: activeDraft.content,
        expected_modified_at: activeDraft.modifiedAt,
        expected_hash: activeDraft.hash
      });
      setFileStates((states) => ({
        ...states,
        [activeTab.path]: { status: "ready", file: savedFile }
      }));
      setEditorDrafts((drafts) => ({
        ...drafts,
        [activeTab.path]: markDraftSaved(activeDraft, savedFile)
      }));
      await refreshWorldAfterSave(activeTab.path);
    } catch (error: unknown) {
      unmarkLocalWrite([activeTab.path]);
      const message = error instanceof Error ? error.message : "Unknown error";
      setEditorDrafts((drafts) => ({
        ...drafts,
        [activeTab.path]: message.includes("409")
          ? markDraftConflict(activeDraft, "World file changed on disk.")
          : markDraftError(activeDraft, message)
      }));
    }
  }

  async function reloadTabFile(tab: OpenTab) {
    setFileStates((states) => ({
      ...states,
      [tab.path]: { status: "loading" }
    }));

    try {
      const file = await fetchWorldFile(tab.path);
      setFileStates((states) => ({
        ...states,
        [tab.path]: { status: "ready", file }
      }));
      setEditorDrafts((drafts) => ({
        ...drafts,
        [tab.path]: createEditorDraft(file)
      }));
      clearDerivedFileState(tab.path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setFileStates((states) => ({
        ...states,
        [tab.path]: message.includes("404")
          ? { status: "removed", message: "File removed from disk." }
          : { status: "error", message }
      }));
    }
  }

  async function handleReloadActiveFile() {
    if (!activeTab) {
      return;
    }

    await reloadTabFile(activeTab);
  }

  function handleOpenFavorite(tab: WorkspaceTab) {
    openWorkspaceTab(tab);
  }

  function handleOpenRecent(tab: WorkspaceTab) {
    openWorkspaceTab(tab);
  }

  function openSearchDialog() {
    setSearchDialogOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeSearchDialog() {
    setSearchDialogOpen(false);
    window.setTimeout(() => searchButtonRef.current?.focus(), 0);
  }

  function handleToggleFolder(path: string) {
    setExpandedPaths((paths) => {
      const nextPaths = new Set(paths);
      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }
      return nextPaths;
    });
  }

  function removeDeletedWorkspaceItems(deletedPaths: string[]) {
    if (deletedPaths.length === 0) {
      return;
    }

    setFavorites((items) => {
      const nextItems = deletedPaths.reduce(removeWorkspacePath, items);
      void saveFavorites(nextItems)
        .then((workspace) => setFavorites(workspace.favorites))
        .catch(() => {});
      return nextItems;
    });
    setRecentFiles((items) => {
      const nextItems = deletedPaths.reduce(removeWorkspacePath, items);
      void saveRecentFiles(nextItems)
        .then((workspace) => setRecentFiles(workspace.recentFiles))
        .catch(() => {});
      return nextItems;
    });
  }

  async function handleWorldEvent(event: WorldEvent) {
    const syncEvent = discardLocalWriteEvent(event);
    if (!syncEvent) {
      return;
    }

    const latest = syncStateRef.current;
    const metadataDirty =
      latest.activeMetadataEdit.mode === "edit" &&
      latest.activePageState.status === "ready" &&
      isMetadataFormDirty(latest.activeMetadataEdit.form, latest.activePageState.page);
    const activeDirty =
      (latest.activeDraft ? isDraftDirty(latest.activeDraft) : false) || metadataDirty;
    const plan = planWorldEventUpdate(syncEvent, latest.activeTab?.path ?? null, activeDirty);

    setSearchRevision((revision) => revision + 1);
    removeDeletedWorkspaceItems(syncEvent.deleted_paths);
    await refreshWorldStructure(plan.affectedPaths);

    if (!latest.activeTab) {
      return;
    }
    const eventActiveTab = latest.activeTab;

    if (plan.activeDeleted) {
      setFileStates((states) => ({
        ...states,
        [eventActiveTab.path]: {
          status: "removed",
          message: "File removed from disk."
        }
      }));
      setMetadataEdits((states) => {
        const nextStates = { ...states };
        delete nextStates[eventActiveTab.path];
        return nextStates;
      });
      return;
    }

    if (plan.markDraftChanged) {
      if (latest.activeDraft && isDraftDirty(latest.activeDraft)) {
        setEditorDrafts((drafts) => {
          const draft = drafts[eventActiveTab.path];
          return draft
            ? { ...drafts, [eventActiveTab.path]: markDraftChangedOnDisk(draft) }
            : drafts;
        });
      }
      if (metadataDirty) {
        setMetadataEdits((states) => {
          const current = states[eventActiveTab.path];
          return current?.mode === "edit"
            ? {
                ...states,
                [eventActiveTab.path]: {
                  ...current,
                  status: "conflict",
                  message: "World file changed on disk."
                }
              }
            : states;
        });
      }
      return;
    }

    if (
      plan.refetchActive &&
      eventActiveTab.mediaKind !== "image" &&
      eventActiveTab.mediaKind !== "pdf" &&
      eventActiveTab.mediaKind !== "video" &&
      eventActiveTab.mediaKind !== "unsupported"
    ) {
      await reloadTabFile(eventActiveTab);
    }
  }

  async function refreshWorldLibrary() {
    try {
      setWorldLibrary(await fetchWorlds());
    } catch {
      // The rest of the app can continue working from the active world.
    }
  }

  function prepareWorldSwitch() {
    setLoadState("loading");
    setWorkspaceReady(false);
    setToolPanelState(createToolPanelState());
    setSearchQuery("");
    setSearchState({ status: "idle" });
    setAudioQuery("");
    setAudioState({ status: "idle" });
    setAudioAutocompleteTracks([]);
    hpEditVersionRef.current = 0;
    hpRowsRef.current = [];
    audioPlaylistsRef.current = [];
    setAudioPlaylistState({ status: "idle", playlists: [] });
    setHpRows([]);
    setHpStatus({ status: "idle", message: null });
    setAudioMixer(createAudioMixerState());
    setAudioPlaylistExpansion({});
    setFastSlots([]);
    setTableSnapshots([]);
    setSelectedTableSnapshotId("");
    setTableSnapshotName("");
    setTableSnapshotStatus({ status: "idle", message: null });
    setScriptState({ status: "idle" });
    setScriptRunState({ status: "idle" });
    setTrustedScriptPaths(new Set());
    setDmsTrustDialog({ open: false });
    setDmsFormDialog({ open: false });
    setDmsOutputSaveDialog({ open: false });
    setTabState({ tabs: [], activePath: null });
    setWorkspaceLayout(defaultWorkspaceLayout());
    setWorkspaces([]);
    setCurrentWorkspaceId("default");
    setCurrentWorkspaceName("Default");
    setWorkspaceDialog({ kind: "closed" });
    setFileStates({});
    setPageStates({});
    setLinksStates({});
    setEditorDrafts({});
    setMetadataEdits({});
    setFavorites([]);
    setRecentFiles([]);
    setDisplayState(null);
    setMapState(null);
    setMapActionStatus({ status: "idle", message: null });
    setMapPresets([]);
    setLocalMapViewport(null);
    mapViewportSyncRef.current.lastSyncedAt = 0;
    setFolderMenuPath(null);
    setWorldOpenDialog(false);
  }

  async function finishWorldSwitch(nextWorldLibrary: WorldLibraryState) {
    const [
      nextWorldTree,
      nextPages,
      workspace,
      hpState,
      nextWorkspaces,
      nextDisplayState,
      nextFastSlots,
      nextMapState,
      nextTableSnapshots
    ] =
      await Promise.all([
        fetchWorldTree(),
        fetchPages(),
        fetchWorkspace(),
        fetchHpTracker(),
        fetchWorkspaces(),
        fetchDisplayState(),
        fetchFastSlots(),
        fetchMapState(),
        fetchTableSnapshots()
      ]);
    const workspaceTabs = workspace.tabs.map(workspaceTabToOpenTab);
    const activePath =
      workspace.activePath && workspaceTabs.some((tab) => tab.path === workspace.activePath)
        ? workspace.activePath
        : workspaceTabs[0]?.path ?? null;
    setWorldLibrary(nextWorldLibrary);
    setWorldTree(nextWorldTree);
    setPages(nextPages);
    setWorkspaces(nextWorkspaces);
    setCurrentWorkspaceId(workspace.workspaceId);
    setCurrentWorkspaceName(workspace.workspaceName);
    hpEditVersionRef.current = 0;
    hpRowsRef.current = hpState.rows;
    setHpRows(hpState.rows);
    setHpStatus({ status: "idle", message: null });
    setFavorites(workspace.favorites);
    setRecentFiles(workspace.recentFiles);
    setDisplayState(nextDisplayState);
    adoptMapState(nextMapState);
    const sortedTableSnapshots = sortTableSnapshots(nextTableSnapshots);
    setTableSnapshots(sortedTableSnapshots);
    setSelectedTableSnapshotId(sortedTableSnapshots[0]?.id ?? "");
    setTableSnapshotStatus({ status: "idle", message: null });
    setMapPresets([]);
    setLocalMapViewport(null);
    mapViewportSyncRef.current.lastSyncedAt = 0;
    setFastSlots(visibleFastSlots(nextFastSlots));
    setTabState({ tabs: workspaceTabs, activePath });
    setWorkspaceLayout(normalizeWorkspaceLayout(workspace.layout, workspace.tabs));
    setExpandedPaths(new Set(collectDirectoryPaths(nextWorldTree)));
    setWorkspaceReady(true);
    setSearchRevision((revision) => revision + 1);
    setLoadState("ready");
  }

  async function handleOpenWorld(worldId: string) {
    if (!confirmDiscardDirtyDrafts("Switch worlds and discard unsaved changes?")) {
      return;
    }
    prepareWorldSwitch();
    try {
      const nextWorldLibrary = await openWorld(worldId);
      await finishWorldSwitch(nextWorldLibrary);
    } catch {
      setLoadState("error");
    }
  }

  function handleWorldNameChange(name: string) {
    setWorldCreateDialog((state) =>
      state.open ? { ...state, name, error: null } : state
    );
  }

  async function handleCreateWorld() {
    if (!worldCreateDialog.open) {
      return;
    }
    const name = worldCreateDialog.name.trim();
    if (!name) {
      setWorldCreateDialog({ ...worldCreateDialog, error: "World name is required." });
      return;
    }
    if (name.startsWith(".") || name.includes("/") || name.includes("\\")) {
      setWorldCreateDialog({
        ...worldCreateDialog,
        error: "Use a simple folder name inside the world library."
      });
      return;
    }
    if (!confirmDiscardDirtyDrafts("Create a new world and discard unsaved changes?")) {
      return;
    }

    setWorldCreateDialog({ ...worldCreateDialog, name, status: "submitting", error: null });
    try {
      const nextWorldLibrary = await createWorld(name);
      setWorldCreateDialog({ open: false });
      prepareWorldSwitch();
      await finishWorldSwitch(nextWorldLibrary);
    } catch (error: unknown) {
      setWorldCreateDialog({
        open: true,
        name,
        status: "idle",
        error: managementErrorMessage(error)
      });
    }
  }

  async function handleShowActiveFullscreen(pathOverride?: string) {
    const path = pathOverride?.trim() || activeTab?.path;
    if (!path) {
      return;
    }
    try {
      setDisplayState(await setDisplayFullscreen(path));
      adoptMapState(await fetchMapState());
    } catch {
    }
  }

  async function handleOpenActivePopup(preset: DisplayPopupPreset = "plain", pathOverride?: string) {
    const path = pathOverride?.trim() || activeTab?.path;
    if (!path) {
      return;
    }
    try {
      setDisplayState(await openDisplayPopup(path, preset));
    } catch {
    }
  }

  async function handleStageActivePopup(preset: DisplayPopupPreset = "plain", pathOverride?: string) {
    const path = pathOverride?.trim() || activeTab?.path;
    if (!path) {
      return;
    }
    try {
      setDisplayState(await openDisplayPopup(path, preset, false));
    } catch {
    }
  }

  async function handleDisplayPopupVisibleChange(popupId: string, visible: boolean) {
    try {
      setDisplayState(await setDisplayPopupVisible(popupId, visible));
    } catch {
    }
  }

  async function handleClearAndShowActiveFullscreen(pathOverride?: string) {
    const path = pathOverride?.trim() || activeTab?.path;
    if (!path) {
      return;
    }
    try {
      setDisplayState(
        await showActiveOnDisplay({
          path,
          mode: "fullscreen",
          clear_existing: true
        })
      );
      adoptMapState(await fetchMapState());
    } catch {
    }
  }

  async function handleBlankDisplay() {
    try {
      const nextDisplayState = await blankDisplay();
      adoptMapState(await fetchMapState());
      if (hasResidualPopupsAfterBlank(nextDisplayState)) {
        const clearedState = await clearDisplayPopups();
        setDisplayState({ ...clearedState, fullscreen: null, popups: [] });
        return;
      }
      setDisplayState(nextDisplayState);
    } catch {
    }
  }

  async function handleCloseDisplayPopup(popupId: string) {
    try {
      setDisplayState(await closeDisplayPopup(popupId));
    } catch {
    }
  }

  async function handleClearDisplayPopups() {
    try {
      setDisplayState(await clearDisplayPopups());
    } catch {
    }
  }

  function persistCurrentCaptureDraft(draft: CaptureDraft = captureDraft) {
    if (draft.text.trim()) {
      saveCaptureDraft(captureWorldKey, draft);
    } else {
      clearCaptureDraft(captureWorldKey);
    }
  }

  function handleCaptureCategoryChange(category: CaptureCategory) {
    const nextDraft = { ...captureDraft, category };
    captureDraftRef.current = nextDraft;
    setCaptureDraft(nextDraft);
    setCaptureStatus({ status: "idle", message: null });
    persistCurrentCaptureDraft(nextDraft);
  }

  function handleCaptureTextChange(text: string) {
    const nextDraft = { ...captureDraftRef.current, text };
    captureDraftRef.current = nextDraft;
    setCaptureDraft(nextDraft);
    if (captureStatus.status === "error" || captureStatus.status === "saved") {
      setCaptureStatus({ status: "idle", message: null });
    }
  }

  function captureLogTab(path: string, sourcePages: PageSummary[] = pages): WorkspaceTab {
    const page = sourcePages.find((item) => item.path === path);
    return {
      path,
      name: path.split("/").filter(Boolean).at(-1) ?? path,
      title: page?.title ?? null,
      mediaKind: "markdown"
    };
  }

  async function handleSaveCapture() {
    const submittedDraft = captureDraftRef.current;
    if (!submittedDraft.text.trim()) {
      setCaptureStatus({ status: "error", message: "Write a note before saving." });
      return;
    }

    setCaptureStatus({ status: "saving", message: null });
    try {
      const response = await createCapture({
        category: submittedDraft.category,
        text: submittedDraft.text
      });
      const nextPages = await refreshWorldStructure([response.path]);
      const logTab = captureLogTab(response.path, nextPages);
      const openLogTab = tabState.tabs.find((tab) => tab.path === response.path);
      const logDraft = editorDrafts[response.path];
      if (openLogTab && (!logDraft || !isDraftDirty(logDraft))) {
        await reloadTabFile(openLogTab);
      }
      persistRecent(logTab);
      setCaptureToday({ path: response.path, exists: true });
      const nextDraft = { category: submittedDraft.category, text: "" };
      captureDraftRef.current = nextDraft;
      setCaptureDraft(nextDraft);
      clearCaptureDraft(captureWorldKey);
      setSearchRevision((revision) => revision + 1);
      setCaptureStatus({
        status: "saved",
        message: `Saved to ${response.heading}.`
      });
    } catch (error) {
      setCaptureStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not save capture."
      });
    }
  }

  async function handleOpenCaptureLog() {
    try {
      const today = captureToday ?? (await fetchCaptureToday());
      setCaptureToday(today);
      if (!today.exists) {
        setCaptureStatus({ status: "error", message: "Save a capture first." });
        return;
      }
      openWorkspaceTab(captureLogTab(today.path));
    } catch (error) {
      setCaptureStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not open capture log."
      });
    }
  }

  async function handleRunPrepHealth() {
    setPrepHealthStatus({ status: "loading", message: null });
    try {
      const report = await fetchPrepHealth();
      setPrepHealthReport(report);
      setPrepHealthStatus({
        status: "ready",
        message:
          report.issue_count === 0
            ? "No broken references found."
            : `${report.issue_count} issue${report.issue_count === 1 ? "" : "s"} found.`
      });
    } catch (error) {
      setPrepHealthStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not run prep check."
      });
    }
  }

  function handleOpenPrepHealthSource(issue: PrepHealthIssue) {
    openWorkspaceTab(prepHealthIssueToOpenTab(issue));
  }

  function handleCopyPrepHealthTarget(target: string) {
    if (!target) {
      return;
    }
    void navigator.clipboard?.writeText(target);
    setPrepHealthStatus({ status: "ready", message: "Target copied." });
  }

  function persistHpRows(rows: HpTrackerRow[], version = hpEditVersionRef.current) {
    const errors = validateHpTrackerRows(rows);
    if (errors.length > 0) {
      setHpStatus({ status: "error", message: errors[0] });
      return;
    }
    setHpStatus({ status: "saving", message: null });
    saveHpTracker(rows)
      .then((state) => {
        if (hpEditVersionRef.current === version) {
          hpRowsRef.current = state.rows;
          setHpRows(state.rows);
        }
        setHpStatus({ status: "saved", message: "Saved" });
      })
      .catch((error: unknown) => {
        setHpStatus({
          status: "error",
          message: error instanceof Error ? error.message : "Could not save HP rows."
        });
      });
  }

  function handleHpAdd() {
    hpEditVersionRef.current += 1;
    const nextRows = addHpTrackerRow(
      hpRowsRef.current,
      createHpTrackerRow({
        id: `hp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: "New",
        current_hp: 0,
        max_hp: null
      })
    );
    hpRowsRef.current = nextRows;
    setHpRows(nextRows);
    persistHpRows(nextRows, hpEditVersionRef.current);
  }

  function handleHpUpdate(rowId: string, updates: Partial<Omit<HpTrackerRow, "id">>) {
    hpEditVersionRef.current += 1;
    const nextRows = updateHpTrackerRow(hpRowsRef.current, rowId, updates);
    hpRowsRef.current = nextRows;
    setHpRows(nextRows);
    setHpStatus({ status: "idle", message: null });
  }

  function handleHpAdjust(rowId: string, amount: number) {
    hpEditVersionRef.current += 1;
    const nextRows = adjustHpTrackerRow(hpRowsRef.current, rowId, amount);
    hpRowsRef.current = nextRows;
    setHpRows(nextRows);
    persistHpRows(nextRows, hpEditVersionRef.current);
  }

  function handleHpRemove(rowId: string) {
    hpEditVersionRef.current += 1;
    const nextRows = removeHpTrackerRow(hpRowsRef.current, rowId);
    hpRowsRef.current = nextRows;
    setHpRows(nextRows);
    persistHpRows(nextRows, hpEditVersionRef.current);
  }

  function handleHpClear() {
    hpEditVersionRef.current += 1;
    const nextRows = clearHpTrackerRows();
    hpRowsRef.current = nextRows;
    setHpRows(nextRows);
    persistHpRows(nextRows, hpEditVersionRef.current);
  }

  function handleHpPersist() {
    persistHpRows(hpRowsRef.current);
  }

  async function handleMapLoadSource(path: string) {
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return;
    }
    try {
      adoptMapState(await setMapSource(trimmedPath));
      setLocalMapViewport(null);
      mapViewportSyncRef.current.lastSyncedAt = 0;
      setMapActionStatus({ status: "ready", message: `Loaded map: ${trimmedPath}` });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not load map.")
      });
    }
  }

  async function handleUseActiveImageAsMap() {
    if (!activeTab || !isImageMapCandidate(activeTab.mediaKind)) {
      return;
    }
    await handleMapLoadSource(activeTab.path);
  }

  async function syncMapViewport(viewport: MapViewport) {
    try {
      adoptMapState(await setMapViewport(viewport));
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not update map view.")
      });
    }
  }

  function handleMapViewportPreview(viewport: MapViewport) {
    const decision = planViewportSync({
      viewport,
      now: Date.now(),
      lastSyncedAt: mapViewportSyncRef.current.lastSyncedAt
    });
    setLocalMapViewport(decision.preview);
    if (decision.sync) {
      mapViewportSyncRef.current.lastSyncedAt = decision.lastSyncedAt;
      void syncMapViewport(decision.sync);
    }
  }

  function handleMapViewportCommit(viewport: MapViewport) {
    const decision = planViewportSync({
      viewport,
      now: Date.now(),
      lastSyncedAt: mapViewportSyncRef.current.lastSyncedAt,
      flush: true
    });
    setLocalMapViewport(decision.preview);
    mapViewportSyncRef.current.lastSyncedAt = decision.lastSyncedAt;
    if (decision.sync) {
      void syncMapViewport(decision.sync);
    }
  }

  async function handleMapFogChange(enabled: boolean) {
    try {
      adoptMapState(await setMapFog(enabled));
      setMapActionStatus({ status: "ready", message: enabled ? t("map.fogEnabled") : t("map.fogDisabled") });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not update fog.")
      });
    }
  }

  async function handleMapGridChange(grid: MapGrid) {
    try {
      adoptMapState(await setMapGrid(grid));
      setMapActionStatus({ status: "ready", message: "Grid updated." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not update grid.")
      });
    }
  }

  async function handleMapRevealCreate(reveal: MapRevealPayload) {
    try {
      adoptMapState(await addMapReveal(reveal));
      setMapActionStatus({
        status: "ready",
        message: reveal.action === "hide" ? t("map.hideAdded") : t("map.revealAdded")
      });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not add reveal.")
      });
    }
  }

  async function handleMapUndoReveal() {
    const latestReveal = mapState?.reveals.at(-1);
    if (!latestReveal) {
      return;
    }
    try {
      adoptMapState(await deleteMapReveal(latestReveal.id));
      setMapActionStatus({ status: "ready", message: "Reveal undone." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not undo reveal.")
      });
    }
  }

  async function handleMapPinCreate(
    point: MapPoint,
    label: string,
    visibility: MapPinVisibility
  ) {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return;
    }
    try {
      adoptMapState(await addMapPin(createPinPayload(point, trimmedLabel, visibility)));
      setMapActionStatus({ status: "ready", message: "Pin added." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not add pin.")
      });
    }
  }

  async function handleMapDeletePin(pinId: string) {
    try {
      adoptMapState(await deleteMapPin(pinId));
      setMapActionStatus({ status: "ready", message: "Pin removed." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not remove pin.")
      });
    }
  }

  async function handleMapClearReveals() {
    try {
      adoptMapState(await clearMapReveals());
      setMapActionStatus({ status: "ready", message: "Reveals cleared." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not clear reveals.")
      });
    }
  }

  async function handleMapPresent() {
    try {
      adoptMapState(await presentMap());
      setDisplayState(await fetchDisplayState());
      setMapActionStatus({ status: "ready", message: "Map presented to player screen." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not present map.")
      });
    }
  }

  async function handleMapStop() {
    try {
      adoptMapState(await stopMap());
      setMapActionStatus({ status: "ready", message: "Map stopped." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not stop map.")
      });
    }
  }

  async function handleMapSavePreset(name: string, state: MapState) {
    try {
      const preset = await saveMapPreset(name, state);
      setMapPresets((currentPresets) => [
        preset,
        ...currentPresets.filter((currentPreset) => currentPreset.id !== preset.id)
      ]);
      setMapActionStatus({ status: "ready", message: `Saved map preset: ${name}` });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not save map preset.")
      });
    }
  }

  async function handleMapLoadPreset(presetId: string) {
    try {
      adoptMapState(await loadMapPreset(presetId));
      setLocalMapViewport(null);
      mapViewportSyncRef.current.lastSyncedAt = 0;
      setMapActionStatus({ status: "ready", message: "Map preset loaded." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not load map preset.")
      });
    }
  }

  async function handleMapDeletePreset(presetId: string) {
    try {
      await deleteMapPreset(presetId);
      setMapPresets((currentPresets) =>
        currentPresets.filter((currentPreset) => currentPreset.id !== presetId)
      );
    } catch {
    }
  }

  function persistAudioPlaylists(playlists: AudioPlaylist[]) {
    const revision = audioPlaylistSaveRevisionRef.current + 1;
    audioPlaylistSaveRevisionRef.current = revision;
    audioPlaylistsRef.current = playlists;
    setAudioPlaylistState({
      status: "saving",
      playlists,
      message: t("audio.savedSaving")
    });
    void saveAudioPlaylists(playlists)
      .then((response) => {
        if (audioPlaylistSaveRevisionRef.current !== revision) {
          return;
        }
        audioPlaylistsRef.current = response.playlists;
        setAudioPlaylistState({
          status: "ready",
          playlists: response.playlists,
          message: t("audio.savedSaved")
        });
      })
      .catch((error: unknown) => {
        if (audioPlaylistSaveRevisionRef.current !== revision) {
          return;
        }
        const message = error instanceof Error ? error.message : t("audio.savedSaveError");
        setAudioPlaylistState({ status: "error", playlists, message });
      });
  }

  function updateAudioPlaylists(updater: (playlists: AudioPlaylist[]) => AudioPlaylist[]) {
    persistAudioPlaylists(updater(audioPlaylistsRef.current));
  }

  function handleSavedAudioPlaylistCreate(name: string, bus: AudioBus) {
    updateAudioPlaylists((playlists) => createAudioPlaylist(playlists, name, bus));
  }

  function handleSavedAudioPlaylistRename(playlistId: string, name: string) {
    updateAudioPlaylists((playlists) => renameAudioPlaylist(playlists, playlistId, name));
  }

  function handleSavedAudioPlaylistDelete(playlistId: string) {
    updateAudioPlaylists((playlists) => deleteAudioPlaylist(playlists, playlistId));
  }

  function handleSavedAudioPlaylistBusChange(playlistId: string, bus: AudioBus) {
    updateAudioPlaylists((playlists) => setSavedAudioPlaylistBus(playlists, playlistId, bus));
  }

  function handleSavedAudioPlaylistLoopChange(playlistId: string, loop: boolean) {
    updateAudioPlaylists((playlists) => setSavedAudioPlaylistLoop(playlists, playlistId, loop));
  }

  function handleSavedAudioPlaylistAddTrack(playlistId: string, path: string) {
    updateAudioPlaylists((playlists) => addAudioPlaylistTrack(playlists, playlistId, path.trim()));
  }

  function handleSavedAudioPlaylistAddCurrentTrack(playlistId: string) {
    const playlist = audioPlaylistsRef.current.find((candidate) => candidate.id === playlistId);
    const currentTrack = playlist ? audioMixer[playlist.bus].track : null;
    if (!currentTrack) {
      setAudioPlaylistState({
        status: "error",
        playlists: audioPlaylistsRef.current,
        message: t("audio.noCurrentTrack")
      });
      return;
    }
    handleSavedAudioPlaylistAddTrack(playlistId, currentTrack.path);
  }

  function handleSavedAudioPlaylistRemoveTrack(playlistId: string, path: string) {
    updateAudioPlaylists((playlists) => removeAudioPlaylistTrack(playlists, playlistId, path));
  }

  function handleSavedAudioPlaylistMoveTrack(
    playlistId: string,
    index: number,
    direction: -1 | 1
  ) {
    updateAudioPlaylists((playlists) =>
      moveAudioPlaylistTrack(playlists, playlistId, index, direction)
    );
  }

  async function handleSavedAudioPlaylistPlay(playlistId: string) {
    const playlist = audioPlaylistsRef.current.find((candidate) => candidate.id === playlistId);
    if (!playlist) {
      return;
    }
    try {
      const tracks =
        audioAutocompleteTracks.length > 0
          ? audioAutocompleteTracks
          : await fetchAudioLibrary();
      if (audioAutocompleteTracks.length === 0) {
        setAudioAutocompleteTracks(tracks);
      }
      const nextMixer = loadSavedAudioPlaylist(audioMixer, playlist, tracks);
      if (!nextMixer[playlist.bus].track) {
        setAudioPlaylistState({
          status: "error",
          playlists: audioPlaylistsRef.current,
          message: t("audio.noPlayableTracks")
        });
        return;
      }
      setAudioMixer(setAudioBusPlaying(nextMixer, playlist.bus, true));
      setAudioPlaylistState({
        status: "ready",
        playlists: audioPlaylistsRef.current,
        message: t("audio.savedLoaded", { name: playlist.name })
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("audio.savedLoadError");
      setAudioPlaylistState({ status: "error", playlists: audioPlaylistsRef.current, message });
    }
  }

  function handleAudioLoadTrack(track: AudioTrack) {
    setAudioMixer((state) => loadAudioTrack(state, track));
  }

  function handleAudioLoadPlaylist(
    bus: AudioBus,
    playlist: string | null,
    tracks: AudioTrack[]
  ) {
    setAudioMixer((state) =>
      setAudioBusPlaying(loadAudioPlaylist(state, bus, playlist, tracks), bus, true)
    );
  }

  function handleAudioPlayingChange(bus: AudioBus, playing: boolean) {
    setAudioMixer((state) => setAudioBusPlaying(state, bus, playing));
  }

  function handleAudioEnded(bus: AudioBus) {
    setAudioMixer((state) => {
      if (state[bus].playlistMode) {
        return advanceAudioQueue(state, bus);
      }
      return setAudioBusPlaying(state, bus, false);
    });
  }

  function handleAudioStopBus(bus: AudioBus) {
    setAudioMixer((state) => stopAudioBus(state, bus));
  }

  function handleAudioStopAll() {
    setAudioMixer((state) => stopAllAudio(state));
  }

  function handleAudioLoopChange(bus: AudioBus, loop: boolean) {
    setAudioMixer((state) => setAudioBusLoop(state, bus, loop));
  }

  function handleAudioPlaylistLoopChange(bus: AudioBus, loop: boolean) {
    setAudioMixer((state) => setAudioPlaylistLoop(state, bus, loop));
  }

  function handleAudioNextTrack(bus: AudioBus) {
    setAudioMixer((state) => advanceAudioQueue(state, bus));
  }

  function handleAudioPreviousTrack(bus: AudioBus) {
    setAudioMixer((state) => rewindAudioQueue(state, bus));
  }

  function handleAudioFadeIn(bus: AudioBus) {
    setAudioMixer((state) =>
      startAudioFade(state, bus, "fading_in", AUDIO_FADE_DURATION_MS, performance.now())
    );
  }

  function handleAudioFadeOut(bus: AudioBus) {
    setAudioMixer((state) =>
      startAudioFade(state, bus, "fading_out", AUDIO_FADE_DURATION_MS, performance.now())
    );
  }

  function handleAudioFadeFinish(bus: AudioBus) {
    setAudioMixer((state) => finishAudioFade(state, bus));
  }

  function handleAudioVolumeChange(bus: AudioBus, volume: number) {
    setAudioMixer((state) => setAudioBusVolume(state, bus, volume));
  }

  function handleAudioPlaylistToggle(bus: AudioBus, playlist: string | null) {
    setAudioPlaylistExpansion((state) => togglePlaylistExpansion(state, bus, playlist));
  }

  function handleToolsResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = toolsPanelWidth;

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      setToolsPanelWidth(saveToolsPanelWidth(startWidth + startX - moveEvent.clientX));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleToolsResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    setToolsPanelWidth((width) => saveToolsPanelWidth(width + direction * 24));
  }

  function handleToolToggle(tool: ToolId) {
    const lockedTools: ToolId[] = activeMetadataEdit.mode === "edit" ? ["metadata"] : [];
    setToolPanelState((state) => toggleToolSection(state, tool, lockedTools));
  }

  function handleToolPin(tool: ToolId) {
    setToolPanelState((state) => toggleToolSectionPin(state, tool));
  }

  useEffect(() => {
    if (authState.status !== "unlocked") {
      return;
    }
    return createWorldEventClient({
      onEvent: (event) => {
        void handleWorldEvent(event);
      },
      onStatus: () => {}
    });
  }, [authState.status]);

  useEffect(() => {
    if (authState.status !== "unlocked") {
      return;
    }
    fetchDisplayState()
      .then(setDisplayState)
      .catch(() => {});
    return createDisplayEventClient({
      onEvent: setDisplayState
    });
  }, [authState.status]);

  useEffect(() => {
    if (authState.status !== "unlocked") {
      return;
    }
    fetchMapState()
      .then(adoptMapState)
      .catch(() => {});
    return createMapEventClient({
      onEvent: adoptMapState,
      url: buildMapEventsUrl()
    });
  }, [authState.status]);

  const currentWorldName = worldLibrary?.current?.name ?? worldTree?.name ?? "No world loaded";
  const contentLayoutStyle = {
    "--tools-panel-width": `${toolsPanelWidth}px`
  } as CSSProperties;
  const visibleMapState =
    mapState && localMapViewport ? { ...mapState, viewport: localMapViewport } : mapState;

  function handleOpenWorldPathPicker(
    filter: WorldPathPickerFilter,
    title: string,
    onSelect: (path: string) => void
  ) {
    setPathPickerState({
      open: true,
      filter,
      title,
      onSelect
    });
  }

  function requestEditMode(path: string, file: WorldFile) {
    if (!isEditableFile(file)) {
      return;
    }
    setEditorDrafts((drafts) => {
      const draft = drafts[path] ?? createEditorDraft(file);
      return { ...drafts, [path]: setDraftMode(draft, "edit") };
    });
  }

  function handlePaneDoubleClick(
    paneActive: boolean,
    tab: OpenTab | null,
    fileState: FileLoadState,
    event: MouseEvent<HTMLElement>
  ) {
    if (!paneActive || !tab || fileState.status !== "ready") {
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("button,a,input,textarea,select,[role='menu'],[role='dialog']")) {
      return;
    }
    requestEditMode(tab.path, fileState.file);
  }

  function runEditorShortcutIntent(file: WorldFile, draft: EditorDraft, intent: EditorShortcutIntent) {
    if (intent === "save") {
      if (canSaveEditorDraft(file, draft)) {
        void handleSaveDraft();
      } else if (isDraftDirty(draft)) {
        setEditorDrafts((drafts) => ({
          ...drafts,
          [draft.path]: {
            ...draft,
            message: "Fix validation errors or reload disk changes before saving."
          }
        }));
      }
      return;
    }

    if (intent === "toggle-split") {
      handleDraftModeChange(draft.mode === "split" ? "edit" : "split");
      return;
    }

    if (intent === "dirty-escape") {
      setEditorDrafts((drafts) => ({
        ...drafts,
        [draft.path]: {
          ...draft,
          message: "Unsaved changes. Use Ctrl+S to save or Shift+Esc to revert."
        }
      }));
      return;
    }

    if (intent === "exit-edit") {
      handleDraftModeChange("preview");
      return;
    }

    if (intent === "revert" && window.confirm("Revert unsaved changes?")) {
      setEditorDrafts((drafts) => ({
        ...drafts,
        [draft.path]: setDraftMode(revertDraft(draft), "preview")
      }));
    }
  }

  function handlePaneKeyDown(
    paneActive: boolean,
    fileState: FileLoadState,
    draft: EditorDraft | null,
    event: ReactKeyboardEvent<HTMLElement>
  ) {
    if (!paneActive || fileState.status !== "ready" || !draft || !isEditableFile(fileState.file)) {
      return;
    }
    const intent = editorShortcutIntent(event, {
      dirty: isDraftDirty(draft),
      mode: draft.mode,
      supportsSplit: supportsEditorMode(fileState.file, "split")
    });
    if (!intent) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    runEditorShortcutIntent(fileState.file, draft, intent);
  }

  function renderWorkspacePane(paneId: WorkspacePaneId, tab: OpenTab | null) {
    const paneActive = normalizedWorkspaceLayout.activePaneId === paneId;
    const paneFileState = tab ? fileStates[tab.path] ?? idleFileState : idleFileState;
    const paneLinksState = tab ? linksStates[tab.path] ?? idleLinksState : idleLinksState;
    const paneDraft = tab ? editorDrafts[tab.path] ?? null : null;
    const viewerDraft = paneActive || !paneDraft ? paneDraft : { ...paneDraft, mode: "preview" as const };
    const paneLabel = paneId === "main" ? t("live.pane.main") : t("live.pane.secondary");

    return (
      <section
        aria-label={t("workspace.viewerPane", { pane: paneLabel })}
        className={`viewer-surface workspace-viewer-pane ${
          paneActive ? "workspace-viewer-pane-active" : ""
        }`}
        onClickCapture={(event) => {
          if (event.detail === 2) {
            handlePaneDoubleClick(paneActive, tab, paneFileState, event);
          }
        }}
        onClick={() => handleActivatePane(paneId, tab?.path ?? null)}
        onDoubleClickCapture={(event) => handlePaneDoubleClick(paneActive, tab, paneFileState, event)}
        onKeyDownCapture={(event) => handlePaneKeyDown(paneActive, paneFileState, paneDraft, event)}
      >
        <div className="workspace-pane-header">
          <strong>{paneLabel}</strong>
          <span>{tab ? tab.title ?? tab.name : t("live.pane.empty")}</span>
          {paneActive && <em>{t("actions.target")}</em>}
        </div>
        {tab ? (
          <>
            {paneActive && (
              <DocumentChrome
                draft={paneDraft}
                file={paneFileState.status === "ready" ? paneFileState.file : null}
                onCancelScript={(runId) => void handleCancelDmsScript(runId)}
                onReload={handleReloadActiveFile}
                onRequestEdit={() => {
                  if (paneFileState.status === "ready") {
                    requestEditMode(tab.path, paneFileState.file);
                  }
                }}
                onRunScript={() => void handleRunDmsScript(tab.path)}
                onSaveTemporary={handleOpenDmsOutputSaveDialog}
                scriptRunState={scriptRunState}
                t={t}
              />
            )}
            <FileViewer
              completions={buildEditorCompletions(pages, worldTree, audioAutocompleteTracks)}
              draft={viewerDraft}
              links={paneLinksState.status === "ready" ? paneLinksState.outgoing : []}
              loadState={paneFileState}
              onContextLink={handleLinkContext}
              onCsvDraftChange={handleCsvDraftChange}
              onDiceRoll={handleDiceRoll}
              onDraftContentChange={handleDraftContentChange}
              onOpenLink={openResolvedLink}
              onPickWorldPath={handleOpenWorldPathPicker}
              onPeekLink={openLinkPeek}
              tab={tab}
            />
          </>
        ) : (
          <div className="empty-surface">
            <h2>{t("workspace.selectFile")}</h2>
            <p>{t("workspace.openFromTree")}</p>
          </div>
        )}
      </section>
    );
  }

  if (authState.status === "checking") {
    return <UnlockScreen error={null} loading onUnlock={() => {}} t={t} />;
  }

  if (authState.status === "locked" || authState.status === "unlocking") {
    return (
      <UnlockScreen
        error={authState.error}
        loading={authState.status === "unlocking"}
        onUnlock={(token) => void handleAuthUnlock(token)}
        t={t}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <div className="side-top">
          <div className="brand-row">
            <span className="brand">VirtualScreen</span>
            <span className="current-world" title={currentWorldName}>
              {currentWorldName}
            </span>
          </div>
          <WorldSelector
            onOpenWorld={(id) => void handleOpenWorld(id)}
            state={worldLibrary}
            t={t}
          />
          <div className="panel-actions-row">
            <button className="panel-action" onClick={() => setWorldOpenDialog(true)} title={t("side.openFolderFull")} type="button">
              {t("side.openFolder")}
            </button>
            <button
              className="panel-action"
              onClick={() =>
                setWorldCreateDialog({
                  open: true,
                  name: "",
                  status: "idle",
                  error: null
                })
              }
              title={t("side.newWorldFull")}
              type="button"
            >
              {t("side.newWorld")}
            </button>
            <button className="panel-action" onClick={() => void refreshWorldLibrary()} title={t("side.scan")} type="button">
              {t("side.scan")}
            </button>
            <button className="panel-action" onClick={() => void loadTrashDialog()} title={t("side.trash")} type="button">
              {t("side.trash")}
            </button>
            <button
              className="panel-action"
              onClick={() => setSettingsDialogOpen(true)}
              ref={settingsButtonRef}
              title={t("app.settings")}
              type="button"
            >
              {t("side.settings")}
            </button>
          </div>
        </div>
        <nav className="world-tree" aria-label={t("side.worldFiles")} data-help-context="world-tree">
          <div className="world-tree-controls">
            <input
              aria-label={t("side.filterWorldTree")}
              onChange={(event) => setTreeFilter(event.target.value)}
              placeholder={t("side.filterWorld")}
              type="search"
              value={treeFilter}
            />
            <button onClick={() => setExpandedPaths(new Set([""]))} type="button">
              {t("side.collapseAll")}
            </button>
          </div>
          {worldTreeStatus && <p className="world-tree-status">{worldTreeStatus}</p>}
          {loadState === "error" ? (
            <p className="load-error">{t("side.couldNotLoadWorld")}</p>
          ) : worldTree ? (
            <ul>
              <WorldTree
                dragPath={worldTreeDragPath}
                dropPath={worldTreeDropPath}
                entry={worldTree}
                expandedPaths={expandedPaths}
                favoritePaths={favoritePaths}
                filter={treeFilter}
                menuPath={folderMenuPath}
                onAdd={handleFolderAdd}
                onContextEntry={handleWorldTreeContextEntry}
                onDragEnd={handleWorldTreeDragEnd}
                onDragStart={handleWorldTreeDragStart}
                onDragTarget={setWorldTreeDropPath}
                onDropEntry={(entry, event) => void handleWorldTreeDrop(entry, event)}
                onMenuToggle={setFolderMenuPath}
                onOpen={handleOpenEntry}
                onToggle={handleToggleFolder}
                t={t}
              />
            </ul>
          ) : (
            <p>{t("side.loadingWorld")}</p>
          )}
          <WorldTreeContextMenu
            favorite={worldTreeContextMenu.open ? favoritePaths.has(worldTreeContextMenu.entry.path) : false}
            onClose={closeWorldTreeContextMenu}
            onDuplicate={(entry) => void handleWorldTreeDuplicate(entry)}
            onOpen={handleOpenEntry}
            onOpenNewTab={handleOpenEntry}
            onRename={handleWorldTreeRename}
            onToggleFavorite={handleWorldTreeToggleFavorite}
            onTrash={handleWorldTreeTrash}
            state={worldTreeContextMenu}
            t={t}
          />
        </nav>
        <div className="side-bottom">
          <QuickFileList
            emptyLabel={t("app.none")}
            items={favorites}
            onOpen={handleOpenFavorite}
            title={t("side.favorites")}
          />
          <QuickFileList
            collapsible
            defaultOpen={false}
            emptyLabel={t("app.none")}
            items={recentFiles}
            onOpen={handleOpenRecent}
            title={t("side.recent")}
          />
        </div>
      </aside>

      <section className="workspace">
        <div className="workspace-body">
          <WorkspaceControls
            currentId={currentWorkspaceId}
            currentName={currentWorkspaceName}
            layout={normalizedWorkspaceLayout}
            onActivate={(workspaceId) => void handleActivateWorkspace(workspaceId)}
            onCapture={() => setCaptureDialogOpen(true)}
            onDelete={() => void handleDeleteCurrentWorkspace()}
            onHelp={() => openContextHelp(helpContextForMediaKind(activeTab?.mediaKind ?? null))}
            onNewCard={handleOpenNewCardDialog}
            onSearch={openSearchDialog}
            searchButtonRef={searchButtonRef}
            onModeChange={handleWorkspaceModeChange}
            onNew={() =>
              setWorkspaceDialog({ kind: "create", name: "", status: "idle", error: null })
            }
            onPrepCheck={() => setPrepHealthDialogOpen(true)}
            onRename={() => {
              const workspace =
                workspaces.find((item) => item.id === currentWorkspaceId) ?? {
                  id: currentWorkspaceId,
                  name: currentWorkspaceName,
                  is_active: true,
                  updated_at: ""
                };
              setWorkspaceDialog({
                kind: "rename",
                workspace,
                name: workspace.name,
                status: "idle",
                error: null
              });
            }}
            prepStatus={livePrepHealthLabel(prepHealthReport, t).replace(/^.*?:\s*/, "")}
            summaries={workspaces}
            t={t}
          />
          {tabState.tabs.length > 0 && (
            <div className="tab-strip" role="tablist" aria-label={t("workspace.openFiles")}>
              {tabState.tabs.map((tab) => {
                const tabDraft = editorDrafts[tab.path];
                const dirty = tabDraft ? isDraftDirty(tabDraft) : false;
                return (
                  <div
                    className="tab-shell"
                    key={tab.path}
                    onAuxClick={(event) => {
                      if (event.button === 1) {
                        event.preventDefault();
                        event.stopPropagation();
                        handleCloseTab(tab.path);
                      }
                    }}
                    onMouseDown={(event) => {
                      if (event.button === 1) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <button
                      aria-selected={tab.path === tabState.activePath}
                      className="tab-button"
                      onClick={() => handleActivateTab(tab.path)}
                      role="tab"
                      type="button"
                    >
                      {tab.title ?? tab.name}
                      {dirty ? " *" : ""}
                    </button>
                    <button
                      aria-label={`Close ${tab.name}`}
                      className="close-tab"
                      onClick={() => handleCloseTab(tab.path)}
                      type="button"
                    >
                      x
                    </button>
                  </div>
                );
              })}
              <span className="tab-strip-count">{t("workspace.openFileCount", { count: tabState.tabs.length })}</span>
            </div>
          )}

          <AudioPlaybackHost
            mixer={audioMixer}
            onEnded={handleAudioEnded}
            onFadeFinish={handleAudioFadeFinish}
          />

          <div className="content-layout with-tools" style={contentLayoutStyle}>
            <div
              className={`viewer-panes viewer-panes-${normalizedWorkspaceLayout.mode}`}
              style={
                {
                  "--workspace-main-ratio": `${normalizedWorkspaceLayout.splitRatio}fr`,
                  "--workspace-secondary-ratio": `${1 - normalizedWorkspaceLayout.splitRatio}fr`
                } as CSSProperties
              }
            >
              {renderWorkspacePane("main", mainPaneTab)}
              {normalizedWorkspaceLayout.mode === "vertical_split" && (
                <>
                  <div
                    aria-label="Resize workspace panes"
                    aria-orientation="vertical"
                    className="workspace-pane-resizer"
                    onPointerDown={handlePaneResizePointerDown}
                    role="separator"
                    tabIndex={0}
                  />
                  {renderWorkspacePane("secondary", secondaryPaneTab)}
                </>
              )}
            </div>
            <div
              aria-label="Resize tools panel"
              aria-orientation="vertical"
              className="tools-resizer"
              onKeyDown={handleToolsResizeKeyDown}
              onPointerDown={handleToolsResizePointerDown}
              role="separator"
              tabIndex={0}
            />
            <ToolsPanel
              activeTab={activeTab}
              assistantActiveDocumentLabel={assistantActiveDocumentLabel}
              assistantCanUseActiveDocument={assistantCanUseActiveDocument}
              assistantContext={assistantContext}
              assistantContextSource={assistantContextSource}
              assistantForm={selectedAssistantForm}
              assistantForms={localizedAssistantForms}
              assistantProvider={assistantProvider}
              assistantResult={assistantResult}
              assistantSaveKind={assistantSaveKind}
              assistantSavePath={assistantSavePath}
              assistantStatus={assistantStatus}
              assistantValues={assistantValues}
              actionBindings={actionBindings}
              actionBindingMessage={actionBindingMessage}
              audioExpansionState={audioPlaylistExpansion}
              audioLibraryTracks={audioAutocompleteTracks}
              audioMixer={audioMixer}
              audioQuery={audioQuery}
              audioPlaylistState={audioPlaylistState}
              audioState={audioState}
              contentDirty={activeContentDirty}
              displayState={displayState}
              diceHistory={diceHistory}
              diceStatus={diceStatus}
              fastSlotError={fastSlotError}
              fastSlots={fastSlots}
              hpRows={hpRows}
              hpStatus={hpStatus}
              fileReady={
                activePageState.status === "ready" &&
                hasPageSavePreconditions(activePageState.page)
              }
              linksState={activeLinksState}
              mapActionStatus={mapActionStatus}
              mapPresets={mapPresets}
              mapState={visibleMapState}
              metadataEditState={activeMetadataEdit}
              midiBindingMessage={midiBindingMessage}
              midiBindings={midiBindings}
              midiInputs={midiInputs}
              midiLearnedControl={midiLearnedControl}
              midiLearning={midiLearning}
              midiStatus={midiStatus}
              onBlankDisplay={() => void handleBlankDisplay()}
              onAssistantCheckProvider={() => void handleAssistantCheckProvider()}
              onAssistantContextChange={handleAssistantContextChange}
              onAssistantCopy={() => void handleAssistantCopy()}
              onAssistantFieldChange={handleAssistantFieldChange}
              onAssistantFormChange={handleAssistantFormChange}
              onAssistantGenerate={() => void handleAssistantGenerate()}
              onAssistantSave={() => void handleAssistantSave()}
              onAssistantSaveKindChange={handleAssistantSaveKindChange}
              onAssistantSavePathChange={setAssistantSavePath}
              onAssistantUseActiveDocument={handleAssistantUseActiveDocument}
              onActionBindingDelete={handleDeleteActionBinding}
              onActionBindingRun={(binding) => void handleActionBindingTrigger(binding)}
              onActionBindingSave={handleSaveActionBinding}
              onAudioFadeIn={handleAudioFadeIn}
              onAudioFadeOut={handleAudioFadeOut}
              onAudioLoadTrack={handleAudioLoadTrack}
              onAudioLoadPlaylist={handleAudioLoadPlaylist}
              onAudioLoopChange={handleAudioLoopChange}
              onAudioNextTrack={handleAudioNextTrack}
              onAudioPlaylistLoopChange={handleAudioPlaylistLoopChange}
              onAudioPlaylistToggle={handleAudioPlaylistToggle}
              onAudioPlayingChange={handleAudioPlayingChange}
              onAudioPreviousTrack={handleAudioPreviousTrack}
              onAudioQueryChange={setAudioQuery}
              onAudioStopAll={handleAudioStopAll}
              onAudioStopBus={handleAudioStopBus}
              onAudioVolumeChange={handleAudioVolumeChange}
              onSavedAudioPlaylistAddCurrentTrack={handleSavedAudioPlaylistAddCurrentTrack}
              onSavedAudioPlaylistAddTrack={handleSavedAudioPlaylistAddTrack}
              onSavedAudioPlaylistBusChange={handleSavedAudioPlaylistBusChange}
              onSavedAudioPlaylistCreate={handleSavedAudioPlaylistCreate}
              onSavedAudioPlaylistDelete={handleSavedAudioPlaylistDelete}
              onSavedAudioPlaylistLoopChange={handleSavedAudioPlaylistLoopChange}
              onSavedAudioPlaylistMoveTrack={handleSavedAudioPlaylistMoveTrack}
              onSavedAudioPlaylistPlay={handleSavedAudioPlaylistPlay}
              onSavedAudioPlaylistRemoveTrack={handleSavedAudioPlaylistRemoveTrack}
              onSavedAudioPlaylistRename={handleSavedAudioPlaylistRename}
              onDiceClearHistory={handleDiceClearHistory}
              onDiceRoll={handleDiceRoll}
              onHpAdd={handleHpAdd}
              onHpAdjust={handleHpAdjust}
              onHpClear={handleHpClear}
              onHpPersist={handleHpPersist}
              onHpRemove={handleHpRemove}
              onHpUpdate={handleHpUpdate}
              onCancelMetadataEdit={handleCancelMetadataEdit}
              onCancelScript={(runId) => void handleCancelDmsScript(runId)}
              onChangeMetadataEdit={handleChangeMetadataEdit}
              onClearDisplayPopups={() => void handleClearDisplayPopups()}
              onClearFastSlot={handleClearFastSlot}
              onPickPath={handleOpenWorldPathPicker}
              onCloseDisplayPopup={(popupId) => void handleCloseDisplayPopup(popupId)}
              onDisplayPopupVisibleChange={(popupId, visible) =>
                void handleDisplayPopupVisibleChange(popupId, visible)
              }
              onMapClearReveals={() => void handleMapClearReveals()}
              onMapDeletePin={(pinId) => void handleMapDeletePin(pinId)}
              onMapDeletePreset={(presetId) => void handleMapDeletePreset(presetId)}
              onMapFogChange={(enabled) => void handleMapFogChange(enabled)}
              onMapGridChange={(grid) => void handleMapGridChange(grid)}
              onMapLoadSource={(path) => void handleMapLoadSource(path)}
              onMapLoadPreset={(presetId) => void handleMapLoadPreset(presetId)}
              onMapPinCreate={(point, label, visibility) =>
                void handleMapPinCreate(point, label, visibility)
              }
              onMapPresent={() => void handleMapPresent()}
              onMapRevealCreate={(reveal) => void handleMapRevealCreate(reveal)}
              onMapSavePreset={(name, state) => void handleMapSavePreset(name, state)}
              onMapStop={() => void handleMapStop()}
              onMapUndoReveal={() => void handleMapUndoReveal()}
              onMapUseActiveImage={() => void handleUseActiveImageAsMap()}
              onMapViewportCommit={(viewport) => void handleMapViewportCommit(viewport)}
              onMapViewportPreview={handleMapViewportPreview}
              onClearMidiLearned={handleClearMidiLearned}
              onConnectMidi={() => void handleConnectMidi()}
              onDeleteMidiBinding={handleDeleteMidiBinding}
              onMidiBindingRun={(binding) => void handleMidiBindingTrigger(binding)}
              onMidiBindingSave={handleSaveMidiBinding}
              onOpenBacklink={openBacklink}
              onOpenDisplayPopup={(preset, path) => void handleOpenActivePopup(preset, path)}
              onStageDisplayPopup={(preset, path) => void handleStageActivePopup(preset, path)}
              onOpenOutgoing={openResolvedLink}
              onReloadMetadataEdit={() => void handleReloadMetadataEdit()}
              onRevertMetadataEdit={handleRevertMetadataEdit}
              onSaveMetadataEdit={() => void handleSaveMetadataEdit()}
              onDeleteTableSnapshot={(snapshotId) => void handleDeleteTableSnapshot(snapshotId)}
              onLoadTableSnapshot={(snapshotId) => void handleLoadTableSnapshot(snapshotId)}
              onSaveTableSnapshot={() => void handleSaveTableSnapshot()}
              onSaveFastSlot={handleSaveFastSlot}
              onSelectTableSnapshot={setSelectedTableSnapshotId}
              onStartMidiLearn={() => void handleStartMidiLearn()}
              onTableSnapshotNameChange={(name) => {
                setTableSnapshotName(name);
                setTableSnapshotStatus({ status: "idle", message: null });
              }}
              onScriptRun={(path) => void handleRunDmsScript(path)}
              onClearAndShowFullscreen={(path) => void handleClearAndShowActiveFullscreen(path)}
              onShowFullscreen={(path) => void handleShowActiveFullscreen(path)}
              onStartMetadataEdit={handleStartMetadataEdit}
              onScreenToolTabChange={setScreenToolTab}
              onToolPin={handleToolPin}
              onToolToggle={handleToolToggle}
              openTools={toolPanelState}
              pageState={activePageState}
              pages={pages}
              screenToolTab={screenToolTab}
              scriptRunState={scriptRunState}
              scriptState={scriptState}
              tableSnapshotName={tableSnapshotName}
              tableSnapshotSelectedId={selectedTableSnapshotId}
              tableSnapshotStatus={tableSnapshotStatus}
              tableSnapshots={tableSnapshots}
              t={t}
            />
          </div>
          <FastSlotBar slots={fastSlots} onTrigger={(slot) => void handleFastSlotTrigger(slot)} t={t} />
        </div>
      </section>
      <SearchDialog
        inputRef={searchInputRef}
        onClose={closeSearchDialog}
        onOpenOtherPane={(result) => {
          handleOpenSearchResultOtherPane(result);
          setSearchDialogOpen(false);
        }}
        onOpenResult={(result) => {
          handleOpenSearchResult(result);
          setSearchDialogOpen(false);
        }}
        onPeekResult={(result) => {
          handlePeekSearchResult(result);
          setSearchDialogOpen(false);
        }}
        onQueryChange={setSearchQuery}
        onShowResult={(result) => {
          handleShowSearchResult(result);
          setSearchDialogOpen(false);
        }}
        onStageResult={(result) => {
          handleStageSearchResult(result);
          setSearchDialogOpen(false);
        }}
        open={searchDialogOpen}
        query={searchQuery}
        state={searchState}
        t={t}
      />
      <CaptureDialog
        draft={captureDraft}
        onCategoryChange={handleCaptureCategoryChange}
        onClose={() => setCaptureDialogOpen(false)}
        onOpenLog={() => void handleOpenCaptureLog()}
        onPersistDraft={() => persistCurrentCaptureDraft()}
        onSave={() => void handleSaveCapture()}
        onTextChange={handleCaptureTextChange}
        open={captureDialogOpen}
        status={captureStatus}
        t={t}
        today={captureToday}
      />
      <PrepHealthDialog
        filter={prepHealthFilter}
        onClose={() => setPrepHealthDialogOpen(false)}
        onCopyTarget={handleCopyPrepHealthTarget}
        onFilterChange={setPrepHealthFilter}
        onOpenSource={handleOpenPrepHealthSource}
        onRun={() => void handleRunPrepHealth()}
        open={prepHealthDialogOpen}
        report={prepHealthReport}
        status={prepHealthStatus}
        t={t}
      />
      <SettingsDialog
        availableLanguages={availableLanguageOptions}
        language={uiLanguage}
        onClose={closeSettingsDialog}
        onImportComplete={async () => {
          await refreshWorldStructure([]);
          setSearchRevision((revision) => revision + 1);
        }}
        onLanguageChange={handleLanguageChange}
        open={settingsDialogOpen}
        t={t}
      />
      <WorldPathPicker
        candidates={pathPickerCandidates}
        cancelLabel={t("app.cancel")}
        dialogLabel={t("pathPicker.label")}
        filter={pathPickerState.open ? pathPickerState.filter : "any"}
        filterInputLabel={t("pathPicker.filter")}
        filterLabel={localizedWorldPathPickerFilterLabel(
          t,
          pathPickerState.open ? pathPickerState.filter : "any"
        )}
        emptyMessage={t("pathPicker.empty")}
        onClose={() => setPathPickerState({ open: false })}
        onSelect={(path) => {
          if (pathPickerState.open) {
            pathPickerState.onSelect(path);
          }
          setPathPickerState({ open: false });
        }}
        open={pathPickerState.open}
        placeholder={t("pathPicker.placeholder")}
        resultsLabel={t("pathPicker.results")}
        searchLabel={t("pathPicker.search")}
        title={pathPickerState.open ? pathPickerState.title : t("pathPicker.title")}
        useSelectedLabel={t("pathPicker.use")}
      />
      <FileManagementDialog
        onCardTemplateChange={handleFileDialogCardTemplateChange}
        onCardTitleChange={handleFileDialogCardTitleChange}
        onClose={() => setFileDialog({ kind: "closed" })}
        onFileTypeChange={handleFileDialogTypeChange}
        onPathChange={handleFileDialogPathChange}
        onSubmit={handleSubmitFileDialog}
        state={fileDialog}
      />
      <TrashManagerDialog
        onClose={() => setTrashDialog({ open: false })}
        onDelete={(entry) => void handleDeleteTrashEntry(entry)}
        onRestore={(entry) => void handleRestoreTrashEntry(entry)}
        onRestorePathChange={handleTrashRestorePathChange}
        onSetConfirmDelete={(path) =>
          setTrashDialog((state) => (state.open ? { ...state, confirmDeletePath: path } : state))
        }
        state={trashDialog}
      />
      {worldOpenDialog && (
        <WorldOpenDialog
          onClose={() => setWorldOpenDialog(false)}
          onOpenWorld={(id) => void handleOpenWorld(id)}
          onRefresh={() => void refreshWorldLibrary()}
          state={worldLibrary}
          t={t}
        />
      )}
      <WorldCreateDialog
        onClose={() => setWorldCreateDialog({ open: false })}
        onNameChange={handleWorldNameChange}
        onSubmit={() => void handleCreateWorld()}
        state={worldCreateDialog}
        t={t}
      />
      <WorkspaceDialog
        onClose={() => setWorkspaceDialog({ kind: "closed" })}
        onNameChange={(name) =>
          setWorkspaceDialog((state) =>
            state.kind === "closed" ? state : { ...state, name, error: null }
          )
        }
        onSubmit={() => void handleSubmitWorkspaceDialog()}
        state={workspaceDialog}
      />
      <LinkContextMenu
        onClose={() => setLinkContextMenu({ open: false })}
        onCopyPath={(link) => {
          const value = link.target_path ?? link.raw_target;
          void navigator.clipboard?.writeText(value);
        }}
        onOpen={openResolvedLink}
        onOpenOtherPane={openLinkInOtherPane}
        onPeek={openLinkPeek}
        onShowPopup={(link) => {
          if (link.target_path) {
            void openDisplayPopup(link.target_path).then(setDisplayState).catch(() => {});
          }
        }}
        onStagePopup={(link) => {
          if (link.target_path) {
            void openDisplayPopup(link.target_path, "plain", false).then(setDisplayState).catch(() => {});
          }
        }}
        state={linkContextMenu}
      />
      <PeekDialog
        completions={buildEditorCompletions(pages, worldTree, audioAutocompleteTracks)}
        onClose={() => setPeekState({ open: false })}
        onContextLink={handleLinkContext}
        onDiceRoll={handleDiceRoll}
        onOpenLink={openResolvedLink}
        onPeekLink={openLinkPeek}
        state={peekState}
      />
      <DmsFormDialog
        fileOptions={pages.map((page) => page.path)}
        onChange={handleDmsFormChange}
        onClose={() => setDmsFormDialog({ open: false })}
        onSubmit={() => void handleDmsFormSubmit()}
        state={dmsFormDialog}
        t={t}
      />
      <DmsTrustDialog
        onCancel={handleCancelDmsTrust}
        onConfirm={handleConfirmDmsTrust}
        state={dmsTrustDialog}
        t={t}
      />
      <DmsOutputSaveDialog
        onChange={handleDmsOutputSavePathChange}
        onClose={() => setDmsOutputSaveDialog({ open: false })}
        onSubmit={() => void handleSaveDmsOutput()}
        state={dmsOutputSaveDialog}
        t={t}
      />
      <ContextHelpDialog
        onClose={closeContextHelp}
        open={Boolean(contextHelpTopic)}
        t={t}
        topic={contextHelpTopic}
      />
    </main>
  );
}
