import { useEffect, useRef, useState } from "react";

import type { DmsFormDialogState, DmsTrustDialogState } from "../components/DmsDialogs";
import type { ScriptLoadState, ScriptRunState } from "../components/tools/ScriptsTool";
import {
  acknowledgeDmsTrust,
  cancelDmsRun,
  fetchDmsRun,
  fetchDmsTrust,
  fetchScripts,
  runDmsScript,
  submitDmsForm,
  type DmsRunState
} from "../lib/api";
import { buildDmsFormDefaults, normalizeDmsFormSchema } from "../lib/scripts";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export type UseDmsScriptsOptions = {
  scriptsToolOpen: boolean;
  workspaceReady: boolean;
  worldId: string | undefined;
  // A run finished successfully: refresh the world, open its outputs, apply its effects.
  onRunSucceeded: (run: DmsRunState) => Promise<void>;
  // Bring the Scripts tool into view (to show a run, or the trust prompt).
  onShowScripts: () => void;
};

// DMS scripts: the list, whether this world's scripts are trusted, and a run's lifecycle -
// the trust prompt, polling a running script, its input form, and cancelling it.
export function useDmsScripts({
  scriptsToolOpen,
  workspaceReady,
  worldId,
  onRunSucceeded,
  onShowScripts
}: UseDmsScriptsOptions) {
  const [scriptState, setScriptState] = useState<ScriptLoadState>({ status: "idle" });
  const [scriptRunState, setScriptRunState] = useState<ScriptRunState>({ status: "idle" });
  const [dmsWorldTrusted, setDmsWorldTrusted] = useState(false);
  const [dmsTrustDialog, setDmsTrustDialog] = useState<DmsTrustDialogState>({ open: false });
  const [dmsFormDialog, setDmsFormDialog] = useState<DmsFormDialogState>({ open: false });
  const cancelledDmsRuns = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!scriptsToolOpen) {
      return;
    }

    let cancelled = false;
    setScriptState({ status: "loading" });
    fetchScripts()
      .then((scripts) => {
        if (cancelled) {
          return;
        }
        setScriptState({ status: "ready", scripts });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";
          setScriptState({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scriptsToolOpen, worldId]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }
    let cancelled = false;
    fetchDmsTrust()
      .then((state) => {
        if (!cancelled) {
          setDmsWorldTrusted(state.trusted);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDmsWorldTrusted(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceReady, worldId]);

  async function waitForDmsRun(run: DmsRunState): Promise<DmsRunState> {
    let current = run;
    while (current.status === "running") {
      if (cancelledDmsRuns.current.has(current.run_id)) {
        return {
          ...current,
          status: "cancelled",
          stderr: current.stderr || "Cancelled."
        };
      }
      setScriptRunState({
        status: "running",
        path: current.path,
        runId: current.run_id,
        run: current
      });
      await delay(250);
      current = await fetchDmsRun(current.run_id);
    }
    return current;
  }

  async function handleDmsRunResult(run: DmsRunState) {
    const finalRun = run.status === "running" ? await waitForDmsRun(run) : run;
    setScriptRunState({ status: "ready", run: finalRun });
    if (finalRun.status === "waiting_for_form" && finalRun.form_request) {
      const fields = normalizeDmsFormSchema(finalRun.form_request.schema);
      setDmsFormDialog({
        open: true,
        run: finalRun,
        fields,
        values: buildDmsFormDefaults(fields)
      });
      return;
    }
    setDmsFormDialog({ open: false });
    if (finalRun.status === "success") {
      await onRunSucceeded(finalRun);
    }
  }

  async function runTrustedDmsScript(path: string) {
    cancelledDmsRuns.current.clear();
    setScriptRunState({ status: "running", path, runId: null });
    onShowScripts();
    try {
      await handleDmsRunResult(await runDmsScript(path));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setScriptRunState({ status: "error", message });
    }
  }

  async function handleRunDmsScript(path: string) {
    if (!dmsWorldTrusted) {
      setDmsTrustDialog({ open: true, path });
      onShowScripts();
      return;
    }
    await runTrustedDmsScript(path);
  }

  async function handleConfirmDmsTrust() {
    if (!dmsTrustDialog.open) {
      return;
    }
    const path = dmsTrustDialog.path;
    try {
      await acknowledgeDmsTrust();
      setDmsWorldTrusted(true);
      setDmsTrustDialog({ open: false });
      await runTrustedDmsScript(path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setDmsTrustDialog({ open: false });
      setScriptRunState({ status: "error", message });
      onShowScripts();
    }
  }

  function handleCancelDmsTrust() {
    setDmsTrustDialog({ open: false });
  }

  function handleDmsFormChange(name: string, value: string | number | boolean) {
    setDmsFormDialog((state) =>
      state.open ? { ...state, values: { ...state.values, [name]: value } } : state
    );
  }

  async function handleDmsFormSubmit() {
    if (!dmsFormDialog.open) {
      return;
    }
    setScriptRunState({
      status: "running",
      path: dmsFormDialog.run.path,
      runId: dmsFormDialog.run.run_id,
      run: dmsFormDialog.run
    });
    try {
      await handleDmsRunResult(await submitDmsForm(dmsFormDialog.run.run_id, dmsFormDialog.values));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setScriptRunState({ status: "error", message });
    }
  }

  async function handleCancelDmsScript(runId: string) {
    cancelledDmsRuns.current.add(runId);
    try {
      await handleDmsRunResult(await cancelDmsRun(runId));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setScriptRunState({ status: "error", message });
    }
  }

  function resetScripts() {
    setScriptState({ status: "idle" });
    setScriptRunState({ status: "idle" });
    setDmsWorldTrusted(false);
    setDmsTrustDialog({ open: false });
    setDmsFormDialog({ open: false });
  }

  return {
    scriptState,
    scriptRunState,
    dmsTrustDialog,
    dmsFormDialog,
    markDmsTrusted: () => setDmsWorldTrusted(true),
    closeDmsFormDialog: () => setDmsFormDialog({ open: false }),
    resetScripts,
    handleRunDmsScript,
    handleConfirmDmsTrust,
    handleCancelDmsTrust,
    handleDmsFormChange,
    handleDmsFormSubmit,
    handleCancelDmsScript
  };
}
