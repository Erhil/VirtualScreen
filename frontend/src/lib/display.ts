import type {
  DisplayPopup,
  DisplayPopupPreset,
  DisplayState
} from "./api";
import type { MapState } from "./map";

export type { DisplayState };
export type ScreenPrimaryMode = "blank" | "fullscreen" | "map";

export type LocationLike = {
  protocol: string;
  host: string;
};

export function buildDisplayEventsUrl(location: LocationLike = window.location): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/display`;
}

export function buildScreenDisplayEventsUrl(location: LocationLike = window.location): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/screen/display`;
}

const popupPresets = new Set<DisplayPopupPreset>([
  "plain",
  "note",
  "letter",
  "portrait",
  "clue"
]);

export function displayPopupPreset(popup: DisplayPopup): DisplayPopupPreset {
  return popupPresets.has(popup.preset as DisplayPopupPreset) ? popup.preset! : "plain";
}

export function displayPopupClassName(popup: DisplayPopup): string {
  return `screen-popup screen-popup-${displayPopupPreset(popup)}`;
}

export function isDisplayPopupVisible(popup: DisplayPopup): boolean {
  return popup.visible !== false;
}

export function visibleDisplayPopups(popups: DisplayPopup[]): DisplayPopup[] {
  return popups.filter(isDisplayPopupVisible);
}

export function hasResidualPopupsAfterBlank(state: DisplayState): boolean {
  return state.popups.length > 0;
}

export function screenPrimaryMode(
  displayState: DisplayState | null,
  mapState: MapState | null
): ScreenPrimaryMode {
  if (mapState?.presenting && mapState.image_path) {
    return "map";
  }
  if (displayState?.fullscreen) {
    return "fullscreen";
  }
  return "blank";
}

export function screenPrimaryTitle(
  displayState: DisplayState | null,
  mapState: MapState | null
): string | null {
  const mode = screenPrimaryMode(displayState, mapState);
  if (mode === "map") {
    return mapState?.title ?? mapState?.image_path ?? null;
  }
  if (mode === "fullscreen") {
    return displayState?.fullscreen?.title ?? displayState?.fullscreen?.name ?? null;
  }
  return null;
}

export function visibleScreenPopupCount(displayState: DisplayState | null): number {
  return visibleDisplayPopups(displayState?.popups ?? []).length;
}

export type DisplayEventClientOptions = {
  onEvent: (event: DisplayState) => void;
  reconnectMs?: number;
  url?: string;
};

export function createDisplayEventClient({
  onEvent,
  reconnectMs = 1000,
  url = buildDisplayEventsUrl()
}: DisplayEventClientOptions): () => void {
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

    socket = new WebSocket(url);
    socket.addEventListener("message", (message) => {
      try {
        onEvent(JSON.parse(message.data) as DisplayState);
      } catch {
        // Ignore malformed local display events; the next valid state will recover the screen.
      }
    });
    socket.addEventListener("close", () => {
      if (stopped) {
        return;
      }
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
  };
}
