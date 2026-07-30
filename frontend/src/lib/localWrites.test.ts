import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearLocalWrites, isLocalWrite, markLocalWrite, unmarkLocalWrite } from "./localWrites";

describe("local write registry", () => {
  beforeEach(() => {
    clearLocalWrites();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports unknown paths as not local writes", () => {
    expect(isLocalWrite("README.md")).toBe(false);
  });

  it("marks a path as a local write", () => {
    markLocalWrite(["README.md"]);

    expect(isLocalWrite("README.md")).toBe(true);
  });

  it("marks multiple paths at once", () => {
    markLocalWrite(["README.md", "NPCs/Captain.md"]);

    expect(isLocalWrite("README.md")).toBe(true);
    expect(isLocalWrite("NPCs/Captain.md")).toBe(true);
    expect(isLocalWrite("Other.md")).toBe(false);
  });

  it("unmarks a path immediately", () => {
    markLocalWrite(["README.md"]);
    unmarkLocalWrite(["README.md"]);

    expect(isLocalWrite("README.md")).toBe(false);
  });

  it("unmarking an unknown path is a no-op", () => {
    unmarkLocalWrite(["Missing.md"]);

    expect(isLocalWrite("Missing.md")).toBe(false);
  });

  it("expires a marked path after 15 seconds", () => {
    vi.useFakeTimers();
    markLocalWrite(["README.md"]);

    expect(isLocalWrite("README.md")).toBe(true);

    vi.advanceTimersByTime(14999);
    expect(isLocalWrite("README.md")).toBe(true);

    vi.advanceTimersByTime(1);
    expect(isLocalWrite("README.md")).toBe(false);
  });
});
