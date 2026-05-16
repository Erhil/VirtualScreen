import { describe, expect, it } from "vitest";

import {
  affectedWorldPaths,
  buildEventsUrl,
  nextSyncStatus,
  planWorldEventUpdate,
  type WorldEvent
} from "./liveSync";

const event: WorldEvent = {
  type: "world_changed",
  paths: ["README.md", "NPCs/Captain.md"],
  deleted_paths: ["Old.md"],
  reason: "mixed",
  source: "watcher",
  rebuilt_at: "2026-05-08T10:00:00Z"
};

describe("live sync helpers", () => {
  it("builds a websocket URL from the current browser origin", () => {
    expect(buildEventsUrl({ protocol: "http:", host: "localhost:5173" })).toBe(
      "ws://localhost:5173/ws/events"
    );
    expect(buildEventsUrl({ protocol: "https:", host: "table.local" })).toBe(
      "wss://table.local/ws/events"
    );
  });

  it("deduplicates affected paths", () => {
    expect(
      affectedWorldPaths({
        ...event,
        paths: ["README.md", "README.md"],
        deleted_paths: ["Old.md", "README.md"]
      })
    ).toEqual(["README.md", "Old.md"]);
  });

  it("plans clean active files for refetch", () => {
    const plan = planWorldEventUpdate(event, "README.md", false);

    expect(plan.activeChanged).toBe(true);
    expect(plan.refetchActive).toBe(true);
    expect(plan.markDraftChanged).toBe(false);
  });

  it("marks dirty active files as externally changed instead of refetching", () => {
    const plan = planWorldEventUpdate(event, "README.md", true);

    expect(plan.refetchActive).toBe(false);
    expect(plan.markDraftChanged).toBe(true);
  });

  it("detects deleted active files", () => {
    const plan = planWorldEventUpdate(event, "Old.md", false);

    expect(plan.activeDeleted).toBe(true);
    expect(plan.refetchActive).toBe(false);
  });

  it("keeps sync status transitions deterministic", () => {
    expect(nextSyncStatus("reconnecting", "connected")).toBe("live");
    expect(nextSyncStatus("live", "disconnected")).toBe("reconnecting");
    expect(nextSyncStatus("reconnecting", "stopped")).toBe("offline");
  });
});
