import { useState } from "react";
import {
  addCardField,
  addCardSection,
  addCardTableColumn,
  addCardTableRow,
  type CardFieldType,
  type CardSectionLayout,
  computedCardFieldPreview,
  duplicateCardField,
  duplicateCardSection,
  duplicateCardTableRow,
  removeCardField,
  removeCardSection,
  removeCardTableColumn,
  removeCardTableRow,
  reorderCardField,
  reorderCardSection,
  reorderCardTableRow,
  setCardSectionLayout,
  type StructuredCard,
  updateCardField,
  updateCardKind,
  updateCardSection,
  updateCardTableCell,
  updateCardTitle
} from "../../lib/cards";

function parseCardTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const CARD_FIELD_TYPE_OPTIONS: Array<{ value: CardFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select" },
  { value: "world_link", label: "World link" },
  { value: "computed", label: "Computed" }
];

const CARD_SECTION_LAYOUT_OPTIONS: Array<{ value: CardSectionLayout; label: string }> = [
  { value: "fields", label: "List" },
  { value: "grid", label: "Grid" },
  { value: "table", label: "Table" }
];

function cardSectionLayoutValue(layout: CardSectionLayout | undefined): CardSectionLayout {
  return layout ?? "fields";
}

function updateCardTableColumnName(
  card: StructuredCard,
  sectionIndex: number,
  columnIndex: number,
  nextName: string
): StructuredCard {
  const section = card.sections[sectionIndex];
  const columns = section?.columns ?? [];
  const previousName = columns[columnIndex];
  if (!section || previousName === undefined) {
    return card;
  }
  const nextColumns = columns.map((column, index) => (index === columnIndex ? nextName : column));
  return updateCardSection(card, sectionIndex, {
    columns: nextColumns,
    rows: (section.rows ?? []).map((row) => {
      const nextRow = { ...row };
      nextRow[nextName] = row[previousName] ?? "";
      if (nextName !== previousName) {
        delete nextRow[previousName];
      }
      return nextRow;
    })
  });
}

