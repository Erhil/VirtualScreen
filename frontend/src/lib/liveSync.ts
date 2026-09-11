export type WorldEvent = {
  type: "world_changed";
  paths: string[];
  deleted_paths: string[];
  reason: "created" | "modified" | "deleted" | "mixed";
  source: "watcher" | "api";
  rebuilt_at: string;
};

export type LocationLike = {
  protocol: string;
  host: string;
};

export type WorldEventPlan = {
  activeChanged: boolean;
  activeDeleted: boolean;
  affectedPaths: string[];
  refetchActive: boolean;
  markDraftChanged: boolean;
};

export function buildEventsUrl(location: LocationLike = window.location): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/events`;
}

export function affectedWorldPaths(event: WorldEvent): string[] {
  return Array.from(new Set([...event.paths, ...event.deleted_paths]));
}

export function planWorldEventUpdate(
  event: WorldEvent,
  activePath: string | null,
  activeDirty: boolean
): WorldEventPlan {
  const changedPaths = new Set(event.paths);
  const deletedPaths = new Set(event.deleted_paths);
  const activeChanged = activePath !== null && changedPaths.has(activePath);
  const activeDeleted = activePath !== null && deletedPaths.has(activePath);

  return {
    activeChanged,
    activeDeleted,
    affectedPaths: affectedWorldPaths(event),
    refetchActive: activeChanged && !activeDirty && !activeDeleted,
    markDraftChanged: activeChanged && activeDirty && !activeDeleted
  };
}

