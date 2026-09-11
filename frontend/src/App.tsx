import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent
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
import { useFileManagement } from "./hooks/useFileManagement";
import { useHpTracker } from "./hooks/useHpTracker";
import { useLanguage } from "./hooks/useLanguage";
import { useMap } from "./hooks/useMap";
import { useTableSnapshots } from "./hooks/useTableSnapshots";
import { useStableHandler } from "./hooks/useStableHandler";
import { useCapture } from "./hooks/useCapture";
import { useDice } from "./hooks/useDice";
import { usePanelLayout } from "./hooks/usePanelLayout";
import { usePathPicker } from "./hooks/usePathPicker";
import { usePrepHealth } from "./hooks/usePrepHealth";
import { useSearch } from "./hooks/useSearch";
import { useToolPanel } from "./hooks/useToolPanel";
import { useWorkspace } from "./hooks/useWorkspace";
import {
  blankDisplay,
  clearDisplayPopups,
  createWorld,
  createWorldFile,
  fetchDisplayState,
  fetchPage,
  fetchPageBacklinks,
  fetchPageLinks,
  fetchPages,
  fetchWorkspace,
  fetchWorldFile,
  fetchWorldTree,
  fetchWorlds,
  openWorld,
  openDisplayPopup,
  rotateDisplayFullscreen,
  saveWorldFile,
  setDisplayFullscreen,
  showActiveOnDisplay,
  updatePageMetadata,
  type PageDetail,
  type PageLink,
  type PageSummary,
  type PrepHealthIssue,
  type SearchResult,
  type RestoreTableSnapshotResponse,
  type DmsRunState,
  type WorldEntry,
  type WorldFile,
  type WorldLibraryState,
  type WorkspacePaneId,
  type WorkspaceTab
} from "./lib/api";
import { type Translator } from "./lang";
import { prepHealthIssueToOpenTab } from "./lib/prepHealth";
import { canonicalShortcutFromEvent, isEditableHotkeyTarget, type ActionBindingAction } from "./lib/actionBindings";
import {
  isTableSnapshotRestoreAction,
  resolveScreenActionPath,
  validateDispatchAction
} from "./lib/actionBindingDispatch";
import { hasLoadedAudio, loadAudioTrack, setAudioBusPlaying, setAudioBusVolume } from "./lib/audio";
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
  managementErrorMessage,
  normalizeDialogPath,
  hasDirtyDescendantPath,
  isDescendantPath,
  remapMovedWorldPath,
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
  dirtyTabCloseMessage,
  isScreenTabPath,
  isVirtualTabPath,
  mediaKindForEntry,
  openTabToWorkspaceTab,
  SCREEN_TAB_PATH,
  shouldConfirmDirtyTabClose,
  workspaceTabFromPath,
  workspaceTabToOpenTab,
  type OpenTab
} from "./lib/tabs";
import { searchResultToTab } from "./lib/workspace";
import { dmsOutputToWorldFile, isTemporaryDmsPath } from "./lib/scripts";
import { applyAudioSnapshot, buildTableSnapshotState } from "./lib/tableSnapshots";
import {
  DEFAULT_SCREEN_TOOL_TAB,
  isToolDisabled,
  isToolOpen,
  type ScreenToolTabId
} from "./lib/toolPanel";
import { livePrepHealthLabel } from "./lib/liveStatus";
import { type WorldPathPickerFilter } from "./lib/worldPathPicker";
import { helpContextForMediaKind } from "./lib/contextHelp";
import { DocumentChrome } from "./components/documents/DocumentChrome";
import { type FileLoadState, FileViewer } from "./components/documents/FileViewer";
import { FolderKanbanView } from "./components/documents/FolderKanbanView";
import { LinkContextMenu, type LinkContextMenuState } from "./components/documents/LinkContextMenu";
import { PeekDialog, type PeekState } from "./components/documents/PeekDialog";
import { isCardPath, isEditableFile, parseCardJson } from "./components/documents/documentFiles";
import { FastSlotBar } from "./components/tools/FastSlotBar";
import { ToolsPanel } from "./components/tools/ToolsPanel";
import { FileManagementDialog } from "./components/world/FileManagementDialog";
import { QuickFileList } from "./components/world/QuickFileList";
import { TrashManagerDialog } from "./components/world/TrashManagerDialog";
import {
  WorldCreateDialog,
  type WorldCreateDialogState,
  WorldOpenDialog,
  WorldSelector
} from "./components/world/WorldLibrary";
import { WorldTree } from "./components/world/WorldTree";
import { WorldTreeContextMenu } from "./components/world/WorldTreeContextMenu";
import { CaptureDialog } from "./components/dialogs/CaptureDialog";
import { PrepHealthDialog } from "./components/dialogs/PrepHealthDialog";
import { SearchDialog } from "./components/dialogs/SearchDialog";
import { SettingsDialog } from "./components/dialogs/SettingsDialog";
import { WorkspaceControls } from "./components/workspace/WorkspaceControls";
import { WorkspaceDialog } from "./components/workspace/WorkspaceDialog";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };
// A failed world load used to render a bare "Could not load world." with the cause
// discarded, which left both users and failing e2e runs with nothing to act on.
function worldLoadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  const {
    tabState,
    normalizedWorkspaceLayout,
    activeTab,
    activeDocumentTab,
    mainPaneTab,
    secondaryPaneTab,
    visiblePaneTabs,
    workspaces,
    currentWorkspaceId,
    currentWorkspaceName,
    workspaceDialog,
    favorites,
    recentFiles,
    favoritePaths,
    persistRecent,
    openWorkspaceTab,
    handleActivateTab,
    handleActivatePane,
    closeWorkspaceTab,
    openInOtherPane,
    openVirtualTab,
    openScreenTab,
    replaceVirtualTab,
    toggleFavoriteTab,
    refreshWorkspaceSummaries,
    applyWorkspaceState,
    flushCurrentWorkspaceState,
    handleActivateWorkspace,
    handleSubmitWorkspaceDialog,
    handleDeleteCurrentWorkspace,
    handleWorkspaceModeChange,
    handlePaneResizePointerDown,
    remapWorkspacePath,
    forgetWorkspacePath,
    retitleFromPages,
    retitleTab,
    resetWorkspace,
    adoptWorkspace,
    replaceWorkspaceCollections,
    removeDeletedWorkspaceItems,
    openCreateWorkspaceDialog,
    openRenameWorkspaceDialog,
    closeWorkspaceDialog,
    handleWorkspaceDialogNameChange
  } = useWorkspace({
    ready: workspaceReady,
    t,
    onTabShown: (path) => clearFailedDerivedFileState(path),
    onWorkspaceChanged: () => hp.refresh()
  });
  const [pdfTargets, setPdfTargets] = useState<Record<string, string | null>>({});
  const [fileStates, setFileStates] = useState<Record<string, FileLoadState>>({});
  const [pageStates, setPageStates] = useState<Record<string, PageLoadState>>({});
  const [linksStates, setLinksStates] = useState<Record<string, LinksLoadState>>({});
  const [editorDrafts, setEditorDrafts] = useState<Record<string, EditorDraft>>({});
  const {
    searchDialogOpen,
    setSearchDialogOpen,
    searchQuery,
    setSearchQuery,
    searchState,
    searchInputRef,
    searchButtonRef,
    openSearchDialog,
    closeSearchDialog,
    invalidateSearch,
    resetSearch
  } = useSearch();
  const {
    toolPanelState,
    openTool,
    handleToolToggle,
    handleToolPin,
    handleToolDisabledChange,
    applyAutoOpen,
    resetToolPanel
  } = useToolPanel();
  const [screenToolTab, setScreenToolTab] = useState<ScreenToolTabId>(DEFAULT_SCREEN_TOOL_TAB);
  const {
    toolsPanelWidth,
    treePanelWidth,
    toolsPanelVisible,
    handleToolsResizePointerDown,
    handleToolsResizeKeyDown,
    handleTreeResizePointerDown,
    handleTreeResizeKeyDown,
    handleTreeResizeReset,
    handleToolsPanelVisibleChange,
    toggleToolsPanel
  } = usePanelLayout();
  const [treeFilter, setTreeFilter] = useState("");
  const { diceHistory, diceStatus, handleDiceRoll, handleDiceClearHistory } = useDice({
    t,
    onRoll: () => openTool("dice")
  });
  const [linkContextMenu, setLinkContextMenu] = useState<LinkContextMenuState>({ open: false });
  const [peekState, setPeekState] = useState<PeekState>({ open: false });
  const [dmsOutputSaveDialog, setDmsOutputSaveDialog] = useState<DmsOutputSaveDialogState>({
    open: false
  });
  const [worldOpenDialog, setWorldOpenDialog] = useState(false);
  const {
    fileDialog,
    trashDialog,
    worldTreeStatus,
    folderMenuPath,
    setFolderMenuPath,
    worldTreeContextMenu,
    worldTreeDragPath,
    worldTreeDropPath,
    setWorldTreeDropPath,
    expandedPaths,
    revealPaths,
    collapseAll,
    closeFileDialog,
    closeTrashDialog,
    setTrashConfirmDelete,
    closeWorldTreeContextMenu,
    handleWorldTreeContextEntry,
    handleWorldTreeRename,
    handleWorldTreeDuplicate,
    handleWorldTreeTrash,
    handleWorldTreeDragStart,
    handleWorldTreeDragEnd,
    handleWorldTreeDrop,
    handleFolderAdd,
    handleOpenNewCardDialog,
    handleFileDialogPathChange,
    handleFileDialogTypeChange,
    handleFileDialogCardTemplateChange,
    handleFileDialogCardTitleChange,
    handleSubmitFileDialog,
    loadTrashDialog,
    handleTrashRestorePathChange,
    handleRestoreTrashEntry,
    handleDeleteTrashEntry,
    handleToggleFolder
  } = useFileManagement({
    refreshWorldStructure,
    blockedByUnsavedChanges: treeOperationBlockedByDirty,
    onPathMoved: applyMovedPathToWorkspaceState,
    onPathTrashed: applyTrashedPathToWorkspaceState,
    onFileCreated: handleManagedFileCreated
  });
  const [worldCreateDialog, setWorldCreateDialog] = useState<WorldCreateDialogState>({
    open: false
  });
  const [metadataEdits, setMetadataEdits] = useState<Record<string, MetadataEditState>>({});
  const captureWorldKey = worldLibrary?.current?.id ?? worldLibrary?.current?.path ?? "default";
  const {
    captureDialogOpen,
    setCaptureDialogOpen,
    captureDraft,
    captureStatus,
    captureToday,
    persistCurrentCaptureDraft,
    handleCaptureCategoryChange,
    handleCaptureTextChange,
    handleSaveCapture,
    handleOpenCaptureLog
  } = useCapture({
    worldKey: captureWorldKey,
    authReady: authState.status === "unlocked",
    onSaved: handleCaptureSaved,
    onOpenLog: (path) => openWorkspaceTab(captureLogTab(path))
  });
  const hp = useHpTracker();
  const snapshots = useTableSnapshots({ capture: captureTableState, apply: applyTableSnapshot });
  const bindings = useBindings({
    worldKey: captureWorldKey,
    execute: executeActionBindingAction,
    onBindingError: () => openTool("actions")
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
    onShowScripts: () => openTool("scripts")
  });
  const {
    prepHealthDialogOpen,
    setPrepHealthDialogOpen,
    prepHealthReport,
    prepHealthFilter,
    setPrepHealthFilter,
    prepHealthStatus,
    handleRunPrepHealth,
    handleCopyPrepHealthTarget,
    handleTrustAllDmsScripts
  } = usePrepHealth({ t, onScriptsTrusted: markDmsTrusted });
  const audio = useAudio({
    worldId: worldLibrary?.current?.id,
    workspaceReady,
    audioToolOpen,
    t
  });
  const {
    pathPickerState,
    pathPickerCandidates,
    handleOpenWorldPathPicker,
    closePathPicker,
    selectPath
  } = usePathPicker({ worldTree, audio });
  // Memoized, not built inline: a fresh array on every render made the code editor
  // reconfigure itself on every keystroke, walking the whole world tree each time.
  const editorCompletions = useMemo(
    () => buildEditorCompletionItems({ pages, tree: worldTree, audioTracks: audio.audioAutocompleteTracks }),
    [pages, worldTree, audio.audioAutocompleteTracks]
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
        toggleToolsPanel();
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

  const { contextHelpTopic, openContextHelp, closeContextHelp } = useContextHelp(
    activeTab?.mediaKind ?? null
  );
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
  const dirtyPaths = new Set(
    Object.entries(editorDrafts)
      .filter(([, draft]) => isDraftDirty(draft))
      .map(([path]) => path)
  );
  const hasDirtyDrafts = dirtyPaths.size > 0;
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
    applyAutoOpen({
      activePath: activeTab?.path ?? null,
      audioActive: hasLoadedAudio(audio.audioMixer),
      displayState: display.displayState,
      mapState: map.mapState,
      metadataEditing: activeMetadataEdit.mode === "edit"
    });
  }, [activeTab?.path, activeMetadataEdit.mode, audio.audioMixer, display.displayState, map.mapState]);

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
    closeWorkspaceTab(path);
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
    if (tab.mediaKind === "pdf") {
      setPdfTargets((targets) => ({ ...targets, [tab.path]: link.heading ?? null }));
    }
    openInOtherPane(openTabToWorkspaceTab(tab));
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

  function handleOpenFolderKanban(entry: WorldEntry) {
    if (entry.kind !== "directory") {
      return;
    }
    openWorkspaceTab(folderKanbanTab(entry));
  }

  function handleOpenSearchResult(result: SearchResult) {
    openWorkspaceTab(searchResultToTab(result));
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

  function openDmsOutputTabs(run: DmsRunState) {
    for (const output of run.outputs) {
      const file = dmsOutputToWorldFile(output);
      setFileStates((states) => ({
        ...states,
        [file.path]: { status: "ready", file }
      }));
      openVirtualTab({ path: file.path, name: file.name, title: file.name, mediaKind: file.media_kind });
    }
  }

  function revealScreenTool(tab: ScreenToolTabId) {
    // Automation (DMS effects, action/MIDI bindings) needs the Screen tool's state visible
    // to the DM, but it must never yank a workspace tab into view on its own - a MIDI
    // binding that swaps out whatever the DM has open mid-session would be far worse than
    // a panel section quietly expanding. Only open the tools-panel section, and only when
    // the Screen tab is not already showing as a pane in the main workspace area.
    setScreenToolTab(tab);
    if (!visiblePaneTabs.some((paneTab) => isScreenTabPath(paneTab.path))) {
      openTool("screen");
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
          openTool("audio");
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
      openTool("actions");
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
        openTool("actions");
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
        openTool("actions");
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
        openTool("audio");
      } else {
        reportError("Audio track was not found.");
        openTool("actions");
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
      revealPaths([createdFile.path]);
      const tab = tabFromFileWithPages(createdFile, nextPages);
      setFileStates((states) => {
        const nextStates = { ...states };
        delete nextStates[dmsOutputSaveDialog.file.path];
        nextStates[createdFile.path] = { status: "ready", file: createdFile };
        return nextStates;
      });
      replaceVirtualTab(dmsOutputSaveDialog.file.path, tab);
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

    toggleFavoriteTab(tabForEntry(entry));
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
      retitleTab(activeTab.path, response.page.title);
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
    remapWorkspacePath(oldPath, newPath);
  }

  function applyTrashedPathToWorkspaceState(path: string) {
    setFileStates((states) => removeLoadedFileRecords(states, path));
    setPageStates((states) => removeLoadedFileRecords(states, path));
    setLinksStates((states) => removeLoadedFileRecords(states, path));
    setEditorDrafts((drafts) => removeLoadedFileRecords(drafts, path));
    forgetWorkspacePath(path);
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
    setWorldTree(nextWorldTree);
    setPages(nextPages);
    retitleFromPages(nextPages);
    if (pathsToClear.length > 0) {
      clearDerivedFileStates(pathsToClear);
    }
    return nextPages;
  }

  // A file created from the file dialog opens right away, with a clean draft to edit.
  function handleManagedFileCreated(file: WorldFile, nextPages: PageSummary[]) {
    setFileStates((states) => ({ ...states, [file.path]: { status: "ready", file } }));
    setEditorDrafts((drafts) => ({ ...drafts, [file.path]: createEditorDraft(file) }));
    openWorkspaceTab(tabFromFileWithPages(file, nextPages));
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
      await refreshWorldStructure([activeTab.path]);
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

    invalidateSearch();
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
    resetToolPanel();
    resetSearch();
    audio.reset();
    hp.reset();
    bindings.adoptFastSlots([]);
    snapshots.reset();
    resetScripts();
    setDmsOutputSaveDialog({ open: false });
    resetWorkspace();
    setFileStates({});
    setPageStates({});
    setLinksStates({});
    setEditorDrafts({});
    setMetadataEdits({});
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
    setWorldLibrary(nextWorldLibrary);
    setWorldTree(content.tree);
    setPages(content.pages);
    adoptWorkspace(content.workspaces, workspace, Boolean(loadedAt));
    hp.adopt(content.hp.rows, loadedAt?.hp);
    display.setDisplayState(content.display);
    map.adoptMapState(content.map);
    snapshots.adopt(content.tableSnapshots);
    bindings.adoptFastSlots(content.fastSlots, loadedAt?.fastSlots);
    if (!loadedAt) {
      map.setMapPresets([]);
      map.resetViewport();
      invalidateSearch();
    }
    collapseAll();
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

  function captureLogTab(path: string, sourcePages: PageSummary[] = pages): WorkspaceTab {
    const page = sourcePages.find((item) => item.path === path);
    return {
      path,
      name: path.split("/").filter(Boolean).at(-1) ?? path,
      title: page?.title ?? null,
      mediaKind: "markdown"
    };
  }

  // A capture landed in today's log: show it in the tree, reload the log if it is open and not
  // being edited, and remember it as a recent file.
  async function handleCaptureSaved(path: string) {
    const nextPages = await refreshWorldStructure([path]);
    revealPaths([path]);
    const openLogTab = tabState.tabs.find((tab) => tab.path === path);
    const logDraft = editorDrafts[path];
    if (openLogTab && (!logDraft || !isDraftDirty(logDraft))) {
      await reloadTabFile(openLogTab);
    }
    persistRecent(captureLogTab(path, nextPages));
    invalidateSearch();
  }

  function handleOpenPrepHealthSource(issue: PrepHealthIssue) {
    openWorkspaceTab(prepHealthIssueToOpenTab(issue));
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
              revealPaths(paths);
              invalidateSearch();
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
            <button onClick={() => collapseAll()} type="button">
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
            onNew={openCreateWorkspaceDialog}
            onPrepCheck={() => setPrepHealthDialogOpen(true)}
            onRename={openRenameWorkspaceDialog}
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
              onToolToggle={(tool) => handleToolToggle(tool, activeMetadataEdit.mode === "edit")}
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
          openInOtherPane(searchResultToTab(result));
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
            revealPaths(importedPaths);
          }
          invalidateSearch();
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
        onClose={closePathPicker}
        onSelect={selectPath}
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
        onClose={closeFileDialog}
        onFileTypeChange={handleFileDialogTypeChange}
        onPathChange={handleFileDialogPathChange}
        onSubmit={handleSubmitFileDialog}
        state={fileDialog}
      />
      <TrashManagerDialog
        onClose={closeTrashDialog}
        onDelete={(entry) => void handleDeleteTrashEntry(entry)}
        onRestore={(entry) => void handleRestoreTrashEntry(entry)}
        onRestorePathChange={handleTrashRestorePathChange}
        onSetConfirmDelete={setTrashConfirmDelete}
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
        onClose={closeWorkspaceDialog}
        onNameChange={handleWorkspaceDialogNameChange}
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
