import type { HpTrackerRow } from "./api";

export type HpTrackerValidationError = string;

export function createHpTrackerRow(
  values: Partial<HpTrackerRow> & { id: string }
): HpTrackerRow {
  return {
    id: values.id.trim(),
    name: values.name?.trim() ?? "",
    current_hp: values.current_hp ?? values.max_hp ?? 0,
    max_hp: values.max_hp ?? null,
    status: values.status ?? "",
    notes: values.notes ?? ""
  };
}

export function addHpTrackerRow(
  rows: HpTrackerRow[],
  row: HpTrackerRow
): HpTrackerRow[] {
  return [...rows, row];
}

export function removeHpTrackerRow(rows: HpTrackerRow[], rowId: string): HpTrackerRow[] {
  return rows.filter((row) => row.id !== rowId);
}

export function clearHpTrackerRows(): HpTrackerRow[] {
  return [];
}

export function updateHpTrackerRow(
  rows: HpTrackerRow[],
  rowId: string,
  updates: Partial<Omit<HpTrackerRow, "id">>
): HpTrackerRow[] {
  return rows.map((row) => {
    if (row.id !== rowId) {
      return row;
    }
    return createHpTrackerRow({
      ...row,
      ...updates,
      id: row.id
    });
  });
}

export function adjustHpTrackerRow(
  rows: HpTrackerRow[],
  rowId: string,
  amount: number
): HpTrackerRow[] {
  return rows.map((row) =>
    row.id === rowId ? { ...row, current_hp: row.current_hp + amount } : row
  );
}

export function parseHpMaxValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return Number(value);
}

function isWholeNumber(value: number): boolean {
  return Number.isInteger(value);
}

export function validateHpTrackerRows(rows: HpTrackerRow[]): HpTrackerValidationError[] {
  const errors: HpTrackerValidationError[] = [];
  const seenIds = new Set<string>();
  if (rows.length > 60) {
    errors.push("HP tracker can contain 60 rows or fewer.");
  }

  rows.forEach((row, index) => {
    const label = row.name.trim() || `Row ${index + 1}`;
    const id = row.id.trim();
    if (!id) {
      errors.push(`Row ${index + 1} id is required.`);
    } else if (seenIds.has(id)) {
      errors.push(`Duplicate row id: ${id}.`);
    }
    seenIds.add(id);

    if (!row.name.trim()) {
      errors.push(`Row ${index + 1} name is required.`);
    }
    if (!isWholeNumber(row.current_hp) || row.current_hp < -9999 || row.current_hp > 9999) {
      errors.push(`${label} current HP must be a whole number between -9999 and 9999.`);
    }
    if (
      row.max_hp !== null &&
      (!isWholeNumber(row.max_hp) || row.max_hp < 1 || row.max_hp > 9999)
    ) {
      errors.push(`${label} max HP must be a positive whole number.`);
    }
    if (row.status.length > 120) {
      errors.push(`${label} status must be 120 characters or fewer.`);
    }
    if (row.notes.length > 500) {
      errors.push(`${label} notes must be 500 characters or fewer.`);
    }
  });

  return errors;
}

export function summarizeHpTrackerRows(rows: HpTrackerRow[]): { count: number; down: number } {
  return {
    count: rows.length,
    down: rows.filter((row) => row.current_hp <= 0).length
  };
}
