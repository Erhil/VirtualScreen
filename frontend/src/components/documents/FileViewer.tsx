import { type MouseEvent, type ReactNode, useMemo } from "react";
import { CodeEditor, type CodeEditorCompletion } from "../../CodeEditor";
import { type Translator } from "../../lang";
import { buildMediaUrl, type PageLink, type WorldFile } from "../../lib/api";
import { serializeCard } from "../../lib/cards";
import { type CsvData, parseCsv } from "../../lib/csv";
import { type EditorDraft } from "../../lib/editor";
import { renderRichMarkdown } from "../../lib/richText";
import { type OpenTab } from "../../lib/tabs";
import { type WorldPathPickerFilter } from "../../lib/worldPathPicker";
import { PdfViewer } from "../PdfViewer";
import { CardEditor } from "./CardEditor";
import { CardViewer } from "./CardViewer";
import { CsvEditor, CsvViewer } from "./CsvViews";
import { isCardPath, parseCardJson } from "./documentFiles";
import { RichHtml } from "./RichHtml";

export type FileLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; file: WorldFile }
  | { status: "removed"; message: string }
  | { status: "error"; message: string };

function splitMarkdownFrontmatter(content: string): { frontmatter: string; body: string } {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: "", body: content };
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { frontmatter: "", body: content };
  }

  const bodyStart = endIndex + 5;
  return {
    frontmatter: normalized.slice(0, bodyStart),
    body: normalized.slice(bodyStart)
  };
}

function replaceMarkdownBody(content: string, body: string): string {
  const parts = splitMarkdownFrontmatter(content);
  return `${parts.frontmatter}${body}`;
}

