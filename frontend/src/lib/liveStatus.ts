import type { PrepHealthReport } from "./api";
import type { Translator } from "../lang";

function countLabel(
  count: number,
  singularKey: string,
  pluralKey: string,
  singularFallback: string,
  pluralFallback: string,
  t?: Translator
): string {
  if (t) {
    return t(count === 1 ? singularKey : pluralKey, { count });
  }
  return `${count} ${count === 1 ? singularFallback : pluralFallback}`;
}

export function livePrepHealthLabel(report: PrepHealthReport | null, t?: Translator): string {
  if (!report) {
    const value = t?.("prep.status.notChecked") ?? "Not checked";
    return t ? t("live.prep", { value }) : `Prep: ${value}`;
  }
  if (report.errors === 0 && report.warnings === 0) {
    const value = t?.("prep.status.ready") ?? "Ready";
    return t ? t("live.prep", { value }) : `Prep: ${value}`;
  }
  const parts: string[] = [];
  if (report.errors > 0) {
    parts.push(countLabel(report.errors, "prep.count.error", "prep.count.errors", "error", "errors", t));
  }
  if (report.warnings > 0) {
    parts.push(
      countLabel(report.warnings, "prep.count.warning", "prep.count.warnings", "warning", "warnings", t)
    );
  }
  const value = parts.join(", ");
  return t ? t("live.prep", { value }) : `Prep: ${value}`;
}
