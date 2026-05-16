import { describe, expect, it } from "vitest";

import {
  addCsvColumn,
  addCsvRow,
  isRectangularCsv,
  parseCsv,
  removeCsvColumn,
  removeCsvRow,
  serializeCsv,
  updateCsvCell,
  updateCsvHeader
} from "./csv";

describe("parseCsv", () => {
  it("parses headers and rows from simple CSV", () => {
    expect(parseCsv("result,event,tone\n1,Rain,mystery\n2,Fog,travel\n")).toEqual({
      headers: ["result", "event", "tone"],
      rows: [
        ["1", "Rain", "mystery"],
        ["2", "Fog", "travel"]
      ]
    });
  });

  it("keeps quoted commas inside a cell", () => {
    expect(parseCsv('name,detail\n"Ilyra","calm, formal"\n')).toEqual({
      headers: ["name", "detail"],
      rows: [["Ilyra", "calm, formal"]]
    });
  });

  it("serializes cells with commas, quotes, and newlines", () => {
    expect(
      serializeCsv({
        headers: ["name", "detail"],
        rows: [["Ilyra", 'calm, "formal"\nready']]
      })
    ).toBe('name,detail\nIlyra,"calm, ""formal""\nready"\n');
  });

  it("updates cells and headers immutably", () => {
    const csv = parseCsv("result,event\n1,Rain\n");

    expect(updateCsvHeader(csv, 1, "tone").headers).toEqual(["result", "tone"]);
    expect(updateCsvCell(csv, 0, 1, "Fog").rows).toEqual([["1", "Fog"]]);
  });

  it("adds and removes rows", () => {
    const csv = parseCsv("result,event\n1,Rain\n");

    const added = addCsvRow(csv);
    expect(added.rows).toEqual([
      ["1", "Rain"],
      ["", ""]
    ]);
    expect(removeCsvRow(added, 0).rows).toEqual([["", ""]]);
  });

  it("adds and removes columns", () => {
    const csv = parseCsv("result,event\n1,Rain\n");

    const added = addCsvColumn(csv);
    expect(added.headers).toEqual(["result", "event", "Column 3"]);
    expect(added.rows).toEqual([["1", "Rain", ""]]);
    expect(removeCsvColumn(added, 1).headers).toEqual(["result", "Column 3"]);
  });

  it("validates rectangular data", () => {
    expect(isRectangularCsv({ headers: ["a"], rows: [["1"]] })).toBe(true);
    expect(isRectangularCsv({ headers: ["a"], rows: [["1", "2"]] })).toBe(false);
  });
});
