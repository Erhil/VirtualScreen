import { useState } from "react";

import type { TableSnapshotStatus } from "../components/tools/ActionsTool";
import {
  deleteTableSnapshot,
  restoreTableSnapshot,
  saveTableSnapshot,
  type RestoreTableSnapshotResponse,
  type TableSnapshotState,
  type TableSnapshotSummary
} from "../lib/api";
import {
  deleteTableSnapshotFromList,
  saveTableSnapshotInList,
  sortTableSnapshots
} from "../lib/tableSnapshots";

export type UseTableSnapshotsOptions = {
  // Gathers the live table (workspace, screen, map, audio) at the moment of saving.
  capture: () => Promise<TableSnapshotState>;
  // Puts a restored table back into every domain it touches.
  apply: (restored: RestoreTableSnapshotResponse) => Promise<void>;
};

// Saved table states: the list, the name being typed, the selection, and save/load/delete.
// What a table state contains is the caller's business - see capture and apply.
export function useTableSnapshots({ capture, apply }: UseTableSnapshotsOptions) {
  const [snapshots, setSnapshots] = useState<TableSnapshotSummary[]>([]);
  const [name, setNameState] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<TableSnapshotStatus>({ status: "idle", message: null });

  function adopt(next: TableSnapshotSummary[]) {
    const sorted = sortTableSnapshots(next);
    setSnapshots(sorted);
    setSelectedId(sorted[0]?.id ?? "");
    setStatus({ status: "idle", message: null });
  }

  function reset() {
    setSnapshots([]);
    setSelectedId("");
    setNameState("");
    setStatus({ status: "idle", message: null });
  }

  function setName(next: string) {
    setNameState(next);
    setStatus({ status: "idle", message: null });
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus({ status: "error", message: "Snapshot name is required." });
      return;
    }
    if (trimmed.length > 80) {
      setStatus({ status: "error", message: "Use 80 characters or fewer." });
      return;
    }
    setStatus({ status: "saving", message: "Saving..." });
    try {
      const saved = await saveTableSnapshot({ name: trimmed, state: await capture() });
      setSnapshots((current) => saveTableSnapshotInList(current, saved));
      setSelectedId(saved.id);
      setStatus({ status: "saved", message: `Saved ${saved.name}` });
    } catch (error: unknown) {
      setStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not save table state."
      });
    }
  }

  async function handleLoad(snapshotId: string) {
    if (!snapshotId) {
      setStatus({ status: "error", message: "Choose a saved state first." });
      return;
    }
    setStatus({ status: "loading", message: "Loading..." });
    try {
      const restored = await restoreTableSnapshot(snapshotId);
      await apply(restored);
      setSnapshots((current) => saveTableSnapshotInList(current, restored.snapshot));
      setSelectedId(restored.snapshot.id);
      setStatus({ status: "loaded", message: `Loaded ${restored.snapshot.name}` });
    } catch (error: unknown) {
      setStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load table state."
      });
    }
  }

  async function handleDelete(snapshotId: string) {
    if (!snapshotId) {
      setStatus({ status: "error", message: "Choose a saved state first." });
      return;
    }
    setStatus({ status: "loading", message: "Deleting..." });
    try {
      await deleteTableSnapshot(snapshotId);
      setSnapshots((current) => deleteTableSnapshotFromList(current, snapshotId));
      setSelectedId((currentId) => (currentId === snapshotId ? "" : currentId));
      setStatus({ status: "saved", message: "Deleted table state." });
    } catch (error: unknown) {
      setStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Could not delete table state."
      });
    }
  }

  return {
    snapshots,
    name,
    selectedId,
    status,
    adopt,
    reset,
    setName,
    setSelectedId,
    handleSave,
    handleLoad,
    handleDelete
  };
}
