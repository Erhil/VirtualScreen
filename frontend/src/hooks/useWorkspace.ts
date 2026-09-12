import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent
} from "react";
import { type Translator } from "../lang";
import {
  activateWorkspace,
  createWorkspace,
  deleteWorkspace,
  fetchWorkspaces,
  recordRecent,
  renameWorkspace,
  saveFavorites,
  saveRecentFiles,
  saveWorkspaceLayout,
  saveWorkspaceTabs,
  type NamedWorkspaceSummary,
  type PageSummary,
  type WorkspaceLayout,
  type WorkspacePaneId,
  type WorkspaceState,
  type WorkspaceTab
} from "../lib/api";
import {
  affectedDescendantPaths,
  isDescendantPath,
  remapMovedWorldPath,
  remapMovedWorkspacePaths,
  removeDescendantWorkspacePaths,
  removeWorkspacePath,
  replaceWorkspacePath
} from "../lib/fileManagement";
import {
  activateTab,
  closeTab,
  isVirtualTabPath,
  openTab,
  openTabToWorkspaceTab,
  SCREEN_TAB_PATH,
  shouldPersistTab,
  workspaceTabToOpenTab,
  type OpenTab,
  type TabState
} from "../lib/tabs";
import {
  chooseSecondaryPaneActiveTab,
  clampWorkspaceSplitRatio,
  defaultWorkspaceLayout,
  normalizeWorkspaceLayout,
  openFileInActivePane,
  recordRecentItem,
  retargetLayoutAfterTabClose,
  toggleFavorite,
  workspacePersistPayload
} from "../lib/workspace";
import { type WorkspaceDialogState } from "../components/workspace/WorkspaceDialog";

export type UseWorkspaceOptions = {
  ready: boolean;
  t: Translator;
  // A tab was opened or activated - App lets the documents retry a failed load for it.
  onTabShown: (path: string) => void;
  // The active named workspace changed (switched, created, restored, or fell back after a delete).
  onWorkspaceChanged: () => Promise<void>;
};

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

