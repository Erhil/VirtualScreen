import { afterEach, describe, expect, it, vi } from "vitest";

import { createTranslator } from "../lang";
import {
  addMapPin,
  addMapReveal,
  buildMapEventsUrl,
  buildMapMediaUrl,
  buildScreenMapEventsUrl,
  buildScreenMapMediaUrl,
  deleteMapPreset,
  clampMapViewport,
  clientPointToImagePoint,
  createPinPayload,
  fitMapImageToStage,
  fetchMapState,
  fetchMapPresets,
  fetchScreenMapState,
  formatMapMeasurementLabel,
  isImageMapCandidate,
  isMapPresenting,
  isUsableMapImageSize,
  mapFogClassName,
  mapFogOverlayOpacity,
  mapFogMaskOperations,
  mapFogRevealRects,
  mapSummary,
  nextMapState,
  normalizedMapGridLines,
  normalizeMapPolygon,
  normalizeMapRect,
  planViewportSync,
  presentMap,
  shouldAdoptMapState,
  loadMapPreset,
  saveMapPreset,
  setMapFog,
  setMapGrid,
  setMapSource,
  setMapViewport,
  stopMap,
  type MapGrid,
  type MapState
} from "./map";

const blankState: MapState = {
  image_path: null,
  title: null,
  viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
  grid: { enabled: false, columns: 10, rows: 10, visible_to_players: true },
  fog_enabled: false,
  reveals: [],
  pins: [],
  presenting: false,
  updated_at: "2026-05-11T12:00:00Z"
};

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body)
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("map helpers", () => {
  it("calls protected and public map APIs with expected payloads", async () => {
    const loadedState: MapState = {
      ...blankState,
      image_path: "Media/City Map.svg",
      title: "City Map"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(loadedState));
    vi.stubGlobal("fetch", fetchMock);

    await fetchMapState();
    await fetchScreenMapState();
    await setMapSource("Media/City Map.svg");
    await setMapViewport({ center_x: 0.25, center_y: 0.75, zoom: 2 });
    await setMapFog(true);
    await setMapGrid({
      enabled: true,
      columns: 500,
      rows: 0,
      visible_to_players: false
    });
    await addMapReveal({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
    await addMapPin({ x: 0.4, y: 0.6, label: "Gate", visibility: "dm" });
    await presentMap();
    await stopMap();
    await fetchMapPresets();
    await saveMapPreset("Dungeon Level 1", loadedState);
    await loadMapPreset("preset-1");
    await deleteMapPreset("preset-1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/map/state");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/screen/map/state");
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/map/source", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: "Media/City Map.svg" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/map/viewport", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewport: { center_x: 0.25, center_y: 0.75, zoom: 2 } })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/map/fog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fog_enabled: true })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(6, "/api/map/grid", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: true,
        columns: 200,
        rows: 1,
        visible_to_players: false
      })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(7, "/api/map/reveals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(8, "/api/map/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: 0.4, y: 0.6, label: "Gate", visibility: "dm" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(9, "/api/map/present", {
      method: "POST"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(10, "/api/map/stop", {
      method: "POST"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(11, "/api/map/presets");
    expect(fetchMock).toHaveBeenNthCalledWith(12, "/api/map/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dungeon Level 1", state: loadedState })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(13, "/api/map/presets/preset-1/load", {
      method: "POST"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(14, "/api/map/presets/preset-1", {
      method: "DELETE"
    });
  });

  it("builds protected and public map media URLs", () => {
    expect(buildMapMediaUrl("Media/sample map.svg")).toBe(
      "/api/world/media?path=Media%2Fsample%20map.svg"
    );
    expect(buildScreenMapMediaUrl("Media/sample map.svg")).toBe(
      "/api/screen/map/media?path=Media%2Fsample%20map.svg"
    );
  });

  it("builds the public screen map websocket URL", () => {
    expect(buildMapEventsUrl({ protocol: "http:", host: "localhost:5173" })).toBe(
      "ws://localhost:5173/ws/map"
    );
    expect(buildScreenMapEventsUrl({ protocol: "http:", host: "localhost:5173" })).toBe(
      "ws://localhost:5173/ws/screen/map"
    );
    expect(buildScreenMapEventsUrl({ protocol: "https:", host: "table.local" })).toBe(
      "wss://table.local/ws/screen/map"
    );
  });

  it("clamps map viewport values to the supported range", () => {
    expect(clampMapViewport({ center_x: -1, center_y: 2, zoom: 99 })).toEqual({
      center_x: 0,
      center_y: 1,
      zoom: 6
    });
    expect(clampMapViewport({ center_x: 0.25, center_y: 0.75, zoom: 0.1 })).toEqual({
      center_x: 0.25,
      center_y: 0.75,
      zoom: 0.5
    });
  });

  it("normalizes reveal rectangles regardless of drag direction", () => {
    expect(normalizeMapRect({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 })).toEqual({
      x: 0.2,
      y: 0.1,
      width: 0.6,
      height: 0.6
    });
  });

  it("normalizes polygon points by clamping coordinates", () => {
    expect(
      normalizeMapPolygon([
        { x: -0.2, y: 0.25 },
        { x: 0.3333333333, y: 1.2 },
        { x: 0.8, y: 0.5 }
      ])
    ).toEqual([
      { x: 0, y: 0.25 },
      { x: 0.333333, y: 1 },
      { x: 0.8, y: 0.5 }
    ]);
  });

  it("rejects polygons with fewer than three distinct normalized points", () => {
    expect(
      normalizeMapPolygon([
        { x: 0, y: 0 },
        { x: -0.5, y: -0.25 },
        { x: 1, y: 1 }
      ])
    ).toBeNull();
  });

  it("fits loaded map images into the stage while preserving aspect ratio", () => {
    expect(fitMapImageToStage({ width: 320, height: 240 }, { width: 640, height: 400 })).toEqual({
      width: 320,
      height: 200
    });
    expect(fitMapImageToStage({ width: 200, height: 400 }, { width: 640, height: 400 })).toEqual({
      width: 200,
      height: 125
    });
    expect(fitMapImageToStage({ width: 320, height: 240 }, { width: 0, height: 400 })).toEqual({
      width: 0,
      height: 0
    });
  });

  it("keeps map image readiness and fog classes mode-specific", () => {
    expect(isUsableMapImageSize({ width: 640, height: 400 })).toBe(true);
    expect(isUsableMapImageSize({ width: 0, height: 400 })).toBe(false);
    expect(mapFogClassName("dm")).toBe("map-canvas-fog map-canvas-fog-dm");
    expect(mapFogClassName("player")).toBe("map-canvas-fog map-canvas-fog-player");
    expect(mapFogOverlayOpacity("dm")).toBe(0.7);
    expect(mapFogOverlayOpacity("player")).toBe(1);
  });

  it("adopts incoming map state only when it is not stale", () => {
    const loadedState: MapState = {
      ...blankState,
      image_path: "Media/map.svg",
      title: "map",
      updated_at: "2026-05-11T12:00:02Z"
    };
    const olderBlankState: MapState = {
      ...blankState,
      updated_at: "2026-05-11T12:00:01Z"
    };
    const equalEventState: MapState = {
      ...loadedState,
      presenting: true
    };
    const newerState: MapState = {
      ...loadedState,
      updated_at: "2026-05-11T12:00:03Z"
    };

    expect(shouldAdoptMapState(null, olderBlankState)).toBe(true);
    expect(shouldAdoptMapState(loadedState, newerState)).toBe(true);
    expect(shouldAdoptMapState(loadedState, olderBlankState)).toBe(false);
    expect(shouldAdoptMapState(loadedState, equalEventState)).toBe(true);
    expect(shouldAdoptMapState({ ...loadedState, updated_at: "not-a-date" }, olderBlankState)).toBe(true);
    expect(shouldAdoptMapState(loadedState, { ...olderBlankState, updated_at: "not-a-date" })).toBe(true);
  });

  it("creates pin payloads and image points from client coordinates", () => {
    expect(createPinPayload({ x: 1.2, y: -0.2 }, "  North Gate  ")).toEqual({
      x: 1,
      y: 0,
      label: "North Gate",
      visibility: "player"
    });
    expect(createPinPayload({ x: 0.4, y: 0.6 }, "Secret", "dm")).toEqual({
      x: 0.4,
      y: 0.6,
      label: "Secret",
      visibility: "dm"
    });
    expect(
      clientPointToImagePoint(150, 260, {
        left: 100,
        top: 200,
        width: 200,
        height: 300
      })
    ).toEqual({ x: 0.25, y: 0.2 });
  });

  it("returns normalized internal grid lines and concise measurement labels", () => {
    const grid: MapGrid = {
      enabled: true,
      columns: 4,
      rows: 2,
      visible_to_players: true
    };

    expect(normalizedMapGridLines(grid)).toEqual([
      {
        orientation: "vertical",
        index: 1,
        start: { x: 0.25, y: 0 },
        end: { x: 0.25, y: 1 }
      },
      {
        orientation: "vertical",
        index: 2,
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 }
      },
      {
        orientation: "vertical",
        index: 3,
        start: { x: 0.75, y: 0 },
        end: { x: 0.75, y: 1 }
      },
      {
        orientation: "horizontal",
        index: 1,
        start: { x: 0, y: 0.5 },
        end: { x: 1, y: 0.5 }
      }
    ]);
    expect(
      normalizedMapGridLines({ ...grid, enabled: false, columns: 99, rows: 99 })
    ).toEqual([]);
    expect(formatMapMeasurementLabel(0)).toBe("0 sq");
    expect(formatMapMeasurementLabel(1)).toBe("1 sq");
    expect(formatMapMeasurementLabel(1.25)).toBe("1.3 sq");
    expect(formatMapMeasurementLabel(Number.NaN)).toBe("0 sq");
  });

  it("creates binary fog mask reveal rectangles without inverting the mask", () => {
    expect(
      mapFogRevealRects([
        { id: "a", x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        { id: "b", x: 0.8, y: 0.9, width: 0.5, height: 0.5 },
        { id: "ignored", x: 0.2, y: 0.2, width: 0, height: 0.1 }
      ])
    ).toEqual([
      { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      { x: 0.8, y: 0.9, width: 0.2, height: 0.1 }
    ]);
  });

  it("converts legacy reveal entries into ordered rect reveal fog mask operations", () => {
    expect(
      mapFogMaskOperations([
        { id: "a", x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        { id: "b", x: 0.8, y: 0.9, width: 0.5, height: 0.5 }
      ])
    ).toEqual([
      {
        shape: "rect",
        action: "reveal",
        fill: "black",
        rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
      },
      {
        shape: "rect",
        action: "reveal",
        fill: "black",
        rect: { x: 0.8, y: 0.9, width: 0.2, height: 0.1 }
      }
    ]);
  });

  it("keeps reveal and hide fog mask operations ordered with mask fill colors", () => {
    expect(
      mapFogMaskOperations([
        {
          id: "reveal-poly",
          action: "reveal",
          shape: "polygon",
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.4, y: 0.2 },
            { x: 0.2, y: 0.5 }
          ]
        },
        {
          id: "hide-rect",
          action: "hide",
          shape: "rect",
          x: -0.1,
          y: 0.2,
          width: 0.3,
          height: 0.4
        }
      ])
    ).toEqual([
      {
        shape: "polygon",
        action: "reveal",
        fill: "black",
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.4, y: 0.2 },
          { x: 0.2, y: 0.5 }
        ]
      },
      {
        shape: "rect",
        action: "hide",
        fill: "white",
        rect: { x: 0, y: 0.2, width: 0.2, height: 0.4 }
      }
    ]);
  });

  it("rejects polygon previews with too few distinct points or too many points", () => {
    expect(
      normalizeMapPolygon([
        { x: 0.1, y: 0.1 },
        { x: 0.1, y: 0.1 },
        { x: 0.1, y: 0.1 }
      ])
    ).toBeNull();
    expect(normalizeMapPolygon(Array.from({ length: 33 }, (_, index) => ({ x: index / 40, y: 0.2 })))).toBeNull();
  });

  it("plans viewport sync with immediate preview, throttle, and final flush", () => {
    const first = planViewportSync({
      viewport: { center_x: 0.45, center_y: 0.5, zoom: 1.2 },
      now: 1_000,
      lastSyncedAt: 0
    });
    expect(first.preview).toEqual({ center_x: 0.45, center_y: 0.5, zoom: 1.2 });
    expect(first.sync).toEqual(first.preview);
    expect(first.pending).toBeNull();
    expect(first.lastSyncedAt).toBe(1_000);

    const throttled = planViewportSync({
      viewport: { center_x: 0.4, center_y: 0.5, zoom: 1.2 },
      now: 1_400,
      lastSyncedAt: first.lastSyncedAt
    });
    expect(throttled.preview).toEqual({ center_x: 0.4, center_y: 0.5, zoom: 1.2 });
    expect(throttled.sync).toBeNull();
    expect(throttled.pending).toEqual(throttled.preview);
    expect(throttled.lastSyncedAt).toBe(1_000);

    const flushed = planViewportSync({
      viewport: throttled.preview,
      now: 1_500,
      lastSyncedAt: throttled.lastSyncedAt,
      flush: true
    });
    expect(flushed.sync).toEqual(throttled.preview);
    expect(flushed.pending).toBeNull();
    expect(flushed.lastSyncedAt).toBe(1_500);
  });

  it("requires both presenting and an image path for player map presentation", () => {
    expect(isMapPresenting(blankState)).toBe(false);
    expect(isMapPresenting({ ...blankState, presenting: true })).toBe(false);
    expect(isMapPresenting({ ...blankState, image_path: "Media/map.svg" })).toBe(false);
    expect(
      isMapPresenting({ ...blankState, image_path: "Media/map.svg", presenting: true })
    ).toBe(true);
  });

  it("summarizes map state and accepts only image map candidates", () => {
    expect(isImageMapCandidate("image")).toBe(true);
    expect(isImageMapCandidate("video")).toBe(false);
    expect(isImageMapCandidate("pdf")).toBe(false);
    expect(mapSummary(blankState)).toBe("No map");
    expect(
      mapSummary({
        ...blankState,
        image_path: "Media/City Map.svg",
        title: "City Map"
      })
    ).toBe("Ready: City Map");
    expect(
      mapSummary({
        ...blankState,
        image_path: "Media/City Map.svg",
        title: null,
        presenting: true
      })
    ).toBe("Presenting: City Map.svg");
    const t = createTranslator({
      "map.summary.noMap": "Карты нет",
      "map.summary.presenting": "На экране: {map}",
      "map.summary.ready": "Готово: {map}"
    });
    expect(mapSummary(blankState, t)).toBe("Карты нет");
    expect(
      mapSummary({
        ...blankState,
        image_path: "Media/City Map.svg",
        title: "City Map"
      }, t)
    ).toBe("Готово: City Map");
  });

  it("replaces map state from websocket events", () => {
    const next = { ...blankState, image_path: "Media/City Map.svg", presenting: true };

    expect(nextMapState(blankState, next)).toEqual(next);
  });
});
