import { useState } from "react";

import { type PrepHealthStatus } from "../components/dialogs/PrepHealthDialog";
import { acknowledgeDmsTrust, fetchPrepHealth, type PrepHealthReport } from "../lib/api";
import { type Translator } from "../lang";
import { type PrepHealthFilter } from "../lib/prepHealth";

export type UsePrepHealthOptions = {
  t: Translator;
  onScriptsTrusted: () => void;
};

// The prep check dialog: running the broken-reference scan, its filter, and trusting all
// DMS scripts from the report.
export function usePrepHealth({ t, onScriptsTrusted }: UsePrepHealthOptions) {
  const [prepHealthDialogOpen, setPrepHealthDialogOpen] = useState(false);
  const [prepHealthReport, setPrepHealthReport] = useState<PrepHealthReport | null>(null);
  const [prepHealthFilter, setPrepHealthFilter] = useState<PrepHealthFilter>("all");
  const [prepHealthStatus, setPrepHealthStatus] = useState<PrepHealthStatus>({
    status: "idle",
    message: null
  });

  async function handleRunPrepHealth() {
    setPrepHealthStatus({ status: "loading", message: null });
    try {
      const report = await fetchPrepHealth();
      setPrepHealthReport(report);
      setPrepHealthStatus({
        status: "ready",
        message:
          report.issue_count === 0
            ? "No broken references found."
            : `${report.issue_count} issue${report.issue_count === 1 ? "" : "s"} found.`
      });
    } catch (error) {
      setPrepHealthStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not run prep check."
      });
    }
  }

  function handleCopyPrepHealthTarget(target: string) {
    if (!target) {
      return;
    }
    void navigator.clipboard?.writeText(target);
    setPrepHealthStatus({ status: "ready", message: "Target copied." });
  }

  async function handleTrustAllDmsScripts() {
    if (!window.confirm(t("prep.trustAllScriptsConfirm"))) {
      return;
    }
    setPrepHealthStatus({ status: "loading", message: null });
    try {
      await acknowledgeDmsTrust();
      onScriptsTrusted();
      const report = await fetchPrepHealth();
      setPrepHealthReport(report);
      setPrepHealthStatus({ status: "ready", message: t("prep.trustAllScriptsDone") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("prep.trustAllScriptsError");
      setPrepHealthStatus({ status: "error", message });
    }
  }

  return {
    prepHealthDialogOpen,
    setPrepHealthDialogOpen,
    prepHealthReport,
    prepHealthFilter,
    setPrepHealthFilter,
    prepHealthStatus,
    handleRunPrepHealth,
    handleCopyPrepHealthTarget,
    handleTrustAllDmsScripts
  };
}
