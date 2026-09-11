import { type Translator } from "../../lang";
import { type PageLink } from "../../lib/api";
import { canSendToScreen } from "../../lib/toolPanel";

export type LinkContextMenuState =
  | { open: false }
  | { open: true; link: PageLink; x: number; y: number };

export function LinkContextMenu({
  state,
  onClose,
  onCopyPath,
  onOpen,
  onOpenOtherPane,
  onPeek,
  onShowFullscreen,
  onShowPopup,
  onStagePopup,
  onUseAsMap,
  t
}: {
  state: LinkContextMenuState;
  onClose: () => void;
  onCopyPath: (link: PageLink) => void;
  onOpen: (link: PageLink) => void;
  onOpenOtherPane: (link: PageLink) => void;
  onPeek: (link: PageLink) => void;
  onShowFullscreen: (link: PageLink) => void;
  onShowPopup: (link: PageLink) => void;
  onStagePopup: (link: PageLink) => void;
  onUseAsMap: (link: PageLink) => void;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }
  const disabled = !state.link.resolved || !state.link.target_path;
  return (
    <div
      className="link-context-menu"
      role="menu"
      style={{ left: state.x, top: state.y }}
    >
      <button disabled={disabled} onClick={() => { onOpen(state.link); onClose(); }} type="button">
        {t("search.open")}
      </button>
      <button disabled={disabled} onClick={() => { onOpenOtherPane(state.link); onClose(); }} type="button">
        {t("search.otherPane")}
      </button>
      <button disabled={disabled} onClick={() => { onPeek(state.link); onClose(); }} type="button">
        {t("search.peek")}
      </button>
      <button disabled={disabled} onClick={() => { onStagePopup(state.link); onClose(); }} type="button">
        {t("search.stage")}
      </button>
      <button disabled={disabled} onClick={() => { onShowPopup(state.link); onClose(); }} type="button">
        {t("search.showOnScreen")}
      </button>
      <button
        disabled={disabled || !canSendToScreen(state.link.target_kind)}
        onClick={() => { onShowFullscreen(state.link); onClose(); }}
        type="button"
      >
        {t("contextMenu.showFullscreen")}
      </button>
      {state.link.target_kind === "image" ? (
        <button disabled={disabled} onClick={() => { onUseAsMap(state.link); onClose(); }} type="button">
          {t("contextMenu.useAsMap")}
        </button>
      ) : null}
      <button onClick={() => { onCopyPath(state.link); onClose(); }} type="button">
        {t("contextMenu.copyPath")}
      </button>
    </div>
  );
}
