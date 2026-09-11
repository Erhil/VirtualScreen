import { type MouseEvent } from "react";
import { type PageLink, type WorldFile } from "../../lib/api";
import { type CardFieldType, evaluateCardField, type StructuredCard } from "../../lib/cards";
import { renderRichInline } from "../../lib/richText";
import { RichHtml } from "./RichHtml";

function cardFieldDisplayValue(field: { type?: CardFieldType; value: string }): string {
  if (field.type === "computed") {
    return "";
  }
  if (field.type === "boolean") {
    return field.value === "true" ? "Yes" : "No";
  }
  if (field.type === "world_link") {
    const value = field.value.trim();
    if (!value) {
      return "";
    }
    return value.startsWith("[[") || value.includes("](") ? value : `[[${value}]]`;
  }
  return field.value;
}

export function CardViewer({
  card,
  file,
  links,
  onContextLink,
  onDiceRoll,
  onOpenLink,
  onPeekLink
}: {
  card: StructuredCard;
  file: WorldFile;
  links: PageLink[];
  onContextLink?: (link: PageLink, event: MouseEvent<HTMLElement>) => void;
  onDiceRoll?: (expression: string) => void;
  onOpenLink: (link: PageLink) => void;
  onPeekLink?: (link: PageLink) => void;
}) {
  const title = card.title.trim() || file.name.replace(/\.cs$/i, "");
  const kind = card.kind.trim() || "card";

  function sectionSummary(section: StructuredCard["sections"][number]): string {
    if (section.layout === "table") {
      const count = section.rows?.length ?? 0;
      return count === 1 ? "1 row" : `${count} rows`;
    }
    const count = section.fields.length;
    return count === 1 ? "1 field" : `${count} fields`;
  }

  function renderFieldList(section: StructuredCard["sections"][number]) {
    if (section.fields.length === 0) {
      return <p className="card-empty">No fields.</p>;
    }
    return (
      <dl className={`card-field-list${section.layout === "grid" ? " card-field-grid" : ""}`}>
        {section.fields.map((field, fieldIndex) => (
          <div className="card-field-row" key={`${field.label}-${fieldIndex}`}>
            <dt>{field.label.trim() || "Untitled field"}</dt>
            <dd>
              {field.type === "computed" ? (
                (() => {
                  const result = evaluateCardField(card, field);
                  return result?.ok ? (
                    <span className="card-field-value card-computed-value">{result.display}</span>
                  ) : (
                    <span className="card-formula-error" role="note">
                      {result?.message ?? "Formula error."}
                    </span>
                  );
                })()
              ) : (
                <RichHtml
                  className="rich-inline card-field-value"
                  html={renderRichInline(cardFieldDisplayValue(field), links, file.path)}
                  links={links}
                  onContextLink={onContextLink}
                  onDiceRoll={onDiceRoll}
                  onOpenLink={onOpenLink}
                  onPeekLink={onPeekLink}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderTable(section: StructuredCard["sections"][number]) {
    const columns = section.columns ?? [];
    const rows = section.rows ?? [];
    if (columns.length === 0 || rows.length === 0) {
      return <p className="card-empty">No rows.</p>;
    }
    return (
      <div className="card-table-wrap">
        <table className="card-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={column}>
                    <RichHtml
                      className="rich-inline card-field-value"
                      html={renderRichInline(row[column] ?? "", links, file.path)}
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

  return (
    <article className="card-surface card-viewer" data-help-context="document-card" tabIndex={0}>
      <header className="card-header">
        <div>
          <h1>{title}</h1>
          <span className="card-kind">{kind}</span>
        </div>
        {card.tags.length > 0 && (
          <ul className="card-tags" aria-label="Card tags">
            {card.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </header>

      {card.sections.length === 0 ? (
        <p className="card-empty">No sections.</p>
      ) : (
        card.sections.map((section, sectionIndex) => (
          <details className="card-section" key={`${section.title}-${sectionIndex}`} open>
            <summary>
              <span>{section.title.trim() || "Untitled section"}</span>
              <span className="card-section-count">{sectionSummary(section)}</span>
            </summary>
            {section.layout === "table" ? renderTable(section) : renderFieldList(section)}
          </details>
        ))
      )}
    </article>
  );
}
