import { describe, expect, it } from "vitest";

import type { PrepHealthResponse } from "./api";
import { createTranslator } from "../lang";
import { livePrepHealthLabel } from "./liveStatus";

const t = createTranslator({
  "live.prep": "Подготовка: {value}",
  "prep.count.error": "{count} ошибка",
  "prep.count.errors": "Ошибок: {count}",
  "prep.count.warning": "{count} предупреждение",
  "prep.count.warnings": "Предупреждений: {count}",
  "prep.status.notChecked": "Не проверено",
  "prep.status.ready": "Готово"
});

function prepReport(overrides: Partial<PrepHealthResponse>): PrepHealthResponse {
  return {
    checked_at: "2026-05-08T12:00:00Z",
    status: "ok",
    issue_count: 0,
    errors: 0,
    warnings: 0,
    issues: [],
    ...overrides
  };
}

describe("live status helpers", () => {
  it("summarizes prep health labels", () => {
    expect(livePrepHealthLabel(null)).toBe("Prep: Not checked");
    expect(livePrepHealthLabel(prepReport({ status: "ok" }))).toBe("Prep: Ready");
    expect(livePrepHealthLabel(prepReport({ status: "warning", warnings: 2, issue_count: 2 }))).toBe(
      "Prep: 2 warnings"
    );
    expect(livePrepHealthLabel(prepReport({ status: "error", errors: 1, warnings: 1, issue_count: 2 }))).toBe(
      "Prep: 1 error, 1 warning"
    );
  });

  it("summarizes live labels with localized strings", () => {
    expect(livePrepHealthLabel(null, t)).toBe("Подготовка: Не проверено");
    expect(livePrepHealthLabel(prepReport({ status: "warning", warnings: 2, issue_count: 2 }), t)).toBe(
      "Подготовка: Предупреждений: 2"
    );
  });
});
