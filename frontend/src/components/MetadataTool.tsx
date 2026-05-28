import type { Translator } from "../lang";
import type { PageDetail, PageLink, PageSummary } from "../lib/api";
import { buildMetadataViewModel } from "../lib/metadata";
import {
  addMetadataFieldRow,
  isMetadataFormDirty,
  removeMetadataFieldRow,
  updateMetadataFieldRow,
  validateMetadataForm,
  type MetadataFormState
} from "../lib/metadataEditor";
import type { OpenTab } from "../lib/tabs";

export type PageLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; page: PageDetail }
  | { status: "error"; message: string };

export type LinksLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; outgoing: PageLink[]; backlinks: PageLink[] }
  | { status: "error"; message: string };

export type MetadataEditState =
  | { mode: "view" }
  | {
      mode: "edit";
      form: MetadataFormState;
      status: "idle" | "saving" | "conflict" | "error";
      message: string | null;
      expectedModifiedAt: string;
      expectedHash: string;
    };

function MetadataEditForm({
  contentDirty,
  fileReady,
  page,
  state,
  onCancel,
  onChange,
  onReload,
  onSave,
  onRevert
}: {
  contentDirty: boolean;
  fileReady: boolean;
  page: PageDetail;
  state: Extract<MetadataEditState, { mode: "edit" }>;
  onCancel: () => void;
  onChange: (form: MetadataFormState) => void;
  onReload: () => void;
  onSave: () => void;
  onRevert: () => void;
}) {
  const validation = validateMetadataForm(state.form);
  const dirty = isMetadataFormDirty(state.form, page);
  const saving = state.status === "saving";
  const disabled = saving || !fileReady || contentDirty;

  return (
    <form
      className="metadata-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <label>
        Title
        <input
          aria-label="Metadata title"
          onChange={(event) => onChange({ ...state.form, title: event.target.value })}
          value={state.form.title}
        />
      </label>
      <label>
        Type
        <input
          aria-label="Metadata type"
          onChange={(event) => onChange({ ...state.form, type: event.target.value })}
          value={state.form.type}
        />
      </label>
      <label>
        Tags
        <input
          aria-label="Metadata tags"
          onChange={(event) => onChange({ ...state.form, tagsText: event.target.value })}
          value={state.form.tagsText}
        />
      </label>
      <label>
        Aliases
        <input
          aria-label="Metadata aliases"
          onChange={(event) => onChange({ ...state.form, aliasesText: event.target.value })}
          value={state.form.aliasesText}
        />
      </label>
      <section className="metadata-fields" aria-label="Custom Fields">
        <h3>Custom Fields</h3>
        {state.form.fields.map((field, index) => (
          <div className="metadata-field-row" key={`field-${index}`}>
            <input
              aria-label={`Field ${index + 1} key`}
              onChange={(event) =>
                onChange(updateMetadataFieldRow(state.form, index, { key: event.target.value }))
              }
              placeholder="Key"
              value={field.key}
            />
            <input
              aria-label={`Field ${index + 1} value`}
              onChange={(event) =>
                onChange(updateMetadataFieldRow(state.form, index, { value: event.target.value }))
              }
              placeholder="Value"
              value={field.value}
            />
            <button
              aria-label={`Remove field ${index + 1}`}
              onClick={() => onChange(removeMetadataFieldRow(state.form, index))}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={() => onChange(addMetadataFieldRow(state.form))} type="button">
          Add Field
        </button>
      </section>
      {(validation || state.message || contentDirty) && (
        <p className={`metadata-form-message metadata-form-message-${state.status}`}>
          {contentDirty
            ? "Save or revert content before editing metadata."
            : validation ?? state.message}
        </p>
      )}
      <div className="metadata-form-actions">
        <button disabled={disabled || !dirty || Boolean(validation)} type="submit">
          {saving ? "Saving..." : "Save Metadata"}
        </button>
        <button disabled={saving} onClick={onRevert} type="button">
          Revert
        </button>
        {state.status === "conflict" && (
          <button disabled={saving} onClick={onReload} type="button">
            Reload metadata
          </button>
        )}
        <button disabled={saving} onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function MetadataTool({
  tab,
  pageState,
  linksState,
  pages,
  editState,
  fileReady,
  contentDirty,
  onOpenOutgoing,
  onOpenBacklink,
  onStartEdit,
  onChangeEdit,
  onCancelEdit,
  onRevertEdit,
  onSaveEdit,
  onReloadEdit,
  t
}: {
  tab: OpenTab | null;
  pageState: PageLoadState;
  linksState: LinksLoadState;
  pages: PageSummary[];
  editState: MetadataEditState;
  fileReady: boolean;
  contentDirty: boolean;
  onOpenOutgoing: (link: PageLink) => void;
  onOpenBacklink: (link: PageLink) => void;
  onStartEdit: () => void;
  onChangeEdit: (form: MetadataFormState) => void;
  onCancelEdit: () => void;
  onRevertEdit: () => void;
  onSaveEdit: () => void;
  onReloadEdit: () => void;
  t: Translator;
}) {
  if (pageState.status === "loading" || pageState.status === "idle") {
    return (
      <section className="metadata-tool" aria-label={t("metadata.title")} data-help-context="metadata">
        {tab ? <p>{t("metadata.loading")}</p> : <p>{t("metadata.selectFile")}</p>}
      </section>
    );
  }

  if (pageState.status === "error") {
    return (
      <section className="metadata-tool" aria-label={t("metadata.title")} data-help-context="metadata">
        <div className="metadata-empty">
          <h3>{t("metadata.loadError")}</h3>
          <p>{pageState.message}</p>
        </div>
      </section>
    );
  }

  const entries = buildMetadataViewModel(pageState.page);
  const outgoing = linksState.status === "ready" ? linksState.outgoing : [];
  const backlinks = linksState.status === "ready" ? linksState.backlinks : [];
  const linksError = linksState.status === "error" ? linksState.message : null;

  return (
    <section className="metadata-tool" aria-label={t("metadata.title")} data-help-context="metadata">
      <div className="metadata-heading">
        {editState.mode === "view" && (
          <button disabled={!fileReady || contentDirty} onClick={onStartEdit} type="button">
            {t("metadata.edit")}
          </button>
        )}
      </div>
      {editState.mode === "edit" ? (
        <MetadataEditForm
          contentDirty={contentDirty}
          fileReady={fileReady}
          onCancel={onCancelEdit}
          onChange={onChangeEdit}
          onReload={onReloadEdit}
          onRevert={onRevertEdit}
          onSave={onSaveEdit}
          page={pageState.page}
          state={editState}
        />
      ) : (
        <>
          <dl>
            {entries.map((entry) => (
              <div className="metadata-row" key={entry.label}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
          <section className="link-section" aria-label={t("metadata.outgoingLinks")}>
            <h3>{t("metadata.outgoingLinks")}</h3>
            {linksError && <p>{linksError}</p>}
            {linksState.status === "loading" && <p>{t("metadata.loadingLinks")}</p>}
            {linksState.status !== "loading" && outgoing.length === 0 && <p>{t("app.none")}</p>}
            {outgoing.map((link, index) => (
              <button
                className="panel-link"
                disabled={!link.resolved}
                key={`${link.source_path}-${link.raw_target}-${link.link_type}-${index}`}
                onClick={() => onOpenOutgoing(link)}
                type="button"
              >
                {link.target_kind === "markdown" ? link.target_title ?? link.label : link.label}
              </button>
            ))}
          </section>
          <section className="link-section" aria-label={t("metadata.backlinks")}>
            <h3>{t("metadata.backlinks")}</h3>
            {linksState.status === "loading" && <p>{t("metadata.loadingBacklinks")}</p>}
            {linksState.status !== "loading" && backlinks.length === 0 && <p>{t("app.none")}</p>}
            {backlinks.map((link) => {
              const sourcePage = pages.find((page) => page.path === link.source_path);
              return (
                <button
                  className="panel-link"
                  key={`${link.source_path}-${link.raw_target}`}
                  onClick={() => onOpenBacklink(link)}
                  type="button"
                >
                  {sourcePage?.title ?? link.source_path}
                </button>
              );
            })}
          </section>
        </>
      )}
    </section>
  );
}
