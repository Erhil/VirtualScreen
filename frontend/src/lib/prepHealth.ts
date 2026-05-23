import type { PrepHealthIssue, PrepHealthReport, PrepHealthStatus, WorkspaceTab } from "./api";
import type { Translator } from "../lang";

export type PrepHealthFilter = "all" | "errors" | "warnings" | "links" | "dms";
export type PrepHealthCheckStatus = {
  status: "idle" | "loading" | "ready" | "error";
};

function prepCountLabel(
  count: number,
  singularKey: string,
  pluralKey: string,
  singularFallback: string,
  pluralFallback: string,
  t?: Translator
): string {
  if (typeof t === "function") {
    return t(count === 1 ? singularKey : pluralKey, { count });
  }
  return `${count} ${count === 1 ? singularFallback : pluralFallback}`;
}

export function prepHealthStatusLabel(status: PrepHealthStatus, t?: Translator | number): string {
  const translate = typeof t === "function" ? t : undefined;
  if (status === "error") {
    return translate ? translate("prep.status.errors") : "Errors";
  }
  if (status === "warning") {
    return translate ? translate("prep.status.warnings") : "Warnings";
  }
  return translate ? translate("prep.status.ready") : "Ready";
}

export function prepHealthCompactStatusLabel(
  report: PrepHealthReport | null,
  status: PrepHealthCheckStatus,
  t?: Translator
): string {
  const translate = typeof t === "function" ? t : undefined;
  if (status.status === "loading") {
    return translate ? translate("prep.status.checking") : "Checking";
  }
  if (status.status === "error" && !report) {
    return translate ? translate("prep.status.checkFailed") : "Check failed";
  }
  if (!report) {
    return translate ? translate("prep.status.notChecked") : "Not checked";
  }
  if (report.errors === 0 && report.warnings === 0) {
    return translate ? translate("prep.status.ready") : "Ready";
  }

  const parts: string[] = [];
  if (report.errors > 0) {
    parts.push(
      prepCountLabel(report.errors, "prep.count.error", "prep.count.errors", "error", "errors", translate)
    );
  }
  if (report.warnings > 0) {
    parts.push(
      prepCountLabel(
        report.warnings,
        "prep.count.warning",
        "prep.count.warnings",
        "warning",
        "warnings",
        translate
      )
    );
  }
  return parts.join(" / ");
}

export function filterPrepHealthIssues(
  issues: PrepHealthIssue[],
  filter: PrepHealthFilter
): PrepHealthIssue[] {
  if (filter === "errors") {
    return issues.filter((issue) => issue.severity === "error");
  }
  if (filter === "warnings") {
    return issues.filter((issue) => issue.severity === "warning");
  }
  if (filter === "links") {
    return issues.filter((issue) => issue.kind === "broken_link" || issue.kind === "missing_embed");
  }
  if (filter === "dms") {
    return issues.filter(
      (issue) => issue.kind === "missing_dms_reference" || issue.kind === "dms_parse_error"
    );
  }
  return issues;
}

export function sortPrepHealthIssues(issues: PrepHealthIssue[]): PrepHealthIssue[] {
  return [...issues].sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === "error" ? -1 : 1;
    }
    return left.source_path.localeCompare(right.source_path, undefined, { sensitivity: "base" });
  });
}

export function prepHealthIssueToOpenTab(issue: PrepHealthIssue): WorkspaceTab {
  return {
    path: issue.source_path,
    name: issue.source_path.split("/").pop() ?? issue.source_path,
    title: issue.source_title,
    mediaKind: issue.source_kind
  };
}
