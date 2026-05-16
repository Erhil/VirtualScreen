export type CsvData = {
  headers: string[];
  rows: string[][];
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(cell);
  return cells;
}

export function parseCsv(content: string): CsvData {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmptyLines = lines.filter((line) => line.length > 0);

  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerLine, ...rowLines] = nonEmptyLines;
  return {
    headers: parseCsvLine(headerLine),
    rows: rowLines.map(parseCsvLine)
  };
}

function serializeCsvCell(cell: string): string {
  if (/[",\r\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
}

export function serializeCsv(data: CsvData): string {
  const lines = [
    data.headers.map(serializeCsvCell).join(","),
    ...data.rows.map((row) => row.map(serializeCsvCell).join(","))
  ];
  return `${lines.join("\n")}\n`;
}

export function isRectangularCsv(data: CsvData): boolean {
  return data.rows.every((row) => row.length === data.headers.length);
}

export function updateCsvHeader(data: CsvData, columnIndex: number, value: string): CsvData {
  return {
    ...data,
    headers: data.headers.map((header, index) => (index === columnIndex ? value : header))
  };
}

export function updateCsvCell(
  data: CsvData,
  rowIndex: number,
  columnIndex: number,
  value: string
): CsvData {
  return {
    ...data,
    rows: data.rows.map((row, index) =>
      index === rowIndex
        ? row.map((cell, cellIndex) => (cellIndex === columnIndex ? value : cell))
        : row
    )
  };
}

export function addCsvRow(data: CsvData): CsvData {
  return {
    ...data,
    rows: [...data.rows, data.headers.map(() => "")]
  };
}

export function removeCsvRow(data: CsvData, rowIndex: number): CsvData {
  return {
    ...data,
    rows: data.rows.filter((_, index) => index !== rowIndex)
  };
}

export function addCsvColumn(data: CsvData): CsvData {
  const nextColumn = data.headers.length + 1;
  return {
    headers: [...data.headers, `Column ${nextColumn}`],
    rows: data.rows.map((row) => [...row, ""])
  };
}

export function removeCsvColumn(data: CsvData, columnIndex: number): CsvData {
  return {
    headers: data.headers.filter((_, index) => index !== columnIndex),
    rows: data.rows.map((row) => row.filter((_, index) => index !== columnIndex))
  };
}