// The workspace: open tabs, the pane layout, the named workspaces and their dialog,
// favorites and recent files, and saving all of that to the server.
export function useWorkspace({ ready, t, onTabShown, onWorkspaceChanged }: UseWorkspaceOptions) {
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
  const [tabState, setTabState] = useState<TabState>({ tabs: [], activePath: null });
  const tabStateRef = useRef<TabState>({ tabs: [], activePath: null });
  const activeDocumentTabRef = useRef<OpenTab | null>(null);
  const workspaceReadyRef = useRef(false);

  useEffect(() => {
    workspaceReadyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    currentWorkspaceIdRef.current = currentWorkspaceId;
  }, [currentWorkspaceId]);

  useEffect(() => {
    workspaceLayoutRef.current = workspaceLayout;
  }, [workspaceLayout]);

  useEffect(() => {
    tabStateRef.current = tabState;
  }, [tabState]);

  useEffect(() => {
    if (!ready) {
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
  }, [currentWorkspaceId, tabState, ready]);

  useEffect(() => {
    if (!ready) {
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
  }, [currentWorkspaceId, tabState.tabs, workspaceLayout, ready]);

  const normalizedWorkspaceLayout = normalizeWorkspaceLayout(
    workspaceLayout,
    tabState.tabs.map(openTabToWorkspaceTab)
  );
  const activeTab = tabState.tabs.find((tab) => tab.path === tabState.activePath) ?? null;
  // "Active tab" and "active document" diverge for synthetic tabs (the Screen tab, DMS
  // temporary output): those can be focused in the workspace, but screen actions that mean
  // "the document I'm looking at" should keep targeting the last real document instead of
  // sending a synthetic path like screen://main back to the player screen.
  if (activeTab && !isVirtualTabPath(activeTab.path)) {
    activeDocumentTabRef.current = activeTab;
  }
  const activeDocumentTab =
    activeTab && !isVirtualTabPath(activeTab.path) ? activeTab : activeDocumentTabRef.current;
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
  const favoritePaths = useMemo(() => new Set(favorites.map((favorite) => favorite.path)), [favorites]);

  function persistRecent(tab: WorkspaceTab) {
    setRecentFiles((items) => recordRecentItem(items, tab));
    void recordRecent(tab)
      .then((workspace) => setRecentFiles(workspace.recentFiles))
      .catch(() => {});
  }

  function persistFavoritesAndRecent(nextFavorites: WorkspaceTab[], nextRecentFiles: WorkspaceTab[]) {
    setFavorites(nextFavorites);
    setRecentFiles(nextRecentFiles);
    void saveFavorites(nextFavorites)
      .then((workspace) => setFavorites(workspace.favorites))
      .catch(() => {});
    void saveRecentFiles(nextRecentFiles)
      .then((workspace) => setRecentFiles(workspace.recentFiles))
      .catch(() => {});
  }

  function openTabInActivePane(tab: OpenTab) {
    setTabState((state) => {
      const nextState = openTab(state, tab);
      setWorkspaceLayout((layout) =>
        openFileInActivePane(
          normalizeWorkspaceLayout(layout, nextState.tabs.map(openTabToWorkspaceTab)),
          tab.path
        )
      );
      return nextState;
    });
  }

  function openWorkspaceTab(tab: WorkspaceTab) {
    onTabShown(tab.path);
    openTabInActivePane(workspaceTabToOpenTab(tab));
    persistRecent(tab);
  }

  function handleActivateTab(path: string) {
    onTabShown(path);
    setWorkspaceLayout((layout) =>
      openFileInActivePane(
        normalizeWorkspaceLayout(layout, tabState.tabs.map(openTabToWorkspaceTab)),
        path
      )
    );
    setTabState((state) => activateTab(state, path));
  }

  function closeWorkspaceTab(path: string) {
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

  function openInOtherPane(tab: WorkspaceTab) {
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

  function openVirtualTab(tab: OpenTab) {
    // Opens a tab that has no file on disk, without persistRecent, which would 400 trying
    // to record a recent file for a path that does not exist.
    openTabInActivePane(tab);
  }

  function openScreenTab() {
    openVirtualTab({
      path: SCREEN_TAB_PATH,
      name: t("tools.screen"),
      title: t("tools.screen"),
      mediaKind: "unsupported"
    });
  }

  function replaceVirtualTab(oldPath: string, tab: WorkspaceTab) {
    setTabState((state) =>
      openTab(
        {
          tabs: state.tabs.filter((item) => item.path !== oldPath),
          activePath: state.activePath === oldPath ? null : state.activePath
        },
        workspaceTabToOpenTab(tab)
      )
    );
  }

  function toggleFavoriteTab(tab: WorkspaceTab) {
    const nextFavorites = toggleFavorite(favorites, tab);
    setFavorites(nextFavorites);
    void saveFavorites(nextFavorites)
      .then((workspace) => setFavorites(workspace.favorites))
      .catch(() => {});
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
    await onWorkspaceChanged();
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
        await onWorkspaceChanged();
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
      await onWorkspaceChanged();
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

  function remapWorkspacePath(oldPath: string, newPath: string) {
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
    persistFavoritesAndRecent(nextFavorites, nextRecentFiles);
  }

  function forgetWorkspacePath(path: string) {
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
    persistFavoritesAndRecent(nextFavorites, nextRecentFiles);
  }

  function retitleFromPages(nextPages: PageSummary[]) {
    const pageTitles = new Map(nextPages.map((page) => [page.path, page.title]));
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
  }

  function retitleTab(path: string, title: string) {
    const titledTabs = tabState.tabs.map((tab) =>
      tab.path === path ? { ...tab, title } : tab
    );
    const persistedTitledTabs = titledTabs.filter(shouldPersistTab);
    const persistedActivePath = persistedTitledTabs.some((tab) => tab.path === tabState.activePath)
      ? tabState.activePath
      : persistedTitledTabs[0]?.path ?? null;
    setTabState((state) => ({
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.path === path ? { ...tab, title } : tab
      )
    }));
    void saveWorkspaceTabs(
      persistedTitledTabs.map(openTabToWorkspaceTab),
      persistedActivePath
    ).catch(() => {});
  }

  function resetWorkspace() {
    setTabState({ tabs: [], activePath: null });
    setWorkspaceLayout(defaultWorkspaceLayout());
    setWorkspaces([]);
    setCurrentWorkspaceId("default");
    setCurrentWorkspaceName("Default");
    setWorkspaceDialog({ kind: "closed" });
    setFavorites([]);
    setRecentFiles([]);
  }

  function adoptWorkspace(
    nextWorkspaces: NamedWorkspaceSummary[],
    workspace: WorkspaceState,
    mergeOpenTabs: boolean
  ) {
    const nextTabState = workspaceStateToTabState(workspace);
    setWorkspaces(nextWorkspaces);
    setCurrentWorkspaceId(workspace.workspaceId);
    setCurrentWorkspaceName(workspace.workspaceName);
    setFavorites(workspace.favorites);
    setRecentFiles(workspace.recentFiles);
    if (mergeOpenTabs) {
      setTabState((currentState) =>
        mergeLoadedWorkspaceTabs(currentState, nextTabState.tabs, nextTabState.activePath)
      );
    } else {
      setTabState(nextTabState);
    }
    setWorkspaceLayout(normalizeWorkspaceLayout(workspace.layout, workspace.tabs));
  }

  function replaceWorkspaceCollections(oldPath: string, replacement: WorkspaceTab) {
    const nextFavorites = replaceWorkspacePath(favorites, oldPath, replacement);
    const nextRecentFiles = replaceWorkspacePath(recentFiles, oldPath, replacement);
    persistFavoritesAndRecent(nextFavorites, nextRecentFiles);
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

  function openCreateWorkspaceDialog() {
    setWorkspaceDialog({ kind: "create", name: "", status: "idle", error: null });
  }

  function openRenameWorkspaceDialog() {
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
  }

  function closeWorkspaceDialog() {
    setWorkspaceDialog({ kind: "closed" });
  }

  function handleWorkspaceDialogNameChange(name: string) {
    setWorkspaceDialog((state) =>
      state.kind === "closed" ? state : { ...state, name, error: null }
    );
  }

  return {
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
  };
}
