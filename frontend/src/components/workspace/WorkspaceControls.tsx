import { type RefObject } from "react";
import { type Translator } from "../../lang";
import { type NamedWorkspaceSummary, type WorkspaceLayout } from "../../lib/api";
import { IconButton } from "../IconButton";

export function WorkspaceControls({
  currentId,
  currentName,
  layout,
  prepStatus,
  summaries,
  onActivate,
  onCapture,
  onDelete,
  onHelp,
  onNewCard,
  onNew,
  onOpenScreen,
  onPrepCheck,
  onSearch,
  searchButtonRef,
  onRename,
  onModeChange,
  onToggleTools,
  toolsVisible,
  t
}: {
  currentId: string;
  currentName: string;
  layout: WorkspaceLayout;
  prepStatus: string;
  summaries: NamedWorkspaceSummary[];
  onActivate: (workspaceId: string) => void;
  onCapture: () => void;
  onDelete: () => void;
  onHelp: () => void;
  onNewCard: () => void;
  onNew: () => void;
  onOpenScreen: () => void;
  onPrepCheck: () => void;
  onSearch: () => void;
  searchButtonRef: RefObject<HTMLButtonElement | null>;
  onRename: () => void;
  onModeChange: (mode: WorkspaceLayout["mode"]) => void;
  onToggleTools: () => void;
  toolsVisible: boolean;
  t: Translator;
}) {
  return (
    <section className="workspace-controls" aria-label={t("workspace.controls")} data-help-context="document-empty">
      <label>
        {t("workspace.workspace")}
        <select
          aria-label={t("workspace.select")}
          onChange={(event) => onActivate(event.target.value)}
          value={currentId}
        >
          {summaries.length === 0 ? (
            <option value={currentId}>{currentName}</option>
          ) : (
            summaries.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))
          )}
        </select>
      </label>
      <button onClick={onNew} type="button">
        {t("workspace.new")}
      </button>
      <button onClick={onRename} type="button">
        {t("workspace.rename")}
      </button>
      <button disabled={currentId === "default"} onClick={onDelete} type="button">
        {t("workspace.delete")}
      </button>
      <button onClick={onSearch} ref={searchButtonRef} type="button">
        {t("workspace.search")}
      </button>
      <button onClick={onCapture} type="button">
        {t("workspace.capture")}
      </button>
      <button onClick={onOpenScreen} type="button">
        {t("workspace.screen")}
      </button>
      <button onClick={onNewCard} type="button">
        {t("workspace.newCard")}
      </button>
      <button onClick={onPrepCheck} type="button">
        {t("workspace.prepCheckStatus", { status: prepStatus })}
      </button>
      <button
        aria-label={t("help.open")}
        className="workspace-help-button"
        onClick={onHelp}
        title={t("help.open")}
        type="button"
      >
        {t("help.openShort")}
      </button>
      <div className="workspace-controls-divider" aria-hidden="true" />
      <div className="workspace-view-toggles">
        <IconButton
          aria-pressed={toolsVisible}
          label={`${toolsVisible ? t("tools.hidePanel") : t("tools.showPanel")} (Ctrl+B)`}
          name="panel"
          onClick={onToggleTools}
        />
        <div className="workspace-layout-toggle" role="group" aria-label={t("workspace.layout")}>
          <IconButton
            aria-pressed={layout.mode === "single"}
            label={t("workspace.single")}
            name="single"
            onClick={() => onModeChange("single")}
          />
          <IconButton
            aria-pressed={layout.mode === "vertical_split"}
            label={t("workspace.split")}
            name="split"
            onClick={() => onModeChange("vertical_split")}
          />
        </div>
      </div>
    </section>
  );
}
