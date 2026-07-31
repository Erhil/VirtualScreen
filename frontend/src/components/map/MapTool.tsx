import { useEffect, useState } from "react";

import { InnerToolTabs } from "../InnerToolTabs";
import { IconButton } from "../IconButton";
import { MapCanvas, type MapCanvasTool } from "../../MapCanvas";
import {
  buildMapMediaUrl,
  isImageMapCandidate,
  normalizeMapPolygon,
  type MapActionStatus,
  type MapGrid,
  type MapPinVisibility,
  type MapPoint,
  type MapPreset,
  type MapRevealPayload,
  type MapState,
  type MapViewport
} from "../../lib/map";
import type { OpenTab } from "../../lib/tabs";
import type { Translator } from "../../lang";
import type { WorldPathPickerFilter } from "../../lib/worldPathPicker";

export function MapTool({
  activeTab,
  actionStatus,
  presets,
  state,
  onClearReveals,
  onDeletePin,
  onDeletePreset,
  onFogChange,
  onGridChange,
  onLoadSource,
  onLoadPreset,
  onPinCreate,
  onPickPath,
  onPresent,
  onRevealCreate,
  onRotate,
  onSavePreset,
  onStop,
  onUndoReveal,
  onUseActiveImage,
  onViewportCommit,
  onViewportPreview,
  t
}: {
  activeTab: OpenTab | null;
  actionStatus: MapActionStatus;
  presets: MapPreset[];
  state: MapState | null;
  onClearReveals: () => void;
  onDeletePin: (pinId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onFogChange: (enabled: boolean) => void;
  onGridChange: (grid: MapGrid) => void;
  onLoadSource: (path: string) => void;
  onLoadPreset: (presetId: string) => void;
  onPinCreate: (point: MapPoint, label: string, visibility: MapPinVisibility) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onPresent: () => void;
  onRevealCreate: (reveal: MapRevealPayload) => void;
  onRotate: () => void;
  onSavePreset: (name: string, state: MapState) => void;
  onStop: () => void;
  onUndoReveal: () => void;
  onUseActiveImage: () => void;
  onViewportCommit: (viewport: MapViewport) => void;
  onViewportPreview: (viewport: MapViewport) => void;
  t: Translator;
}) {
  const currentMap = state ?? {
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
  const [sourcePath, setSourcePath] = useState(currentMap.image_path ?? "");
  const [presetName, setPresetName] = useState("");
  const [draftMap, setDraftMap] = useState<MapState>(currentMap);
  const [tool, setTool] = useState<MapCanvasTool>("pan");
  const [polygonPoints, setPolygonPoints] = useState<MapPoint[]>([]);
  const [mapPanel, setMapPanel] = useState<"live" | "setup">("live");
  const [pinLabel, setPinLabel] = useState("Pin");
  const [pinVisibility, setPinVisibility] = useState<MapPinVisibility>("player");
  const activeImage = Boolean(activeTab && isImageMapCandidate(activeTab.mediaKind));
  const shownMap = draftMap;
  const hasMap = Boolean(shownMap.image_path);

  useEffect(() => {
    setSourcePath(currentMap.image_path ?? "");
  }, [currentMap.image_path]);

  useEffect(() => {
    setDraftMap(currentMap);
  }, [state]);

  useEffect(() => {
    setPolygonPoints([]);
  }, [currentMap.image_path, tool]);

  function handleFogChange(enabled: boolean) {
    setDraftMap((map) => ({ ...map, fog_enabled: enabled }));
    onFogChange(enabled);
  }

  function handleGridChange(grid: MapGrid) {
    setDraftMap((map) => ({ ...map, grid }));
    onGridChange(grid);
  }

  function selectTool(nextTool: MapCanvasTool) {
    setTool(nextTool);
  }

  function handlePolygonCommit() {
    const points = normalizeMapPolygon(polygonPoints);
    if (!points) {
      return;
    }
    onRevealCreate({
      action: tool === "hide-polygon" ? "hide" : "reveal",
      shape: "polygon",
      points
    });
    setPolygonPoints([]);
  }

  const polygonToolActive = tool === "reveal-polygon" || tool === "hide-polygon";
  const polygonReady = Boolean(normalizeMapPolygon(polygonPoints));

  return (
    <section aria-label={t("map.control")} className="map-tool" data-help-context="screen-map">
      <InnerToolTabs
        active={mapPanel}
        ariaLabel={t("map.controls")}
        onChange={setMapPanel}
        tabs={[
          { id: "live", label: t("map.live") },
          { id: "setup", label: t("map.setup") }
        ]}
      />
      <div className="map-tool-status" aria-live="polite">
        <p>{shownMap.image_path ? t("map.current", { map: shownMap.title ?? shownMap.image_path }) : t("map.noMapLoaded")}</p>
        {actionStatus.message && (
          <p className={actionStatus.status === "error" ? "map-tool-error" : "map-tool-message"}>
            {actionStatus.message}
          </p>
        )}
      </div>
      {mapPanel === "live" ? (
        <>
      <div className="map-tool-actions">
        <button disabled={!activeImage} onClick={onUseActiveImage} type="button">
          {t("map.useActiveImage")}
        </button>
        <button disabled={!shownMap.image_path} onClick={onPresent} type="button">
          {t("map.present")}
        </button>
        <button disabled={!shownMap.presenting} onClick={onStop} type="button">
          {t("map.stop")}
        </button>
        <IconButton
          disabled={!shownMap.image_path}
          label={t("map.rotate90")}
          name="rotate"
          onClick={onRotate}
        />
      </div>
      <div className="map-tool-row">
        <label className="compact-inline-control">
          {t("map.fog")}
          <input
            aria-label={t("map.fog")}
            checked={shownMap.fog_enabled}
            disabled={!hasMap}
            onChange={(event) => handleFogChange(event.target.checked)}
            type="checkbox"
          />
        </label>
        <button disabled={!hasMap || shownMap.reveals.length === 0} onClick={onClearReveals} type="button">
          {t("map.clearReveals")}
        </button>
        <button disabled={!hasMap || shownMap.reveals.length === 0} onClick={onUndoReveal} type="button">
          {t("map.undoReveal")}
        </button>
      </div>
      <div className="map-tool-modes" role="group" aria-label={t("map.mode")}>
        <button aria-pressed={tool === "pan"} disabled={!hasMap} onClick={() => selectTool("pan")} type="button">
          {t("map.pan")}
        </button>
        <button aria-pressed={tool === "reveal"} disabled={!hasMap} onClick={() => selectTool("reveal")} type="button">
          {t("map.revealBox")}
        </button>
        <button aria-pressed={tool === "hide"} disabled={!hasMap} onClick={() => selectTool("hide")} type="button">
          {t("map.hideBox")}
        </button>
        <button
          aria-pressed={tool === "reveal-polygon"}
          disabled={!hasMap}
          onClick={() => selectTool("reveal-polygon")}
          type="button"
        >
          {t("map.revealPolygon")}
        </button>
        <button
          aria-pressed={tool === "hide-polygon"}
          disabled={!hasMap}
          onClick={() => selectTool("hide-polygon")}
          type="button"
        >
          {t("map.hidePolygon")}
        </button>
        <button aria-pressed={tool === "pin"} disabled={!hasMap} onClick={() => selectTool("pin")} type="button">
          {t("map.pin")}
        </button>
        <button aria-pressed={tool === "measure"} disabled={!hasMap} onClick={() => selectTool("measure")} type="button">
          {t("map.measure")}
        </button>
      </div>
      {polygonToolActive && (
        <div className="map-polygon-controls" aria-label={t("map.polygonControls")}>
          <span>{t("map.polygonPoints", { count: polygonPoints.length })}</span>
          <button disabled={!polygonReady} onClick={handlePolygonCommit} type="button">
            {t("map.commitPolygon")}
          </button>
          <button disabled={polygonPoints.length === 0} onClick={() => setPolygonPoints([])} type="button">
            {t("app.cancel")}
          </button>
        </div>
      )}
      {tool === "pin" && (
        <div className="map-pin-controls">
          <label>
            {t("map.pinLabel")}
            <input
              aria-label={t("map.pinLabel")}
              onChange={(event) => setPinLabel(event.target.value)}
              value={pinLabel}
            />
          </label>
          <label>
            {t("map.visibility")}
            <select
              aria-label={t("map.pinVisibility")}
              onChange={(event) => setPinVisibility(event.target.value as MapPinVisibility)}
              value={pinVisibility}
            >
              <option value="player">{t("map.players")}</option>
              <option value="dm">{t("map.dmOnly")}</option>
            </select>
          </label>
        </div>
      )}
      <MapCanvas
        className="map-tool-canvas"
        mediaUrlBuilder={buildMapMediaUrl}
        onPinCreate={(point) => onPinCreate(point, pinLabel, pinVisibility)}
        onPolygonPointAdd={(point) => setPolygonPoints((points) => [...points, point])}
        onRevealCreate={onRevealCreate}
        onViewportCommit={onViewportCommit}
        onViewportPreview={onViewportPreview}
        polygonPoints={polygonPoints}
        state={shownMap}
        tool={tool}
      />
      {shownMap.pins.length > 0 && (
        <section className="map-pin-list" aria-label={t("map.pins")}>
          {shownMap.pins.map((pin) => (
            <div className="map-pin-row" key={pin.id}>
              <span>{pin.label}</span>
              <small>{pin.visibility === "dm" ? t("map.dmOnly") : t("map.players")}</small>
              <button onClick={() => onDeletePin(pin.id)} type="button">
                {t("map.removePin")}
              </button>
            </div>
          ))}
        </section>
      )}
        </>
      ) : (
        <>
      <div className="map-tool-actions">
        <button disabled={!activeImage} onClick={onUseActiveImage} type="button">
          {t("map.useActiveImage")}
        </button>
      </div>
      <label>
        {t("map.imagePath")}
        <div className="inline-input-action">
          <input
            aria-label={t("map.imagePath")}
            onChange={(event) => setSourcePath(event.target.value)}
            placeholder="Media/sample-map.svg"
            value={sourcePath}
          />
          <button
            aria-label={t("map.chooseImage")}
            onClick={() => onPickPath("image", t("map.chooseImageTitle"), setSourcePath)}
            type="button"
          >
            {t("app.pick")}
          </button>
          <button disabled={!sourcePath.trim()} onClick={() => onLoadSource(sourcePath)} type="button">
            {t("map.load")}
          </button>
        </div>
      </label>
      <section className="map-presets" aria-label={t("map.presets")}>
        <label>
          {t("map.presetName")}
          <div className="inline-input-action">
            <input
              aria-label={t("map.presetName")}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder={t("map.presetPlaceholder")}
              value={presetName}
            />
            <button
              disabled={!shownMap.image_path || !presetName.trim()}
              onClick={() => {
                onSavePreset(presetName, shownMap);
                setPresetName("");
              }}
              type="button"
            >
              {t("map.savePreset")}
            </button>
          </div>
        </label>
        {presets.length > 0 ? (
          <div className="map-preset-list">
            {presets.map((preset) => (
              <div className="map-preset-row" key={preset.id}>
                <button
                  aria-label={t("map.loadPreset", { name: preset.name })}
                  onClick={() => onLoadPreset(preset.id)}
                  type="button"
                >
                  {preset.name}
                </button>
                <button
                  aria-label={t("map.deletePreset", { name: preset.name })}
                  className="button-danger-subtle"
                  onClick={() => onDeletePreset(preset.id)}
                  type="button"
                >
                  {t("app.delete")}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <div className="map-grid-controls" aria-label={t("map.grid")}>
        <label className="compact-inline-control">
          {t("map.gridShort")}
          <input
            aria-label={t("map.gridEnabled")}
            checked={shownMap.grid.enabled}
            onChange={(event) => handleGridChange({ ...shownMap.grid, enabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          {t("map.columns")}
          <input
            aria-label={t("map.gridColumns")}
            min={1}
            max={200}
            onChange={(event) =>
              handleGridChange({ ...shownMap.grid, columns: Number(event.target.value) })
            }
            type="number"
            value={shownMap.grid.columns}
          />
        </label>
        <label>
          {t("map.rows")}
          <input
            aria-label={t("map.gridRows")}
            min={1}
            max={200}
            onChange={(event) =>
              handleGridChange({ ...shownMap.grid, rows: Number(event.target.value) })
            }
            type="number"
            value={shownMap.grid.rows}
          />
        </label>
        <label className="compact-inline-control">
          {t("map.gridPlayers")}
          <input
            aria-label={t("map.gridVisiblePlayers")}
            checked={shownMap.grid.visible_to_players}
            onChange={(event) =>
              handleGridChange({ ...shownMap.grid, visible_to_players: event.target.checked })
            }
            type="checkbox"
          />
        </label>
      </div>
        </>
      )}
    </section>
  );
}
