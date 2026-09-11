import { type MouseEvent } from "react";
import { type PageLink, type WorldFile } from "../../lib/api";
import {
  addCsvColumn,
  addCsvRow,
  type CsvData,
  isRectangularCsv,
  parseCsv,
  removeCsvColumn,
  removeCsvRow,
  updateCsvCell,
  updateCsvHeader
} from "../../lib/csv";
import { renderRichInline } from "../../lib/richText";
import { RichHtml } from "./RichHtml";

export function CsvViewer({
  file,
  content,
  links,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink
}: {
  file: WorldFile;
  content?: string;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  const data = parseCsv(content ?? file.content);

  if (data.headers.length === 0) {
    return <div className="empty-surface">CSV file is empty.</div>;
  }

  return (
    <div className="table-wrap" data-help-context="document-csv" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {data.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {data.headers.map((header, cellIndex) => (
                <td key={`${header}-${cellIndex}`}>
                  <RichHtml
                    className="rich-inline"
                    html={renderRichInline(row[cellIndex] ?? "", links, file.path)}
                    links={links}
                    onContextLink={onContextLink}
                    onDiceRoll={onDiceRoll}
                    onOpenLink={onOpenLink}
                    onPeekLink={onPeekLink}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CsvEditor({
  data,
  onChange
}: {
  data: CsvData;
  onChange: (data: CsvData) => void;
}) {
  return (
    <div className="csv-editor" data-help-context="document-csv">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {data.headers.map((header, columnIndex) => (
                <th key={`header-${columnIndex}`}>
                  <input
                    aria-label={`Header ${columnIndex + 1}`}
                    onChange={(event) =>
                      onChange(updateCsvHeader(data, columnIndex, event.target.value))
                    }
                    value={header}
                  />
                  <button
                    aria-label={`Remove column ${columnIndex + 1}`}
                    className="table-compact-control"
                    disabled={data.headers.length <= 1}
                    onClick={() => onChange(removeCsvColumn(data, columnIndex))}
                    type="button"
                  >
                    x
                  </button>
                </th>
              ))}
              <th aria-label="Column controls" className="table-control-cell">
                <button
                  aria-label="Add Column"
                  className="table-compact-control"
                  onClick={() => onChange(addCsvColumn(data))}
                  type="button"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {data.headers.map((header, columnIndex) => (
                  <td key={`${header}-${rowIndex}-${columnIndex}`}>
                    <input
                      aria-label={`Cell ${rowIndex + 1}-${columnIndex + 1}`}
                      onChange={(event) =>
                        onChange(updateCsvCell(data, rowIndex, columnIndex, event.target.value))
                      }
                      value={row[columnIndex] ?? ""}
                    />
                  </td>
                ))}
                <td>
                  <button
                    aria-label={`Remove row ${rowIndex + 1}`}
                    className="table-compact-control"
                    onClick={() => onChange(removeCsvRow(data, rowIndex))}
                    type="button"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="table-footer-control" colSpan={data.headers.length + 1}>
                <button
                  aria-label="Add Row"
                  className="table-compact-control"
                  onClick={() => onChange(addCsvRow(data))}
                  type="button"
                >
                  +
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!isRectangularCsv(data) && <p className="editor-message">CSV rows must be rectangular.</p>}
    </div>
  );
}
