import type { WorldMediaKind } from "./api";

export type MapViewport = {
  center_x: number;
  center_y: number;
  zoom: number;
};

export type MapReveal = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MapPinVisibility = "player" | "dm";

export type MapPin = {
  id: string;
  x: number;
  y: number;
  label: string;
  visibility: MapPinVisibility;
};

export type MapGrid = {
  enabled: boolean;
  columns: number;
  rows: number;
  visible_to_players: boolean;
};

export type MapGridLine = {
  orientation: "vertical" | "horizontal";
  index: number;
  start: MapPoint;
  end: MapPoint;
};

export type MapState = {
  image_path: string | null;
  title: string | null;
  viewport: MapViewport;
  grid: MapGrid;
  fog_enabled: boolean;
  reveals: MapReveal[];
  pins: MapPin[];
  presenting: boolean;
  updated_at: string;
};

export type MapPreset = {
  id: string;
  name: string;
  state: MapState;
  created_at: string;
  updated_at: string;
};

export type MapPoint = {
  x: number;
  y: number;
};

export type MapSize = {
  width: number;
  height: number;
};

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MapRevealPayload = Omit<MapReveal, "id">;
export type MapPinPayload = Omit<MapPin, "id" | "visibility"> & {
  visibility?: MapPinVisibility;
};

export type LocationLike = {
  protocol: string;
  host: string;
};

export const blankMapState: MapState = {
  image_path: null,
  title: null,
  viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
  grid: { enabled: false, columns: 10, rows: 10, visible_to_players: true },
  fog_enabled: false,
  reveals: [],
  pins: [],
  presenting: false,
  updated_at: ""
};

function mapStateTime(state: MapState): number | null {
  const parsed = Date.parse(state.updated_at);
  return Number.isFinite(parsed) ? parsed : null;
}