function MarkdownViewer({
  file,
  content,
  links,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink
}: {
  file: WorldFile;
  content?: string;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  // App re-renders on unrelated state (a dice roll, a tool toggle); re-rendering a long
  // page's markdown and sanitizing it each time is the cost worth skipping.
  const source = content ?? file.content;
  const html = useMemo(() => renderRichMarkdown(source, links, file.path), [source, links, file.path]);
  return (
    <RichHtml
      className="markdown-viewer"
      helpContext="document-markdown"
      html={html}
      links={links}
      onContextLink={onContextLink}
      onDiceRoll={onDiceRoll}
      onOpenLink={onOpenLink}
      onPeekLink={onPeekLink}
      tabIndex={0}
    />
  );
}

function InvalidCardState({
  message,
  rawEditor
}: {
  message: string;
  rawEditor?: ReactNode;
}) {
  return (
    <div className="card-surface card-invalid">
      <h2>Invalid Card</h2>
      <p>{message}</p>
      {rawEditor ? (
        <>
          <p>Repair the raw JSON to return to the structured editor.</p>
          <div className="card-raw-recovery">{rawEditor}</div>
        </>
      ) : (
        <p>Switch to Edit to repair the raw JSON.</p>
      )}
    </div>
  );
}

function TextViewer({ file }: { file: WorldFile }) {
  return (
    <pre className="text-viewer" data-help-context="document-media" tabIndex={0}>
      {file.content}
    </pre>
  );
}

export function FileViewer({
  tab,
  loadState,
  completions,
  draft,
  links,
  onContextLink,
  onCsvDraftChange,
  onDiceRoll,
  onDraftContentChange,
  onOpenLink,
  onPickWorldPath,
  onPeekLink,
  pdfTarget,
  t
}: {
  tab: OpenTab;
  loadState: FileLoadState;
  completions: CodeEditorCompletion[];
  draft: EditorDraft | null;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onCsvDraftChange: (data: CsvData) => void;
  onDiceRoll?: (expression: string) => void;
  onDraftContentChange: (content: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPickWorldPath?: (filter: WorldPathPickerFilter, title: string, onSelect: (path: string) => void) => void;
  onPeekLink?: (link: PageLink) => void;
  pdfTarget?: string | null;
  t: Translator;
}) {
  if (loadState.status === "removed") {
    return (
      <div className="empty-surface" data-help-context="document-empty">
        <h2>{t("document.fileRemoved")}</h2>
        <p>{loadState.message}</p>
      </div>
    );
  }

  if (tab.mediaKind === "unsupported") {
    return (
      <div className="empty-surface" data-help-context="document-empty">
        <h2>{t("document.unsupportedFile")}</h2>
        <p>{t("document.unsupportedFileDetail", { name: tab.name })}</p>
      </div>
    );
  }

  if (tab.mediaKind === "image") {
    return (
      <div className="media-viewer" data-help-context="document-media" tabIndex={0}>
        <img alt={tab.name} src={buildMediaUrl(tab.path)} />
      </div>
    );
  }

  if (tab.mediaKind === "video") {
    return (
      <div className="media-viewer" data-help-context="document-media" tabIndex={0}>
        <video aria-label={tab.name} controls src={buildMediaUrl(tab.path)} />
      </div>
    );
  }

  if (tab.mediaKind === "pdf") {
    return <PdfViewer name={tab.name} path={tab.path} target={pdfTarget} t={t} />;
  }

  if (loadState.status === "loading" || loadState.status === "idle") {
    return <div className="empty-surface" data-help-context="document-empty">{t("document.loadingFile", { name: tab.name })}</div>;
  }

  if (loadState.status === "error") {
    return (
      <div className="empty-surface" data-help-context="document-empty">
        <h2>{t("document.couldNotOpen")}</h2>
        <p>{loadState.message}</p>
      </div>
    );
  }

  if (isCardPath(loadState.file.path, loadState.file.extension)) {
    const content = draft?.content ?? loadState.file.content;
    const parsed = parseCardJson(content);

    if (!parsed.ok) {
      return (
        <div data-help-context="document-card">
          <InvalidCardState
            message={parsed.message}
            rawEditor={
              draft?.mode === "edit" ? (
                <CodeEditor
                  ariaLabel="Raw card JSON editor"
                  language="text"
                  onChange={onDraftContentChange}
                  value={draft.content}
                />
              ) : undefined
            }
          />
        </div>
      );
    }

    if (draft?.mode === "edit") {
      return (
        <CardEditor
          card={parsed.card}
          onChange={(card) => onDraftContentChange(serializeCard(card))}
          onPickWorldPath={(onSelect) => onPickWorldPath?.("any", "Choose World Link", onSelect)}
        />
      );
    }

    return (
      <CardViewer
        card={parsed.card}
        file={loadState.file}
          links={links}
          onContextLink={onContextLink}
          onDiceRoll={onDiceRoll}
          onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );
  }

  if (loadState.file.media_kind === "markdown") {
    const body = splitMarkdownFrontmatter(draft?.content ?? loadState.file.content).body;
    const editor = draft ? (
      <CodeEditor
        ariaLabel="Markdown editor"
        completions={completions}
        language="markdown"
        onChange={(value) => onDraftContentChange(replaceMarkdownBody(draft.content, value))}
        value={body}
      />
    ) : null;
    const preview = (
      <MarkdownViewer
        content={draft?.content}
        file={loadState.file}
        links={links}
        onContextLink={onContextLink}
        onDiceRoll={onDiceRoll}
        onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );

    if (draft?.mode === "edit") {
      return (
        <section className="document-help-surface" data-help-context="document-markdown">
          {editor}
        </section>
      );
    }

    if (draft?.mode === "split") {
      return (
        <div className="markdown-split-view">
          <section aria-label="Markdown editor pane" data-help-context="document-markdown">{editor}</section>
          <section aria-label="Markdown preview pane" data-help-context="document-markdown">{preview}</section>
        </div>
      );
    }

    return preview;
  }

  if (loadState.file.media_kind === "csv") {
    if (draft?.mode === "edit") {
      return <CsvEditor data={parseCsv(draft.content)} onChange={onCsvDraftChange} />;
    }

    return (
      <CsvViewer
        content={draft?.content}
        file={loadState.file}
        links={links}
        onContextLink={onContextLink}
        onDiceRoll={onDiceRoll}
        onOpenLink={onOpenLink}
        onPeekLink={onPeekLink}
      />
    );
  }

  if (loadState.file.media_kind === "script") {
    if (draft?.mode === "edit") {
      return (
        <section className="document-help-surface" data-help-context="document-dms">
          <CodeEditor
            ariaLabel="DMS editor"
            completions={completions}
            language="python"
            onChange={onDraftContentChange}
            value={draft.content}
          />
        </section>
      );
    }

    return <pre className="text-viewer" data-help-context="document-dms" tabIndex={0}>{draft?.content ?? loadState.file.content}</pre>;
  }

  return <TextViewer file={loadState.file} />;
}
