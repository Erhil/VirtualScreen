import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from "react";

import {
  clampMapViewport,
  fitMapImageToStage,
  isUsableMapImageSize,
  mapFogClassName,
  mapFogRevealRects,
  normalizeMapPoint,
  normalizeMapRect,
  type MapPoint,
  type MapReveal,
  type MapSize,
  type MapState,
  type MapViewport
} from "./lib/map";

export type MapCanvasTool = "pan" | "reveal" | "pin" | "measure";

type MapGridState = {
  enabled?: boolean;
  columns?: number;
  cols?: number;
  rows?: number;
  cell_size?: number;
  cellSize?: number;
  cell_width?: number;
  cellWidth?: number;
  cell_height?: number;
  cellHeight?: number;
  normalized_cell_size?: number;
  normalizedCellSize?: number;
  distance_per_cell?: number;
  distancePerCell?: number;
  feet_per_cell?: number;
  feetPerCell?: number;
  unit?: string;
  units?: string;
  color?: string;
  opacity?: number;
};

type MapCanvasPin = MapState["pins"][number] & {
  audience?: string;
  dm_only?: boolean;
  dmOnly?: boolean;
  is_dm_only?: boolean;
  isDmOnly?: boolean;
  scope?: string;
  visibility?: string;
  visible_to_players?: boolean;
  visibleToPlayers?: boolean;
};

type MapCanvasState = Omit<MapState, "pins"> & {
  grid?: MapGridState | null;
  pins: MapCanvasPin[];
};

export type MapCanvasProps = {
  state: MapCanvasState;
  mediaUrlBuilder: (path: string) => string;
  mode?: "dm" | "player";
  tool?: MapCanvasTool;
  className?: string;
  emptyMessage?: string;
  onViewportPreview?: (viewport: MapViewport) => void;
  onViewportCommit?: (viewport: MapViewport) => void;
  onRevealCreate?: (reveal: Omit<MapReveal, "id">) => void;
  onPinCreate?: (point: MapPoint) => void;
};

type DragState =
  | {
      kind: "pan";
      clientX: number;
      clientY: number;
      viewport: MapViewport;
    }
  | {
      kind: "reveal";
      start: MapPoint;
    }
  | {
      kind: "measure";
      start: MapPoint;
    };

type GridSpec = {
  columns: number;
  rows: number;
  distancePerCell: number;
  unit: string;
  color?: string;
  opacity?: number;
};

type MeasurementPreview = {
  start: MapPoint;
  end: MapPoint;
};

function eventToMapPoint(event: ReactPointerEvent, world: HTMLDivElement | null): MapPoint | null {
  if (!world) {
    return null;
  }

  const rect = world.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return normalizeMapPoint({
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  });
}

function parseLength(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const match = value.trim().match(/^([0-9.]+)/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseSvgSize(text: string): MapSize | null {
  const svgMatch = text.match(/<svg\b[^>]*>/i);
  if (!svgMatch) {
    return null;
  }

  const svgTag = svgMatch[0];
  const width = parseLength(svgTag.match(/\bwidth=["']([^"']+)["']/i)?.[1] ?? null);
  const height = parseLength(svgTag.match(/\bheight=["']([^"']+)["']/i)?.[1] ?? null);
  if (width && height) {
    return { width, height };
  }

  const viewBox = svgTag.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  const parts = viewBox?.trim().split(/[\s,]+/).map(Number) ?? [];
  if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3]) && parts[2] > 0 && parts[3] > 0) {
    return { width: parts[2], height: parts[3] };
  }
  return null;
}

async function loadSvgSize(url: string): Promise<MapSize | null> {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return parseSvgSize(await response.text());
}

function positiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function firstPositive(grid: MapGridState, keys: Array<keyof MapGridState>): number | null {
  for (const key of keys) {
    const value = positiveNumber(grid[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function resolveGridSpec(grid: MapGridState | null | undefined, imageSize: MapSize): GridSpec | null {
  if (!grid?.enabled) {
    return null;
  }

  const explicitColumns = firstPositive(grid, ["columns", "cols"]);
  const explicitRows = firstPositive(grid, ["rows"]);
  const normalizedCellSize = firstPositive(grid, ["normalized_cell_size", "normalizedCellSize"]);
  const cellWidth = firstPositive(grid, ["cell_width", "cellWidth", "cell_size", "cellSize"]);
  const cellHeight = firstPositive(grid, ["cell_height", "cellHeight", "cell_size", "cellSize"]);

  const columns =
    explicitColumns ??
    (normalizedCellSize ? 1 / normalizedCellSize : null) ??
    (cellWidth && isUsableMapImageSize(imageSize) ? imageSize.width / cellWidth : null) ??
    10;
  const rows =
    explicitRows ??
    (normalizedCellSize ? 1 / normalizedCellSize : null) ??
    (cellHeight && isUsableMapImageSize(imageSize) ? imageSize.height / cellHeight : null) ??
    10;

  return {
    columns: Math.min(200, Math.max(1, columns)),
    rows: Math.min(200, Math.max(1, rows)),
    distancePerCell:
      firstPositive(grid, ["distance_per_cell", "distancePerCell", "feet_per_cell", "feetPerCell"]) ?? 1,
    unit: grid.unit ?? grid.units ?? "cells",
    color: grid.color,
    opacity: positiveNumber(grid.opacity) ?? undefined
  };
}

function formatNumber(value: number): string {
  if (value >= 100) {
    return String(Math.round(value));
  }
  if (value >= 10) {
    return value.toFixed(1).replace(/\.0$/, "");
  }
  return value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}

function formatMeasurementLabel(
  measurement: MeasurementPreview,
  gridSpec: GridSpec | null,
  imageSize: MapSize
): string {
  const dx = measurement.end.x - measurement.start.x;
  const dy = measurement.end.y - measurement.start.y;

  if (gridSpec) {
    const cells = Math.hypot(dx * gridSpec.columns, dy * gridSpec.rows);
    const distance = cells * gridSpec.distancePerCell;
    return `${formatNumber(distance)} ${gridSpec.unit}`;
  }

  if (isUsableMapImageSize(imageSize)) {
    return `${Math.round(Math.hypot(dx * imageSize.width, dy * imageSize.height))} px`;
  }

  return `${formatNumber(Math.hypot(dx, dy) * 100)}%`;
}

function isDmOnlyPin(pin: MapCanvasPin): boolean {
  if (
    pin.dm_only === true ||
    pin.dmOnly === true ||
    pin.is_dm_only === true ||
    pin.isDmOnly === true ||
    pin.visible_to_players === false ||
    pin.visibleToPlayers === false
  ) {
    return true;
  }

  const visibility = [pin.visibility, pin.audience, pin.scope]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());
  return visibility.some((value) => ["dm", "dm-only", "dm_only", "private", "hidden"].includes(value));
}

export function MapCanvas({
  state,
  mediaUrlBuilder,
  mode = "dm",
  tool = "pan",
  className = "",
  emptyMessage = "No map selected.",
  onViewportPreview,
  onViewportCommit,
  onRevealCreate,
  onPinCreate
}: MapCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const previewRevealRef = useRef<Omit<MapReveal, "id"> | null>(null);
  const previewMeasurementRef = useRef<MeasurementPreview | null>(null);
  const restoreStageFocusRef = useRef(false);
  const latestViewportRef = useRef<MapViewport>(state.viewport);
  const viewportCommitTimerRef = useRef<number | null>(null);
  const rawId = useId();
  const maskId = `map-fog-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [stageSize, setStageSize] = useState<MapSize>({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState<MapSize>({ width: 0, height: 0 });
  const [imageStatus, setImageStatus] = useState<"loading" | "ready" | "error">("loading");
  const [previewReveal, setPreviewReveal] = useState<Omit<MapReveal, "id"> | null>(null);
  const [previewMeasurement, setPreviewMeasurement] = useState<MeasurementPreview | null>(null);

  const viewport = clampMapViewport(state.viewport);
  const readOnly = mode === "player";
  const canMeasure = mode === "dm" && tool === "measure";
  const imageUrl = state.image_path ? mediaUrlBuilder(state.image_path) : "";
  const fittedSize = useMemo(() => fitMapImageToStage(stageSize, imageSize), [stageSize, imageSize]);
  const imageReady = imageStatus === "ready" && isUsableMapImageSize(fittedSize);
  const interactive =
    !readOnly &&
    imageReady &&
    (canMeasure || Boolean(onViewportPreview || onViewportCommit || onRevealCreate || onPinCreate));
  const gridSpec = useMemo(() => resolveGridSpec(state.grid, imageSize), [state.grid, imageSize]);
  const revealRects = useMemo(() => mapFogRevealRects(state.reveals), [state.reveals]);
  latestViewportRef.current = viewport;

  function updatePreviewReveal(reveal: Omit<MapReveal, "id"> | null) {
    previewRevealRef.current = reveal;
    setPreviewReveal(reveal);
  }

  function updatePreviewMeasurement(measurement: MeasurementPreview | null) {
    previewMeasurementRef.current = measurement;
    setPreviewMeasurement(measurement);
  }

  function requestStageFocusRestore() {
    restoreStageFocusRef.current = true;
  }

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }
    const stageElement = stageRef.current;

    function updateSize() {
      const rect = stageElement.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    }

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (viewportCommitTimerRef.current) {
        window.clearTimeout(viewportCommitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setImageSize({ width: 0, height: 0 });
    setImageStatus(state.image_path ? "loading" : "error");
    updatePreviewReveal(null);
    updatePreviewMeasurement(null);
    dragRef.current = null;
  }, [state.image_path]);

  useEffect(() => {
    const image = imageRef.current;
    if (state.image_path && image?.complete) {
      void markImageLoaded(image);
    }
  }, [imageUrl, state.image_path]);

  useEffect(() => {
    if (!canMeasure) {
      updatePreviewMeasurement(null);
      if (dragRef.current?.kind === "measure") {
        dragRef.current = null;
      }
    }
  }, [canMeasure]);

  useEffect(() => {
    if (!restoreStageFocusRef.current) {
      return;
    }
    restoreStageFocusRef.current = false;
    window.requestAnimationFrame(() => {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }
      const activeElement = document.activeElement;
      if (activeElement === stage || activeElement === document.body) {
        stage.focus({ preventScroll: true });
      }
    });
  }, [
    state.fog_enabled,
    state.pins.length,
    state.reveals.length,
    state.updated_at,
    state.viewport.center_x,
    state.viewport.center_y,
    state.viewport.zoom
  ]);

  function emitViewportPreview(nextViewport: MapViewport) {
    latestViewportRef.current = nextViewport;
    onViewportPreview?.(nextViewport);
  }

  function flushViewportCommit(nextViewport = latestViewportRef.current) {
    if (viewportCommitTimerRef.current) {
      window.clearTimeout(viewportCommitTimerRef.current);
      viewportCommitTimerRef.current = null;
    }
    onViewportCommit?.(nextViewport);
  }

  function scheduleViewportCommit(nextViewport: MapViewport) {
    latestViewportRef.current = nextViewport;
    if (viewportCommitTimerRef.current) {
      window.clearTimeout(viewportCommitTimerRef.current);
    }
    viewportCommitTimerRef.current = window.setTimeout(() => {
      viewportCommitTimerRef.current = null;
      onViewportCommit?.(latestViewportRef.current);
    }, 1000);
  }

  if (!state.image_path) {
    return (
      <div className={`map-canvas map-canvas-empty ${className}`.trim()}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) {
      return;
    }
    event.currentTarget.focus({ preventScroll: true });

    const point = eventToMapPoint(event, worldRef.current);
    if (!point) {
      return;
    }

    if (canMeasure) {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { kind: "measure", start: point };
      updatePreviewMeasurement({ start: point, end: point });
      return;
    }

    if (tool === "pin" && onPinCreate) {
      requestStageFocusRestore();
      onPinCreate(point);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "reveal" && onRevealCreate) {
      dragRef.current = { kind: "reveal", start: point };
      updatePreviewReveal({ x: point.x, y: point.y, width: 0, height: 0 });
      return;
    }

    if (onViewportPreview || onViewportCommit) {
      dragRef.current = {
        kind: "pan",
        clientX: event.clientX,
        clientY: event.clientY,
        viewport
      };
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    if (drag.kind === "reveal") {
      const point = eventToMapPoint(event, worldRef.current);
      if (point) {
        updatePreviewReveal(normalizeMapRect(drag.start, point));
      }
      return;
    }

    if (drag.kind === "measure") {
      const point = eventToMapPoint(event, worldRef.current);
      if (point) {
        updatePreviewMeasurement({ start: drag.start, end: point });
      }
      return;
    }

    if (!onViewportPreview && !onViewportCommit) {
      return;
    }

    const worldRect = worldRef.current?.getBoundingClientRect();
    if (!worldRect || worldRect.width <= 0 || worldRect.height <= 0) {
      return;
    }

    emitViewportPreview(
      clampMapViewport({
        center_x: drag.viewport.center_x - (event.clientX - drag.clientX) / worldRect.width,
        center_y: drag.viewport.center_y - (event.clientY - drag.clientY) / worldRect.height,
        zoom: drag.viewport.zoom
      })
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;

    const finalPreviewReveal = previewRevealRef.current;
    if (drag?.kind === "reveal" && finalPreviewReveal && onRevealCreate) {
      if (finalPreviewReveal.width > 0.005 && finalPreviewReveal.height > 0.005) {
        requestStageFocusRestore();
        onRevealCreate(finalPreviewReveal);
      }
      updatePreviewReveal(null);
    }

    if (drag?.kind === "pan") {
      requestStageFocusRestore();
      flushViewportCommit();
    }

    if (drag?.kind === "measure") {
      updatePreviewMeasurement(null);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (readOnly || (!onViewportPreview && !onViewportCommit)) {
      return;
    }

    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const nextViewport = clampMapViewport({ ...viewport, zoom: viewport.zoom * factor });
    emitViewportPreview(nextViewport);
    scheduleViewportCommit(nextViewport);
  }

  async function markImageLoaded(image: HTMLImageElement) {
    const naturalSize = {
      width: image.naturalWidth,
      height: image.naturalHeight
    };
    if (isUsableMapImageSize(naturalSize)) {
      setImageSize(naturalSize);
      setImageStatus("ready");
      return;
    }
    if (state.image_path?.toLowerCase().endsWith(".svg")) {
      const svgSize = await loadSvgSize(imageUrl);
      if (svgSize) {
        setImageSize(svgSize);
        setImageStatus("ready");
        return;
      }
    }
    setImageStatus("error");
  }

  const label = state.title ?? state.image_path;
  const worldStyle = {
    height: `${fittedSize.height}px`,
    left: "50%",
    top: "50%",
    transform: `translate(-${viewport.center_x * 100}%, -${viewport.center_y * 100}%) scale(${viewport.zoom})`,
    transformOrigin: `${viewport.center_x * 100}% ${viewport.center_y * 100}%`,
    width: `${fittedSize.width}px`
  };
  const measurementLabel = previewMeasurement
    ? formatMeasurementLabel(previewMeasurement, gridSpec, imageSize)
    : "";

  return (
    <div
      aria-label={label}
      className={`map-canvas map-canvas-${mode} map-canvas-tool-${tool} ${interactive ? "map-canvas-interactive" : ""} ${className}`.trim()}
    >
      <div
        className="map-canvas-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerCancel={handlePointerUp}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        ref={stageRef}
        tabIndex={readOnly ? -1 : 0}
      >
        {imageStatus === "loading" ? (
          <p className="map-canvas-status">Loading map...</p>
        ) : null}
        {imageStatus === "error" ? (
          <p className="map-canvas-status">Map image could not load.</p>
        ) : null}
        <div
          className="map-canvas-world"
          ref={worldRef}
          style={{ ...worldStyle, visibility: imageReady ? "visible" : "hidden" }}
        >
          <img
            alt={label}
            className="map-canvas-image"
            draggable={false}
            onError={() => setImageStatus("error")}
            onLoad={(event) => void markImageLoaded(event.currentTarget)}
            ref={imageRef}
            src={imageUrl}
          />
          {gridSpec ? (
            <svg
              aria-hidden="true"
              className="map-canvas-grid"
              preserveAspectRatio="none"
              style={{ color: gridSpec.color, opacity: gridSpec.opacity }}
              viewBox="0 0 1 1"
            >
              {Array.from({ length: Math.floor(gridSpec.columns) }, (_, index) => index + 1)
                .filter((index) => index < gridSpec.columns)
                .map((index) => (
                  <line
                    className="map-canvas-grid-line"
                    key={`x-${index}`}
                    x1={index / gridSpec.columns}
                    x2={index / gridSpec.columns}
                    y1="0"
                    y2="1"
                  />
                ))}
              {Array.from({ length: Math.floor(gridSpec.rows) }, (_, index) => index + 1)
                .filter((index) => index < gridSpec.rows)
                .map((index) => (
                  <line
                    className="map-canvas-grid-line"
                    key={`y-${index}`}
                    x1="0"
                    x2="1"
                    y1={index / gridSpec.rows}
                    y2={index / gridSpec.rows}
                  />
                ))}
            </svg>
          ) : null}
          {state.fog_enabled ? (
            <svg
              aria-hidden="true"
              className={mapFogClassName(mode)}
              preserveAspectRatio="none"
              viewBox="0 0 1 1"
            >
              <defs>
                <mask id={maskId} maskContentUnits="objectBoundingBox" maskUnits="objectBoundingBox">
                  <rect fill="white" height="1" width="1" x="0" y="0" />
                  {revealRects.map((reveal, index) => (
                    <rect
                      className="map-fog-hole"
                      fill="black"
                      height={reveal.height}
                      key={`${reveal.x}-${reveal.y}-${reveal.width}-${reveal.height}-${index}`}
                      width={reveal.width}
                      x={reveal.x}
                      y={reveal.y}
                    />
                  ))}
                </mask>
              </defs>
              <rect
                className="map-fog-overlay"
                height="1"
                mask={`url(#${maskId})`}
                width="1"
                x="0"
                y="0"
              />
            </svg>
          ) : null}
          {state.pins.map((pin) => (
            <span
              className={`map-canvas-pin ${mode === "dm" && isDmOnlyPin(pin) ? "map-canvas-pin-dm-only" : ""}`.trim()}
              key={pin.id}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              title={pin.label}
            >
              {pin.label}
            </span>
          ))}
          {previewReveal ? (
            <span
              aria-hidden="true"
              className="map-canvas-reveal-preview"
              style={{
                height: `${previewReveal.height * 100}%`,
                left: `${previewReveal.x * 100}%`,
                top: `${previewReveal.y * 100}%`,
                width: `${previewReveal.width * 100}%`
              }}
            />
          ) : null}
          {previewMeasurement && canMeasure ? (
            <>
              <svg
                aria-hidden="true"
                className="map-canvas-measurement"
                preserveAspectRatio="none"
                viewBox="0 0 1 1"
              >
                <line
                  className="map-canvas-measurement-line"
                  x1={previewMeasurement.start.x}
                  x2={previewMeasurement.end.x}
                  y1={previewMeasurement.start.y}
                  y2={previewMeasurement.end.y}
                />
                <circle
                  className="map-canvas-measurement-point"
                  cx={previewMeasurement.start.x}
                  cy={previewMeasurement.start.y}
                  r="0.006"
                />
                <circle
                  className="map-canvas-measurement-point"
                  cx={previewMeasurement.end.x}
                  cy={previewMeasurement.end.y}
                  r="0.006"
                />
              </svg>
              <span
                className="map-canvas-measurement-label"
                style={{
                  left: `${((previewMeasurement.start.x + previewMeasurement.end.x) / 2) * 100}%`,
                  top: `${((previewMeasurement.start.y + previewMeasurement.end.y) / 2) * 100}%`
                }}
              >
                {measurementLabel}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
