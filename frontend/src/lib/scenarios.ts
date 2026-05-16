import type { ScenarioSummary } from "./api";

export type ScenarioInputValues = Record<string, string | number | boolean>;

export function buildScenarioDefaults(scenario: ScenarioSummary): ScenarioInputValues {
  return Object.fromEntries(
    scenario.inputs.map((input) => [
      input.name,
      input.default ?? (input.input_type === "boolean" ? false : "")
    ])
  );
}

export function validateScenarioInputs(
  scenario: ScenarioSummary,
  values: ScenarioInputValues
): string[] {
  return scenario.inputs
    .filter((input) => input.required)
    .filter((input) => {
      const value = values[input.name];
      return value === undefined || value === null || String(value).trim() === "";
    })
    .map((input) => `${input.label} is required.`);
}
