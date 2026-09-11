import { type MouseEvent } from "react";
import { type CodeEditorCompletion } from "../../CodeEditor";
import { type Translator } from "../../lang";
import { type PageLink } from "../../lib/api";
import { type OpenTab } from "../../lib/tabs";
import { type LinksLoadState } from "../MetadataTool";
import { type FileLoadState, FileViewer } from "./FileViewer";

export type PeekState =
  | { open: false }
  | {
      open: true;
      tab: OpenTab;
      fileState: FileLoadState;
      linksState: LinksLoadState;
    };

export function PeekDialog({
  state,
  completions,
  onClose,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink,
  t
}: {
  state: PeekState;
  completions: CodeEditorCompletion[];
  onClose: () => void;
  onContextLink: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink: (link: PageLink) => void;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }
  return (
    <div className="peek-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label={t("peek.title", { name: state.tab.title ?? state.tab.name })}
        className="peek-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{state.tab.title ?? state.tab.name}</h2>
          <button aria-label={t("peek.close")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <FileViewer
          completions={completions}
          draft={null}
          links={state.linksState.status === "ready" ? state.linksState.outgoing : []}
          loadState={state.fileState}
          onContextLink={onContextLink}
          onCsvDraftChange={() => {}}
          onDiceRoll={onDiceRoll}
          onDraftContentChange={() => {}}
          onOpenLink={onOpenLink}
          onPeekLink={onPeekLink}
          pdfTarget={null}
          tab={state.tab}
          t={t}
        />
      </section>
    </div>
  );
}
