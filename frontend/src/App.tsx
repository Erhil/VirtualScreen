import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent
} from "react";
import { ContextHelpDialog } from "./components/ContextHelpDialog";
import { PluginToolsHost } from "./components/PluginToolsHost";
import { AudioPlaybackHost } from "./components/audio/AudioPlaybackHost";
import { AudioProvider } from "./contexts/AudioContext";
import { DmsFormDialog, DmsOutputSaveDialog, DmsTrustDialog, type DmsOutputSaveDialogState } from "./components/DmsDialogs";
import { type LinksLoadState, type MetadataEditState, type PageLoadState } from "./components/MetadataTool";
import { IconButton } from "./components/IconButton";
import { ScreenTool } from "./components/screen/ScreenTool";
import { MapProvider } from "./contexts/MapContext";
import { DisplayProvider } from "./contexts/DisplayContext";
import { UnlockScreen } from "./UnlockScreen";
import { WorldPathPicker } from "./WorldPathPicker";
import { useAudio } from "./hooks/useAudio";
import { useAuthGate } from "./hooks/useAuthGate";
import { useDisplay } from "./hooks/useDisplay";
import { useBindings } from "./hooks/useBindings";
import { useContextHelp } from "./hooks/useContextHelp";
import { useDmsScripts } from "./hooks/useDmsScripts";
import { useHpTracker } from "./hooks/useHpTracker";
import { useLanguage } from "./hooks/useLanguage";
import { useMap } from "./hooks/useMap";
import { useTableSnapshots } from "./hooks/useTableSnapshots";
import { useStableHandler } from "./hooks/useStableHandler";
import {
  builtInCardTemplates,
  serializeCard,
  defaultCardPath,
  normalizeCardTemplateCatalog,
  renderCardTemplate,
  type CardTemplateCatalog
} from "./lib/cards";
import {
  acknowledgeDmsTrust,
  activateWorkspace,
  blankDisplay,
  clearDisplayPopups,
  createCapture,
  createWorkspace,
  createWorld,
  createWorldFolder,
  createWorldFile,
  deleteWorkspace,
  deleteTrash,
  duplicateWorldPath,
  fetchAudioLibrary,
  fetchCardTemplates,
  fetchCaptureToday,
  fetchDisplayState,
  fetchPage,
  fetchPageBacklinks,
  fetchPageLinks,
  fetchPages,
  fetchPrepHealth,
  fetchTrash,
  fetchWorkspace,
  fetchWorkspaces,
  fetchWorldFile,
  fetchWorldTree,
  fetchWorlds,
  moveWorldPath,
  openWorld,
  openDisplayPopup,
  recordRecent,
  renameWorkspace,
  restoreTrash,
  rotateDisplayFullscreen,
  rollDice,
  saveFavorites,
  saveRecentFiles,
  saveWorldFile,
  saveWorkspaceLayout,
  saveWorkspaceTabs,
  searchWorld,
  setDisplayFullscreen,
  showActiveOnDisplay,
  trashWorldPath,
  updatePageMetadata,
  type PageDetail,
  type PageLink,
  type PageSummary,
  type PrepHealthIssue,
  type PrepHealthReport,
  type SearchResult,
  type RestoreTableSnapshotResponse,
  type CaptureCategory,
  type CaptureTodayResponse,
  type DmsRunState,
  type DiceRollResponse,
  type NamedWorkspaceSummary,
  type TrashEntry,
  type WorldEntry,
  type WorldFile,
  type WorldLibraryState,
  type WorkspaceLayout,
  type WorkspacePaneId,
  type WorkspaceState,
  type WorkspaceTab
} from "./lib/api";
import { type Translator } from "./lang";
import { prepHealthIssueToOpenTab, type PrepHealthFilter } from "./lib/prepHealth";
import { canonicalShortcutFromEvent, isEditableHotkeyTarget, type ActionBindingAction } from "./lib/actionBindings";
import {
  isTableSnapshotRestoreAction,
  resolveScreenActionPath,
  validateDispatchAction
} from "./lib/actionBindingDispatch";
import { hasLoadedAudio, loadAudioTrack, setAudioBusPlaying, setAudioBusVolume } from "./lib/audio";
import { clearCaptureDraft, loadCaptureDraft, saveCaptureDraft, type CaptureDraft } from "./lib/capture";
import { isRectangularCsv, parseCsv, serializeCsv, type CsvData } from "./lib/csv";
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
import { subscribeToEvents } from "./lib/eventSocket";
import { fetchWorldContent, type WorldContent } from "./lib/worldContent";
import {
  buildEventsUrl,
  planWorldEventUpdate,
  type WorldEvent
} from "./lib/liveSync";
import { isLocalWrite, markLocalWrite, unmarkLocalWrite } from "./lib/localWrites";
import { hasResidualPopupsAfterBlank, screenPrimaryMode } from "./lib/display";
import { fetchMapState, fetchMapPresets, presentMap, setMapFog, setMapSource, stopMap } from "./lib/map";
import { folderKanbanTab } from "./lib/folderKanban";
import { dispatchableHotkeyPosition } from "./lib/fastSlots";
import {
  isMetadataFormDirty,
  metadataFormFromPage,
  metadataPayloadFromForm,
  validateMetadataForm,
  type MetadataFormState
} from "./lib/metadataEditor";
import {
  activateTab,
  closeTab,
  dirtyTabCloseMessage,
  isScreenTabPath,
  isVirtualTabPath,
  mediaKindForEntry,
  openTab,
  openTabToWorkspaceTab,
  SCREEN_TAB_PATH,
  shouldConfirmDirtyTabClose,
  shouldPersistTab,
  workspaceTabFromPath,
  workspaceTabToOpenTab,
  type OpenTab,
  type TabState
} from "./lib/tabs";
import {
  chooseSecondaryPaneActiveTab,
  clampWorkspaceSplitRatio,
  defaultWorkspaceLayout,
  normalizeWorkspaceLayout,
  openFileInActivePane,
  recordRecentItem,
  retargetLayoutAfterTabClose,
  searchResultToTab,
  toggleFavorite,
  workspacePersistPayload
} from "./lib/workspace";
import { addDiceHistoryEntry, type DiceHistoryEntry } from "./lib/dice";
import { dmsOutputToWorldFile, isTemporaryDmsPath } from "./lib/scripts";
import {
  DEFAULT_TREE_PANEL_WIDTH,
  loadToolsPanelVisible,
  loadTreePanelWidth,
  loadToolsPanelWidth,
  saveToolsPanelVisible,
  saveTreePanelWidth,
  saveToolsPanelWidth
} from "./lib/panelWidth";
import { applyAudioSnapshot, buildTableSnapshotState } from "./lib/tableSnapshots";
import {
  applyToolAutoOpenRules,
  createToolPanelState,
  DEFAULT_SCREEN_TOOL_TAB,
  isToolDisabled,
  isToolOpen,
  loadDisabledTools,
  openToolSectionByUser,
  saveDisabledTools,
  setToolDisabled,
  toggleToolSection,
  toggleToolSectionPin,
  type ScreenToolTabId,
  type ToolId,
  type ToolPanelState
} from "./lib/toolPanel";
import { livePrepHealthLabel } from "./lib/liveStatus";
import {
  flattenWorldPathPickerEntries,
  type WorldPathPickerFilter
} from "./lib/worldPathPicker";
import { helpContextForMediaKind } from "./lib/contextHelp";
import { DocumentChrome } from "./components/documents/DocumentChrome";
import { type FileLoadState, FileViewer } from "./components/documents/FileViewer";
import { FolderKanbanView } from "./components/documents/FolderKanbanView";
import { LinkContextMenu, type LinkContextMenuState } from "./components/documents/LinkContextMenu";
import { PeekDialog, type PeekState } from "./components/documents/PeekDialog";
import { isCardPath, isEditableFile, parseCardJson } from "./components/documents/documentFiles";
import { type DiceStatus } from "./components/tools/DiceTool";
import { FastSlotBar } from "./components/tools/FastSlotBar";
import { ToolsPanel } from "./components/tools/ToolsPanel";
import {
  DEFAULT_CARD_TEMPLATE_ID,
  type FileDialogState,
  FileManagementDialog,
  selectedCardTemplate
} from "./components/world/FileManagementDialog";
import { QuickFileList } from "./components/world/QuickFileList";
import { type TrashDialogState, TrashManagerDialog } from "./components/world/TrashManagerDialog";
import {
  WorldCreateDialog,
  type WorldCreateDialogState,
  WorldOpenDialog,
  WorldSelector
} from "./components/world/WorldLibrary";
import { type FolderCreateKind, WorldTree } from "./components/world/WorldTree";
import {
  WorldTreeContextMenu,
  type WorldTreeContextMenuState
} from "./components/world/WorldTreeContextMenu";
import { CaptureDialog, type CaptureStatus } from "./components/dialogs/CaptureDialog";
import { PrepHealthDialog, type PrepHealthStatus } from "./components/dialogs/PrepHealthDialog";
import { SearchDialog, type SearchLoadState } from "./components/dialogs/SearchDialog";
import { SettingsDialog } from "./components/dialogs/SettingsDialog";
import { WorkspaceControls } from "./components/workspace/WorkspaceControls";
import { WorkspaceDialog, type WorkspaceDialogState } from "./components/workspace/WorkspaceDialog";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };
type WorldPathPickerState =
  | { open: false }
  | {
      open: true;
      filter: WorldPathPickerFilter;
      title: string;
      onSelect: (path: string) => void;
    };
