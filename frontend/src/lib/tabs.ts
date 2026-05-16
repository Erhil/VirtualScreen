import type { WorldMediaKind } from "./api";

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
