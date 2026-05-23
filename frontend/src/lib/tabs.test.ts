import { describe, expect, it } from "vitest";

import {
  activateTab,
  closeTab,
  dirtyTabCloseMessage,
  shouldConfirmDirtyTabClose,
  openTab,
  type OpenTab
} from "./tabs";

const first: OpenTab = { path: "README.md", name: "README.md", mediaKind: "markdown" };
const second: OpenTab = {
  path: "Tables/random-events.csv",
  name: "random-events.csv",
  mediaKind: "csv"
};

describe("tab helpers", () => {
  it("opens a new tab and activates it", () => {
    expect(openTab({ tabs: [], activePath: null }, first)).toEqual({
      tabs: [first],
      activePath: "README.md"
    });
  });

  it("activates an existing tab without duplicating it", () => {
    expect(openTab({ tabs: [first], activePath: "README.md" }, first)).toEqual({
      tabs: [first],
      activePath: "README.md"
    });
  });

  it("closes the active tab and activates the nearest remaining tab", () => {
    expect(closeTab({ tabs: [first, second], activePath: second.path }, second.path)).toEqual({
      tabs: [first],
      activePath: first.path
    });
  });

  it("activates a requested tab", () => {
    expect(activateTab({ tabs: [first, second], activePath: first.path }, second.path)).toEqual({
      tabs: [first, second],
      activePath: second.path
    });
  });

  it("requires confirmation only for dirty tab closes", () => {
    expect(shouldConfirmDirtyTabClose(first.path, new Set())).toBe(false);
    expect(shouldConfirmDirtyTabClose(first.path, new Set([first.path]))).toBe(true);
  });

  it("formats a clear dirty tab close warning", () => {
    expect(dirtyTabCloseMessage({ ...first, title: "Sample World Guide" })).toBe(
      "Close Sample World Guide without saving changes?"
    );
    expect(dirtyTabCloseMessage(second)).toBe(
      "Close random-events.csv without saving changes?"
    );
  });
});