export function shouldAdoptMapState(current: MapState | null, incoming: MapState): boolean {
  if (!current) {
    return true;
  }
  const currentTime = mapStateTime(current);
  const incomingTime = mapStateTime(incoming);
  if (currentTime === null || incomingTime === null) {
    return true;
  }
  return incomingTime >= currentTime;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clampUnit(value: number): number {
  return roundCoordinate(clamp(finiteOr(value, 0), 0, 1));
}

function clampGridSize(value: number): number {
  return clamp(Math.round(finiteOr(value, 1)), 1, 200);
}

export function clampMapViewport(viewport: MapViewport): MapViewport {
  return {
    center_x: clampUnit(viewport.center_x),
    center_y: clampUnit(viewport.center_y),
    zoom: roundCoordinate(clamp(finiteOr(viewport.zoom, 1), 0.5, 6))
  };
}

export const clampViewport = clampMapViewport;

export function clampMapGrid(grid: MapGrid): MapGrid {
  return {
    enabled: Boolean(grid.enabled),
    columns: clampGridSize(grid.columns),
    rows: clampGridSize(grid.rows),
    visible_to_players: Boolean(grid.visible_to_players)
  };
}

export function normalizedMapGridLines(grid: MapGrid): MapGridLine[] {
  const normalized = clampMapGrid(grid);
  if (!normalized.enabled) {
    return [];
  }

  const lines: MapGridLine[] = [];
  for (let column = 1; column < normalized.columns; column += 1) {
    const x = roundCoordinate(column / normalized.columns);
    lines.push({
      orientation: "vertical",
      index: column,
      start: { x, y: 0 },
      end: { x, y: 1 }
    });
  }

  for (let row = 1; row < normalized.rows; row += 1) {
    const y = roundCoordinate(row / normalized.rows);
    lines.push({
      orientation: "horizontal",
      index: row,
      start: { x: 0, y },
      end: { x: 1, y }
    });
  }

  return lines;
}

export function formatMapMeasurementLabel(squares: number): string {
  const rounded = Math.round(Math.max(0, finiteOr(squares, 0)) * 10) / 10;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${value} sq`;
}

export function normalizeMapPoint(point: MapPoint): MapPoint {
  return {
    x: clampUnit(point.x),
    y: clampUnit(point.y)
  };
}

export function normalizeMapRect(start: MapPoint, end: MapPoint): Omit<MapReveal, "id"> {
  const first = normalizeMapPoint(start);
  const second = normalizeMapPoint(end);
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  return {
    x,
    y,
    width: Number(Math.abs(first.x - second.x).toFixed(4)),
    height: Number(Math.abs(first.y - second.y).toFixed(4))
  };
}

export const normalizeRevealRect = normalizeMapRect;

export function isUsableMapImageSize(size: MapSize): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

export function fitMapImageToStage(stage: MapSize, image: MapSize): MapSize {
  if (!isUsableMapImageSize(stage) || !isUsableMapImageSize(image)) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(stage.width / image.width, stage.height / image.height);
  return {
    width: roundCoordinate(image.width * scale),
    height: roundCoordinate(image.height * scale)
  };
}

export function mapFogClassName(mode: "dm" | "player"): string {
  return `map-canvas-fog map-canvas-fog-${mode}`;
}

export function mapFogOverlayOpacity(mode: "dm" | "player"): number {
  return mode === "dm" ? 0.7 : 1;
}

export function mapFogRevealRects(reveals: MapReveal[]): MapRevealPayload[] {
  return reveals
    .map((reveal) => {
      const x1 = clamp(reveal.x, 0, 1);
      const y1 = clamp(reveal.y, 0, 1);
      const x2 = clamp(reveal.x + reveal.width, 0, 1);
      const y2 = clamp(reveal.y + reveal.height, 0, 1);
      return {
        x: roundCoordinate(Math.min(x1, x2)),
        y: roundCoordinate(Math.min(y1, y2)),
        width: roundCoordinate(Math.abs(x2 - x1)),
        height: roundCoordinate(Math.abs(y2 - y1))
      };
    })
    .filter((reveal) => reveal.width > 0 && reveal.height > 0);
}

export type ViewportSyncPlan = {
  preview: MapViewport;
  sync: MapViewport | null;
  pending: MapViewport | null;
  lastSyncedAt: number;
};

export function planViewportSync({
  viewport,
  now,
  lastSyncedAt,
  intervalMs = 1_000,
  flush = false
}: {
  viewport: MapViewport;
  now: number;
  lastSyncedAt: number;
  intervalMs?: number;
  flush?: boolean;
}): ViewportSyncPlan {
  const preview = clampMapViewport(viewport);
  if (flush || now - lastSyncedAt >= intervalMs) {
    return {
      preview,
      sync: preview,
      pending: null,
      lastSyncedAt: now
    };
  }

  return {
    preview,
    sync: null,
    pending: preview,
    lastSyncedAt
  };
}

export function isMapPresenting(state: MapState | null | undefined): state is MapState & {
  image_path: string;
} {
  return Boolean(state?.presenting && state.image_path);
}

function fileNameFromPath(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

async function sendJson<T>(
  path: string,
  method: "DELETE" | "POST" | "PUT",
  body?: unknown
): Promise<T> {
  const response = await fetch(path, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

export function fetchMapState(): Promise<MapState> {
  return getJson<MapState>("/api/map/state");
}

export function fetchMapPresets(): Promise<{ presets: MapPreset[] }> {
  return getJson<{ presets: MapPreset[] }>("/api/map/presets");
}

export function setMapSource(imagePath: string): Promise<MapState> {
  return sendJson<MapState>("/api/map/source", "PUT", { image_path: imagePath });
}

export function setMapViewport(viewport: MapViewport): Promise<MapState> {
  return sendJson<MapState>("/api/map/viewport", "PUT", {
    viewport: clampMapViewport(viewport)
  });
}

export function setMapFog(fogEnabled: boolean): Promise<MapState> {
  return sendJson<MapState>("/api/map/fog", "PUT", { fog_enabled: fogEnabled });
}

export function setMapGrid(grid: MapGrid): Promise<MapState> {
  return sendJson<MapState>("/api/map/grid", "PUT", clampMapGrid(grid));
}

export function addMapReveal(reveal: MapRevealPayload): Promise<MapState> {
  return sendJson<MapState>("/api/map/reveals", "POST", reveal);
}

export function deleteMapReveal(revealId: string): Promise<MapState> {
  return sendJson<MapState>(
    `/api/map/reveals/${encodeURIComponent(revealId)}`,
    "DELETE"
  );
}

export function clearMapReveals(): Promise<MapState> {
  return sendJson<MapState>("/api/map/reveals", "DELETE");
}

export function addMapPin(pin: MapPinPayload): Promise<MapState> {
  return sendJson<MapState>("/api/map/pins", "POST", {
    ...pin,
    visibility: pin.visibility ?? "player"
  });
}

export function deleteMapPin(pinId: string): Promise<MapState> {
  return sendJson<MapState>(`/api/map/pins/${encodeURIComponent(pinId)}`, "DELETE");
}

export function presentMap(): Promise<MapState> {
  return sendJson<MapState>("/api/map/present", "POST");
}

export function stopMap(): Promise<MapState> {
  return sendJson<MapState>("/api/map/stop", "POST");
}

export function saveMapPreset(name: string, state?: MapState): Promise<MapPreset> {
  return sendJson<MapPreset>(
    "/api/map/presets",
    "POST",
    state === undefined ? { name } : { name, state }
  );
}

export function loadMapPreset(presetId: string): Promise<MapState> {
  return sendJson<MapState>(`/api/map/presets/${encodeURIComponent(presetId)}/load`, "POST");
}

export function deleteMapPreset(presetId: string): Promise<{ deleted: boolean }> {
  return sendJson<{ deleted: boolean }>(
    `/api/map/presets/${encodeURIComponent(presetId)}`,
    "DELETE"
  );
}

export function buildMapMediaUrl(path: string): string {
  return `/api/world/media?path=${encodeURIComponent(path)}`;
}

export function buildScreenMapMediaUrl(path: string): string {
  return `/api/screen/map/media?path=${encodeURIComponent(path)}`;
}

export function buildMapEventsUrl(location: LocationLike = window.location): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/map`;
}

export function buildScreenMapEventsUrl(location: LocationLike = window.location): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/screen/map`;
}

export async function fetchScreenMapState(): Promise<MapState> {
  return getJson<MapState>("/api/screen/map/state");
}

export function createPinPayload(
  point: MapPoint,
  label: string,
  visibility: MapPinVisibility = "player"
): MapPinPayload {
  return {
    ...normalizeMapPoint(point),
    label: label.trim(),
    visibility
  };
}

export function clientPointToImagePoint(
  clientX: number,
  clientY: number,
  rect: RectLike
): MapPoint {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }

  return normalizeMapPoint({
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height
  });
}

export function normalizePointerToImagePoint(
  point: { clientX: number; clientY: number },
  rect: RectLike
): MapPoint {
  return clientPointToImagePoint(point.clientX, point.clientY, rect);
}

export function isImageMapCandidate(mediaKind: WorldMediaKind): boolean {
  return mediaKind === "image";
}

export function mapSummary(state: MapState): string {
  if (!state.image_path) {
    return "No map";
  }

  const label = state.title || fileNameFromPath(state.image_path);
  return state.presenting ? `Presenting: ${label}` : `Ready: ${label}`;
}

export function nextMapState(_current: MapState, event: MapState): MapState {
  return event;
}

export type MapEventClientOptions = {
  onEvent: (event: MapState) => void;
  reconnectMs?: number;
  url?: string;
};

export function createMapEventClient({
  onEvent,
  reconnectMs = 1000,
  url = buildScreenMapEventsUrl()
}: MapEventClientOptions): () => void {
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
        onEvent(JSON.parse(message.data) as MapState);
      } catch {
        // Ignore malformed local map events; the next valid state will recover the screen.
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
