export type WorldEvent = {
  type: "world_changed";
  paths: string[];
  deleted_paths: string[];
  reason: "created" | "modified" | "deleted" | "mixed";
  source: "watcher" | "api";
  rebuilt_at: string;
};

export type SyncStatus = "live" | "reconnecting" | "offline";

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

export function nextSyncStatus(
  _current: SyncStatus,
  action: "connected" | "disconnected" | "stopped"
): SyncStatus {
  if (action === "connected") {
    return "live";
  }
  if (action === "stopped") {
    return "offline";
  }
  return "reconnecting";
}

export type WorldEventClientOptions = {
  onEvent: (event: WorldEvent) => void;
  onStatus: (status: SyncStatus) => void;
  reconnectMs?: number;
  url?: string;
};

export function createWorldEventClient({
  onEvent,
  onStatus,
  reconnectMs = 1000,
  url = buildEventsUrl()
}: WorldEventClientOptions): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let stopped = false;

  function clearReconnect() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function connect() {
    if (stopped) {
      return;
    }

    onStatus("reconnecting");
    socket = new WebSocket(url);
    socket.addEventListener("open", () => onStatus("live"));
    socket.addEventListener("message", (message) => {
      try {
        onEvent(JSON.parse(message.data) as WorldEvent);
      } catch {
        // Ignore malformed local sync events; the next valid event will recover state.
      }
    });
    socket.addEventListener("close", () => {
      if (stopped) {
        onStatus("offline");
        return;
      }
      onStatus("reconnecting");
      clearReconnect();
      reconnectTimer = window.setTimeout(connect, reconnectMs);
    });
    socket.addEventListener("error", () => {
      socket?.close();
    });
  }

  connect();

  return () => {
    stopped = true;
    clearReconnect();
    socket?.close();
    onStatus("offline");
  };
}
