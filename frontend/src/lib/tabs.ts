import type { PageSummary, WorldEntry, WorldMediaKind, WorkspaceTab } from "./api";

export type OpenTab = {
  path: string;
  name: string;
  title?: string | null;
  mediaKind: WorldMediaKind | "unsupported";
};

export type TabState = {
  tabs: OpenTab[];
  activePath: string | null;
};

export function openTab(state: TabState, tab: OpenTab): TabState {
  if (state.tabs.some((openTabItem) => openTabItem.path === tab.path)) {
    return { ...state, activePath: tab.path };
  }

  return {
    tabs: [...state.tabs, tab],
    activePath: tab.path
  };
}

export function activateTab(state: TabState, path: string): TabState {
  if (!state.tabs.some((tab) => tab.path === path)) {
    return state;
  }

  return { ...state, activePath: path };
}

export function closeTab(state: TabState, path: string): TabState {
  const closedIndex = state.tabs.findIndex((tab) => tab.path === path);
  if (closedIndex === -1) {
    return state;
  }

  const nextTabs = state.tabs.filter((tab) => tab.path !== path);
  if (state.activePath !== path) {
    return { tabs: nextTabs, activePath: state.activePath };
  }

  const fallbackTab = nextTabs[closedIndex] ?? nextTabs[closedIndex - 1] ?? null;
  return {
    tabs: nextTabs,
    activePath: fallbackTab?.path ?? null
  };
}

export function shouldConfirmDirtyTabClose(
  path: string,
  dirtyPaths: ReadonlySet<string>
): boolean {
  return dirtyPaths.has(path);
}

export function dirtyTabCloseMessage(tab: Pick<OpenTab, "name" | "title">): string {
  return `Close ${tab.title ?? tab.name} without saving changes?`;
}

const TEXT_EXTENSIONS: Record<string, WorldMediaKind> = {
  csv: "csv",
  cs: "card",
  dms: "script",
  markdown: "markdown",
  md: "markdown",
  txt: "text"
};
const IMAGE_EXTENSIONS = new Set(["gif", "jpeg", "jpg", "png", "svg", "webp"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const VIDEO_EXTENSIONS = new Set(["mp4"]);

export function mediaKindForPath(path: string): OpenTab["mediaKind"] {
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

export function mediaKindForEntry(entry: WorldEntry): OpenTab["mediaKind"] {
  return mediaKindForPath(entry.extension ? `file.${entry.extension}` : entry.path);
}

export function workspaceTabFromPath(path: string, pages: PageSummary[]): WorkspaceTab {
  const page = pages.find((pageItem) => pageItem.path === path);
  const name = path.split("/").at(-1) || path;
  return {
    path,
    name,
    title: page?.title ?? null,
    mediaKind: mediaKindForPath(path)
  };
}

export function workspaceTabToOpenTab(tab: WorkspaceTab): OpenTab {
  return {
    path: tab.path,
    name: tab.name,
    title: tab.title,
    mediaKind: tab.mediaKind
  };
}

export function openTabToWorkspaceTab(tab: OpenTab): WorkspaceTab {
  return {
    path: tab.path,
    name: tab.name,
    title: tab.title ?? null,
    mediaKind: tab.mediaKind
  };
}
