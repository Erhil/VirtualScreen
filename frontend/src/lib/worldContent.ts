import {
  fetchDisplayState,
  fetchFastSlots,
  fetchHpTracker,
  fetchPages,
  fetchTableSnapshots,
  fetchWorkspace,
  fetchWorkspaces,
  fetchWorldTree
} from "./api";
import { fetchMapState } from "./map";

// Everything the console shows for the open world, fetched together on load and on a switch.
export async function fetchWorldContent() {
  const [tree, pages, workspace, hp, workspaces, display, fastSlots, map, tableSnapshots] =
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
  return { tree, pages, workspace, hp, workspaces, display, fastSlots, map, tableSnapshots };
}

export type WorldContent = Awaited<ReturnType<typeof fetchWorldContent>>;
