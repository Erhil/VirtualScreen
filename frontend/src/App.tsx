import {
  useEffect,
  useRef,
  useState,
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
  fetchAuthStatus,
  fetchAudioLibrary,
  fetchCardTemplates,
  fetchCaptureToday,
  fetchDisplayState,
  fetchDmsRun,
  fetchFastSlots,
  fetchHpTracker,
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
  loginAuth,
  moveWorldPath,
  openWorld,
  openDisplayPopup,
  recordRecent,
  renameWorkspace,
  restoreTableSnapshot,
  restoreTrash,
  runDmsScript,
  saveFavorites,
  saveFastSlots,
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
  type TableSnapshotSummary,
  type DisplayState,
  type DisplayPopupPreset,
  type AudioBus,
  type AudioTrack,
  type AuthStatus,
  type CaptureCategory,
  type CaptureTodayResponse,
  type DmsRunState,
  type DmsScriptSummary,
  type FastSlot,
  type FastSlotAction,
  type HpTrackerRow,
  type NamedWorkspaceSummary,
  type TrashEntry,
  type WorldEntry,
  type WorldFile,
  type WorldLibraryState,
  type WorldMediaKind,
  type WorkspaceLayout,
  type WorkspacePaneId,
  type WorkspaceState,
  type WorkspaceTab
} from "./lib/api";
import {
  filterPrepHealthIssues,
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
  createPlaylistExpansionState,
  createAudioMixerState,
  displayAudioTrackTitle,
  finishAudioFade,
  groupAudioTracksByBus,
  hasLoadedAudio,
  loadAudioPlaylist,
  loadAudioTrack,
  playlistExpansionKey,
  rewindAudioQueue,
  setAudioBusLoop,
  setAudioPlaylistLoop,
  setAudioBusPlaying,
  setAudioBusVolume,
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
  isDraftDirty,
  normalizeEditorModeForTarget,
  editorModesForTarget,
  markDraftConflict,
  markDraftChangedOnDisk,
  markDraftError,
  markDraftSaved,
  markDraftSaving,
  revertDraft,
  setDraftMode,
  updateDraftContent,
  type EditorDraft,
  type EditorMode
} from "./lib/editor";
import { buildEditorCompletionItems } from "./lib/editorAutocomplete";
import {
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
import { createDisplayEventClient, hasResidualPopupsAfterBlank } from "./lib/display";
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
  planViewportSync,
  presentMap,
  saveMapPreset,
  setMapFog,
  setMapGrid,
  setMapSource,
  setMapViewport,
  stopMap,
  type MapGrid,
  type MapPinVisibility,
  type MapPoint,
  type MapPreset,
  type MapReveal,
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
import { activateTab, closeTab, openTab, type OpenTab, type TabState } from "./lib/tabs";
import {
  chooseSecondaryPaneActiveTab,
  clampWorkspaceSplitRatio,
  defaultWorkspaceLayout,
  groupSearchResults,
  isFavorite,
  normalizeWorkspaceLayout,
  openFileInActivePane,
  recordRecentItem,
  retargetLayoutAfterTabClose,
  searchResultToTab,
  toggleFavorite
} from "./lib/workspace";
import { renderRichInline, renderRichMarkdown } from "./lib/richText";
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
import {
  liveAudioBusSummaries,
  liveMapSummary,
  liveOutputSummary,
  livePaneSummary,
  livePopupSummary,
  livePrepHealthLabel
} from "./lib/liveStatus";
import { moveSearchResultSelection, selectedSearchResult } from "./lib/searchPalette";
import {
  flattenWorldPathPickerEntries,
  type WorldPathPickerFilter
} from "./lib/worldPathPicker";

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
type TableSnapshotStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "loaded"; message: string }
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
  folderPath: string
): Extract<FileDialogState, { kind: "create" }> {
  const cardTitle = DEFAULT_CARD_TITLE;
  return {
    kind: "create",
    fileType,
    path:
      fileType === "card"
        ? defaultCardPath(folderPath, cardTitle)
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
  html,
  links,
  onContextLink,
  onOpenLink,
  onPeekLink
}: {
  className?: string;
  html: string;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
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

  function handleClick(event: MouseEvent<HTMLElement>) {
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
      dangerouslySetInnerHTML={{ __html: html }}
      onAuxClick={handleAuxClick}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  );
}

function MarkdownViewer({
  file,
  content,
  links,
  onContextLink,
  onOpenLink,
  onPeekLink
}: {
  file: WorldFile;
  content?: string;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  return (
    <RichHtml
      className="markdown-viewer"
      html={renderRichMarkdown(content ?? file.content, links, file.path)}
      links={links}
      onContextLink={onContextLink}
      onOpenLink={onOpenLink}
      onPeekLink={onPeekLink}
    />
  );
}

function CsvViewer({
  file,
  content,
  links,
  onContextLink,
  onOpenLink,
  onPeekLink
}: {
  file: WorldFile;
  content?: string;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  const data = parseCsv(content ?? file.content);

  if (data.headers.length === 0) {
    return <div className="empty-surface">CSV file is empty.</div>;
  }

  return (
    <div className="table-wrap">
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
    <div className="csv-editor">
      <div className="editor-actions">
        <button onClick={() => onChange(addCsvRow(data))} type="button">
          Add Row
        </button>
        <button onClick={() => onChange(addCsvColumn(data))} type="button">
          Add Column
        </button>
      </div>
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
                    disabled={data.headers.length <= 1}
                    onClick={() => onChange(removeCsvColumn(data, columnIndex))}
                    type="button"
                  >
                    x
                  </button>
                </th>
              ))}
              <th aria-label="Row controls" />
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
                    onClick={() => onChange(removeCsvRow(data, rowIndex))}
                    type="button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
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
  onOpenLink,
  onPeekLink
}: {
  card: StructuredCard;
  file: WorldFile;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
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
    <article className="card-surface card-viewer">
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
        <div className="card-editor-table-columns">
          {columns.map((column, columnIndex) => (
            <div className="card-editor-column" key={`column-${sectionIndex}-${columnIndex}`}>
              <input
                aria-label={`Table column ${sectionIndex + 1}-${columnIndex + 1}`}
                onChange={(event) =>
                  onChange(
                    updateCardTableColumnName(card, sectionIndex, columnIndex, event.target.value)
                  )
                }
                value={column}
              />
              <button
                onClick={() => onChange(removeCardTableColumn(card, sectionIndex, column))}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange(addCardTableColumn(card, sectionIndex, "New Column"))}
            type="button"
          >
            Add Column
          </button>
        </div>
        <div className="card-table-wrap">
          <table className="card-table card-editor-table-grid">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Actions</th>
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
                      className="button-danger-subtle"
                      onClick={() => onChange(removeCardTableRow(card, sectionIndex, rowIndex))}
                      type="button"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => onChange(addCardTableRow(card, sectionIndex))} type="button">
          Add Row
        </button>
      </div>
    );
  }

  return (
    <form className="card-surface card-editor" onSubmit={(event) => event.preventDefault()}>
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
  return <pre className="text-viewer">{file.content}</pre>;
}

function EditorToolbar({
  draft,
  favorite,
  file,
  onModeChange,
  onReload,
  onRename,
  onCancelScript,
  onRevert,
  onRunScript,
  onSave,
  onSaveTemporary,
  onToggleFavorite,
  onTrash,
  scriptRunState
}: {
  draft: EditorDraft | null;
  favorite: boolean;
  file: WorldFile | null;
  onModeChange: (mode: EditorMode) => void;
  onReload: () => void;
  onRename: () => void;
  onCancelScript: (runId: string) => void;
  onRevert: () => void;
  onRunScript: () => void;
  onSave: () => void;
  onSaveTemporary: () => void;
  onToggleFavorite: () => void;
  onTrash: () => void;
  scriptRunState: ScriptRunState;
}) {
  if (!file) {
    return null;
  }

  const editable = Boolean(draft && isEditableFile(file));
  if (!editable || !draft) {
    if (isTemporaryDmsPath(file.path)) {
      return (
        <div className="editor-toolbar" aria-label="Editor controls">
          <button onClick={onSaveTemporary} type="button">
            Save As
          </button>
        </div>
      );
    }
    return (
      <div className="editor-toolbar" aria-label="Editor controls">
        <button aria-pressed={favorite} onClick={onToggleFavorite} type="button">
          {favorite ? "Favorited" : "Favorite"}
        </button>
      </div>
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
  const editorModes = draft ? editorModesForTarget(file) : [];

  return (
    <div className="editor-toolbar" aria-label="Editor controls">
      <button
        aria-pressed={favorite}
        onClick={onToggleFavorite}
        type="button"
      >
        {favorite ? "Favorited" : "Favorite"}
      </button>
      {file.media_kind === "script" && (
        runningScript && scriptRunState.status === "running" && scriptRunState.runId ? (
          <button onClick={() => onCancelScript(scriptRunState.runId!)} type="button">
            Cancel
          </button>
        ) : (
          <button
            disabled={!scriptRun.available}
            onClick={onRunScript}
            title={scriptRun.available ? "Run DMS script" : scriptRun.reason}
            type="button"
          >
            Run
          </button>
        )
      )}
      <div className="editor-mode">
        {editorModes.map((mode) => (
          <button
            aria-pressed={draft.mode === mode}
            key={mode}
            onClick={() => onModeChange(mode)}
            type="button"
          >
            {mode === "split" ? "Split" : mode === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>
      <button
        disabled={!dirty || saving || !csvValid || !cardValid || changedOnDisk}
        onClick={onSave}
        type="button"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <button disabled={!dirty || saving} onClick={onRevert} type="button">
        Revert
      </button>
      <button disabled={dirty || saving} onClick={onRename} type="button">
        Rename
      </button>
      <button disabled={dirty || saving} onClick={onTrash} type="button">
        Move to Trash
      </button>
      {(draft.status === "conflict" || changedOnDisk) && (
        <button disabled={saving} onClick={onReload} type="button">
          Reload from disk
        </button>
      )}
      <span
        className={`editor-status ${
          changedOnDisk ? "editor-status-external" : `editor-status-${draft.status}`
        }`}
      >
        {changedOnDisk
          ? "Changed on disk"
          : draft.status === "conflict"
            ? draft.message ?? "World file changed on disk."
              : draft.status === "error"
                ? draft.message ?? "Could not save file."
                : file.media_kind === "script" && !scriptRun.available
                  ? scriptRun.reason
                : !cardValid
                  ? "Invalid card JSON"
                : dirty
                  ? "Unsaved changes"
                : draft.status === "saved"
                  ? "Saved"
                  : "Clean"}
      </span>
    </div>
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
  onDraftContentChange: (content: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPickWorldPath?: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  if (loadState.status === "removed") {
    return (
      <div className="empty-surface">
        <h2>File Removed</h2>
        <p>{loadState.message}</p>
      </div>
    );
  }

  if (tab.mediaKind === "unsupported") {
    return (
      <div className="empty-surface">
        <h2>Unsupported File</h2>
        <p>{tab.name} cannot be previewed yet.</p>
      </div>
    );
  }

  if (tab.mediaKind === "image") {
    return (
      <div className="media-viewer">
        <img alt={tab.name} src={buildMediaUrl(tab.path)} />
      </div>
    );
  }

  if (tab.mediaKind === "video") {
    return (
      <div className="media-viewer">
        <video aria-label={tab.name} controls src={buildMediaUrl(tab.path)} />
      </div>
    );
  }

  if (tab.mediaKind === "pdf") {
    return (
      <div className="pdf-viewer">
        <iframe aria-label={tab.name} src={buildMediaUrl(tab.path)} title={tab.name} />
      </div>
    );
  }

  if (loadState.status === "loading" || loadState.status === "idle") {
    return <div className="empty-surface">Loading {tab.name}...</div>;
  }

  if (loadState.status === "error") {
    return (
      <div className="empty-surface">
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
        onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );

    if (draft?.mode === "edit") {
      return editor;
    }

    if (draft?.mode === "split") {
      return (
        <div className="markdown-split-view">
          <section aria-label="Markdown editor pane">{editor}</section>
          <section aria-label="Markdown preview pane">{preview}</section>
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
        onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );
  }

  if (loadState.file.media_kind === "script") {
    if (draft?.mode === "edit") {
      return (
        <CodeEditor
          ariaLabel="DMS editor"
          completions={completions}
          language="python"
          onChange={onDraftContentChange}
          value={draft.content}
        />
      );
    }

    return <pre className="text-viewer">{draft?.content ?? loadState.file.content}</pre>;
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
  onReloadEdit
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
}) {
  if (pageState.status === "loading" || pageState.status === "idle") {
    return (
      <section className="metadata-tool" aria-label="Metadata">
        {tab ? <p>Loading metadata...</p> : <p>Select a file to inspect page metadata.</p>}
      </section>
    );
  }

  if (pageState.status === "error") {
    return (
      <section className="metadata-tool" aria-label="Metadata">
        <div className="metadata-empty">
          <h3>Could Not Load Metadata</h3>
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
    <section className="metadata-tool" aria-label="Metadata">
      <div className="metadata-heading">
        {editState.mode === "view" && (
          <button
            disabled={!fileReady || contentDirty}
            onClick={onStartEdit}
            type="button"
          >
            Edit Metadata
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
          <section className="link-section" aria-label="Outgoing Links">
            <h3>Outgoing Links</h3>
            {linksError && <p>{linksError}</p>}
            {linksState.status === "loading" && <p>Loading links...</p>}
            {linksState.status !== "loading" && outgoing.length === 0 && <p>None</p>}
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
          <section className="link-section" aria-label="Backlinks">
            <h3>Backlinks</h3>
            {linksState.status === "loading" && <p>Loading backlinks...</p>}
            {linksState.status !== "loading" && backlinks.length === 0 && <p>None</p>}
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
  onMenuToggle
}: {
  dragPath: string | null;
  dropPath: string | null;
  entry: WorldEntry;
  expandedPaths: Set<string>;
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
    return (
      <li>
        <button
          className="tree-item file-item"
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
  const addLabel = entry.path === "" ? "Add in world" : `Add in ${entry.name}`;

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
              New Markdown
            </button>
              <button onClick={() => onAdd(entry.path, "card")} type="button">
                New Card
              </button>
              <button onClick={() => onAdd(entry.path, "csv")} type="button">
                New CSV
              </button>
              <button onClick={() => onAdd(entry.path, "script")} type="button">
                New Script
              </button>
              <button onClick={() => onAdd(entry.path, "folder")} type="button">
                New Folder
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
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function WorldTreeContextMenu({
  state,
  onClose,
  onDuplicate,
  onOpen,
  onOpenNewTab,
  onRename,
  onTrash
}: {
  state: WorldTreeContextMenuState;
  onClose: () => void;
  onDuplicate: (entry: WorldEntry) => void;
  onOpen: (entry: WorldEntry) => void;
  onOpenNewTab: (entry: WorldEntry) => void;
  onRename: (entry: WorldEntry) => void;
  onTrash: (entry: WorldEntry) => void;
}) {
  if (!state.open) {
    return null;
  }
  const entry = state.entry;
  const isRoot = entry.path === "";
  return (
    <div
      className="tree-context-menu"
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
            Open
          </button>
          <button
            onClick={() => {
              onOpenNewTab(entry);
              onClose();
            }}
            type="button"
          >
            Open in New Tab
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
            Rename
          </button>
          <button
            onClick={() => {
              onDuplicate(entry);
              onClose();
            }}
            type="button"
          >
            Duplicate
          </button>
          <button
            className="danger-action"
            onClick={() => {
              onTrash(entry);
              onClose();
            }}
            type="button"
          >
            Move to Trash
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
  defaultOpen = true
}: {
  title: string;
  items: WorkspaceTab[];
  onOpen: (tab: WorkspaceTab) => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
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
        <p>None</p>
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
  onNewCard,
  onNew,
  onPrepCheck,
  onSearch,
  onRename,
  onModeChange
}: {
  currentId: string;
  currentName: string;
  layout: WorkspaceLayout;
  prepStatus: string;
  summaries: NamedWorkspaceSummary[];
  onActivate: (workspaceId: string) => void;
  onCapture: () => void;
  onDelete: () => void;
  onNewCard: () => void;
  onNew: () => void;
  onPrepCheck: () => void;
  onSearch: () => void;
  onRename: () => void;
  onModeChange: (mode: WorkspaceLayout["mode"]) => void;
}) {
  return (
    <section className="workspace-controls" aria-label="Workspace controls">
      <label>
        Workspace
        <select
          aria-label="Select workspace"
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
        New
      </button>
      <button onClick={onRename} type="button">
        Rename
      </button>
      <button disabled={currentId === "default"} onClick={onDelete} type="button">
        Delete
      </button>
      <button onClick={onSearch} type="button">
        Search
      </button>
      <button onClick={onCapture} type="button">
        Capture
      </button>
      <button onClick={onNewCard} type="button">
        New Card
      </button>
      <button onClick={onPrepCheck} type="button">
        Prep Check: {prepStatus}
      </button>
      <div className="workspace-layout-toggle" role="group" aria-label="Workspace layout">
        <button
          aria-pressed={layout.mode === "single"}
          onClick={() => onModeChange("single")}
          type="button"
        >
          Single
        </button>
        <button
          aria-pressed={layout.mode === "vertical_split"}
          onClick={() => onModeChange("vertical_split")}
          type="button"
        >
          Split
        </button>
      </div>
    </section>
  );
}

function LiveOutputStrip({
  audioMixer,
  displayState,
  dirtyPaths,
  layout,
  mapState,
  prepReport,
  tabs
}: {
  audioMixer: AudioMixerState;
  displayState: DisplayState | null;
  dirtyPaths: Set<string>;
  layout: WorkspaceLayout;
  mapState: MapState | null;
  prepReport: PrepHealthReport | null;
  tabs: WorkspaceTab[];
}) {
  return (
    <section aria-label="Live Output Status" className="live-output-strip">
      <div className="live-output-group live-output-primary">
        <strong>{liveOutputSummary(displayState)}</strong>
        <span>{livePopupSummary(displayState)}</span>
        <span>{liveMapSummary(mapState)}</span>
      </div>
      <div className="live-output-group">
        {liveAudioBusSummaries(audioMixer).map((summary) => (
          <span key={summary}>{summary}</span>
        ))}
      </div>
      <div className="live-output-group">
        {livePaneSummary(layout, tabs, dirtyPaths).map((summary) => (
          <span key={summary}>{summary}</span>
        ))}
        <span>{livePrepHealthLabel(prepReport)}</span>
      </div>
      <a className="live-output-screen-link" href="/screen" rel="noreferrer" target="_blank">
        Open Screen
      </a>
    </section>
  );
}

function WorldSelector({
  state,
  onOpenWorld
}: {
  state: WorldLibraryState | null;
  onOpenWorld: (id: string) => void;
}) {
  const currentId = state?.worlds.find((world) => world.path === state.current?.path)?.id ?? "";

  return (
    <div className="world-selector">
      <select
        aria-label="Select world"
        disabled={!state || state.worlds.length === 0}
        onChange={(event) => {
          if (event.target.value) {
            onOpenWorld(event.target.value);
          }
        }}
        value={currentId}
      >
        <option value="">Select world</option>
        {state?.recent.length ? (
          <optgroup label="Recent">
            {state.recent.map((world) => (
              <option key={`recent-${world.id}`} value={world.id}>
                {world.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        <optgroup label="World Library">
          {state?.worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {world.name}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

function WorldOpenDialog({
  state,
  onClose,
  onOpenWorld,
  onRefresh
}: {
  state: WorldLibraryState | null;
  onClose: () => void;
  onOpenWorld: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label="Open Folder as World" className="file-dialog world-dialog" role="dialog">
        <div className="dialog-header">
          <h2>Open Folder as World</h2>
          <button aria-label="Close Open Folder as World" onClick={onClose} type="button">
            x
          </button>
        </div>
        <p className="dialog-note">{state?.worlds_root ?? "World library is not loaded yet."}</p>
        <button className="panel-action" onClick={onRefresh} type="button">
          Scan Worlds
        </button>
        {state && state.worlds.length === 0 ? <p>No world folders found.</p> : null}
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
  onSubmit
}: {
  state: WorldCreateDialogState;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label="Add New World" className="file-dialog world-dialog" role="dialog">
        <div className="dialog-header">
          <h2>Add New World</h2>
          <button aria-label="Close Add New World" onClick={onClose} type="button">
            x
          </button>
        </div>
        <label>
          World name
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
            {state.status === "submitting" ? "Creating..." : "Create World"}
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
  tab
}: {
  activeTab: OpenTab | null;
  displayState: DisplayState | null;
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
  onMapRevealCreate: (reveal: Omit<MapReveal, "id">) => void;
  onMapSavePreset: (name: string, state: MapState) => void;
  onMapStop: () => void;
  onMapUndoReveal: () => void;
  onMapUseActiveImage: () => void;
  onMapViewportCommit: (viewport: MapViewport) => void;
  onMapViewportPreview: (viewport: MapViewport) => void;
  onTabChange: (tab: ScreenToolTabId) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  tab: ScreenToolTabId;
}) {
  const displayable = canSendToScreen(activeTab?.mediaKind);
  const [popupPreset, setPopupPreset] = useState<DisplayPopupPreset>("plain");
  const [displayTargetPath, setDisplayTargetPath] = useState("");
  const activeTargetLabel = activeTab?.title ?? activeTab?.name ?? "active file";
  const targetPath = displayTargetPath.trim();
  const targetLabel = targetPath || activeTargetLabel;
  const canUseTarget = Boolean(targetPath) || displayable;
  const visiblePopups = displayState?.popups.filter((popup) => popup.visible !== false) ?? [];
  const stagedPopups = displayState?.popups.filter((popup) => popup.visible === false) ?? [];

  function renderPopupList(popups: DisplayState["popups"], empty: string) {
    if (popups.length === 0) {
      return <p>{empty}</p>;
    }
    return (
      <div className="screen-popup-list">
        {popups.map((popup) => (
          <div className="screen-popup-item" key={popup.id}>
            <span>{popup.title ?? popup.name}</span>
            <small>{popup.preset ?? "plain"}</small>
            {popup.visible === false ? (
              <button onClick={() => onPopupVisibleChange(popup.id, true)} type="button">
                Show
              </button>
            ) : (
              <button onClick={() => onPopupVisibleChange(popup.id, false)} type="button">
                Hide
              </button>
            )}
            <button className="button-danger-subtle" onClick={() => onClosePopup(popup.id)} type="button">
              Close
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Screen Control" className="screen-tool">
      <InnerToolTabs
        active={tab}
        ariaLabel="Screen sections"
        onChange={onTabChange}
        tabs={[
          { id: "display", label: "Display" },
          { id: "map", label: "Map" }
        ]}
      />
      {tab === "map" ? (
        <MapTool
          activeTab={activeTab}
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
        />
      ) : (
        <>
      <label>
        Fullscreen path
        <div className="inline-input-action">
          <input
            aria-label="Fullscreen path"
            onChange={(event) => setDisplayTargetPath(event.target.value)}
            placeholder={activeTab?.path ?? "Blank means current page"}
            value={displayTargetPath}
          />
          <button
            aria-label="Choose fullscreen path"
            onClick={() => onPickPath("displayable", "Choose Screen Target", setDisplayTargetPath)}
            type="button"
          >
            Pick
          </button>
        </div>
      </label>
      <div className="screen-actions">
        <button disabled={!canUseTarget} onClick={() => onShowFullscreen(targetPath || undefined)} type="button">
          {targetPath ? "Show Path Fullscreen" : `Show Active Fullscreen: ${targetLabel}`}
        </button>
        <button disabled={!canUseTarget} onClick={() => onOpenPopup(popupPreset, targetPath || undefined)} type="button">
          {targetPath ? `Open Popup: ${targetLabel}` : `Open Active as Popup: ${targetLabel}`}
        </button>
        <button disabled={!canUseTarget} onClick={() => onStagePopup(popupPreset, targetPath || undefined)} type="button">
          {targetPath ? `Stage Popup: ${targetLabel}` : `Stage Active as Popup: ${targetLabel}`}
        </button>
        <button className="button-danger-subtle" disabled={!canUseTarget} onClick={() => onClearAndShowFullscreen(targetPath || undefined)} type="button">
          Clear + Fullscreen: {targetLabel}
        </button>
        <button className="button-danger-subtle" onClick={onBlank} type="button">
          Blank Fullscreen
        </button>
        <button className="button-danger-subtle" onClick={onClearPopups} type="button">
          Close All Popups
        </button>
        <a href="/screen" rel="noreferrer" target="_blank">
          Open Player Screen
        </a>
      </div>
      <label className="compact-inline-control">
        Popup preset
        <select
          onChange={(event) => setPopupPreset(event.target.value as DisplayPopupPreset)}
          value={popupPreset}
        >
          <option value="plain">Plain</option>
          <option value="note">Note</option>
          <option value="letter">Letter</option>
          <option value="portrait">Portrait</option>
          <option value="clue">Clue</option>
        </select>
      </label>
      {!canUseTarget && <p>Select a supported file or choose a target path before sending content to the screen.</p>}
      <section className="screen-state" aria-label="Current Screen">
        <h3>Fullscreen</h3>
        <p>{displayState?.fullscreen?.title ?? displayState?.fullscreen?.name ?? "Blank"}</p>
      </section>
      <section className="screen-state" aria-label="Screen Popups">
        <h3>Popups</h3>
        <h4>Visible</h4>
        {renderPopupList(visiblePopups, "No visible popups.")}
        <h4>Staged</h4>
        {renderPopupList(stagedPopups, "No staged popups.")}
      </section>
        </>
      )}
    </section>
  );
}

function MapTool({
  activeTab,
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
  onViewportPreview
}: {
  activeTab: OpenTab | null;
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
  onRevealCreate: (reveal: Omit<MapReveal, "id">) => void;
  onSavePreset: (name: string, state: MapState) => void;
  onStop: () => void;
  onUndoReveal: () => void;
  onUseActiveImage: () => void;
  onViewportCommit: (viewport: MapViewport) => void;
  onViewportPreview: (viewport: MapViewport) => void;
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
  const [mapPanel, setMapPanel] = useState<"live" | "setup">("live");
  const [pinLabel, setPinLabel] = useState("Pin");
  const [pinVisibility, setPinVisibility] = useState<MapPinVisibility>("player");
  const activeImage = Boolean(activeTab && isImageMapCandidate(activeTab.mediaKind));
  const shownMap = draftMap;

  useEffect(() => {
    setSourcePath(currentMap.image_path ?? "");
  }, [currentMap.image_path]);

  useEffect(() => {
    setDraftMap(currentMap);
  }, [state]);

  function handleFogChange(enabled: boolean) {
    setDraftMap((map) => ({ ...map, fog_enabled: enabled }));
    onFogChange(enabled);
  }

  function handleGridChange(grid: MapGrid) {
    setDraftMap((map) => ({ ...map, grid }));
    onGridChange(grid);
  }

  return (
    <section aria-label="Map Control" className="map-tool">
      <InnerToolTabs
        active={mapPanel}
        ariaLabel="Map controls"
        onChange={setMapPanel}
        tabs={[
          { id: "live", label: "Live" },
          { id: "setup", label: "Setup" }
        ]}
      />
      {mapPanel === "live" ? (
        <>
      <div className="map-tool-actions">
        <button disabled={!activeImage} onClick={onUseActiveImage} type="button">
          Use Active Image
        </button>
        <button disabled={!shownMap.image_path} onClick={onPresent} type="button">
          Present Map
        </button>
        <button disabled={!shownMap.presenting} onClick={onStop} type="button">
          Stop Map
        </button>
      </div>
      <div className="map-tool-row">
        <label className="compact-inline-control">
          Fog enabled
          <input
            aria-label="Fog enabled"
            checked={shownMap.fog_enabled}
            onChange={(event) => handleFogChange(event.target.checked)}
            type="checkbox"
          />
        </label>
        <button disabled={shownMap.reveals.length === 0} onClick={onClearReveals} type="button">
          Clear Reveals
        </button>
        <button disabled={shownMap.reveals.length === 0} onClick={onUndoReveal} type="button">
          Undo Reveal
        </button>
      </div>
      <div className="map-tool-modes" role="group" aria-label="Map interaction mode">
        <button aria-pressed={tool === "pan"} onClick={() => setTool("pan")} type="button">
          Pan Mode
        </button>
        <button aria-pressed={tool === "reveal"} onClick={() => setTool("reveal")} type="button">
          Reveal Mode
        </button>
        <button aria-pressed={tool === "pin"} onClick={() => setTool("pin")} type="button">
          Pin Mode
        </button>
        <button aria-pressed={tool === "measure"} onClick={() => setTool("measure")} type="button">
          Measure Mode
        </button>
      </div>
      {tool === "pin" && (
        <div className="map-pin-controls">
          <label>
            Pin label
            <input
              aria-label="Pin label"
              onChange={(event) => setPinLabel(event.target.value)}
              value={pinLabel}
            />
          </label>
          <label>
            Visibility
            <select
              aria-label="Pin visibility"
              onChange={(event) => setPinVisibility(event.target.value as MapPinVisibility)}
              value={pinVisibility}
            >
              <option value="player">Players</option>
              <option value="dm">DM only</option>
            </select>
          </label>
        </div>
      )}
      <MapCanvas
        className="map-tool-canvas"
        mediaUrlBuilder={buildMapMediaUrl}
        onPinCreate={(point) => onPinCreate(point, pinLabel, pinVisibility)}
        onRevealCreate={onRevealCreate}
        onViewportCommit={onViewportCommit}
        onViewportPreview={onViewportPreview}
        state={shownMap}
        tool={tool}
      />
      {shownMap.pins.length > 0 && (
        <section className="map-pin-list" aria-label="Map Pins">
          {shownMap.pins.map((pin) => (
            <div className="map-pin-row" key={pin.id}>
              <span>{pin.label}</span>
              <small>{pin.visibility === "dm" ? "DM" : "Players"}</small>
              <button onClick={() => onDeletePin(pin.id)} type="button">
                Remove
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
          Use Active Image
        </button>
      </div>
      <label>
        Map image path
        <div className="inline-input-action">
          <input
            aria-label="Map image path"
            onChange={(event) => setSourcePath(event.target.value)}
            placeholder="Media/sample-map.svg"
            value={sourcePath}
          />
          <button
            aria-label="Choose map image path"
            onClick={() => onPickPath("image", "Choose Map Image", setSourcePath)}
            type="button"
          >
            Pick
          </button>
          <button disabled={!sourcePath.trim()} onClick={() => onLoadSource(sourcePath)} type="button">
            Load Map
          </button>
        </div>
      </label>
      <section className="map-presets" aria-label="Map Presets">
        <label>
          Preset name
          <div className="inline-input-action">
            <input
              aria-label="Preset name"
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Current encounter"
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
              Save Preset
            </button>
          </div>
        </label>
        {presets.length > 0 ? (
          <div className="map-preset-list">
            {presets.map((preset) => (
              <div className="map-preset-row" key={preset.id}>
                <button
                  aria-label={`Load ${preset.name}`}
                  onClick={() => onLoadPreset(preset.id)}
                  type="button"
                >
                  {preset.name}
                </button>
                <button
                  aria-label={`Delete ${preset.name}`}
                  className="button-danger-subtle"
                  onClick={() => onDeletePreset(preset.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <div className="map-grid-controls" aria-label="Map Grid">
        <label className="compact-inline-control">
          Grid
          <input
            aria-label="Grid enabled"
            checked={shownMap.grid.enabled}
            onChange={(event) => handleGridChange({ ...shownMap.grid, enabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          Columns
          <input
            aria-label="Grid columns"
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
          Rows
          <input
            aria-label="Grid rows"
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
          Players
          <input
            aria-label="Grid visible to players"
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
    <section aria-label="Global Search" className="search-tool">
      <label htmlFor="world-search">Search World</label>
      <input
        id="world-search"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder="Title, alias, tag, metadata, or body text"
        ref={inputRef}
        type="search"
        value={query}
      />
      <div className="search-results">
        {state.status === "idle" && <p>Type to search the indexed world.</p>}
        {state.status === "loading" && <p>Searching...</p>}
        {state.status === "error" && <p>{state.message}</p>}
        {state.status === "ready" && groups.length === 0 && <p>No results.</p>}
        {groups.map((group) => (
          <section aria-label={`${group.label} Results`} key={group.label}>
            <h3>{group.label}</h3>
            {group.results.map((result) => {
              const resultIndex = results.findIndex((item) => item.path === result.path);
              return (
              <article
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
                    Open
                  </button>
                  <button onClick={() => onOpenOtherPane(result)} type="button">
                    Other
                  </button>
                  <button onClick={() => onPeekResult(result)} type="button">
                    Peek
                  </button>
                  <button onClick={() => onStageResult(result)} type="button">
                    Stage
                  </button>
                  <button onClick={() => onShowResult(result)} type="button">
                    Show
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
  onLoopChange,
  onNextTrack,
  onPlayingChange,
  onPlaylistLoopChange,
  onPlaylistToggle,
  onPreviousTrack,
  onQueryChange,
  onStopAll,
  onStopBus,
  onVolumeChange,
  query,
  state
}: {
  expansionState: PlaylistExpansionState;
  mixer: AudioMixerState;
  onFadeIn: (bus: AudioBus) => void;
  onFadeOut: (bus: AudioBus) => void;
  onLoadTrack: (track: AudioTrack) => void;
  onLoadPlaylist: (bus: AudioBus, playlist: string | null, tracks: AudioTrack[]) => void;
  onLoopChange: (bus: AudioBus, loop: boolean) => void;
  onNextTrack: (bus: AudioBus) => void;
  onPlayingChange: (bus: AudioBus, playing: boolean) => void;
  onPlaylistLoopChange: (bus: AudioBus, loop: boolean) => void;
  onPlaylistToggle: (bus: AudioBus, playlist: string | null) => void;
  onPreviousTrack: (bus: AudioBus) => void;
  onQueryChange: (query: string) => void;
  onStopAll: () => void;
  onStopBus: (bus: AudioBus) => void;
  onVolumeChange: (bus: AudioBus, volume: number) => void;
  query: string;
  state: AudioLoadState;
}) {
  const groupsByBus = state.status === "ready" ? groupAudioTracksByBus(state.tracks) : groupAudioTracksByBus([]);

  return (
    <section aria-label="Audio Control" className="audio-tool">
      <label className="audio-search-label" htmlFor="audio-search">
        Music Search
        <input
          id="audio-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Track, playlist, or bus"
          type="search"
          value={query}
        />
      </label>
      <div className="audio-buses">
        {AUDIO_BUSES.map((bus) => {
          const busState = mixer[bus];
          const groups = groupsByBus[bus];
          return (
            <section className="audio-bus" aria-label={`${busLabel(bus)} Bus`} key={bus}>
              <div className="audio-bus-heading">
                <h3>{busLabel(bus)}</h3>
                <span>{busState.track ? displayAudioTrackTitle(busState.track) : "Empty"}</span>
              </div>
              {busState.track && (
                <div className="audio-queue-line">
                  <span>{audioQueueLabel(busState)}</span>
                  {busState.fadeStatus !== "idle" && (
                    <small>{busState.fadeStatus === "fading_in" ? "Fading in" : "Fading out"}</small>
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
                    {busState.playing ? "Pause" : "Play"}
                  </button>
                  <button disabled={!busState.track} onClick={() => onStopBus(bus)} type="button">
                    Stop
                  </button>
                  <button
                    disabled={!busState.playlistMode}
                    onClick={() => onPreviousTrack(bus)}
                    type="button"
                  >
                    Prev
                  </button>
                  <button
                    disabled={!busState.playlistMode}
                    onClick={() => onNextTrack(bus)}
                    type="button"
                  >
                    Next
                  </button>
                  <button disabled={!busState.track} onClick={() => onFadeIn(bus)} type="button">
                    Fade In
                  </button>
                  <button
                    disabled={!busState.track || !busState.playing}
                    onClick={() => onFadeOut(bus)}
                    type="button"
                  >
                    Fade Out
                  </button>
                  <label>
                    Track
                    <input
                      checked={busState.loop}
                      onChange={(event) => onLoopChange(bus, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                  <label>
                    Queue
                    <input
                      checked={busState.playlistLoop}
                      onChange={(event) => onPlaylistLoopChange(bus, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                </div>
                <label className="audio-volume">
                  <span>Volume</span>
                  <input
                    aria-label={`${busLabel(bus)} volume`}
                    max="1"
                    min="0"
                    onChange={(event) => onVolumeChange(bus, Number(event.target.value))}
                    step="0.01"
                    type="range"
                    value={busState.volume}
                  />
                </label>
              </div>
              <div className="audio-playlists" aria-label={`${busLabel(bus)} Playlists`}>
                {state.status === "idle" && <p>Open the audio library to load tracks.</p>}
                {state.status === "loading" && <p>Scanning audio...</p>}
                {state.status === "error" && <p>{state.message}</p>}
                {state.status === "ready" && groups.length === 0 && <p>No tracks.</p>}
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
                          <span>{group.playlist ?? "Tracks"}</span>
                          <small>{group.tracks.length}</small>
                        </button>
                        <button
                          aria-label={`Queue ${busLabel(bus)} ${group.playlist ?? "Tracks"}`}
                          className="audio-playlist-play"
                          onClick={() => onLoadPlaylist(bus, group.playlist, group.tracks)}
                          type="button"
                        >
                          Queue
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
        Stop All
      </button>
    </section>
  );
}

function FastSlotBar({
  slots,
  onTrigger
}: {
  slots: FastSlot[];
  onTrigger: (slot: FastSlot) => void;
}) {
  const slotByPosition = new Map(slots.map((slot) => [slot.position, slot]));

  return (
    <nav className="fast-slot-bar" aria-label="Fast Access Slots">
      {Array.from({ length: 10 }, (_, index) => index + 1).map((position) => {
        const slot = slotByPosition.get(position);
        return (
          <button
            aria-label={slot ? `Fast slot ${position}: ${slot.label}` : `Fast slot ${position} empty`}
            className={`fast-slot${slot ? " fast-slot-assigned" : ""}`}
            disabled={!slot}
            key={position}
            onClick={() => slot && onTrigger(slot)}
            title={slot ? fastSlotSummary(slot) : `Alt+${position === 10 ? 0 : position}`}
            type="button"
          >
            <span>{position === 10 ? 0 : position}</span>
            <strong>{slot?.icon ?? slot?.label ?? "Empty"}</strong>
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
  onOpenLink,
  onPeekLink
}: {
  state: PeekState;
  completions: CodeEditorCompletion[];
  onClose: () => void;
  onContextLink: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
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
  onSaveSlot
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
          Pick
        </button>
      </div>
    );
  }

  const [activeTabId, setActiveTabId] = useState<ActionsToolTabId>(DEFAULT_ACTIONS_TOOL_TAB);

  return (
    <section className="actions-tool" aria-label="Fast Slot Configuration">
      <InnerToolTabs
        active={activeTabId}
        ariaLabel="Tool sections"
        onChange={setActiveTabId}
        tabs={[
          { id: "slots", label: "Slots" },
          { id: "state", label: "State" },
          { id: "keys", label: "Keys" },
          { id: "midi", label: "MIDI" }
        ]}
      />
      {activeTabId === "state" && (
      <div className="actions-subsection" aria-label="Table State Snapshots" role="region">
        <h3>Table State</h3>
        <div className="compact-form-grid">
          <label>
            Title
            <input
              onChange={(event) => onSnapshotNameChange(event.target.value)}
              placeholder="Tavern default"
              value={snapshotName}
            />
          </label>
          <label>
            Saved
            <select
              aria-label="Saved table state"
              onChange={(event) => onSelectSnapshot(event.target.value)}
              value={snapshotSelectedId}
            >
              <option value="">Choose state</option>
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
            Selected: {selectedSnapshot.name}
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
            Save Current
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
            {confirmLoadId === snapshotSelectedId ? "Confirm Load" : "Load"}
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
            {confirmDeleteId === snapshotSelectedId ? "Confirm Delete" : "Delete"}
          </button>
        </div>
      </div>
      )}
      {activeTabId === "keys" && (
      <div className="actions-subsection" aria-label="Keyboard Bindings" role="region">
        <h3>Keyboard Bindings</h3>
        <div className="compact-form-grid">
          <label>
            Title
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
            Shortcut
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
            Binding type
            <select
              aria-label="Keyboard binding type"
              onChange={(event) => setBindingKind(event.target.value as BindingActionKind)}
              value={bindingKind}
            >
              <option value="open_file">Open file</option>
              <option value="screen_fullscreen">Screen fullscreen</option>
              <option value="screen_popup">Screen popup</option>
              <option value="audio_track">Audio track</option>
              <option value="script_run">Run script</option>
              <option value="map_preset">Map preset</option>
              <option value="table_snapshot_restore">Restore table state</option>
            </select>
          </label>
          {bindingKind === "map_preset" ? (
            <label>
              Map preset
              <select
                aria-label="Keyboard binding map preset"
                onChange={(event) => setBindingMapPresetId(event.target.value)}
                value={bindingMapPresetId}
              >
                <option value="">Choose preset</option>
                {mapPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          ) : bindingKind === "table_snapshot_restore" ? (
            <label>
              Table state
              <select
                aria-label="Keyboard binding table state"
                onChange={(event) => setBindingSnapshotId(event.target.value)}
                value={bindingSnapshotId}
              >
                <option value="">Choose state</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Target
              {renderPathInput(
                bindingPath,
                setBindingPath,
                bindingKind,
                "Keyboard binding target",
                bindingKind === "screen_fullscreen" || bindingKind === "screen_popup"
                  ? activeTab?.path ?? "Blank means current page"
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
              Preset
              <select
                aria-label="Keyboard binding popup preset"
                onChange={(event) => setBindingPopupPreset(event.target.value as DisplayPopupPreset)}
                value={bindingPopupPreset}
              >
                <option value="plain">Plain</option>
                <option value="note">Note</option>
                <option value="letter">Letter</option>
                <option value="portrait">Portrait</option>
                <option value="clue">Clue</option>
              </select>
            </label>
          )}
          {bindingKind === "map_preset" && (
            <label className="compact-inline-control">
              Present
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
            {bindingId ? "Update Binding" : "Save Binding"}
          </button>
          <button onClick={resetBindingForm} type="button">
            New
          </button>
        </div>
        {actionBindings.length === 0 ? (
          <p className="tool-note">No keyboard bindings yet.</p>
        ) : (
          <div className="binding-list" aria-label="Saved keyboard bindings">
            {actionBindings.map((binding) => (
              <div className="binding-row" key={binding.id}>
                <button onClick={() => onRunBinding(binding)} type="button">
                  {binding.label}
                </button>
                <kbd>{binding.shortcut}</kbd>
                <button onClick={() => editBinding(binding)} type="button">
                  Edit
                </button>
                <button onClick={() => onDeleteBinding(binding.id)} type="button">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      {activeTabId === "midi" && (
      <div className="actions-subsection" aria-label="MIDI Bindings" role="region">
        <h3>MIDI Bindings</h3>
        <div className="inline-actions">
          <button
            disabled={midiStatus.status === "unsupported" || midiStatus.status === "connecting"}
            onClick={onConnectMidi}
            type="button"
          >
            {midiStatus.status === "connecting" ? "Connecting..." : "Connect MIDI"}
          </button>
          <button
            disabled={midiStatus.status === "unsupported" || midiStatus.status === "connecting"}
            onClick={onStartMidiLearn}
            type="button"
          >
            {midiLearning ? "Listening..." : "Learn Control"}
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
            Clear Learn
          </button>
        </div>
        <div className="compact-form-grid">
          <label>
            Title
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
            Control
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
            Input
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
              <option value="">Any connected input</option>
              {midiInputs.map((input) => (
                <option key={input.id ?? input.name ?? "midi-input"} value={input.id ?? ""}>
                  {input.name ?? input.id ?? "MIDI input"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Binding type
            <select
              aria-label="MIDI binding type"
              onChange={(event) => setMidiBindingKind(event.target.value as BindingActionKind)}
              value={midiBindingKind}
            >
              <option value="open_file">Open file</option>
              <option value="screen_fullscreen">Screen fullscreen</option>
              <option value="screen_popup">Screen popup</option>
              <option value="audio_track">Audio track</option>
              <option value="script_run">Run script</option>
              <option value="map_preset">Map preset</option>
              <option value="table_snapshot_restore">Restore table state</option>
            </select>
          </label>
          {midiBindingKind === "map_preset" ? (
            <label>
              Map preset
              <select
                aria-label="MIDI binding map preset"
                onChange={(event) => setMidiBindingMapPresetId(event.target.value)}
                value={midiBindingMapPresetId}
              >
                <option value="">Choose preset</option>
                {mapPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          ) : midiBindingKind === "table_snapshot_restore" ? (
            <label>
              Table state
              <select
                aria-label="MIDI binding table state"
                onChange={(event) => setMidiBindingSnapshotId(event.target.value)}
                value={midiBindingSnapshotId}
              >
                <option value="">Choose state</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Target
              {renderPathInput(
                midiBindingPath,
                setMidiBindingPath,
                midiBindingKind,
                "MIDI binding target",
                midiBindingKind === "screen_fullscreen" || midiBindingKind === "screen_popup"
                  ? activeTab?.path ?? "Blank means current page"
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
              Preset
              <select
                aria-label="MIDI binding popup preset"
                onChange={(event) =>
                  setMidiBindingPopupPreset(event.target.value as DisplayPopupPreset)
                }
                value={midiBindingPopupPreset}
              >
                <option value="plain">Plain</option>
                <option value="note">Note</option>
                <option value="letter">Letter</option>
                <option value="portrait">Portrait</option>
                <option value="clue">Clue</option>
              </select>
            </label>
          )}
          {midiBindingKind === "map_preset" && (
            <label className="compact-inline-control">
              Present
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
            {midiBindingId ? "Update MIDI Binding" : "Save MIDI Binding"}
          </button>
          <button onClick={resetMidiBindingForm} type="button">
            New
          </button>
        </div>
        {midiBindings.length === 0 ? (
          <p className="tool-note">No MIDI bindings yet.</p>
        ) : (
          <div className="binding-list" aria-label="Saved MIDI bindings">
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
                  Relearn
                </button>
                <button onClick={() => onDeleteMidiBinding(binding.id)} type="button">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      {activeTabId === "slots" && (
      <div className="actions-subsection" aria-label="Fast Slots" role="region">
        <h3>Fast Slots</h3>
      <div className="compact-form-grid">
        <label>
          Slot
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
          Action
          <select
            onChange={(event) => setKind(event.target.value as FastSlotAction["kind"])}
            value={kind}
          >
            <option value="open_file">Open file</option>
            <option value="screen_fullscreen">Screen fullscreen</option>
            <option value="screen_popup">Screen popup</option>
            <option value="audio_track">Audio track</option>
            <option value="script_run">Run script</option>
            <option value="map_preset">Map preset</option>
          </select>
        </label>
        <label>
          Label
          <input
            onChange={(event) => setLabel(event.target.value)}
            placeholder={existing?.label ?? activeTab?.title ?? activeTab?.name ?? "Slot"}
            value={label}
          />
        </label>
        {kind === "map_preset" ? (
          <label>
            Map preset
            <select
              aria-label="Map preset"
              onChange={(event) => setMapPresetId(event.target.value)}
              value={mapPresetId}
            >
              <option value="">Choose preset</option>
              {mapPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Path
            {renderPathInput(
              path,
              setPath,
              kind,
              "Fast slot path",
              kind === "screen_fullscreen" || kind === "screen_popup"
                ? activeTab?.path ?? "Blank means current page"
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
            Preset
            <select
              aria-label="Popup preset"
              onChange={(event) => setPopupPreset(event.target.value as DisplayPopupPreset)}
              value={popupPreset}
            >
              <option value="plain">Plain</option>
              <option value="note">Note</option>
              <option value="letter">Letter</option>
              <option value="portrait">Portrait</option>
              <option value="clue">Clue</option>
            </select>
          </label>
        )}
        {kind === "map_preset" && (
          <label className="compact-inline-control">
            Present
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
        <p className="tool-note">Save a map preset in the Map tool first.</p>
      )}
      {existing && <p className="tool-note">Current: {fastSlotSummary(existing)}</p>}
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
          Save Slot
        </button>
        <button disabled={!existing} onClick={() => onClearSlot(position)} type="button">
          Clear
        </button>
      </div>
      </div>
      )}
    </section>
  );
}

function ScriptsTool({
  onCancel,
  onRun,
  runState,
  state
}: {
  onCancel: (runId: string) => void;
  onRun: (path: string) => void;
  runState: ScriptRunState;
  state: ScriptLoadState;
}) {
  const runningRunId = runState.status === "running" ? runState.runId : null;
  return (
    <section className="scenarios-tool" aria-label="DMS Scripts">
      {state.status === "idle" && <p>Open scripts to scan saved DMS files.</p>}
      {state.status === "loading" && <p>Scanning scripts...</p>}
      {state.status === "error" && <p className="inline-error">{state.message}</p>}
      <details className="script-reference">
        <summary>Command Reference</summary>
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
      {state.status === "ready" && state.scripts.length === 0 && <p>No DMS scripts found.</p>}
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
                ? "Running..."
                : "Run"}
            </button>
          </section>
        ))}
      {runState.status === "running" && (
        <section className="scenario-output" aria-label="Latest Script Run">
          <strong>Running</strong>
          <small>{runState.path}</small>
          {runningRunId && (
            <button onClick={() => onCancel(runningRunId)} type="button">
              Cancel
            </button>
          )}
        </section>
      )}
      {runState.status === "ready" && (
        <section className="scenario-output" aria-label="Latest Script Run">
          <strong>{runState.run.status}</strong>
          {runState.run.stderr && <pre>{runState.run.stderr}</pre>}
          {runState.run.stdout && <pre>{runState.run.stdout}</pre>}
          {runState.run.outputs.length > 0 && (
            <small>{runState.run.outputs.length} output tab opened</small>
          )}
          {runState.run.status === "cancelled" && <small>Cancelled</small>}
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
  today
}: {
  draft: CaptureDraft;
  onCategoryChange: (category: CaptureCategory) => void;
  onOpenLog: () => void;
  onPersistDraft: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  status: CaptureStatus;
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
    <section aria-label="Quick Capture" className="capture-tool">
      <div className="capture-category-chips" role="group" aria-label="Capture category">
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
        Capture text <small>Ctrl+Enter to save</small>
        <textarea
          autoFocus
          disabled={status.status === "saving"}
          onBlur={onPersistDraft}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick note from the table..."
          rows={4}
          value={draft.text}
        />
      </label>
      <div className="capture-actions">
        <button disabled={status.status === "saving"} onClick={onSave} type="button">
          {status.status === "saving" ? "Saving..." : "Save Capture"}
        </button>
        <button disabled={!today?.exists} onClick={onOpenLog} type="button">
          Open Log
        </button>
      </div>
      <p className={`capture-status capture-status-${status.status}`}>
        {status.message ?? (today?.exists ? today.path : "No capture log yet.")}
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
  state
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
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="Search"
        className="file-dialog tool-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>Search</h2>
          <button aria-label="Close Search" onClick={onClose} type="button">
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
  today
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
        aria-label="Capture"
        className="file-dialog tool-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>Capture</h2>
          <button aria-label="Close Capture" onClick={handleClose} type="button">
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

function prepHealthKindLabel(issue: PrepHealthIssue): string {
  if (issue.kind === "missing_embed") {
    return "Missing embed";
  }
  if (issue.kind === "missing_dms_reference") {
    return "DMS reference";
  }
  if (issue.kind === "dms_parse_error") {
    return "DMS parse";
  }
  return "Broken link";
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
  status
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
        aria-label="Prep Check"
        className="file-dialog prep-health-dialog tool-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>Prep Check</h2>
          <button aria-label="Close Prep Check" onClick={onClose} type="button">
            x
          </button>
        </div>
        <div className="prep-health-summary">
          <div>
            <strong>{report ? prepHealthStatusLabel(report.status) : "Not checked"}</strong>
            <span>
              {report
                ? `${report.errors} errors / ${report.warnings} warnings`
                : "Run an on-demand broken reference audit."}
            </span>
          </div>
          <button disabled={status.status === "loading"} onClick={onRun} type="button">
            {status.status === "loading" ? "Checking..." : "Run Check"}
          </button>
        </div>
        {status.message && (
          <p className={status.status === "error" ? "dialog-error" : "dialog-note"}>
            {status.message}
          </p>
        )}
        {report && (
          <>
            <div className="prep-health-filters" role="tablist" aria-label="Prep Check filters">
              {PREP_HEALTH_FILTERS.map((item) => (
                <button
                  aria-selected={filter === item.id}
                  key={item.id}
                  onClick={() => onFilterChange(item.id)}
                  role="tab"
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            {filteredIssues.length === 0 ? (
              <p className="dialog-note">No issues in this filter.</p>
            ) : (
              <div className="prep-health-issues" aria-label="Prep Health Issues">
                {filteredIssues.map((issue) => (
                  <article className="prep-health-issue" key={issue.id}>
                    <div>
                      <strong>{prepHealthKindLabel(issue)}</strong>
                      <span>{issue.source_path}</span>
                    </div>
                    <p>{issue.message}</p>
                    <small>
                      Target: {issue.raw_target || "(script syntax)"}
                      {issue.command ? ` / ${issue.command}` : ""}
                    </small>
                    <div className="prep-health-actions">
                      <button onClick={() => onOpenSource(issue)} type="button">
                        Open Source
                      </button>
                      <button
                        disabled={!issue.raw_target}
                        onClick={() => onCopyTarget(issue.raw_target)}
                        type="button"
                      >
                        Copy Target
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
  status
}: {
  onAdd: () => void;
  onAdjust: (rowId: string, amount: number) => void;
  onClear: () => void;
  onPersist: () => void;
  onRemove: (rowId: string) => void;
  onUpdate: (rowId: string, updates: Partial<Omit<HpTrackerRow, "id">>) => void;
  rows: HpTrackerRow[];
  status: HpToolStatus;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const disabled = status.status === "loading" || status.status === "saving";

  return (
    <section aria-label="HP Scratchpad" className="hp-tool">
      <div className="hp-tool-actions">
        <button disabled={disabled} onClick={onAdd} type="button">
          Add
        </button>
        <button disabled={disabled || rows.length === 0} onClick={onPersist} type="button">
          {status.status === "saving" ? "Saving..." : "Save"}
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
          {confirmClear ? "Confirm Clear" : "Clear"}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="tool-note">No combatants yet.</p>
      ) : (
        <div className="hp-rows">
          {rows.map((row) => (
            <article className="hp-row" key={row.id}>
              <div className="hp-row-main">
                <input
                  aria-label={`Name for ${row.name || "HP row"}`}
                  disabled={disabled}
                  onChange={(event) => onUpdate(row.id, { name: event.target.value })}
                  placeholder="Name"
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
                  placeholder="max"
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
                placeholder="Status"
                value={row.status}
              />
              <details className="hp-notes">
                <summary>Notes</summary>
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
            ? "Loading..."
            : status.status === "saving"
              ? "Saving..."
              : "Workspace HP scratchpad")}
      </p>
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
  title: string;
  tool: ToolId;
}) {
  return (
    <section className={`tool-section${open ? " tool-section-open" : ""}`} aria-label={`${title} Tool`}>
      <div className="tool-section-header-row">
        <button
          aria-expanded={open}
          className="tool-section-header"
          onClick={() => onToggle(tool)}
          type="button"
        >
          <span>{title}</span>
          <small>{summary}</small>
          {locked && <em>Editing</em>}
        </button>
        <button
          aria-label={`${pinned ? "Unpin" : "Pin"} ${title}`}
          aria-pressed={pinned}
          className="tool-pin-button"
          onClick={() => onTogglePin(tool)}
          type="button"
        >
          {pinned ? "Pinned" : "Pin"}
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
  editState: MetadataEditState
): string {
  if (editState.mode === "edit") {
    return "Editing metadata";
  }
  if (!tab) {
    return "No file selected";
  }
  if (pageState.status === "ready") {
    return pageState.page.page_type ?? pageState.page.title;
  }
  if (pageState.status === "error") {
    return "Could not load";
  }
  return "Loading";
}

function screenSummary(displayState: DisplayState | null, mapState: MapState | null): string {
  if (mapState?.presenting) {
    return `Map: ${mapState.title ?? mapState.image_path ?? "presenting"}`;
  }
  const popupCount = displayState?.popups.length ?? 0;
  const fullscreen = displayState?.fullscreen?.title ?? displayState?.fullscreen?.name ?? "Blank";
  return popupCount > 0 ? `${fullscreen}, ${popupCount} popup${popupCount === 1 ? "" : "s"}` : fullscreen;
}

function actionsSummary(slots: FastSlot[], bindings: ActionBinding[], midiBindings: MidiBinding[]): string {
  const parts = [
    `${slots.length} slot${slots.length === 1 ? "" : "s"}`,
    `${bindings.length} key${bindings.length === 1 ? "" : "s"}`,
    `${midiBindings.length} MIDI`
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

function scriptsSummary(state: ScriptLoadState, runState: ScriptRunState): string {
  if (runState.status === "running") {
    return "Running";
  }
  if (runState.status === "ready") {
    return runState.run.status;
  }
  if (state.status === "ready") {
    return `${state.scripts.length} found`;
  }
  if (state.status === "loading") {
    return "Scanning";
  }
  if (state.status === "error" || runState.status === "error") {
    return "Error";
  }
  return "Ready";
}

function hpSummary(rows: HpTrackerRow[], status: HpToolStatus): string {
  if (status.status === "loading") {
    return "Loading";
  }
  if (status.status === "saving") {
    return "Saving";
  }
  if (status.status === "error") {
    return "Error";
  }
  const summary = summarizeHpTrackerRows(rows);
  if (summary.count === 0) {
    return "No rows";
  }
  return summary.down > 0 ? `${summary.count} rows, ${summary.down} down` : `${summary.count} rows`;
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
  actionBindings,
  actionBindingMessage,
  audioExpansionState,
  audioMixer,
  audioQuery,
  audioState,
  contentDirty,
  displayState,
  fileReady,
  fastSlotError,
  fastSlots,
  linksState,
  hpRows,
  hpStatus,
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
}: {
  activeTab: OpenTab | null;
  actionBindings: ActionBinding[];
  actionBindingMessage: string | null;
  audioExpansionState: PlaylistExpansionState;
  audioMixer: AudioMixerState;
  audioQuery: string;
  audioState: AudioLoadState;
  contentDirty: boolean;
  displayState: DisplayState | null;
  fastSlotError: string | null;
  fastSlots: FastSlot[];
  fileReady: boolean;
  linksState: LinksLoadState;
  hpRows: HpTrackerRow[];
  hpStatus: HpToolStatus;
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
  onMapRevealCreate: (reveal: Omit<MapReveal, "id">) => void;
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
}) {
  const metadataLocked = metadataEditState.mode === "edit";

  return (
    <aside className="tools-panel" aria-label="DM Tools">
      <div className="tools-heading">
        <h2>Tools</h2>
      </div>
      <ToolSection
        locked={metadataLocked}
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "metadata")}
        pinned={isToolPinned(openTools, "metadata")}
        summary={metadataSummary(activeTab, pageState, metadataEditState)}
        title="Metadata"
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
          tab={activeTab}
        />
      </ToolSection>
      <ToolSection
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "audio")}
        pinned={isToolPinned(openTools, "audio")}
        summary={audioSummary(audioMixer)}
        title="Audio"
        tool="audio"
      >
        <AudioTool
          expansionState={audioExpansionState}
          mixer={audioMixer}
          onFadeIn={onAudioFadeIn}
          onFadeOut={onAudioFadeOut}
          onLoadTrack={onAudioLoadTrack}
          onLoadPlaylist={onAudioLoadPlaylist}
          onLoopChange={onAudioLoopChange}
          onNextTrack={onAudioNextTrack}
          onPlaylistLoopChange={onAudioPlaylistLoopChange}
          onPlaylistToggle={onAudioPlaylistToggle}
          onPlayingChange={onAudioPlayingChange}
          onPreviousTrack={onAudioPreviousTrack}
          onQueryChange={onAudioQueryChange}
          onStopAll={onAudioStopAll}
          onStopBus={onAudioStopBus}
          onVolumeChange={onAudioVolumeChange}
          query={audioQuery}
          state={audioState}
        />
      </ToolSection>
      <ToolSection
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "hp")}
        pinned={isToolPinned(openTools, "hp")}
        summary={hpSummary(hpRows, hpStatus)}
        title="HP"
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
        />
      </ToolSection>
      <ToolSection
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "actions")}
        pinned={isToolPinned(openTools, "actions")}
        summary={actionsSummary(fastSlots, actionBindings, midiBindings)}
        title="Actions"
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
        />
      </ToolSection>
      <ToolSection
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "scripts")}
        pinned={isToolPinned(openTools, "scripts")}
        summary={scriptsSummary(scriptState, scriptRunState)}
        title="Scripts"
        tool="scripts"
      >
        <ScriptsTool
          onCancel={onCancelScript}
          onRun={onScriptRun}
          runState={scriptRunState}
          state={scriptState}
        />
      </ToolSection>
      <ToolSection
        onTogglePin={onToolPin}
        onToggle={onToolToggle}
        open={isToolOpen(openTools, "screen")}
        pinned={isToolPinned(openTools, "screen")}
        summary={screenSummary(displayState, mapState)}
        title="Screen"
        tool="screen"
      >
        <ScreenTool
          activeTab={activeTab}
          displayState={displayState}
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
          {state.kind === "create" && (
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
              <label>
                Card title
                <input
                  onChange={(event) => onCardTitleChange(event.target.value)}
                  value={state.cardTitle}
                />
              </label>
            </>
          )}
          {state.kind !== "trash" ? (
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
          ) : (
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

function DmsFormDialog({
  fileOptions,
  onChange,
  onClose,
  onSubmit,
  state
}: {
  fileOptions: string[];
  onChange: (name: string, value: string | number | boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
  state: DmsFormDialogState;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label="DMS Script Form" className="file-dialog" role="dialog">
        <div className="dialog-header">
          <h2>Script Input</h2>
          <button aria-label="Close DMS Script Form" onClick={onClose} type="button">
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
              Cancel
            </button>
            <button type="submit">Continue</button>
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
  state
}: {
  onChange: (path: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  state: DmsOutputSaveDialogState;
}) {
  if (!state.open) {
    return null;
  }
  const submitting = state.status === "submitting";

  return (
    <div className="dialog-overlay" role="presentation">
      <section aria-label="Save DMS Output" className="file-dialog" role="dialog">
        <div className="dialog-header">
          <h2>Save Output</h2>
          <button aria-label="Close Save DMS Output" onClick={onClose} type="button">
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
            World path
            <input
              onChange={(event) => onChange(event.target.value)}
              type="text"
              value={state.path}
            />
          </label>
          {state.error && <p className="dialog-error">{state.error}</p>}
          <div className="dialog-actions">
            <button disabled={submitting} onClick={onClose} type="button">
              Cancel
            </button>
            <button disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function App() {
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
  const [toolPanelState, setToolPanelState] = useState<ToolPanelState>(() =>
    createToolPanelState()
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
  const [audioPlaylistExpansion, setAudioPlaylistExpansion] =
    useState<PlaylistExpansionState>({});
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
  const cancelledDmsRuns = useRef<Set<string>>(new Set());
  const [linkContextMenu, setLinkContextMenu] = useState<LinkContextMenuState>({ open: false });
  const [peekState, setPeekState] = useState<PeekState>({ open: false });
  const [dmsFormDialog, setDmsFormDialog] = useState<DmsFormDialogState>({ open: false });
  const [dmsOutputSaveDialog, setDmsOutputSaveDialog] = useState<DmsOutputSaveDialogState>({
    open: false
  });
  const [fileDialog, setFileDialog] = useState<FileDialogState>({ kind: "closed" });
  const [folderMenuPath, setFolderMenuPath] = useState<string | null>(null);
  const [worldTreeContextMenu, setWorldTreeContextMenu] =
    useState<WorldTreeContextMenuState>({ open: false });
  const [worldTreeDragPath, setWorldTreeDragPath] = useState<string | null>(null);
  const [worldTreeDropPath, setWorldTreeDropPath] = useState<string | null>(null);
  const [worldTreeStatus, setWorldTreeStatus] = useState<string | null>(null);
  const [trashDialog, setTrashDialog] = useState<TrashDialogState>({ open: false });
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);
  const [mapState, setMapState] = useState<MapState | null>(null);
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
        setMapState(nextMapState);
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
        setSearchDialogOpen(true);
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
    if (!screenToolOpen && !actionsToolOpen) {
      return;
    }
    fetchMapState()
      .then(setMapState)
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
  const workspaceTabs = tabState.tabs.map(openTabToWorkspaceTab);
  const dirtyPaths = new Set(
    Object.entries(editorDrafts)
      .filter(([, draft]) => isDraftDirty(draft))
      .map(([path]) => path)
  );
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
  const visiblePanePathKey = visiblePaneTabs.map((tab) => tab.path).join("\u0000");

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
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setLinkContextMenu({ open: false });
      setWorldTreeContextMenu({ open: false });
      setPeekState({ open: false });
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

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

  function handleCloseTab(path: string) {
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
      setExpandedPaths((paths) => {
        const nextPaths = new Set(paths);
        const parent = duplicated.path.split("/").slice(0, -1).join("/");
        nextPaths.add(parent);
        return nextPaths;
      });
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
      setExpandedPaths((paths) => new Set([...paths, targetEntry.path]));
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
      setMapState(restored.map);
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
    } else if (nextMapState.presenting) {
      nextMapState = await stopMap();
    }
    setMapState(nextMapState);
  }

  async function applyDmsEffects(run: DmsRunState) {
    for (const effect of run.effects) {
      if (effect.kind === "screen_fullscreen") {
        setDisplayState(await setDisplayFullscreen(effect.path));
        setScreenToolTab("display");
      } else if (effect.kind === "screen_popup") {
        setDisplayState(await openDisplayPopup(effect.path));
        setScreenToolTab("display");
      } else if (effect.kind === "map_load") {
        let nextMapState = await setMapSource(effect.path);
        if (effect.present) {
          nextMapState = await presentMap();
        }
        setMapState(nextMapState);
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_preset") {
        await loadMapPresetForAutomation(effect.preset_id, effect.present);
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_present") {
        setMapState(await presentMap());
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_stop") {
        setMapState(await stopMap());
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "map_fog") {
        setMapState(await setMapFog(effect.enabled));
        setScreenToolTab("map");
        setToolPanelState((state) => openToolSectionByUser(state, "screen"));
      } else if (effect.kind === "audio_play") {
        const tracks =
          audioState.status === "ready"
            ? audioState.tracks
            : await fetchAudioLibrary();
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

  async function handleRunDmsScript(path: string) {
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
      const tracks =
        audioState.status === "ready"
          ? audioState.tracks
          : await fetchAudioLibrary();
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

  function handleToggleFavorite() {
    if (!activeTab) {
      return;
    }

    const nextFavorites = toggleFavorite(favorites, openTabToWorkspaceTab(activeTab));
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
      setTabState((state) => ({
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.path === activeTab.path ? { ...tab, title: response.page.title } : tab
        )
      }));
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

    const nextState = createFileDialogState(kind, folderPath);
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

  function handleOpenRenameDialog() {
    if (!activeTab || activeFileState.status !== "ready" || !isEditableFile(activeFileState.file)) {
      return;
    }

    setFileDialog({
      kind: "rename",
      path: activeTab.path,
      newPath: activeTab.path,
      entryKind: "file",
      status: "idle",
      error: null
    });
  }

  function handleOpenTrashDialog() {
    if (!activeTab || activeFileState.status !== "ready" || !isEditableFile(activeFileState.file)) {
      return;
    }

    setFileDialog({
      kind: "trash",
      path: activeTab.path,
      entryKind: "file",
      status: "idle",
      error: null
    });
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
        return {
          ...state,
          path,
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
      const folderPath = state.path.split("/").slice(0, -1).join("/");
      const nextState = createFileDialogState(fileType, folderPath);
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
      const folderPath = state.path.split("/").slice(0, -1).join("/");
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
    setExpandedPaths(new Set(collectDirectoryPaths(nextWorldTree)));
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
      setExpandedPaths((paths) => new Set([...paths, folder.path]));
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

  function handleRevertDraft() {
    if (!activeTab || !activeDraft) {
      return;
    }

    setEditorDrafts((drafts) => ({
      ...drafts,
      [activeTab.path]: revertDraft(activeDraft)
    }));
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
    setMapState(nextMapState);
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
    } catch {
    }
  }

  async function handleBlankDisplay() {
    try {
      const nextDisplayState = await blankDisplay();
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
      setMapState(await setMapSource(trimmedPath));
      setLocalMapViewport(null);
      mapViewportSyncRef.current.lastSyncedAt = 0;
    } catch {
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
      setMapState(await setMapViewport(viewport));
    } catch {
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
      setMapState(await setMapFog(enabled));
    } catch {
    }
  }

  async function handleMapGridChange(grid: MapGrid) {
    try {
      setMapState(await setMapGrid(grid));
    } catch {
    }
  }

  async function handleMapRevealCreate(reveal: Omit<MapReveal, "id">) {
    try {
      setMapState(await addMapReveal(reveal));
    } catch {
    }
  }

  async function handleMapUndoReveal() {
    const latestReveal = mapState?.reveals.at(-1);
    if (!latestReveal) {
      return;
    }
    try {
      setMapState(await deleteMapReveal(latestReveal.id));
    } catch {
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
      setMapState(await addMapPin(createPinPayload(point, trimmedLabel, visibility)));
    } catch {
    }
  }

  async function handleMapDeletePin(pinId: string) {
    try {
      setMapState(await deleteMapPin(pinId));
    } catch {
    }
  }

  async function handleMapClearReveals() {
    try {
      setMapState(await clearMapReveals());
    } catch {
    }
  }

  async function handleMapPresent() {
    try {
      setMapState(await presentMap());
    } catch {
    }
  }

  async function handleMapStop() {
    try {
      setMapState(await stopMap());
    } catch {
    }
  }

  async function handleMapSavePreset(name: string, state: MapState) {
    try {
      const preset = await saveMapPreset(name, state);
      setMapPresets((currentPresets) => [
        preset,
        ...currentPresets.filter((currentPreset) => currentPreset.id !== preset.id)
      ]);
    } catch {
    }
  }

  async function handleMapLoadPreset(presetId: string) {
    try {
      setMapState(await loadMapPreset(presetId));
      setLocalMapViewport(null);
      mapViewportSyncRef.current.lastSyncedAt = 0;
    } catch {
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
      .then(setMapState)
      .catch(() => {});
    return createMapEventClient({
      onEvent: setMapState,
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

  function renderWorkspacePane(paneId: WorkspacePaneId, tab: OpenTab | null) {
    const paneActive = normalizedWorkspaceLayout.activePaneId === paneId;
    const paneFileState = tab ? fileStates[tab.path] ?? idleFileState : idleFileState;
    const paneLinksState = tab ? linksStates[tab.path] ?? idleLinksState : idleLinksState;
    const paneDraft = tab ? editorDrafts[tab.path] ?? null : null;
    const viewerDraft = paneActive || !paneDraft ? paneDraft : { ...paneDraft, mode: "preview" as const };
    const paneFavorite = tab ? isFavorite(favorites, tab.path) : false;

    return (
      <section
        aria-label={`${paneId === "main" ? "Main" : "Secondary"} viewer pane`}
        className={`viewer-surface workspace-viewer-pane ${
          paneActive ? "workspace-viewer-pane-active" : ""
        }`}
        onClick={() => handleActivatePane(paneId, tab?.path ?? null)}
      >
        <div className="workspace-pane-header">
          <strong>{paneId === "main" ? "Main" : "Secondary"}</strong>
          <span>{tab ? tab.title ?? tab.name : "Empty"}</span>
          {paneActive && <em>Target</em>}
        </div>
        {tab ? (
          <>
            {paneActive && (
              <EditorToolbar
                draft={paneDraft}
                favorite={paneFavorite}
                file={paneFileState.status === "ready" ? paneFileState.file : null}
                onCancelScript={(runId) => void handleCancelDmsScript(runId)}
                onModeChange={handleDraftModeChange}
                onReload={handleReloadActiveFile}
                onRename={handleOpenRenameDialog}
                onRevert={handleRevertDraft}
                onRunScript={() => void handleRunDmsScript(tab.path)}
                onSave={handleSaveDraft}
                onSaveTemporary={handleOpenDmsOutputSaveDialog}
                onToggleFavorite={handleToggleFavorite}
                onTrash={handleOpenTrashDialog}
                scriptRunState={scriptRunState}
              />
            )}
            <FileViewer
              completions={buildEditorCompletions(pages, worldTree, audioAutocompleteTracks)}
              draft={viewerDraft}
              links={paneLinksState.status === "ready" ? paneLinksState.outgoing : []}
              loadState={paneFileState}
              onContextLink={handleLinkContext}
              onCsvDraftChange={handleCsvDraftChange}
              onDraftContentChange={handleDraftContentChange}
              onOpenLink={openResolvedLink}
              onPickWorldPath={handleOpenWorldPathPicker}
              onPeekLink={openLinkPeek}
              tab={tab}
            />
          </>
        ) : (
          <div className="empty-surface">
            <h2>Select a File</h2>
            <p>Open Markdown, CSV, or media from the world tree.</p>
          </div>
        )}
      </section>
    );
  }

  if (authState.status === "checking") {
    return <UnlockScreen error={null} loading onUnlock={() => {}} />;
  }

  if (authState.status === "locked" || authState.status === "unlocking") {
    return (
      <UnlockScreen
        error={authState.error}
        loading={authState.status === "unlocking"}
        onUnlock={(token) => void handleAuthUnlock(token)}
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
          />
          <div className="panel-actions-row">
            <button className="panel-action" onClick={() => setWorldOpenDialog(true)} type="button">
              Open Folder
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
              type="button"
            >
              New World
            </button>
            <button className="panel-action" onClick={() => void refreshWorldLibrary()} type="button">
              Scan
            </button>
            <button className="panel-action" onClick={() => void loadTrashDialog()} type="button">
              Trash
            </button>
          </div>
        </div>
        <nav className="world-tree" aria-label="World files">
          <div className="world-tree-controls">
            <input
              aria-label="Filter world tree"
              onChange={(event) => setTreeFilter(event.target.value)}
              placeholder="Filter world"
              type="search"
              value={treeFilter}
            />
            <button onClick={() => setExpandedPaths(new Set([""]))} type="button">
              Collapse All
            </button>
          </div>
          {worldTreeStatus && <p className="world-tree-status">{worldTreeStatus}</p>}
          {loadState === "error" ? (
            <p className="load-error">Could not load world.</p>
          ) : worldTree ? (
            <ul>
              <WorldTree
                dragPath={worldTreeDragPath}
                dropPath={worldTreeDropPath}
                entry={worldTree}
                expandedPaths={expandedPaths}
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
              />
            </ul>
          ) : (
            <p>Loading world...</p>
          )}
          <WorldTreeContextMenu
            onClose={() => setWorldTreeContextMenu({ open: false })}
            onDuplicate={(entry) => void handleWorldTreeDuplicate(entry)}
            onOpen={handleOpenEntry}
            onOpenNewTab={handleOpenEntry}
            onRename={handleWorldTreeRename}
            onTrash={handleWorldTreeTrash}
            state={worldTreeContextMenu}
          />
        </nav>
        <div className="side-bottom">
          <QuickFileList items={favorites} onOpen={handleOpenFavorite} title="Favorites" />
          <QuickFileList
            collapsible
            defaultOpen={false}
            items={recentFiles}
            onOpen={handleOpenRecent}
            title="Recent"
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
            onNewCard={handleOpenNewCardDialog}
            onSearch={() => setSearchDialogOpen(true)}
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
            prepStatus={livePrepHealthLabel(prepHealthReport).replace("Prep: ", "")}
            summaries={workspaces}
          />
          <LiveOutputStrip
            audioMixer={audioMixer}
            dirtyPaths={dirtyPaths}
            displayState={displayState}
            layout={normalizedWorkspaceLayout}
            mapState={visibleMapState}
            prepReport={prepHealthReport}
            tabs={workspaceTabs}
          />
          {tabState.tabs.length > 0 && (
            <div className="tab-strip" role="tablist" aria-label="Open files">
              {tabState.tabs.map((tab) => {
                const tabDraft = editorDrafts[tab.path];
                const dirty = tabDraft ? isDraftDirty(tabDraft) : false;
                return (
                  <div className="tab-shell" key={tab.path}>
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
              actionBindings={actionBindings}
              actionBindingMessage={actionBindingMessage}
              audioExpansionState={audioPlaylistExpansion}
              audioMixer={audioMixer}
              audioQuery={audioQuery}
              audioState={audioState}
              contentDirty={activeContentDirty}
              displayState={displayState}
              fastSlotError={fastSlotError}
              fastSlots={fastSlots}
              hpRows={hpRows}
              hpStatus={hpStatus}
              fileReady={
                activePageState.status === "ready" &&
                hasPageSavePreconditions(activePageState.page)
              }
              linksState={activeLinksState}
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
            />
          </div>
          <FastSlotBar slots={fastSlots} onTrigger={(slot) => void handleFastSlotTrigger(slot)} />
        </div>
      </section>
      <SearchDialog
        inputRef={searchInputRef}
        onClose={() => setSearchDialogOpen(false)}
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
      />
      <WorldPathPicker
        candidates={pathPickerCandidates}
        filter={pathPickerState.open ? pathPickerState.filter : "any"}
        onClose={() => setPathPickerState({ open: false })}
        onSelect={(path) => {
          if (pathPickerState.open) {
            pathPickerState.onSelect(path);
          }
          setPathPickerState({ open: false });
        }}
        open={pathPickerState.open}
        title={pathPickerState.open ? pathPickerState.title : "Choose World Path"}
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
        />
      )}
      <WorldCreateDialog
        onClose={() => setWorldCreateDialog({ open: false })}
        onNameChange={handleWorldNameChange}
        onSubmit={() => void handleCreateWorld()}
        state={worldCreateDialog}
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
      />
      <DmsOutputSaveDialog
        onChange={handleDmsOutputSavePathChange}
        onClose={() => setDmsOutputSaveDialog({ open: false })}
        onSubmit={() => void handleSaveDmsOutput()}
        state={dmsOutputSaveDialog}
      />
    </main>
  );
}
