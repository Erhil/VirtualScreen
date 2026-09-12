import { type Translator } from "../../lang";
import { type PrepHealthIssue, type PrepHealthReport } from "../../lib/api";
import {
  filterPrepHealthIssues,
  prepHealthCompactStatusLabel,
  type PrepHealthFilter,
  prepHealthStatusLabel,
  sortPrepHealthIssues
} from "../../lib/prepHealth";
import { Modal } from "../Modal";

export type PrepHealthStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };

const PREP_HEALTH_FILTERS: Array<{ id: PrepHealthFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "errors", label: "Errors" },
  { id: "warnings", label: "Warnings" },
  { id: "links", label: "Links" },
  { id: "dms", label: "DMS" }
];

function prepHealthKindLabel(issue: PrepHealthIssue, t?: Translator): string {
  if (issue.kind === "untrusted_dms") {
    return t?.("prep.kind.untrustedDms") ?? "DMS not trusted";
  }
  if (issue.kind === "missing_embed") {
    return t?.("prep.kind.missingEmbed") ?? "Missing embed";
  }
  if (issue.kind === "missing_dms_reference") {
    return t?.("prep.kind.missingDmsReference") ?? "DMS reference";
  }
  if (issue.kind === "dms_parse_error") {
    return t?.("prep.kind.dmsParseError") ?? "DMS parse";
  }
  return t?.("prep.kind.brokenLink") ?? "Broken link";
}

export function PrepHealthDialog({
  filter,
  onClose,
  onCopyTarget,
  onFilterChange,
  onOpenSource,
  onRun,
  onTrustAllScripts,
  open,
  report,
  status,
  t
}: {
  filter: PrepHealthFilter;
  onClose: () => void;
  onCopyTarget: (target: string) => void;
  onFilterChange: (filter: PrepHealthFilter) => void;
  onOpenSource: (issue: PrepHealthIssue) => void;
  onRun: () => void;
  onTrustAllScripts: () => void;
  open: boolean;
  report: PrepHealthReport | null;
  status: PrepHealthStatus;
  t: Translator;
}) {
  if (!open) {
    return null;
  }

  const filteredIssues = report
    ? filterPrepHealthIssues(sortPrepHealthIssues(report.issues), filter)
    : [];
  const hasUntrustedScripts = Boolean(report?.issues.some((issue) => issue.kind === "untrusted_dms"));

  return (
    <Modal
      ariaLabel={t("prep.title")}
      className="prep-health-dialog tool-dialog"
      closeLabel={t("prep.close")}
      closeOnEscape
      dataHelpContext="prep-health"
      dismissOnBackdrop
      onClose={onClose}
      title={t("prep.title")}
    >
        <div className="prep-health-summary">
          <div>
            <strong>{report ? prepHealthStatusLabel(report.status, t) : t("prep.status.notChecked")}</strong>
            <span>
              {report
                ? prepHealthCompactStatusLabel(report, { status: "idle" }, t)
                : t("prep.runDescription")}
            </span>
          </div>
          <div className="prep-health-summary-actions">
            <button disabled={status.status === "loading"} onClick={onRun} type="button">
              {status.status === "loading" ? t("prep.checking") : t("prep.run")}
            </button>
            {hasUntrustedScripts && (
              <button disabled={status.status === "loading"} onClick={onTrustAllScripts} type="button">
                {t("prep.trustAllScripts")}
              </button>
            )}
          </div>
        </div>
        {status.message && (
          <p className={status.status === "error" ? "dialog-error" : "dialog-note"}>
            {status.message}
          </p>
        )}
        {report && (
          <>
            <div className="prep-health-filters" role="tablist" aria-label={t("prep.filters.label")}>
              {PREP_HEALTH_FILTERS.map((item) => (
                <button
                  aria-selected={filter === item.id}
                  key={item.id}
                  onClick={() => onFilterChange(item.id)}
                  role="tab"
                  type="button"
                >
                  {localizedOrFallback(t, `prep.filter.${item.id}`, item.label)}
                </button>
              ))}
            </div>
            {filteredIssues.length === 0 ? (
              <p className="dialog-note">{t("prep.noIssues")}</p>
            ) : (
              <div className="prep-health-issues" aria-label={t("prep.issues")}>
                {filteredIssues.map((issue) => (
                  <article className="prep-health-issue" key={issue.id}>
                    <div>
                      <strong>{prepHealthKindLabel(issue, t)}</strong>
                      <span>{issue.source_path}</span>
                    </div>
                    <p>{issue.message}</p>
                    <small>
                      {t("prep.target")} {issue.raw_target || t("prep.scriptSyntax")}
                      {issue.command ? ` / ${issue.command}` : ""}
                    </small>
                    <div className="prep-health-actions">
                      <button onClick={() => onOpenSource(issue)} type="button">
                        {t("prep.openSource")}
                      </button>
                      <button
                        disabled={!issue.raw_target}
                        onClick={() => onCopyTarget(issue.raw_target)}
                        type="button"
                      >
                        {t("prep.copyTarget")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
    </Modal>
  );
}

function localizedOrFallback(t: Translator, key: string, fallback: string): string {
  const value = t(key);
  return value.startsWith("[[") ? fallback : value;
}
