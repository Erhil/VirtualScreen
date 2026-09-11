import { useEffect, useRef, useState } from "react";

import { type CaptureStatus } from "../components/dialogs/CaptureDialog";
import {
  createCapture,
  fetchCaptureToday,
  type CaptureCategory,
  type CaptureTodayResponse
} from "../lib/api";
import { clearCaptureDraft, loadCaptureDraft, saveCaptureDraft, type CaptureDraft } from "../lib/capture";
import { markLocalWrite } from "../lib/localWrites";

export type UseCaptureOptions = {
  worldKey: string;
  authReady: boolean;
  // A capture was appended to a log file on disk (path of that file).
  onSaved: (path: string) => Promise<void>;
  // Open today's capture log.
  onOpenLog: (path: string) => void;
};

// Quick capture of session notes: the draft, today's capture log, and saving/opening it.
export function useCapture({ worldKey, authReady, onSaved, onOpenLog }: UseCaptureOptions) {
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureToday, setCaptureToday] = useState<CaptureTodayResponse | null>(null);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft>({
    category: "idea",
    text: ""
  });
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    status: "idle",
    message: null
  });
  const captureDraftRef = useRef<CaptureDraft>(captureDraft);
  const captureWorldKeyRef = useRef("default");

  useEffect(() => {
    captureDraftRef.current = captureDraft;
  }, [captureDraft]);

  useEffect(() => {
    captureWorldKeyRef.current = worldKey;
    const savedDraft = loadCaptureDraft(worldKey);
    setCaptureDraft(savedDraft ?? { category: "idea", text: "" });
    setCaptureStatus({ status: "idle", message: null });
    setCaptureToday(null);
  }, [worldKey]);

  useEffect(() => {
    function persistBeforeUnload() {
      const draft = captureDraftRef.current;
      if (draft.text.trim()) {
        saveCaptureDraft(captureWorldKeyRef.current, draft);
      } else {
        clearCaptureDraft(captureWorldKeyRef.current);
      }
    }

    window.addEventListener("beforeunload", persistBeforeUnload);
    return () => window.removeEventListener("beforeunload", persistBeforeUnload);
  }, []);

  useEffect(() => {
    if (!authReady || !captureDialogOpen) {
      return;
    }
    let cancelled = false;
    fetchCaptureToday()
      .then((today) => {
        if (!cancelled) {
          setCaptureToday(today);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCaptureStatus({ status: "error", message: "Could not load capture log." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, captureDialogOpen, worldKey]);

  function persistCurrentCaptureDraft(draft: CaptureDraft = captureDraft) {
    if (draft.text.trim()) {
      saveCaptureDraft(worldKey, draft);
    } else {
      clearCaptureDraft(worldKey);
    }
  }

  function handleCaptureCategoryChange(category: CaptureCategory) {
    const nextDraft = { ...captureDraft, category };
    captureDraftRef.current = nextDraft;
    setCaptureDraft(nextDraft);
    setCaptureStatus({ status: "idle", message: null });
    persistCurrentCaptureDraft(nextDraft);
  }

  function handleCaptureTextChange(text: string) {
    const nextDraft = { ...captureDraftRef.current, text };
    captureDraftRef.current = nextDraft;
    setCaptureDraft(nextDraft);
    if (captureStatus.status === "error" || captureStatus.status === "saved") {
      setCaptureStatus({ status: "idle", message: null });
    }
  }

  async function handleSaveCapture() {
    const submittedDraft = captureDraftRef.current;
    if (!submittedDraft.text.trim()) {
      setCaptureStatus({ status: "error", message: "Write a note before saving." });
      return;
    }

    setCaptureStatus({ status: "saving", message: null });
    try {
      const response = await createCapture({
        category: submittedDraft.category,
        text: submittedDraft.text
      });
      markLocalWrite([response.path]);
      await onSaved(response.path);
      setCaptureToday({ path: response.path, exists: true });
      const nextDraft = { category: submittedDraft.category, text: "" };
      captureDraftRef.current = nextDraft;
      setCaptureDraft(nextDraft);
      clearCaptureDraft(worldKey);
      setCaptureStatus({
        status: "saved",
        message: `Saved to ${response.heading}.`
      });
    } catch (error) {
      setCaptureStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not save capture."
      });
    }
  }

  async function handleOpenCaptureLog() {
    try {
      const today = captureToday ?? (await fetchCaptureToday());
      setCaptureToday(today);
      if (!today.exists) {
        setCaptureStatus({ status: "error", message: "Save a capture first." });
        return;
      }
      onOpenLog(today.path);
    } catch (error) {
      setCaptureStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not open capture log."
      });
    }
  }

  return {
    captureDialogOpen,
    setCaptureDialogOpen,
    captureDraft,
    captureStatus,
    captureToday,
    persistCurrentCaptureDraft,
    handleCaptureCategoryChange,
    handleCaptureTextChange,
    handleSaveCapture,
    handleOpenCaptureLog
  };
}