export function CardEditor({
  card,
  onChange,
  onPickWorldPath
}: {
  card: StructuredCard;
  onChange: (card: StructuredCard) => void;
  onPickWorldPath?: (onSelect: (path: string) => void) => void;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  function toggleSectionCollapsed(sectionIndex: number) {
    setCollapsedSections((state) => {
      const next = new Set(state);
      if (next.has(sectionIndex)) {
        next.delete(sectionIndex);
      } else {
        next.add(sectionIndex);
      }
      return next;
    });
  }

  function renderFieldValueControl(
    sectionIndex: number,
    fieldIndex: number,
    field: StructuredCard["sections"][number]["fields"][number]
  ) {
    const ariaLabel = `Field value ${sectionIndex + 1}-${fieldIndex + 1}`;
    if (field.type === "computed") {
      return (
        <input
          aria-label={`Field formula ${sectionIndex + 1}-${fieldIndex + 1}`}
          onChange={(event) =>
            onChange(
              updateCardField(card, sectionIndex, fieldIndex, { formula: event.target.value })
            )
          }
          placeholder="ability_mod(WIS)"
          value={field.formula ?? ""}
        />
      );
    }
    if (field.type === "long_text") {
      return (
        <textarea
          aria-label={ariaLabel}
          onChange={(event) =>
            onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
          }
          value={field.value}
        />
      );
    }
    if (field.type === "boolean") {
      return (
        <select
          aria-label={ariaLabel}
          onChange={(event) =>
            onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
          }
          value={field.value === "true" ? "true" : "false"}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    if (field.type === "number") {
      return (
        <input
          aria-label={ariaLabel}
          onChange={(event) =>
            onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
          }
          type="number"
          value={field.value}
        />
      );
    }
    if (field.type === "world_link") {
      return (
        <div className="inline-input-action">
          <input
            aria-label={ariaLabel}
            onChange={(event) =>
              onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
            }
            value={field.value}
          />
          <button
            aria-label={`Choose field value ${sectionIndex + 1}-${fieldIndex + 1} path`}
            disabled={!onPickWorldPath}
            onClick={() =>
              onPickWorldPath?.((path) =>
                onChange(
                  updateCardField(card, sectionIndex, fieldIndex, {
                    value: `[[${path.replace(/\.md$/i, "").replace(/\.markdown$/i, "")}]]`
                  })
                )
              )
            }
            type="button"
          >
            Pick
          </button>
        </div>
      );
    }
    return (
      <input
        aria-label={ariaLabel}
        onChange={(event) =>
          onChange(updateCardField(card, sectionIndex, fieldIndex, { value: event.target.value }))
        }
        value={field.value}
      />
    );
  }

  function renderFields(section: StructuredCard["sections"][number], sectionIndex: number) {
    return (
      <>
        <div className="card-editor-fields">
          {section.fields.map((field, fieldIndex) => (
            <div className="card-editor-field" key={`field-${sectionIndex}-${fieldIndex}`}>
              <label>
                <span>Key</span>
                <input
                  aria-label={`Field name ${sectionIndex + 1}-${fieldIndex + 1}`}
                  onChange={(event) =>
                    onChange(
                      updateCardField(card, sectionIndex, fieldIndex, {
                        label: event.target.value
                      })
                    )
                  }
                  value={field.label}
                />
              </label>
              <label>
                <span>Type</span>
                <select
                  aria-label={`Field type ${sectionIndex + 1}-${fieldIndex + 1}`}
                  onChange={(event) => {
                    const nextType = event.target.value as CardFieldType;
                    onChange(
                      updateCardField(card, sectionIndex, fieldIndex, {
                        type: nextType,
                        ...(nextType === "computed"
                          ? {
                              value: "",
                              formula: field.formula ?? "0",
                              format: field.format ?? "plain"
                            }
                          : {})
                      })
                    );
                  }}
                  value={field.type ?? "text"}
                >
                  {CARD_FIELD_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{field.type === "computed" ? "Formula" : "Value"}</span>
                {renderFieldValueControl(sectionIndex, fieldIndex, field)}
              </label>
              {field.type === "computed" && (
                <>
                  <label>
                    <span>Format</span>
                    <select
                      aria-label={`Field format ${sectionIndex + 1}-${fieldIndex + 1}`}
                      onChange={(event) =>
                        onChange(
                          updateCardField(card, sectionIndex, fieldIndex, {
                            format: event.target.value as "plain" | "signed"
                          })
                        )
                      }
                      value={field.format ?? "plain"}
                    >
                      <option value="plain">Plain</option>
                      <option value="signed">Signed</option>
                    </select>
                  </label>
                  <p className="card-editor-computed-preview">
                    Preview: {computedCardFieldPreview(card, field)}
                  </p>
                </>
              )}
              {field.type === "select" && (
                <label>
                  <span>Options</span>
                  <input
                    aria-label={`Field options ${sectionIndex + 1}-${fieldIndex + 1}`}
                    onChange={(event) =>
                      onChange(
                        updateCardField(card, sectionIndex, fieldIndex, {
                          options: parseCardTags(event.target.value)
                        })
                      )
                    }
                    value={(field.options ?? []).join(", ")}
                  />
                </label>
              )}
              <button
                onClick={() => onChange(duplicateCardField(card, sectionIndex, fieldIndex))}
                type="button"
              >
                Duplicate
              </button>
              <button
                disabled={fieldIndex === 0}
                onClick={() => onChange(reorderCardField(card, sectionIndex, fieldIndex, fieldIndex - 1))}
                type="button"
              >
                Up
              </button>
              <button
                disabled={fieldIndex >= section.fields.length - 1}
                onClick={() => onChange(reorderCardField(card, sectionIndex, fieldIndex, fieldIndex + 1))}
                type="button"
              >
                Down
              </button>
              <button
                className="button-danger-subtle"
                onClick={() => onChange(removeCardField(card, sectionIndex, fieldIndex))}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => onChange(addCardField(card, sectionIndex))}
          type="button"
        >
          Add Field
        </button>
      </>
    );
  }

  function renderTable(section: StructuredCard["sections"][number], sectionIndex: number) {
    const columns = section.columns ?? [];
    const rows = section.rows ?? [];
    return (
      <div className="card-editor-table">
        <div className="card-table-wrap">
          <table className="card-table card-editor-table-grid">
            <thead>
              <tr>
                {columns.map((column, columnIndex) => (
                  <th key={`column-${sectionIndex}-${columnIndex}`}>
                    <div className="table-header-control">
                      <input
                        aria-label={`Table column ${sectionIndex + 1}-${columnIndex + 1}`}
                        onChange={(event) =>
                          onChange(
                            updateCardTableColumnName(
                              card,
                              sectionIndex,
                              columnIndex,
                              event.target.value
                            )
                          )
                        }
                        value={column}
                      />
                      <button
                        aria-label={`Remove table column ${sectionIndex + 1}-${columnIndex + 1}`}
                        className="table-compact-control"
                        onClick={() => onChange(removeCardTableColumn(card, sectionIndex, column))}
                        type="button"
                      >
                        x
                      </button>
                    </div>
                  </th>
                ))}
                <th className="table-control-cell">
                  <button
                    aria-label={`Add table column ${sectionIndex + 1}`}
                    className="table-compact-control"
                    onClick={() => onChange(addCardTableColumn(card, sectionIndex, "New Column"))}
                    type="button"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {columns.map((column, columnIndex) => (
                    <td key={column}>
                      <input
                        aria-label={`Table cell ${sectionIndex + 1}-${rowIndex + 1}-${columnIndex + 1}`}
                        onChange={(event) =>
                          onChange(
                            updateCardTableCell(
                              card,
                              sectionIndex,
                              rowIndex,
                              column,
                              event.target.value
                            )
                          )
                        }
                        value={row[column] ?? ""}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      onClick={() => onChange(duplicateCardTableRow(card, sectionIndex, rowIndex))}
                      type="button"
                    >
                      Duplicate
                    </button>
                    <button
                      disabled={rowIndex === 0}
                      onClick={() => onChange(reorderCardTableRow(card, sectionIndex, rowIndex, rowIndex - 1))}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      disabled={rowIndex >= rows.length - 1}
                      onClick={() => onChange(reorderCardTableRow(card, sectionIndex, rowIndex, rowIndex + 1))}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      aria-label={`Remove table row ${sectionIndex + 1}-${rowIndex + 1}`}
                      className="button-danger-subtle table-compact-control"
                      onClick={() => onChange(removeCardTableRow(card, sectionIndex, rowIndex))}
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
                <td className="table-footer-control" colSpan={columns.length + 1}>
                  <button
                    aria-label={`Add table row ${sectionIndex + 1}`}
                    className="table-compact-control"
                    onClick={() => onChange(addCardTableRow(card, sectionIndex))}
                    type="button"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  return (
    <form
      className="card-surface card-editor"
      data-help-context="document-card"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="card-editor-grid">
        <label>
          <span>Title</span>
          <input
            aria-label="Card title"
            onChange={(event) => onChange(updateCardTitle(card, event.target.value))}
            value={card.title}
          />
        </label>
        <label>
          <span>Kind</span>
          <input
            aria-label="Card kind"
            onChange={(event) => onChange(updateCardKind(card, event.target.value))}
            value={card.kind}
          />
        </label>
        <label>
          <span>Tags</span>
          <input
            aria-label="Card tags"
            onChange={(event) => onChange({ ...card, tags: parseCardTags(event.target.value) })}
            value={card.tags.join(", ")}
          />
        </label>
      </div>

      <div className="card-editor-actions">
        <button
          onClick={() => onChange(addCardSection(card))}
          type="button"
        >
          Add Section
        </button>
      </div>

      {card.sections.length === 0 ? (
        <p className="card-empty">No sections.</p>
      ) : (
        card.sections.map((section, sectionIndex) => (
          <section className="card-editor-section" key={`section-${sectionIndex}`}>
            <div className="card-editor-section-header">
              <label>
                <span>Section</span>
                <input
                  aria-label={`Section ${sectionIndex + 1} title`}
                  onChange={(event) =>
                    onChange(updateCardSection(card, sectionIndex, { title: event.target.value }))
                  }
                  value={section.title}
                />
              </label>
              <label>
                <span>Layout</span>
                <select
                  aria-label={`Section ${sectionIndex + 1} layout`}
                  onChange={(event) =>
                    onChange(
                      setCardSectionLayout(
                        card,
                        sectionIndex,
                        event.target.value as CardSectionLayout
                      )
                    )
                  }
                  value={cardSectionLayoutValue(section.layout)}
                >
                  {CARD_SECTION_LAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-expanded={!collapsedSections.has(sectionIndex)}
                onClick={() => toggleSectionCollapsed(sectionIndex)}
                type="button"
              >
                {collapsedSections.has(sectionIndex) ? "Expand" : "Collapse"}
              </button>
              <button
                onClick={() => onChange(duplicateCardSection(card, sectionIndex))}
                type="button"
              >
                Duplicate Section
              </button>
              <button
                disabled={sectionIndex === 0}
                onClick={() => onChange(reorderCardSection(card, sectionIndex, sectionIndex - 1))}
                type="button"
              >
                Up
              </button>
              <button
                disabled={sectionIndex >= card.sections.length - 1}
                onClick={() => onChange(reorderCardSection(card, sectionIndex, sectionIndex + 1))}
                type="button"
              >
                Down
              </button>
              <button
                className="button-danger-subtle"
                onClick={() => onChange(removeCardSection(card, sectionIndex))}
                type="button"
              >
                Remove Section
              </button>
            </div>

            {!collapsedSections.has(sectionIndex) &&
              (section.layout === "table"
                ? renderTable(section, sectionIndex)
                : renderFields(section, sectionIndex))}
          </section>
        ))
      )}
    </form>
  );
}
