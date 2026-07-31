import { useState } from "react";

import { IconButton } from "../IconButton";
import { InnerToolTabs } from "../InnerToolTabs";
import { MapTool } from "../map/MapTool";
import { useMapContext } from "../../contexts/MapContext";
import type { DisplayState, DisplayPopupPreset } from "../../lib/api";
import { canSendToScreen, type ScreenToolTabId } from "../../lib/toolPanel";
import { screenPrimaryMode, screenPrimaryTitle } from "../../lib/display";
import type { OpenTab } from "../../lib/tabs";
import type { Translator } from "../../lang";
import type { WorldPathPickerFilter } from "../../lib/worldPathPicker";

export function ScreenTool({
  activeTab,
  displayState,
  onBlank,
  onClearPopups,
  onClosePopup,
  onPopupVisibleChange,
  onOpenPopup,
  onStagePopup,
  onClearAndShowFullscreen,
  onShowFullscreen,
  onTabChange,
  onPickPath,
  onRotatePrimary,
  tab,
  t
}: {
  activeTab: OpenTab | null;
  displayState: DisplayState | null;
  onBlank: () => void;
  onClearPopups: () => void;
  onClosePopup: (popupId: string) => void;
  onPopupVisibleChange: (popupId: string, visible: boolean) => void;
  onOpenPopup: (preset: DisplayPopupPreset, path?: string) => void;
  onStagePopup: (preset: DisplayPopupPreset, path?: string) => void;
  onClearAndShowFullscreen: (path?: string) => void;
  onShowFullscreen: (path?: string) => void;
  onTabChange: (tab: ScreenToolTabId) => void;
  onPickPath: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onRotatePrimary: () => void;
  tab: ScreenToolTabId;
  t: Translator;
}) {
  const { visibleMapState: mapState } = useMapContext();
  const displayable = canSendToScreen(activeTab?.mediaKind);
  const [popupPreset, setPopupPreset] = useState<DisplayPopupPreset>("plain");
  const [displayTargetPath, setDisplayTargetPath] = useState("");
  const activeTargetLabel = activeTab?.title ?? activeTab?.name ?? t("screen.activeFile");
  const targetPath = displayTargetPath.trim();
  const targetLabel = targetPath || activeTargetLabel;
  const canUseTarget = Boolean(targetPath) || displayable;
  const visiblePopups = displayState?.popups.filter((popup) => popup.visible !== false) ?? [];
  const stagedPopups = displayState?.popups.filter((popup) => popup.visible === false) ?? [];
  const primaryMode = screenPrimaryMode(displayState, mapState);
  const primaryTitle = screenPrimaryTitle(displayState, mapState);
  const primaryStatus =
    primaryMode === "map"
      ? t("screen.playersSeeMap", { target: primaryTitle ?? t("map.noMapLoaded") })
      : primaryMode === "fullscreen"
        ? t("screen.playersSeeFullscreen", { target: primaryTitle ?? t("screen.fullscreen") })
        : t("screen.playersSeeBlank");

  function renderPopupList(popups: DisplayState["popups"], empty: string) {
    if (popups.length === 0) {
      return <p>{empty}</p>;
    }
    return (
      <div className="screen-popup-list">
        {popups.map((popup) => (
          <div className="screen-popup-item" key={popup.id}>
            <span>{popup.title ?? popup.name}</span>
            <small>{popup.preset ?? t("screen.popupPresetPlain")}</small>
            {popup.visible === false ? (
              <button onClick={() => onPopupVisibleChange(popup.id, true)} type="button">
                {t("screen.showPopupToPlayers")}
              </button>
            ) : (
              <button onClick={() => onPopupVisibleChange(popup.id, false)} type="button">
                {t("screen.hidePopupFromPlayers")}
              </button>
            )}
            <button className="button-danger-subtle" onClick={() => onClosePopup(popup.id)} type="button">
              {t("app.close")}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label={t("screen.control")}
      className="screen-tool"
      data-help-context={tab === "map" ? "screen-map" : "screen-display"}
    >
      <InnerToolTabs
        active={tab}
        ariaLabel={t("screen.sections")}
        onChange={onTabChange}
        tabs={[
          { id: "display", label: t("screen.display") },
          { id: "map", label: t("screen.map") }
        ]}
      />
      {tab === "map" ? (
        <MapTool activeTab={activeTab} />
      ) : (
        <>
      <label>
        {t("screen.fullscreenPath")}
        <div className="inline-input-action">
          <input
            aria-label={t("screen.fullscreenPath")}
            onChange={(event) => setDisplayTargetPath(event.target.value)}
            placeholder={activeTab?.path ?? t("screen.pathPlaceholder")}
            value={displayTargetPath}
          />
          <button
            aria-label={t("screen.chooseTarget")}
            onClick={() => onPickPath("displayable", t("screen.chooseTarget"), setDisplayTargetPath)}
            type="button"
          >
            {t("screen.pick")}
          </button>
        </div>
      </label>
      <div className="screen-actions">
        <button disabled={!canUseTarget} onClick={() => onShowFullscreen(targetPath || undefined)} type="button">
          {targetPath ? t("screen.showPathFullscreen") : t("screen.showActiveFullscreen", { target: targetLabel })}
        </button>
        <button disabled={!canUseTarget} onClick={() => onOpenPopup(popupPreset, targetPath || undefined)} type="button">
          {targetPath ? t("screen.openPopup", { target: targetLabel }) : t("screen.openActivePopup", { target: targetLabel })}
        </button>
        <button disabled={!canUseTarget} onClick={() => onStagePopup(popupPreset, targetPath || undefined)} type="button">
          {targetPath ? t("screen.stagePopup", { target: targetLabel }) : t("screen.stageActivePopup", { target: targetLabel })}
        </button>
        <button className="button-danger-subtle" disabled={!canUseTarget} onClick={() => onClearAndShowFullscreen(targetPath || undefined)} type="button">
          {t("screen.clearShow", { target: targetLabel })}
        </button>
        <button className="button-danger-subtle" onClick={onBlank} type="button">
          {t("screen.blank")}
        </button>
        <button className="button-danger-subtle" onClick={onClearPopups} type="button">
          {t("screen.clearPopups")}
        </button>
        <IconButton
          disabled={primaryMode === "blank"}
          label={t("screen.rotate90")}
          name="rotate"
          onClick={onRotatePrimary}
        />
        <a href="/screen" rel="noreferrer" target="_blank">
          {t("screen.openPlayer")}
        </a>
      </div>
      <label className="compact-inline-control">
        {t("screen.popupPreset")}
        <select
          onChange={(event) => setPopupPreset(event.target.value as DisplayPopupPreset)}
          value={popupPreset}
        >
          <option value="plain">{t("screen.popupPlain")}</option>
          <option value="note">{t("screen.popupNote")}</option>
          <option value="letter">{t("screen.popupLetter")}</option>
          <option value="portrait">{t("screen.popupPortrait")}</option>
          <option value="clue">{t("screen.popupClue")}</option>
        </select>
      </label>
      {!canUseTarget && <p>{t("screen.selectTarget")}</p>}
      <section className="screen-state" aria-label={t("screen.current")}>
        <h3>{t("screen.current")}</h3>
        <p>{primaryStatus}</p>
        {visiblePopups.length > 0 ? (
          <small>{t("screen.playersVisiblePopups", { count: visiblePopups.length })}</small>
        ) : null}
      </section>
      <section className="screen-state" aria-label={t("screen.popups")}>
        <h3>{t("screen.popups")}</h3>
        <h4>{t("screen.visible")}</h4>
        {renderPopupList(visiblePopups, t("screen.noVisiblePopups"))}
        <h4>{t("screen.staged")}</h4>
        {renderPopupList(stagedPopups, t("screen.noStagedPopups"))}
      </section>
        </>
      )}
    </section>
  );
}
