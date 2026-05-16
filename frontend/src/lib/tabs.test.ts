import { describe, expect, it } from "vitest";

import { activateTab, closeTab, openTab, type OpenTab } from "./tabs";

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
});