// A failed world load used to render a bare "Could not load world." with the cause
// discarded, which left both users and failing e2e runs with nothing to act on.
function worldLoadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const DEFAULT_CARD_TITLE = "New Card";
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

function normalizeDialogPath(path: string): string {
  return path.trim().replace(/\\/g, "/");
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

function localizedWorldPathPickerFilterLabel(t: Translator, filter: WorldPathPickerFilter): string {
  if (filter === "any") {
    return t("pathPicker.allPaths");
  }
  if (filter === "displayable") {
    return t("pathPicker.displayablePaths");
  }
  return t("pathPicker.kindPaths", { kind: filter });
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

export function App() {
  const { uiLanguage, t, availableLanguageOptions, handleLanguageChange } = useLanguage();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const { authState, handleAuthUnlock } = useAuthGate();
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
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
  const activeDocumentTabRef = useRef<OpenTab | null>(null);
  const [pdfTargets, setPdfTargets] = useState<Record<string, string | null>>({});
  const [fileStates, setFileStates] = useState<Record<string, FileLoadState>>({});
  const [pageStates, setPageStates] = useState<Record<string, PageLoadState>>({});
  const [linksStates, setLinksStates] = useState<Record<string, LinksLoadState>>({});
  const [editorDrafts, setEditorDrafts] = useState<Record<string, EditorDraft>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const [toolPanelState, setToolPanelState] = useState<ToolPanelState>(() =>
    createToolPanelState([], [], [], loadDisabledTools())
  );
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [prepHealthDialogOpen, setPrepHealthDialogOpen] = useState(false);
  const [pathPickerState, setPathPickerState] = useState<WorldPathPickerState>({
    open: false
  });
  const [screenToolTab, setScreenToolTab] = useState<ScreenToolTabId>(DEFAULT_SCREEN_TOOL_TAB);
  const [toolsPanelWidth, setToolsPanelWidth] = useState(() => loadToolsPanelWidth());
  const [treePanelWidth, setTreePanelWidth] = useState(() => loadTreePanelWidth());
  const [toolsPanelVisible, setToolsPanelVisible] = useState(() => loadToolsPanelVisible());
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
  const [diceHistory, setDiceHistory] = useState<DiceHistoryEntry[]>([]);
  const [diceStatus, setDiceStatus] = useState<DiceStatus>({ status: "idle", message: null });
  const [linkContextMenu, setLinkContextMenu] = useState<LinkContextMenuState>({ open: false });
  const [peekState, setPeekState] = useState<PeekState>({ open: false });
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
  const [worldOpenDialog, setWorldOpenDialog] = useState(false);
  const [worldCreateDialog, setWorldCreateDialog] = useState<WorldCreateDialogState>({
    open: false
  });
  const [metadataEdits, setMetadataEdits] = useState<Record<string, MetadataEditState>>({});
  const captureDraftRef = useRef<CaptureDraft>(captureDraft);
  const captureWorldKeyRef = useRef("default");
  const searchToolOpen = searchDialogOpen;
  const captureToolOpen = captureDialogOpen;
  const pathPickerOpen = pathPickerState.open;
  const captureWorldKey = worldLibrary?.current?.id ?? worldLibrary?.current?.path ?? "default";
  const hp = useHpTracker();
  const snapshots = useTableSnapshots({ capture: captureTableState, apply: applyTableSnapshot });
  const bindings = useBindings({
    worldKey: captureWorldKey,
    execute: executeActionBindingAction,
    onBindingError: () => setToolPanelState((state) => openToolSectionByUser(state, "actions"))
  });
  const audioToolOpen = isToolOpen(toolPanelState, "audio");
  const scriptsToolOpen = isToolOpen(toolPanelState, "scripts");
  const actionsToolOpen = isToolOpen(toolPanelState, "actions");
  const screenToolOpen = isToolOpen(toolPanelState, "screen");
  const diceDisabled = isToolDisabled(toolPanelState, "dice");
  const actionsDisabled = isToolDisabled(toolPanelState, "actions");
  const {
    scriptState,
    scriptRunState,
    dmsTrustDialog,
    dmsFormDialog,
    markDmsTrusted,
    closeDmsFormDialog,
    resetScripts,
    handleRunDmsScript,
    handleConfirmDmsTrust,
    handleCancelDmsTrust,
    handleDmsFormChange,
    handleDmsFormSubmit,
    handleCancelDmsScript
  } = useDmsScripts({
    scriptsToolOpen,
    workspaceReady,
    worldId: worldLibrary?.current?.id,
    onRunSucceeded: handleDmsRunSucceeded,
    onShowScripts: () => setToolPanelState((state) => openToolSectionByUser(state, "scripts"))
  });
  const audio = useAudio({
    worldId: worldLibrary?.current?.id,
    workspaceReady,
    audioToolOpen,
    t
  });
  // Memoized, not built inline: a fresh array on every render made the code editor
  // reconfigure itself on every keystroke, walking the whole world tree each time.
  const editorCompletions = useMemo(
    () => buildEditorCompletionItems({ pages, tree: worldTree, audioTracks: audio.audioAutocompleteTracks }),
    [pages, worldTree, audio.audioAutocompleteTracks]
  );
  const pathPickerCandidates = flattenWorldPathPickerEntries(
    worldTree,
    audio.audioState.status === "ready" ? audio.audioState.tracks : audio.audioAutocompleteTracks
  );

  function closeSettingsDialog() {
    setSettingsDialogOpen(false);
    window.setTimeout(() => settingsButtonRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (authState.status !== "unlocked") {
      return;
    }
    let mounted = true;

    async function loadStatus() {
      const fastSlotsRevisionAtStart = bindings.fastSlotsRevisionNow();
      const hpRevisionAtStart = hp.editVersion();
      setLoadState({ status: "loading" });
      try {
        const [nextWorldLibrary, content] = await Promise.all([fetchWorlds(), fetchWorldContent()]);
        if (!mounted) {
          return;
        }
        applyWorldContent(nextWorldLibrary, content, {
          hp: hpRevisionAtStart,
          fastSlots: fastSlotsRevisionAtStart
        });
      } catch (error) {
        console.error("Loading the world failed", error);
        if (mounted) {
          setLoadState({ status: "error", message: worldLoadErrorMessage(error) });
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
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "s" || event.code === "KeyS")) {
        event.preventDefault();
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (isEditableHotkeyTarget(target)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearchDialog();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setToolsPanelVisible((visible) => saveToolsPanelVisible(!visible));
        return;
      }
      if (actionsDisabled) {
        return;
      }
      const position = dispatchableHotkeyPosition({
        altKey: event.altKey,
        key: event.key,
        targetTagName:
          event.target instanceof HTMLElement ? event.target.tagName : undefined
      });
      if (position) {
        const slot = bindings.fastSlots.find((item) => item.position === position);
        if (slot) {
          event.preventDefault();
          void bindings.handleFastSlotTrigger(slot);
          return;
        }
      }
      const shortcut = canonicalShortcutFromEvent(event);
      if (!shortcut) {
        return;
      }
      const binding = bindings.actionBindings.find(
        (item) => item.shortcut.toLowerCase() === shortcut.toLowerCase()
      );
      if (binding) {
        event.preventDefault();
        void bindings.handleActionBindingTrigger(binding);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bindings.actionBindings, actionsDisabled, bindings.fastSlots, tabState.activePath]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    const scheduledWorkspaceId = currentWorkspaceId;
    const timeout = window.setTimeout(() => {
      if (currentWorkspaceIdRef.current !== scheduledWorkspaceId) {
        return;
      }
      const payload = workspacePersistPayload(
        tabState.tabs.map(openTabToWorkspaceTab),
        tabState.activePath,
        workspaceLayoutRef.current,
        shouldPersistTab
      );
      void saveWorkspaceTabs(payload.tabs, payload.activePath).catch(() => {});
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [currentWorkspaceId, tabState, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    const { layout } = workspacePersistPayload(
      tabState.tabs.map(openTabToWorkspaceTab),
      tabState.activePath,
      workspaceLayout,
      shouldPersistTab
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
    if (!pathPickerOpen || !pathPickerState.open || pathPickerState.filter !== "audio") {
      return;
    }
    if (audio.audioState.status === "ready" || audio.audioState.status === "loading") {
      return;
    }
    let cancelled = false;
    audio.setAudioState({ status: "loading" });
    fetchAudioLibrary()
      .then((tracks) => {
        if (!cancelled) {
          audio.setAudioState({ status: "ready", tracks });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";
          audio.setAudioState({ status: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [audio.audioState.status, pathPickerOpen, pathPickerState]);

  useEffect(() => {
    if (!screenToolOpen && !actionsToolOpen) {
      return;
    }
    fetchMapState()
      .then(map.adoptMapState)
      .catch(() => {});
    fetchMapPresets()
      .then((response) => map.setMapPresets(response.presets))
      .catch(() => {});
  }, [actionsToolOpen, screenToolOpen, worldLibrary?.current?.id]);

  const normalizedWorkspaceLayout = normalizeWorkspaceLayout(
    workspaceLayout,
    tabState.tabs.map(openTabToWorkspaceTab)
  );
  const activeTab = tabState.tabs.find((tab) => tab.path === tabState.activePath) ?? null;
  const { contextHelpTopic, openContextHelp, closeContextHelp } = useContextHelp(
    activeTab?.mediaKind ?? null
  );
  // "Active tab" and "active document" diverge for synthetic tabs (the Screen tab, DMS
  // temporary output): those can be focused in the workspace, but screen actions that mean
  // "the document I'm looking at" should keep targeting the last real document instead of
  // sending a synthetic path like screen://main back to the player screen.
  if (activeTab && !isVirtualTabPath(activeTab.path)) {
    activeDocumentTabRef.current = activeTab;
  }
  const activeDocumentTab =
    activeTab && !isVirtualTabPath(activeTab.path) ? activeTab : activeDocumentTabRef.current;
  const display = useDisplay({
    activeTab: activeDocumentTab,
    authReady: authState.status === "unlocked"
  });
  const map = useMap({
    activeTab: activeDocumentTab,
    authReady: authState.status === "unlocked",
    t,
    refreshDisplayState: display.refreshDisplayState
  });
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
  const favoritePaths = useMemo(() => new Set(favorites.map((favorite) => favorite.path)), [favorites]);
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
        audioActive: hasLoadedAudio(audio.audioMixer),
        displayState: display.displayState,
        mapState: map.mapState,
        metadataEditing: activeMetadataEdit.mode === "edit"
      })
    );
  }, [activeTab?.path, activeMetadataEdit.mode, audio.audioMixer, display.displayState, map.mapState]);

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
      const saveShortcut = shortcut && (key === "s" || event.code === "KeyS");
      const splitShortcut = shortcut && event.key === "\\";
      const editorEscape = !shortcut && event.key === "Escape";
      if (!saveShortcut && !splitShortcut && !editorEscape) {
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
  syncStateRef.current = {
    activeContentDirty,
    activeDraft,
    activeMetadataEdit,
    activePageState,
    activeTab,
    tabState
  };

  function discardLocalWriteEvent(event: WorldEvent): WorldEvent | null {
    const paths = event.paths.filter((path) => !isLocalWrite(path));
    const deletedPaths = event.deleted_paths.filter((path) => !isLocalWrite(path));

    if (paths.length === 0 && deletedPaths.length === 0) {
      return null;
    }
    return { ...event, paths, deleted_paths: deletedPaths };
  }

  useEffect(() => {
    for (const tab of visiblePaneTabs) {
      if (
        isVirtualTabPath(tab.path) ||
        tab.mediaKind === "image" ||
        tab.mediaKind === "pdf" ||
        tab.mediaKind === "video" ||
        tab.mediaKind === "folder" ||
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
      if (isLocalWrite(file.path)) {
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
      if (isVirtualTabPath(tab.path) || tab.mediaKind === "folder") {
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
      if (isVirtualTabPath(tab.path) || !canHavePageLinks(tab)) {
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
    // Returning the same object when nothing changes matters here: this runs on the
    // click that ends every text drag inside a pane, and a state update whose value only
    // differs by identity still re-renders the whole tree - and each such re-render also
    // queued two pointless workspace saves.
    setWorkspaceLayout((layout) =>
      layout.activePaneId === paneId ? layout : { ...layout, activePaneId: paneId }
    );
    if (path) {
      setTabState((state) => activateTab(state, path));
    }
  }

  function openResolvedLink(link: PageLink) {
    const tab = linkToOpenTab(link);
    if (tab) {
      if (tab.mediaKind === "pdf") {
        setPdfTargets((targets) => ({ ...targets, [tab.path]: link.heading ?? null }));
      }
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
    if (tab.mediaKind === "pdf") {
      setPdfTargets((targets) => ({ ...targets, [tab.path]: link.heading ?? null }));
    }
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
    setDiceHistory([]);
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

  function handleOpenFolderKanban(entry: WorldEntry) {
    if (entry.kind !== "directory") {
      return;
    }
    openWorkspaceTab(folderKanbanTab(entry));
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
    event.stopPropagation();
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
      markLocalWrite([moved.path, ...moved.affected_paths, ...moved.deleted_paths]);
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
    void openDisplayPopup(result.path, "plain", false).then(display.setDisplayState).catch(() => {});
  }

  function handleShowSearchResult(result: SearchResult) {
    void openDisplayPopup(result.path).then(display.setDisplayState).catch(() => {});
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

  async function flushCurrentWorkspaceState() {
    if (!workspaceReadyRef.current) {
      return;
    }
    const latestTabState = tabStateRef.current;
    const latestWorkspaceLayout = workspaceLayoutRef.current;
    const payload = workspacePersistPayload(
      latestTabState.tabs.map(openTabToWorkspaceTab),
      latestTabState.activePath,
      latestWorkspaceLayout,
      shouldPersistTab
    );
    await Promise.all([
      saveWorkspaceTabs(payload.tabs, payload.activePath),
      saveWorkspaceLayout(payload.layout)
    ]).catch(() => {});
  }

  async function handleActivateWorkspace(workspaceId: string) {
    if (!workspaceId) {
      return;
    }
    await flushCurrentWorkspaceState();
    const workspace = await activateWorkspace(workspaceId);
    applyWorkspaceState(workspace);
    await hp.refresh();
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
        await hp.refresh();
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
      await hp.refresh();
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

  function openScreenTab() {
    // Modelled on openDmsOutputTabs: this opens a synthetic tab without calling
    // persistRecent, which would 400 trying to record a recent file for a path that does
    // not exist on disk.
    setTabState((state) => {
      const nextState = openTab(state, {
        path: SCREEN_TAB_PATH,
        name: t("tools.screen"),
        title: t("tools.screen"),
        mediaKind: "unsupported"
      });
      setWorkspaceLayout((layout) =>
        openFileInActivePane(
          normalizeWorkspaceLayout(layout, nextState.tabs.map(openTabToWorkspaceTab)),
          SCREEN_TAB_PATH
        )
      );
      return nextState;
    });
  }

  function revealScreenTool(tab: ScreenToolTabId) {
    // Automation (DMS effects, action/MIDI bindings) needs the Screen tool's state visible
    // to the DM, but it must never yank a workspace tab into view on its own - a MIDI
    // binding that swaps out whatever the DM has open mid-session would be far worse than
    // a panel section quietly expanding. Only open the tools-panel section, and only when
    // the Screen tab is not already showing as a pane in the main workspace area.
    setScreenToolTab(tab);
    if (!visiblePaneTabs.some((paneTab) => isScreenTabPath(paneTab.path))) {
      setToolPanelState((state) => openToolSectionByUser(state, "screen"));
    }
  }

  async function applyDmsEffects(run: DmsRunState) {
    for (const effect of run.effects) {
      if (effect.kind === "screen_fullscreen") {
        display.setDisplayState(await setDisplayFullscreen(effect.path));
        map.adoptMapState(await fetchMapState());
        revealScreenTool("display");
      } else if (effect.kind === "screen_popup") {
        display.setDisplayState(await openDisplayPopup(effect.path));
        revealScreenTool("display");
      } else if (effect.kind === "map_load") {
        let nextMapState = await setMapSource(effect.path);
        if (effect.present) {
          nextMapState = await presentMap();
          display.setDisplayState(await fetchDisplayState());
        }
        map.adoptMapState(nextMapState);
        revealScreenTool("map");
      } else if (effect.kind === "map_preset") {
        await map.loadMapPresetForAutomation(effect.preset_id, effect.present);
        revealScreenTool("map");
      } else if (effect.kind === "map_present") {
        map.adoptMapState(await presentMap());
        display.setDisplayState(await fetchDisplayState());
        revealScreenTool("map");
      } else if (effect.kind === "map_stop") {
        map.adoptMapState(await stopMap());
        revealScreenTool("map");
      } else if (effect.kind === "map_fog") {
        map.adoptMapState(await setMapFog(effect.enabled));
        revealScreenTool("map");
      } else if (effect.kind === "audio_play") {
        const tracks = await audio.fetchFullAudioLibraryTracks();
        const track = tracks.find((item) => item.path === effect.path);
        if (track) {
          const busTrack = { ...track, bus: effect.bus };
          audio.setAudioMixer((state) =>
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

  // A DMS run succeeded: the world may have changed on disk, and the run may have produced
  // output tabs and screen/audio effects.
  async function handleDmsRunSucceeded(run: DmsRunState) {
    await refreshWorldStructure([]);
    setFileStates((states) =>
      Object.fromEntries(Object.entries(states).filter(([path]) => isTemporaryDmsPath(path)))
    );
    setPageStates({});
    setLinksStates({});
    openDmsOutputTabs(run);
    await applyDmsEffects(run);
  }

  async function handleTrustAllDmsScripts() {
    if (!window.confirm(t("prep.trustAllScriptsConfirm"))) {
      return;
    }
    setPrepHealthStatus({ status: "loading", message: null });
    try {
      await acknowledgeDmsTrust();
      markDmsTrusted();
      const report = await fetchPrepHealth();
      setPrepHealthReport(report);
      setPrepHealthStatus({ status: "ready", message: t("prep.trustAllScriptsDone") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("prep.trustAllScriptsError");
      setPrepHealthStatus({ status: "error", message });
    }
  }

  async function captureTableState() {
    await flushCurrentWorkspaceState();
    const [workspace, displaySnapshot, mapSnapshot] = await Promise.all([
      fetchWorkspace(),
      fetchDisplayState(),
      fetchMapState()
    ]);
    return buildTableSnapshotState(displaySnapshot, mapSnapshot, workspace, audio.audioMixer);
  }

  async function applyTableSnapshot(restored: RestoreTableSnapshotResponse) {
    display.setDisplayState(restored.display);
    map.adoptMapState(restored.map);
    map.resetViewport();
    applyWorkspaceState(restored.workspace);
    audio.setAudioMixer((state) => applyAudioSnapshot(state, restored.audio));
    await Promise.all([refreshWorkspaceSummaries(), hp.refresh()]);
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
      await snapshots.handleLoad(validatedAction.snapshot_id);
      return;
    }
    const dispatchAction = validatedAction;
    if (dispatchAction.kind === "open_file") {
      openWorkspaceTab(workspaceTabFromPath(dispatchAction.path, pages));
      return;
    }
    if (dispatchAction.kind === "screen_fullscreen") {
      const resolved = resolveScreenActionPath(dispatchAction, activeDocumentTab?.path);
      if ("error" in resolved) {
        reportError(resolved.error);
        setToolPanelState((state) => openToolSectionByUser(state, "actions"));
        return;
      }
      display.setDisplayState(await setDisplayFullscreen(resolved.path));
      map.adoptMapState(await fetchMapState());
      revealScreenTool("display");
      return;
    }
    if (dispatchAction.kind === "screen_popup") {
      const resolved = resolveScreenActionPath(dispatchAction, activeDocumentTab?.path);
      if ("error" in resolved) {
        reportError(resolved.error);
        setToolPanelState((state) => openToolSectionByUser(state, "actions"));
        return;
      }
      display.setDisplayState(await openDisplayPopup(resolved.path, dispatchAction.preset ?? "plain"));
      revealScreenTool("display");
      return;
    }
    if (dispatchAction.kind === "audio_track") {
      const tracks = await audio.fetchFullAudioLibraryTracks();
      const track = tracks.find((item) => item.path === dispatchAction.path);
      if (track) {
        const effectTrack = { ...track, bus: "effect" as const };
        audio.setAudioMixer((state) =>
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
      await map.loadMapPresetForAutomation(dispatchAction.preset_id, dispatchAction.present);
      revealScreenTool("map");
      return;
    }
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
    markLocalWrite([path]);
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
      unmarkLocalWrite([path]);
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
      markLocalWrite([moved.path, ...moved.affected_paths, ...moved.deleted_paths]);
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
      markLocalWrite(trashed.deleted_paths);
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
    setLoadState({ status: "loading" });
    setWorkspaceReady(false);
    setToolPanelState(createToolPanelState([], [], [], loadDisabledTools()));
    setSearchQuery("");
    setSearchState({ status: "idle" });
    audio.reset();
    hp.reset();
    bindings.adoptFastSlots([]);
    snapshots.reset();
    resetScripts();
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
    display.reset();
    map.reset();
    setFolderMenuPath(null);
    setWorldOpenDialog(false);
  }

  // Put a freshly fetched world into every domain. On the first load (`loadedAt` given) HP rows
  // and fast slots edited while the fetch was in flight win, and restored tabs merge with any
  // already open; a world switch replaces everything.
  function applyWorldContent(
    nextWorldLibrary: WorldLibraryState,
    content: WorldContent,
    loadedAt?: { hp: number; fastSlots: number }
  ) {
    const { workspace } = content;
    const workspaceTabs = workspace.tabs.map(workspaceTabToOpenTab);
    const activePath =
      workspace.activePath && workspaceTabs.some((tab) => tab.path === workspace.activePath)
        ? workspace.activePath
        : workspaceTabs[0]?.path ?? null;
    setWorldLibrary(nextWorldLibrary);
    setWorldTree(content.tree);
    setPages(content.pages);
    setWorkspaces(content.workspaces);
    setCurrentWorkspaceId(workspace.workspaceId);
    setCurrentWorkspaceName(workspace.workspaceName);
    hp.adopt(content.hp.rows, loadedAt?.hp);
    setFavorites(workspace.favorites);
    setRecentFiles(workspace.recentFiles);
    display.setDisplayState(content.display);
    map.adoptMapState(content.map);
    snapshots.adopt(content.tableSnapshots);
    bindings.adoptFastSlots(content.fastSlots, loadedAt?.fastSlots);
    if (loadedAt) {
      setTabState((currentState) => mergeLoadedWorkspaceTabs(currentState, workspaceTabs, activePath));
    } else {
      map.setMapPresets([]);
      map.resetViewport();
      setTabState({ tabs: workspaceTabs, activePath });
      setSearchRevision((revision) => revision + 1);
    }
    setWorkspaceLayout(normalizeWorkspaceLayout(workspace.layout, workspace.tabs));
    setExpandedPaths(new Set([""]));
    setWorkspaceReady(true);
    setLoadState({ status: "ready" });
  }

  async function finishWorldSwitch(nextWorldLibrary: WorldLibraryState) {
    applyWorldContent(nextWorldLibrary, await fetchWorldContent());
  }

  async function handleOpenWorld(worldId: string) {
    if (!confirmDiscardDirtyDrafts("Switch worlds and discard unsaved changes?")) {
      return;
    }
    prepareWorldSwitch();
    try {
      const nextWorldLibrary = await openWorld(worldId);
      await finishWorldSwitch(nextWorldLibrary);
    } catch (error) {
      console.error(`Switching to world "${worldId}" failed`, error);
      setLoadState({ status: "error", message: worldLoadErrorMessage(error) });
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

  // These four handlers stay in App because they span both the display and map domains:
  // each one also drives the map (adopting map state after a display change, or reading
  // map state / rotating the map), so they don't fit cleanly into either domain hook alone.
  async function handleShowActiveFullscreen(pathOverride?: string) {
    // activeDocumentTab, not activeTab: "the active file" means the document the DM is
    // looking at. With the Screen tab focused, activeTab is the synthetic screen://main,
    // and sending that to the player screen shows them nothing at all.
    const path = pathOverride?.trim() || activeDocumentTab?.path;
    if (!path) {
      return;
    }
    try {
      display.setDisplayState(await setDisplayFullscreen(path));
      map.adoptMapState(await fetchMapState());
    } catch {
    }
  }

  async function handleClearAndShowActiveFullscreen(pathOverride?: string) {
    const path = pathOverride?.trim() || activeDocumentTab?.path;
    if (!path) {
      return;
    }
    try {
      display.setDisplayState(
        await showActiveOnDisplay({
          path,
          mode: "fullscreen",
          clear_existing: true
        })
      );
      map.adoptMapState(await fetchMapState());
    } catch {
    }
  }

  async function handleRotatePrimaryScreen() {
    if (screenPrimaryMode(display.displayState, map.mapState) === "map") {
      await map.handleMapRotate();
      return;
    }
    if (!display.displayState?.fullscreen) {
      return;
    }
    try {
      display.setDisplayState(await rotateDisplayFullscreen());
    } catch {
    }
  }

  async function handleBlankDisplay() {
    try {
      const nextDisplayState = await blankDisplay();
      map.adoptMapState(await fetchMapState());
      if (hasResidualPopupsAfterBlank(nextDisplayState)) {
        const clearedState = await clearDisplayPopups();
        display.setDisplayState({ ...clearedState, fullscreen: null, popups: [] });
        return;
      }
      display.setDisplayState(nextDisplayState);
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
      markLocalWrite([response.path]);
      const nextPages = await refreshWorldStructure([response.path]);
      setExpandedPaths((paths) => revealWorldTreePaths(paths, [response.path]));
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

  function handleTreeResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = treePanelWidth;

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      setTreePanelWidth(saveTreePanelWidth(startWidth + moveEvent.clientX - startX));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleTreeResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setTreePanelWidth((width) => saveTreePanelWidth(width + direction * 24));
  }

  function handleTreeResizeReset() {
    setTreePanelWidth(saveTreePanelWidth(DEFAULT_TREE_PANEL_WIDTH));
  }

  function handleToolsPanelVisibleChange(visible: boolean) {
    setToolsPanelVisible(saveToolsPanelVisible(visible));
  }

  function handleToolToggle(tool: ToolId) {
    const lockedTools: ToolId[] = activeMetadataEdit.mode === "edit" ? ["metadata"] : [];
    setToolPanelState((state) => toggleToolSection(state, tool, lockedTools));
  }

  function handleToolPin(tool: ToolId) {
    setToolPanelState((state) => toggleToolSectionPin(state, tool));
  }

  function handleToolDisabledChange(tool: ToolId, disabled: boolean) {
    setToolPanelState((state) => {
      const nextState = setToolDisabled(state, tool, disabled);
      saveDisabledTools(nextState.disabledTools);
      return nextState;
    });
  }

  useEffect(() => {
    if (authState.status !== "unlocked") {
      return;
    }
    return subscribeToEvents<WorldEvent>(buildEventsUrl(), (event) => {
      void handleWorldEvent(event);
    });
  }, [authState.status]);

  const currentWorldName = worldLibrary?.current?.name ?? worldTree?.name ?? "No world loaded";
  const appShellStyle = {
    "--tree-panel-width": `${treePanelWidth}px`
  } as CSSProperties;
  const contentLayoutStyle = {
    "--tools-panel-width": `${toolsPanelWidth}px`
  } as CSSProperties;

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

  function setDraftMessage(draft: EditorDraft, message: string) {
    setEditorDrafts((drafts) => ({
      ...drafts,
      [draft.path]: { ...draft, message }
    }));
  }

  // The three editor intents below are named functions rather than branches inside
  // runEditorShortcutIntent because the toolbar buttons call them too. While they lived
  // only inside the shortcut runner there was no pointer-driven way to save or leave an
  // edit at all, which made editing on a touchscreen a trap: double-tap got you in, and
  // nothing got you out.
  function handleEditorSave(file: WorldFile, draft: EditorDraft) {
    if (canSaveEditorDraft(file, draft)) {
      void handleSaveDraft();
      return;
    }
    if (isDraftDirty(draft)) {
      setDraftMessage(draft, t("document.fixBeforeSaving"));
    }
  }

  function handleEditorExit(draft: EditorDraft) {
    if (isDraftDirty(draft)) {
      setDraftMessage(draft, t("document.saveOrRevertFirst"));
      return;
    }
    handleDraftModeChange("preview");
  }

  function handleEditorRevert(draft: EditorDraft) {
    if (!window.confirm(t("document.confirmRevert"))) {
      return;
    }
    setEditorDrafts((drafts) => ({
      ...drafts,
      [draft.path]: setDraftMode(revertDraft(draft), "preview")
    }));
  }

  function runEditorShortcutIntent(file: WorldFile, draft: EditorDraft, intent: EditorShortcutIntent) {
    if (intent === "save") {
      handleEditorSave(file, draft);
      return;
    }

    if (intent === "toggle-split") {
      handleDraftModeChange(draft.mode === "split" ? "edit" : "split");
      return;
    }

    if (intent === "dirty-escape") {
      setDraftMessage(draft, t("document.saveOrRevertFirst"));
      return;
    }

    if (intent === "exit-edit") {
      handleDraftModeChange("preview");
      return;
    }

    if (intent === "revert") {
      handleEditorRevert(draft);
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
        {tab?.path === SCREEN_TAB_PATH ? (
          <div className="screen-tab-pane">
            <ScreenTool
              activeTab={activeDocumentTab}
              onTabChange={setScreenToolTab}
              tab={screenToolTab}
            />
          </div>
        ) : tab?.mediaKind === "folder" ? (
          <FolderKanbanView
            dirtyPaths={dirtyPaths}
            onChanged={async (paths) => {
              await refreshWorldStructure(paths);
              setExpandedPaths((expanded) => revealWorldTreePaths(expanded, paths));
              setSearchRevision((revision) => revision + 1);
            }}
            onOpenEntity={(path) => openWorkspaceTab(workspaceTabFromPath(path, pages))}
            tab={tab}
            t={t}
            worldTree={worldTree}
          />
        ) : tab ? (
          <>
            {paneActive && (
              <DocumentChrome
                draft={paneDraft}
                file={paneFileState.status === "ready" ? paneFileState.file : null}
                onCancelScript={(runId) => void handleCancelDmsScript(runId)}
                onExitEdit={() => {
                  if (paneDraft) {
                    handleEditorExit(paneDraft);
                  }
                }}
                onReload={handleReloadActiveFile}
                onRequestEdit={() => {
                  if (paneFileState.status === "ready") {
                    requestEditMode(tab.path, paneFileState.file);
                  }
                }}
                onRevert={() => {
                  if (paneDraft) {
                    handleEditorRevert(paneDraft);
                  }
                }}
                onRunScript={() => void handleRunDmsScript(tab.path)}
                onSave={() => {
                  if (paneDraft && paneFileState.status === "ready") {
                    handleEditorSave(paneFileState.file, paneDraft);
                  }
                }}
                onSaveTemporary={handleOpenDmsOutputSaveDialog}
                scriptRunState={scriptRunState}
                t={t}
              />
            )}
            <FileViewer
              completions={editorCompletions}
              draft={viewerDraft}
              links={paneLinksState.status === "ready" ? paneLinksState.outgoing : []}
              loadState={paneFileState}
              onContextLink={handleLinkContext}
              onCsvDraftChange={handleCsvDraftChange}
              onDiceRoll={diceDisabled ? undefined : handleDiceRoll}
              onDraftContentChange={handleDraftContentChange}
              onOpenLink={openResolvedLink}
              onPickWorldPath={handleOpenWorldPathPicker}
              onPeekLink={openLinkPeek}
              pdfTarget={pdfTargets[tab.path] ?? null}
              tab={tab}
              t={t}
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

  // The file tree is memoized and only re-renders when the world or its own UI state
  // changes - not on every keystroke, dice roll or map pan elsewhere in App.
  const treeHandlers = {
    onAdd: useStableHandler(handleFolderAdd),
    onContextEntry: useStableHandler(handleWorldTreeContextEntry),
    onDragEnd: useStableHandler(handleWorldTreeDragEnd),
    onDragStart: useStableHandler(handleWorldTreeDragStart),
    onDropEntry: useStableHandler((entry: WorldEntry, event: DragEvent<HTMLElement>) => {
      void handleWorldTreeDrop(entry, event);
    }),
    onOpen: useStableHandler(handleOpenEntry),
    onToggle: useStableHandler(handleToggleFolder)
  };

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
    <AudioProvider value={{ ...audio, t, onPickPath: handleOpenWorldPathPicker }}>
    <MapProvider value={{ ...map, t, onPickPath: handleOpenWorldPathPicker }}>
    <DisplayProvider
      value={{
        ...display,
        onBlank: () => void handleBlankDisplay(),
        onClearAndShowFullscreen: (path) => void handleClearAndShowActiveFullscreen(path),
        onRotatePrimary: () => void handleRotatePrimaryScreen(),
        onShowFullscreen: (path) => void handleShowActiveFullscreen(path),
        t,
        onPickPath: handleOpenWorldPathPicker
      }}
    >
    <main className="app-shell" style={appShellStyle}>
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
            <IconButton
              className="panel-action"
              label={t("side.trash")}
              name="trash"
              onClick={() => void loadTrashDialog()}
            />
            <IconButton
              className="panel-action"
              label={t("app.settings")}
              name="settings"
              onClick={() => setSettingsDialogOpen(true)}
              ref={settingsButtonRef}
            />
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
          {loadState.status === "error" ? (
            <div className="load-error" role="alert">
              <p>{t("side.couldNotLoadWorld")}</p>
              <p className="load-error-reason">{loadState.message}</p>
            </div>
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
                onAdd={treeHandlers.onAdd}
                onContextEntry={treeHandlers.onContextEntry}
                onDragEnd={treeHandlers.onDragEnd}
                onDragStart={treeHandlers.onDragStart}
                onDragTarget={setWorldTreeDropPath}
                onDropEntry={treeHandlers.onDropEntry}
                onMenuToggle={setFolderMenuPath}
                onOpen={treeHandlers.onOpen}
                onToggle={treeHandlers.onToggle}
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
            onOpenKanban={handleOpenFolderKanban}
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
      <div
        aria-label={t("side.resizeTree")}
        aria-orientation="vertical"
        className="tree-resizer"
        onDoubleClick={handleTreeResizeReset}
        onKeyDown={handleTreeResizeKeyDown}
        onPointerDown={handleTreeResizePointerDown}
        role="separator"
        tabIndex={0}
      />

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
            onOpenScreen={openScreenTab}
            onSearch={openSearchDialog}
            searchButtonRef={searchButtonRef}
            onModeChange={handleWorkspaceModeChange}
            onToggleTools={() => handleToolsPanelVisibleChange(!toolsPanelVisible)}
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
            toolsVisible={toolsPanelVisible}
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
                    <IconButton
                      className="close-tab"
                      label={t("workspace.closeTab", { name: tab.name })}
                      name="close"
                      onClick={() => handleCloseTab(tab.path)}
                    />
                  </div>
                );
              })}
              <span className="tab-strip-count">{t("workspace.openFileCount", { count: tabState.tabs.length })}</span>
            </div>
          )}

          <AudioPlaybackHost />

          <div
            className={`content-layout ${toolsPanelVisible ? "with-tools" : "tools-hidden"}`}
            style={contentLayoutStyle}
          >
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
            {toolsPanelVisible ? (
              <>
                <div
                  aria-label={t("tools.resizePanel")}
                  aria-orientation="vertical"
                  className="tools-resizer"
                  onKeyDown={handleToolsResizeKeyDown}
                  onPointerDown={handleToolsResizePointerDown}
                  role="separator"
                  tabIndex={0}
                />
                <ToolsPanel
              activeTab={activeTab}
              activeDocumentTab={activeDocumentTab}
              actionBindings={bindings.actionBindings}
              actionBindingMessage={bindings.actionBindingMessage}
              contentDirty={activeContentDirty}
              diceHistory={diceHistory}
              diceStatus={diceStatus}
              fastSlotError={bindings.fastSlotError}
              fastSlots={bindings.fastSlots}
              hpRows={hp.rows}
              hpStatus={hp.status}
              fileReady={
                activePageState.status === "ready" &&
                hasPageSavePreconditions(activePageState.page)
              }
              linksState={activeLinksState}
              metadataEditState={activeMetadataEdit}
              midiBindingMessage={bindings.midiBindingMessage}
              midiBindings={bindings.midiBindings}
              midiInputs={bindings.midiInputs}
              midiLearnedControl={bindings.midiLearnedControl}
              midiLearning={bindings.midiLearning}
              midiStatus={bindings.midiStatus}
              onActionBindingDelete={bindings.handleDeleteActionBinding}
              onActionBindingRun={(binding) => void bindings.handleActionBindingTrigger(binding)}
              onActionBindingSave={bindings.handleSaveActionBinding}
              onDiceClearHistory={handleDiceClearHistory}
              onDiceRoll={handleDiceRoll}
              onHpAdd={hp.handleAdd}
              onHpAdjust={hp.handleAdjust}
              onHpClear={hp.handleClear}
              onHpPersist={hp.handlePersist}
              onHpRemove={hp.handleRemove}
              onHpUpdate={hp.handleUpdate}
              onCancelMetadataEdit={handleCancelMetadataEdit}
              onCancelScript={(runId) => void handleCancelDmsScript(runId)}
              onChangeMetadataEdit={handleChangeMetadataEdit}
              onClearFastSlot={bindings.handleClearFastSlot}
              onPickPath={handleOpenWorldPathPicker}
              onClearMidiLearned={bindings.handleClearMidiLearned}
              onConnectMidi={() => void bindings.handleConnectMidi()}
              onDeleteMidiBinding={bindings.handleDeleteMidiBinding}
              onMidiBindingRun={(binding) => void bindings.handleMidiBindingTrigger(binding)}
              onMidiBindingSave={bindings.handleSaveMidiBinding}
              onOpenBacklink={openBacklink}
              onOpenOutgoing={openResolvedLink}
              onReloadMetadataEdit={() => void handleReloadMetadataEdit()}
              onRevertMetadataEdit={handleRevertMetadataEdit}
              onSaveMetadataEdit={() => void handleSaveMetadataEdit()}
              onDeleteTableSnapshot={(snapshotId) => void snapshots.handleDelete(snapshotId)}
              onLoadTableSnapshot={(snapshotId) => void snapshots.handleLoad(snapshotId)}
              onSaveTableSnapshot={() => void snapshots.handleSave()}
              onSaveFastSlot={bindings.handleSaveFastSlot}
              onSelectTableSnapshot={snapshots.setSelectedId}
              onStartMidiLearn={() => void bindings.handleStartMidiLearn()}
              onTableSnapshotNameChange={snapshots.setName}
              onScriptRun={(path) => void handleRunDmsScript(path)}
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
              tableSnapshotName={snapshots.name}
              tableSnapshotSelectedId={snapshots.selectedId}
              tableSnapshotStatus={snapshots.status}
              tableSnapshots={snapshots.snapshots}
                  t={t}
                />
              </>
            ) : (
              <button
                className="tools-restore-button"
                onClick={() => handleToolsPanelVisibleChange(true)}
                type="button"
              >
                {t("tools.showPanel")}
              </button>
            )}
          </div>
          {!actionsDisabled && (
            <FastSlotBar slots={bindings.fastSlots} onTrigger={(slot) => void bindings.handleFastSlotTrigger(slot)} t={t} />
          )}
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
        onTrustAllScripts={() => void handleTrustAllDmsScripts()}
        open={prepHealthDialogOpen}
        report={prepHealthReport}
        status={prepHealthStatus}
        t={t}
      />
      <SettingsDialog
        availableLanguages={availableLanguageOptions}
        disabledTools={toolPanelState.disabledTools}
        language={uiLanguage}
        onClose={closeSettingsDialog}
        onImportComplete={async (summary) => {
          const importedPaths = summary.files
            .filter((file) => ["imported", "overwritten", "renamed"].includes(file.status))
            .map((file) => file.target_path);
          await refreshWorldStructure(importedPaths);
          if (importedPaths.length > 0) {
            setExpandedPaths((paths) => revealWorldTreePaths(paths, importedPaths));
          }
          setSearchRevision((revision) => revision + 1);
        }}
        onLanguageChange={handleLanguageChange}
        onToolDisabledChange={handleToolDisabledChange}
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
        onShowFullscreen={(link) => {
          if (link.target_path) {
            void handleShowActiveFullscreen(link.target_path);
          }
        }}
        onShowPopup={(link) => {
          if (link.target_path) {
            void openDisplayPopup(link.target_path).then(display.setDisplayState).catch(() => {});
          }
        }}
        onStagePopup={(link) => {
          if (link.target_path) {
            void openDisplayPopup(link.target_path, "plain", false).then(display.setDisplayState).catch(() => {});
          }
        }}
        onUseAsMap={(link) => {
          if (link.target_path) {
            void map.handleMapLoadSource(link.target_path);
          }
        }}
        state={linkContextMenu}
        t={t}
      />
      <PeekDialog
        completions={editorCompletions}
        onClose={() => setPeekState({ open: false })}
        onContextLink={handleLinkContext}
        onDiceRoll={diceDisabled ? undefined : handleDiceRoll}
        onOpenLink={openResolvedLink}
        onPeekLink={openLinkPeek}
        state={peekState}
        t={t}
      />
      <DmsFormDialog
        fileOptions={pages.map((page) => page.path)}
        onChange={handleDmsFormChange}
        onClose={closeDmsFormDialog}
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
    <PluginToolsHost t={t} worldId={worldLibrary?.current?.id ?? null} />
    </DisplayProvider>
    </MapProvider>
    </AudioProvider>
  );
}
