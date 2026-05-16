import type { PrepHealthIssue, PrepHealthReport, PrepHealthStatus, WorkspaceTab } from "./api";

export type PrepHealthFilter = "all" | "errors" | "warnings" | "links" | "dms";
export type PrepHealthCheckStatus = {
  status: "idle" | "loading" | "ready" | "error";
};

export function prepHealthStatusLabel(status: PrepHealthStatus): string {
  if (status === "error") {
    return "Errors";
  }
  if (status === "warning") {
    return "Warnings";
  }
  return "Ready";
}

export function prepHealthCompactStatusLabel(
  report: PrepHealthReport | null,
  status: PrepHealthCheckStatus
): string {
  if (status.status === "loading") {
    return "Checking";
  }
  if (status.status === "error" && !report) {
    return "Check failed";
  }
  if (!report) {
    return "Not checked";
  }
  if (report.errors === 0 && report.warnings === 0) {
    return "Ready";
  }

  const parts: string[] = [];
  if (report.errors > 0) {
    parts.push(`${report.errors} error${report.errors === 1 ? "" : "s"}`);
  }
  if (report.warnings > 0) {
    parts.push(`${report.warnings} warning${report.warnings === 1 ? "" : "s"}`);
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
