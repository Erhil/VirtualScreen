import { useEffect, useRef, useState } from "react";

import {
  addMapPin,
  addMapReveal,
  buildMapEventsUrl,
  clearMapReveals,
  createPinPayload,
  deleteMapPreset,
  deleteMapReveal,
  deleteMapPin,
  fetchMapState,
  isImageMapCandidate,
  loadMapPreset,
  planViewportSync,
  presentMap,
  rotateMap,
  saveMapPreset,
  setMapFog,
  setMapGrid,
  setMapSource,
  setMapViewport,
  shouldAdoptMapState,
  stopMap,
  type MapActionStatus,
  type MapGrid,
  type MapPinVisibility,
  type MapPoint,
  type MapPreset,
  type MapRevealPayload,
  type MapState,
  type MapViewport
} from "../lib/map";
import { subscribeToEvents } from "../lib/eventSocket";
import type { OpenTab } from "../lib/tabs";
import type { Translator } from "../lang";

export type UseMapOptions = {
  activeTab: OpenTab | null;
  authReady: boolean;
  t: Translator;
  refreshDisplayState: () => Promise<void>;
};

export function useMap({ activeTab, authReady, t, refreshDisplayState }: UseMapOptions) {
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [mapActionStatus, setMapActionStatus] = useState<MapActionStatus>({
    status: "idle",
    message: null
  });
  const [mapPresets, setMapPresets] = useState<MapPreset[]>([]);
  const [localMapViewport, setLocalMapViewport] = useState<MapViewport | null>(null);

  const mapViewportSyncRef = useRef({ lastSyncedAt: 0 });

  function adoptMapState(nextMapState: MapState) {
    setMapState((current) => (shouldAdoptMapState(current, nextMapState) ? nextMapState : current));
  }

  function mapActionErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  async function loadMapPresetForAutomation(presetId: string, present: boolean) {
    let nextMapState = await loadMapPreset(presetId);
    if (present) {
      nextMapState = await presentMap();
      await refreshDisplayState();
    } else if (nextMapState.presenting) {
      nextMapState = await stopMap();
    }
    adoptMapState(nextMapState);
  }

  async function handleMapLoadSource(path: string) {
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return;
    }
    try {
      adoptMapState(await setMapSource(trimmedPath));
      setLocalMapViewport(null);
      mapViewportSyncRef.current.lastSyncedAt = 0;
      setMapActionStatus({ status: "ready", message: `Loaded map: ${trimmedPath}` });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not load map.")
      });
    }
  }

  async function handleUseActiveImageAsMap() {
    if (!activeTab || !isImageMapCandidate(activeTab.mediaKind)) {
      return;
    }
    await handleMapLoadSource(activeTab.path);
  }

  async function syncMapViewport(viewport: MapViewport) {
    try {
      adoptMapState(await setMapViewport(viewport));
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not update map view.")
      });
    }
  }

  // Called on every pointer move of a pan. The canvas shows the preview itself; setting state
  // here would re-render the whole App at pointer rate, so only the throttled sync (which
  // keeps the player screen following) happens.
  function handleMapViewportPreview(viewport: MapViewport) {
    const decision = planViewportSync({
      viewport,
      now: Date.now(),
      lastSyncedAt: mapViewportSyncRef.current.lastSyncedAt
    });
    if (decision.sync) {
      mapViewportSyncRef.current.lastSyncedAt = decision.lastSyncedAt;
      void syncMapViewport(decision.sync);
    }
  }

  function handleMapViewportCommit(viewport: MapViewport) {
    const decision = planViewportSync({
      viewport,
      now: Date.now(),
      lastSyncedAt: mapViewportSyncRef.current.lastSyncedAt,
      flush: true
    });
    setLocalMapViewport(decision.preview);
    mapViewportSyncRef.current.lastSyncedAt = decision.lastSyncedAt;
    if (decision.sync) {
      void syncMapViewport(decision.sync);
    }
  }

  async function handleMapFogChange(enabled: boolean) {
    try {
      adoptMapState(await setMapFog(enabled));
      setMapActionStatus({ status: "ready", message: enabled ? t("map.fogEnabled") : t("map.fogDisabled") });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not update fog.")
      });
    }
  }

  async function handleMapGridChange(grid: MapGrid) {
    try {
      adoptMapState(await setMapGrid(grid));
      setMapActionStatus({ status: "ready", message: "Grid updated." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not update grid.")
      });
    }
  }

  async function handleMapRevealCreate(reveal: MapRevealPayload) {
    try {
      adoptMapState(await addMapReveal(reveal));
      setMapActionStatus({
        status: "ready",
        message: reveal.action === "hide" ? t("map.hideAdded") : t("map.revealAdded")
      });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not add reveal.")
      });
    }
  }

  async function handleMapUndoReveal() {
    const latestReveal = mapState?.reveals.at(-1);
    if (!latestReveal) {
      return;
    }
    try {
      adoptMapState(await deleteMapReveal(latestReveal.id));
      setMapActionStatus({ status: "ready", message: "Reveal undone." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not undo reveal.")
      });
    }
  }

  async function handleMapPinCreate(
    point: MapPoint,
    label: string,
    visibility: MapPinVisibility
  ) {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return;
    }
    try {
      adoptMapState(await addMapPin(createPinPayload(point, trimmedLabel, visibility)));
      setMapActionStatus({ status: "ready", message: "Pin added." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not add pin.")
      });
    }
  }

  async function handleMapDeletePin(pinId: string) {
    try {
      adoptMapState(await deleteMapPin(pinId));
      setMapActionStatus({ status: "ready", message: "Pin removed." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not remove pin.")
      });
    }
  }

  async function handleMapClearReveals() {
    try {
      adoptMapState(await clearMapReveals());
      setMapActionStatus({ status: "ready", message: "Reveals cleared." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not clear reveals.")
      });
    }
  }

  async function handleMapPresent() {
    try {
      adoptMapState(await presentMap());
      await refreshDisplayState();
      setMapActionStatus({ status: "ready", message: "Map presented to player screen." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not present map.")
      });
    }
  }

  async function handleMapRotate() {
    try {
      adoptMapState(await rotateMap());
      setMapActionStatus({ status: "ready", message: t("map.rotated") });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not rotate map.")
      });
    }
  }

  async function handleMapStop() {
    try {
      adoptMapState(await stopMap());
      setMapActionStatus({ status: "ready", message: "Map stopped." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not stop map.")
      });
    }
  }

  async function handleMapSavePreset(name: string, state: MapState) {
    try {
      const preset = await saveMapPreset(name, state);
      setMapPresets((currentPresets) => [
        preset,
        ...currentPresets.filter((currentPreset) => currentPreset.id !== preset.id)
      ]);
      setMapActionStatus({ status: "ready", message: `Saved map preset: ${name}` });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not save map preset.")
      });
    }
  }

  async function handleMapLoadPreset(presetId: string) {
    try {
      adoptMapState(await loadMapPreset(presetId));
      setLocalMapViewport(null);
      mapViewportSyncRef.current.lastSyncedAt = 0;
      setMapActionStatus({ status: "ready", message: "Map preset loaded." });
    } catch (error: unknown) {
      setMapActionStatus({
        status: "error",
        message: mapActionErrorMessage(error, "Could not load map preset.")
      });
    }
  }

  async function handleMapDeletePreset(presetId: string) {
    try {
      await deleteMapPreset(presetId);
      setMapPresets((currentPresets) =>
        currentPresets.filter((currentPreset) => currentPreset.id !== presetId)
      );
    } catch {
    }
  }

  useEffect(() => {
    if (!authReady) {
      return;
    }
    fetchMapState()
      .then(adoptMapState)
      .catch(() => {});
    return subscribeToEvents(buildMapEventsUrl(), adoptMapState);
  }, [authReady]);

  const visibleMapState =
    mapState && localMapViewport ? { ...mapState, viewport: localMapViewport } : mapState;

  function resetViewport() {
    setLocalMapViewport(null);
    mapViewportSyncRef.current.lastSyncedAt = 0;
  }

  function reset() {
    setMapState(null);
    setMapActionStatus({ status: "idle", message: null });
    setMapPresets([]);
    resetViewport();
  }

  return {
    mapState,
    mapActionStatus,
    mapPresets,
    visibleMapState,
    setMapPresets,
    adoptMapState,
    resetViewport,
    handleMapLoadSource,
    handleUseActiveImageAsMap,
    handleMapViewportPreview,
    handleMapViewportCommit,
    handleMapFogChange,
    handleMapGridChange,
    handleMapRevealCreate,
    handleMapUndoReveal,
    handleMapPinCreate,
    handleMapDeletePin,
    handleMapClearReveals,
    handleMapPresent,
    handleMapRotate,
    handleMapStop,
    handleMapSavePreset,
    handleMapLoadPreset,
    handleMapDeletePreset,
    loadMapPresetForAutomation,
    reset
  };
}

export type MapApi = ReturnType<typeof useMap>;
