import { useRef, useState } from "react";

import type { HpToolStatus } from "../components/tools/HpTool";
import { fetchHpTracker, saveHpTracker, type HpTrackerRow } from "../lib/api";
import {
  addHpTrackerRow,
  adjustHpTrackerRow,
  clearHpTrackerRows,
  createHpTrackerRow,
  removeHpTrackerRow,
  updateHpTrackerRow,
  validateHpTrackerRows
} from "../lib/hp";

// The HP tracker's rows and their persistence. Every edit bumps a version so that a save or
// load answering after a newer edit cannot overwrite it.
export function useHpTracker() {
  const [rows, setRows] = useState<HpTrackerRow[]>([]);
  const [status, setStatus] = useState<HpToolStatus>({ status: "idle", message: null });
  const editVersionRef = useRef(0);
  const rowsRef = useRef<HpTrackerRow[]>([]);

  function setBoth(next: HpTrackerRow[]) {
    rowsRef.current = next;
    setRows(next);
  }

  // Take rows loaded elsewhere (with the world or a workspace). With `loadedAtVersion`, only
  // if nothing was edited since the load started; without it, unconditionally.
  function adopt(next: HpTrackerRow[], loadedAtVersion?: number) {
    if (loadedAtVersion !== undefined && editVersionRef.current !== loadedAtVersion) {
      return;
    }
    if (loadedAtVersion === undefined) {
      editVersionRef.current = 0;
    }
    setBoth(next);
    setStatus({ status: "idle", message: null });
  }

  function editVersion() {
    return editVersionRef.current;
  }

  function reset() {
    adopt([]);
  }

  async function refresh() {
    setStatus({ status: "loading", message: null });
    try {
      const state = await fetchHpTracker();
      editVersionRef.current = 0;
      setBoth(state.rows);
      setStatus({ status: "idle", message: null });
    } catch (error: unknown) {
      setStatus({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  function persist(next: HpTrackerRow[], version = editVersionRef.current) {
    const errors = validateHpTrackerRows(next);
    if (errors.length > 0) {
      setStatus({ status: "error", message: errors[0] });
      return;
    }
    setStatus({ status: "saving", message: null });
    saveHpTracker(next)
      .then((state) => {
        if (editVersionRef.current === version) {
          setBoth(state.rows);
        }
        setStatus({ status: "saved", message: "Saved" });
      })
      .catch((error: unknown) => {
        setStatus({
          status: "error",
          message: error instanceof Error ? error.message : "Could not save HP rows."
        });
      });
  }

  function edit(next: HpTrackerRow[], save: boolean) {
    editVersionRef.current += 1;
    setBoth(next);
    if (save) {
      persist(next, editVersionRef.current);
    } else {
      setStatus({ status: "idle", message: null });
    }
  }

  return {
    rows,
    status,
    adopt,
    editVersion,
    reset,
    refresh,
    handleAdd: () =>
      edit(
        addHpTrackerRow(
          rowsRef.current,
          createHpTrackerRow({
            id: `hp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            name: "New",
            current_hp: 0,
            max_hp: null
          })
        ),
        true
      ),
    handleUpdate: (rowId: string, updates: Partial<Omit<HpTrackerRow, "id">>) =>
      edit(updateHpTrackerRow(rowsRef.current, rowId, updates), false),
    handleAdjust: (rowId: string, amount: number) =>
      edit(adjustHpTrackerRow(rowsRef.current, rowId, amount), true),
    handleRemove: (rowId: string) => edit(removeHpTrackerRow(rowsRef.current, rowId), true),
    handleClear: () => edit(clearHpTrackerRows(), true),
    handlePersist: () => persist(rowsRef.current)
  };
}
