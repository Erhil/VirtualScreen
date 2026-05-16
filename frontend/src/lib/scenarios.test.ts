import { describe, expect, it } from "vitest";

import { buildScenarioDefaults, validateScenarioInputs } from "./scenarios";
import type { ScenarioSummary } from "./api";

const scenario: ScenarioSummary = {
  id: "create-npc",
  name: "Create NPC",
  description: null,
  inputs: [
    {
      name: "name",
      label: "Name",
      input_type: "text",
      required: true,
      default: "Ilyra",
      options: []
    },
    {
      name: "level",
      label: "Level",
      input_type: "number",
      required: false,
      default: 3,
      options: []
    }
  ]
};

describe("scenario helpers", () => {
  it("builds defaults from scenario input definitions", () => {
    expect(buildScenarioDefaults(scenario)).toEqual({ name: "Ilyra", level: 3 });
  });

  it("validates required inputs compactly", () => {
    expect(validateScenarioInputs(scenario, { name: "Ilyra" })).toEqual([]);
    expect(validateScenarioInputs(scenario, { name: "" })).toEqual(["Name is required."]);
  });
});
