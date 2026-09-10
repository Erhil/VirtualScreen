import type { SearchResult, WorkspaceLayout, WorkspaceState, WorkspaceTab } from "./api";

export type SearchResultGroup = {
  label: string;
  results: SearchResult[];
};

const GROUP_LABELS: Record<SearchResult["media_kind"], string> = {
  card: "Cards",
  csv: "CSV",
  image: "Images",
  markdown: "Markdown",
  pdf: "PDF",
  script: "Scripts",
  text: "Text",
  video: "Video",
  folder: "Folders",
  unsupported: "Unsupported"
};

const GROUP_ORDER: SearchResult["media_kind"][] = [
  "markdown",
  "card",
  "csv",
  "script",
  "image",
  "pdf",
  "video",
  "folder",
  "text",
  "unsupported"
];

export function groupSearchResults(results: SearchResult[]): SearchResultGroup[] {
  return GROUP_ORDER.map((mediaKind) => ({
    label: GROUP_LABELS[mediaKind],
    results: results.filter((result) => result.media_kind === mediaKind)
  })).filter((group) => group.results.length > 0);
}

export function searchResultToTab(result: SearchResult): WorkspaceTab {
  return {
    path: result.path,
    name: result.name,
    title: result.title,
    mediaKind: result.media_kind
  };
}

export function isFavorite(favorites: WorkspaceTab[], path: string): boolean {
  return favorites.some((favorite) => favorite.path === path);
}

export function toggleFavorite(favorites: WorkspaceTab[], tab: WorkspaceTab): WorkspaceTab[] {
  if (isFavorite(favorites, tab.path)) {
    return favorites.filter((favorite) => favorite.path !== tab.path);
  }

  return [...favorites, tab];
}

export function recordRecentItem(
  recentFiles: WorkspaceTab[],
  tab: WorkspaceTab,
  limit = 20
): WorkspaceTab[] {
  return [tab, ...recentFiles.filter((recent) => recent.path !== tab.path)].slice(0, limit);
}

export function clampWorkspaceSplitRatio(splitRatio: number): number {
  return Math.min(0.75, Math.max(0.25, splitRatio));
}

export function defaultWorkspaceLayout(activePath: string | null = null): WorkspaceLayout {
  return {
    mode: "single",
    activePaneId: "main",
    panes: [
      { id: "main", activePath },
      { id: "secondary", activePath: null }
    ],
    splitRatio: 0.5
  };
}

function tabPaths(tabs: WorkspaceTab[]): Set<string> {
  return new Set(tabs.map((tab) => tab.path));
}

function normalizePaneActivePath(
  activePath: string | null | undefined,
  paths: Set<string>
): string | null {
  return activePath && paths.has(activePath) ? activePath : null;
}

export function normalizeWorkspaceLayout(
  layout: WorkspaceLayout | null | undefined,
  tabs: WorkspaceTab[]
): WorkspaceLayout {
  const paths = tabPaths(tabs);
  if (!layout) {
    return defaultWorkspaceLayout(tabs[0]?.path ?? null);
  }

  const mainPane = layout.panes.find((pane) => pane.id === "main");
  const secondaryPane = layout.panes.find((pane) => pane.id === "secondary");

  return {
    mode: layout.mode === "vertical_split" ? "vertical_split" : "single",
    activePaneId: layout.activePaneId === "secondary" ? "secondary" : "main",
    panes: [
      {
        id: "main",
        activePath: normalizePaneActivePath(mainPane?.activePath, paths)
      },
      {
        id: "secondary",
        activePath: normalizePaneActivePath(secondaryPane?.activePath, paths)
      }
    ],
    splitRatio: clampWorkspaceSplitRatio(layout.splitRatio)
  };
}

export function chooseSecondaryPaneActiveTab(
  tabs: WorkspaceTab[],
  primaryActivePath: string | null
): string | null {
  return tabs.find((tab) => tab.path !== primaryActivePath)?.path ?? null;
}

export function openFileInActivePane(
  layout: WorkspaceLayout,
  path: string
): WorkspaceLayout {
  return {
    ...layout,
    panes: layout.panes.map((pane) =>
      pane.id === layout.activePaneId ? { ...pane, activePath: path } : pane
    )
  };
}

export function retargetLayoutAfterTabClose(
  layout: WorkspaceLayout,
  remainingTabs: WorkspaceTab[],
  closedPath: string
): WorkspaceLayout {
  const paths = tabPaths(remainingTabs);
  const mainActivePath =
    layout.panes.find((pane) => pane.id === "main")?.activePath ?? null;
  const nextMainPath =
    mainActivePath === closedPath
      ? remainingTabs[0]?.path ?? null
      : normalizePaneActivePath(mainActivePath, paths);
  const secondaryActivePath =
    layout.panes.find((pane) => pane.id === "secondary")?.activePath ?? null;

  return {
    ...layout,
    panes: [
      {
        id: "main",
        activePath: nextMainPath
      },
      {
        id: "secondary",
        activePath: secondaryActivePath === closedPath
          ? chooseSecondaryPaneActiveTab(remainingTabs, nextMainPath)
          : normalizePaneActivePath(secondaryActivePath, paths)
      }
    ]
  };
}

export function switchWorkspaceSession(
  current: WorkspaceState,
  incoming: WorkspaceState
): WorkspaceState {
  return {
    ...incoming,
    favorites: current.favorites,
    recentFiles: current.recentFiles
  };
}

export type WorkspacePersistPayload = {
  tabs: WorkspaceTab[];
  activePath: string | null;
  layout: WorkspaceLayout;
};

/**
 * Decide what actually gets sent to the server for a workspace.
 *
 * The backend validates every tab path against the filesystem and then requires each
 * pane's activePath to be among the tabs it just stored, so temporary tabs have to be
 * dropped from the tab list *and* from the layout that is normalized against it. Doing
 * only the first leaves a pane pointing at a path the server has never heard of, which
 * it rejects - and the caller swallows that rejection, so the layout quietly stops
 * being saved for as long as such a tab is focused.
 */
export function workspacePersistPayload(
  tabs: WorkspaceTab[],
  activePath: string | null,
  layout: WorkspaceLayout | null | undefined,
  isPersistable: (tab: WorkspaceTab) => boolean
): WorkspacePersistPayload {
  const persistedTabs = tabs.filter(isPersistable);
  return {
    tabs: persistedTabs,
    activePath: persistedTabs.some((tab) => tab.path === activePath)
      ? activePath
      : persistedTabs[0]?.path ?? null,
    layout: normalizeWorkspaceLayout(layout, persistedTabs)
  };
}
