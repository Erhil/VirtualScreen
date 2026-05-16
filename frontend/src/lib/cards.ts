export type CardField = {
  label: string;
  type?: CardFieldType;
  value: string;
  formula?: string;
  format?: CardComputedFormat;
  options?: string[];
};

export type CardFieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "long_text"
  | "world_link"
  | "computed";

export type CardComputedFormat = "plain" | "signed";

export type CardSectionLayout = "fields" | "grid" | "table";

export type CardTableRow = Record<string, string>;

export type CardSection = {
  title: string;
  layout?: CardSectionLayout;
  fields: CardField[];
  columns?: string[];
  rows?: CardTableRow[];
};

export type StructuredCard = {
  title: string;
  kind: string;
  tags: string[];
  sections: CardSection[];
};

export type CardTemplateSource = "built_in" | "world";

export type CardTemplate = {
  id: string;
  name: string;
  kind: string;
  description?: string;
  source: CardTemplateSource;
  card: StructuredCard;
};

export type CardTemplateWarning = {
  path?: string;
  id?: string;
  source?: CardTemplateSource | string;
  message: string;
};

export type CardTemplateCatalog = {
  templates: CardTemplate[];
  warnings: CardTemplateWarning[];
};

export const cardTemplateOptions = [
  "npc",
  "monster",
  "character",
  "spell",
  "item",
  "location",
  "reference",
  "custom"
] as const;

export type CardTemplateKind = (typeof cardTemplateOptions)[number];

const templateSections: Record<CardTemplateKind, CardSection[]> = {
  npc: [
    { title: "Core", fields: [{ label: "Role", value: "" }, { label: "Location", value: "" }] },
    { title: "Notes", fields: [{ label: "Hooks", value: "" }] }
  ],
  monster: [
    { title: "Core", fields: [{ label: "Type", value: "" }, { label: "Threat", value: "" }] },
    { title: "Notes", fields: [{ label: "Tactics", value: "" }] }
  ],
  character: [
    { title: "Core", fields: [{ label: "Class", value: "" }, { label: "Level", value: "" }] },
    { title: "Notes", fields: [{ label: "Goals", value: "" }] }
  ],
  spell: [
    { title: "Core", fields: [{ label: "Level", value: "" }, { label: "School", value: "" }] },
    { title: "Effect", fields: [{ label: "Description", value: "" }] }
  ],
  item: [
    { title: "Core", fields: [{ label: "Type", value: "" }, { label: "Rarity", value: "" }] },
    { title: "Notes", fields: [{ label: "Description", value: "" }] }
  ],
  location: [
    { title: "Core", fields: [{ label: "Region", value: "" }, { label: "Mood", value: "" }] },
    { title: "Notes", fields: [{ label: "Details", value: "" }] }
  ],
  reference: [
    { title: "Core", fields: [{ label: "Source", value: "" }, { label: "Topic", value: "" }] },
    { title: "Notes", fields: [{ label: "Summary", value: "" }] }
  ],
  custom: [{ title: "Core", fields: [{ label: "Notes", value: "" }] }]
};

const templateNames: Record<CardTemplateKind, string> = {
  npc: "NPC",
  monster: "Monster",
  character: "Character",
  spell: "Spell",
  item: "Item",
  location: "Location",
  reference: "Reference",
  custom: "Custom"
};

export const builtInCardTemplates: CardTemplate[] = cardTemplateOptions.map((kind) => ({
  id: kind,
  name: templateNames[kind],
  kind,
  source: "built_in",
  card: {
    title: "{{title}}",
    kind,
    tags: [],
    sections: templateSections[kind].map((section) => ({
      title: section.title,
      fields: section.fields.map((field) => ({ ...field }))
    }))
  }
}));

export function cardTemplate(kind: CardTemplateKind, title = ""): StructuredCard {
  return renderCardTemplate(builtInCardTemplates.find((template) => template.id === kind)!, title);
}

export function defaultCardPath(folder: string, title: string): string {
  const fileName = `${title.trim() || "Untitled"}.cs`;
  const normalizedFolder = folder.trim().replace(/[\\/]+$/, "");
  return normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function editableValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function normalizeFieldType(value: unknown): CardFieldType {
  return value === "number" ||
    value === "boolean" ||
    value === "select" ||
    value === "long_text" ||
    value === "world_link" ||
    value === "computed"
    ? value
    : "text";
}

function normalizeComputedFormat(value: unknown): CardComputedFormat | undefined {
  return value === "signed" || value === "plain" ? value : undefined;
}

function normalizeFieldOptions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const options = value.map((option) => stringValue(option).trim()).filter(Boolean);
  return options.length > 0 ? options : undefined;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
}

function normalizeField(value: unknown, fallbackLabel = ""): CardField {
  const field = isRecord(value) ? value : {};
  const type = normalizeFieldType(field.type);
  const options = normalizeFieldOptions(field.options);
  if (type === "computed") {
    return {
      label: stringValue(field.label) || stringValue(field.name) || fallbackLabel,
      type,
      value: "",
      formula: stringValue(field.formula),
      ...(normalizeComputedFormat(field.format) ? { format: normalizeComputedFormat(field.format) } : {})
    };
  }
  return {
    label: stringValue(field.label) || stringValue(field.name) || fallbackLabel,
    type,
    value: editableValue(field.value),
    ...(options ? { options } : {})
  };
}

function normalizeNamedField(label: string, value: unknown): CardField {
  if (isRecord(value)) {
    return normalizeField({ label, ...value }, label);
  }
  return {
    label,
    type: "text",
    value: editableValue(value)
  };
}

function normalizeLayout(value: unknown, rows: unknown): CardSectionLayout | undefined {
  if (value === "grid" || value === "table") {
    return value;
  }
  return Array.isArray(rows) ? "table" : undefined;
}

function normalizeTableRows(value: unknown): CardTableRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }
    return [
      Object.fromEntries(
        Object.entries(row).map(([column, cell]) => [column, editableValue(cell)])
      )
    ];
  });
}

function inferTableColumns(rows: CardTableRow[], value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((column) => stringValue(column).trim()).filter(Boolean);
  }
  const columns: string[] = [];
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (!columns.includes(column)) {
        columns.push(column);
      }
    }
  }
  return columns;
}

function normalizeSection(value: unknown): CardSection {
  const section = isRecord(value) ? value : {};
  const fields = section.fields;
  const rows = normalizeTableRows(section.rows);
  const layout = normalizeLayout(section.layout, section.rows);
  if (layout === "table") {
    return {
      title: stringValue(section.title),
      layout,
      fields: [],
      columns: inferTableColumns(rows, section.columns),
      rows
    };
  }
  return {
    title: stringValue(section.title),
    ...(layout ? { layout } : {}),
    fields: Array.isArray(fields)
      ? fields.map((field) => normalizeField(field))
      : isRecord(fields)
        ? Object.entries(fields).map(([label, value]) => normalizeNamedField(label, value))
        : []
  };
}

export function normalizeCard(value: unknown): StructuredCard {
  const card = isRecord(value) ? value : {};
  const rootFields = card.fields;
  const rootSection =
    Array.isArray(rootFields)
      ? {
          title: "Core",
          fields: rootFields.map((field) => {
            const record = isRecord(field) ? field : {};
            return normalizeField(record);
          })
        }
      : isRecord(rootFields)
        ? {
            title: "Core",
            fields: Object.entries(rootFields).map(([label, value]) => normalizeNamedField(label, value))
          }
        : null;
  const sections = Array.isArray(card.sections) ? card.sections.map(normalizeSection) : [];
  return {
    title: stringValue(card.title),
    kind: stringValue(card.kind) || stringValue(card.type),
    tags: normalizeTags(card.tags),
    sections: sections.length > 0 ? sections : rootSection ? [rootSection] : []
  };
}

function normalizeWarnings(value: unknown): CardTemplateWarning[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((warning) => {
    if (!isRecord(warning)) {
      return [];
    }
    const message = stringValue(warning.message);
    if (!message) {
      return [];
    }
    return [
      {
        ...(stringValue(warning.path) ? { path: stringValue(warning.path) } : {}),
        ...(stringValue(warning.id) ? { id: stringValue(warning.id) } : {}),
        ...(stringValue(warning.source) ? { source: stringValue(warning.source) } : {}),
        message
      }
    ];
  });
}

function normalizeCardTemplate(value: unknown): {
  template: CardTemplate | null;
  warnings: CardTemplateWarning[];
} {
  if (!isRecord(value)) {
    return { template: null, warnings: [{ message: "Template is not an object." }] };
  }

  const id = stringValue(value.id).trim();
  if (!id) {
    return { template: null, warnings: [{ message: "Template is missing an id." }] };
  }

  const card = value.card;
  if (!isRecord(card)) {
    return {
      template: null,
      warnings: [{ id, message: "Template is missing a card object." }]
    };
  }

  const normalizedCard = normalizeCard(card);
  const kind = stringValue(value.kind) || normalizedCard.kind;
  const name = stringValue(value.name) || id;

  return {
    template: {
      id,
      name,
      kind,
      ...(stringValue(value.description)
        ? { description: stringValue(value.description) }
        : {}),
      source:
        value.source === "built_in" || value.source === "builtin"
          ? "built_in"
          : "world",
      card: {
        ...normalizedCard,
        kind: normalizedCard.kind || kind,
        title: normalizedCard.title || "{{title}}"
      }
    },
    warnings: []
  };
}

function renderTemplateString(value: string, title: string): string {
  return value.replaceAll("{{title}}", title);
}

function renderTemplateField(field: CardField, title: string): CardField {
  return {
    label: renderTemplateString(field.label, title),
    type: field.type ?? "text",
    value: renderTemplateString(field.value, title),
    ...(field.formula ? { formula: renderTemplateString(field.formula, title) } : {}),
    ...(field.format ? { format: field.format } : {}),
    ...(field.options
      ? { options: field.options.map((option) => renderTemplateString(option, title)) }
      : {})
  };
}

function renderTemplateRow(row: CardTableRow, title: string): CardTableRow {
  return Object.fromEntries(
    Object.entries(row).map(([column, value]) => [
      renderTemplateString(column, title),
      renderTemplateString(value, title)
    ])
  );
}

export function renderCardTemplate(template: CardTemplate, title: string): StructuredCard {
  const card = template.card;
  return {
    title: renderTemplateString(card.title || "{{title}}", title),
    kind: card.kind || template.kind,
    tags: card.tags.map((tag) => renderTemplateString(tag, title)),
    sections: card.sections.map((section) => ({
      title: renderTemplateString(section.title, title),
      ...(section.layout ? { layout: section.layout } : {}),
      fields: section.fields.map((field) => renderTemplateField(field, title)),
      ...(section.columns
        ? { columns: section.columns.map((column) => renderTemplateString(column, title)) }
        : {}),
      ...(section.rows ? { rows: section.rows.map((row) => renderTemplateRow(row, title)) } : {})
    }))
  };
}

export function mergeCardTemplateCatalogs(
  worldCatalog: CardTemplateCatalog,
  fallbackTemplates = builtInCardTemplates
): CardTemplateCatalog {
  const worldById = new Map(worldCatalog.templates.map((template) => [template.id, template]));
  const usedIds = new Set<string>();
  const templates = fallbackTemplates.map((template) => {
    const worldTemplate = worldById.get(template.id);
    usedIds.add(template.id);
    return worldTemplate ?? template;
  });

  for (const template of worldCatalog.templates) {
    if (!usedIds.has(template.id)) {
      templates.push(template);
      usedIds.add(template.id);
    }
  }

  return {
    templates,
    warnings: worldCatalog.warnings
  };
}

export function normalizeCardTemplateCatalog(value: unknown): CardTemplateCatalog {
  if (!isRecord(value)) {
    return {
      templates: builtInCardTemplates,
      warnings:
        value === null || value === undefined
          ? []
          : [{ message: "Template catalog is not an object." }]
    };
  }

  const warnings = normalizeWarnings(value.warnings);
  const rawTemplates = Array.isArray(value.templates) ? value.templates : [];
  const templates: CardTemplate[] = [];

  for (const rawTemplate of rawTemplates) {
    const normalized = normalizeCardTemplate(rawTemplate);
    warnings.push(...normalized.warnings);
    if (normalized.template) {
      templates.push(normalized.template);
    }
  }

  if (templates.length === 0) {
    return {
      templates: builtInCardTemplates,
      warnings:
        rawTemplates.length > 0
          ? [
              ...warnings,
              { message: "No valid world templates found; using built-in templates." }
            ]
          : warnings
    };
  }

  return mergeCardTemplateCatalogs({ templates, warnings });
}

export function parseCard(content: string): StructuredCard {
  return normalizeCard(JSON.parse(content));
}

function typedFieldValue(field: CardField): string | number | boolean {
  if (field.type === "number") {
    const numberValue = Number(field.value);
    return Number.isFinite(numberValue) ? numberValue : field.value;
  }
  if (field.type === "boolean") {
    return field.value === "true";
  }
  return field.value;
}

function serializedField(field: CardField): Record<string, unknown> {
  if (field.type === "computed") {
    return {
      type: "computed",
      formula: field.formula ?? "",
      ...(field.format ? { format: field.format } : {})
    };
  }
  return {
    type: field.type ?? "text",
    value: typedFieldValue(field),
    ...(field.options && field.options.length > 0 ? { options: field.options } : {})
  };
}

function serializedSection(section: CardSection): Record<string, unknown> {
  if (section.layout === "table") {
    return {
      title: section.title,
      layout: "table",
      rows: (section.rows ?? []).map((row) => {
        const columns = section.columns && section.columns.length > 0 ? section.columns : Object.keys(row);
        return Object.fromEntries(columns.map((column) => [column, row[column] ?? ""]));
      })
    };
  }
  return {
    title: section.title,
    ...(section.layout && section.layout !== "fields" ? { layout: section.layout } : {}),
    fields: Object.fromEntries(section.fields.map((field) => [field.label, serializedField(field)]))
  };
}

export function serializeCard(card: StructuredCard): string {
  const normalizedCard = normalizeCard(card);
  const output = {
    kind: normalizedCard.kind,
    title: normalizedCard.title,
    tags: normalizedCard.tags,
    sections: normalizedCard.sections.map(serializedSection)
  };
  return `${JSON.stringify(output, null, 2)}\n`;
}

export type CardFormulaResult =
  | { ok: true; value: number; display: string }
  | { ok: false; message: string };

type FormulaToken =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "(" | ")" | "," };

type FormulaContextEntry =
  | { kind: "number"; value: number }
  | { kind: "not_numeric" }
  | { kind: "computed" }
  | { kind: "duplicate" };

const CARD_FORMULA_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function formatFormulaValue(value: number, format: CardComputedFormat | undefined): string {
  if (format === "signed" && value > 0) {
    return `+${value}`;
  }
  return String(value);
}

function formulaError(message: string): CardFormulaResult {
  return { ok: false, message };
}

function tokenizeFormula(formula: string): FormulaToken[] | string {
  const tokens: FormulaToken[] = [];
  let index = 0;
  while (index < formula.length) {
    const char = formula[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = formula.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) {
        return "Invalid number.";
      }
      const numberValue = Number(match[0]);
      if (!Number.isFinite(numberValue)) {
        return "Invalid number.";
      }
      tokens.push({ type: "number", value: numberValue });
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = formula.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) {
        return "Invalid identifier.";
      }
      tokens.push({ type: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }
    if ("+-*/(),".includes(char)) {
      tokens.push({
        type: "operator",
        value: char as "+" | "-" | "*" | "/" | "(" | ")" | ","
      });
      index += 1;
      continue;
    }
    return `Unexpected token ${char}.`;
  }
  return tokens;
}

function cardFormulaContext(card: StructuredCard): Map<string, FormulaContextEntry> {
  const context = new Map<string, FormulaContextEntry>();
  for (const section of card.sections) {
    for (const field of section.fields) {
      const name = field.label.trim();
      if (!CARD_FORMULA_IDENTIFIER_PATTERN.test(name)) {
        continue;
      }
      if (context.has(name)) {
        context.set(name, { kind: "duplicate" });
        continue;
      }
      if (field.type === "computed") {
        context.set(name, { kind: "computed" });
        continue;
      }
      if (field.type === "number") {
        const value = Number(field.value);
        context.set(name, Number.isFinite(value) ? { kind: "number", value } : { kind: "not_numeric" });
        continue;
      }
      if (field.type === "boolean") {
        context.set(name, { kind: "number", value: field.value === "true" ? 1 : 0 });
        continue;
      }
      context.set(name, { kind: "not_numeric" });
    }
  }
  return context;
}

class FormulaParser {
  private index = 0;

  constructor(
    private readonly tokens: FormulaToken[],
    private readonly context: Map<string, FormulaContextEntry>
  ) {}

  parse(): number | string {
    if (this.tokens.length === 0) {
      return "Formula is empty.";
    }
    const value = this.expression();
    if (typeof value === "string") {
      return value;
    }
    if (this.peek()) {
      return "Unexpected token.";
    }
    return value;
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.index];
  }

  private takeOperator(value: FormulaToken["value"]): boolean {
    const token = this.peek();
    if (token?.type === "operator" && token.value === value) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private expression(): number | string {
    let value = this.term();
    while (typeof value === "number") {
      if (this.takeOperator("+")) {
        const right = this.term();
        if (typeof right === "string") {
          return right;
        }
        value += right;
        continue;
      }
      if (this.takeOperator("-")) {
        const right = this.term();
        if (typeof right === "string") {
          return right;
        }
        value -= right;
        continue;
      }
      break;
    }
    return value;
  }

  private term(): number | string {
    let value = this.factor();
    while (typeof value === "number") {
      if (this.takeOperator("*")) {
        const right = this.factor();
        if (typeof right === "string") {
          return right;
        }
        value *= right;
        continue;
      }
      if (this.takeOperator("/")) {
        const right = this.factor();
        if (typeof right === "string") {
          return right;
        }
        if (right === 0) {
          return "Division by zero.";
        }
        value /= right;
        continue;
      }
      break;
    }
    return value;
  }

  private factor(): number | string {
    if (this.takeOperator("+")) {
      return this.factor();
    }
    if (this.takeOperator("-")) {
      const value = this.factor();
      return typeof value === "string" ? value : -value;
    }
    const token = this.peek();
    if (!token) {
      return "Expected value.";
    }
    if (token.type === "number") {
      this.index += 1;
      return token.value;
    }
    if (token.type === "identifier") {
      this.index += 1;
      if (this.takeOperator("(")) {
        return this.callFunction(token.value);
      }
      return this.resolveIdentifier(token.value);
    }
    if (this.takeOperator("(")) {
      const value = this.expression();
      if (typeof value === "string") {
        return value;
      }
      if (!this.takeOperator(")")) {
        return "Expected closing parenthesis.";
      }
      return value;
    }
    return "Expected value.";
  }

  private callFunction(name: string): number | string {
    const args: number[] = [];
    if (!this.takeOperator(")")) {
      while (true) {
        const value = this.expression();
        if (typeof value === "string") {
          return value;
        }
        args.push(value);
        if (this.takeOperator(")")) {
          break;
        }
        if (!this.takeOperator(",")) {
          return "Expected comma or closing parenthesis.";
        }
      }
    }
    switch (name) {
      case "ability_mod":
        return args.length === 1 ? Math.floor((args[0] - 10) / 2) : "ability_mod() expects 1 argument.";
      case "floor":
        return args.length === 1 ? Math.floor(args[0]) : "floor() expects 1 argument.";
      case "ceil":
        return args.length === 1 ? Math.ceil(args[0]) : "ceil() expects 1 argument.";
      case "min":
        return args.length > 0 ? Math.min(...args) : "min() expects at least 1 argument.";
      case "max":
        return args.length > 0 ? Math.max(...args) : "max() expects at least 1 argument.";
      case "sum":
        return args.reduce((total, value) => total + value, 0);
      default:
        return `Unknown function ${name}.`;
    }
  }

  private resolveIdentifier(name: string): number | string {
    const entry = this.context.get(name);
    if (!entry) {
      return `Unknown field ${name}.`;
    }
    if (entry.kind === "duplicate") {
      return `Field ${name} is duplicated.`;
    }
    if (entry.kind === "computed") {
      return `Computed field ${name} cannot be used in formulas.`;
    }
    if (entry.kind === "not_numeric") {
      return `Field ${name} is not numeric.`;
    }
    return entry.value;
  }
}

export function evaluateCardFormula(
  formula: string,
  card: StructuredCard,
  format?: CardComputedFormat
): CardFormulaResult {
  const tokens = tokenizeFormula(formula);
  if (typeof tokens === "string") {
    return formulaError(tokens);
  }
  const value = new FormulaParser(tokens, cardFormulaContext(card)).parse();
  if (typeof value === "string") {
    return formulaError(value);
  }
  if (!Number.isFinite(value)) {
    return formulaError("Formula result is not finite.");
  }
  return { ok: true, value, display: formatFormulaValue(value, format) };
}

export function evaluateCardField(card: StructuredCard, field: CardField): CardFormulaResult | null {
  if (field.type !== "computed") {
    return null;
  }
  return evaluateCardFormula(field.formula ?? "", card, field.format);
}

export function computedCardFieldPreview(card: StructuredCard, field: CardField): string {
  const result = evaluateCardField(card, field);
  if (!result) {
    return "";
  }
  return result.ok ? result.display : result.message;
}

function isValidIndex<T>(items: T[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < items.length;
}

function cloneCardField(field: CardField): CardField {
  return {
    ...field,
    ...(field.options ? { options: [...field.options] } : {})
  };
}

function cloneCardTableRow(row: CardTableRow): CardTableRow {
  return { ...row };
}

function cloneCardSection(section: CardSection): CardSection {
  return {
    ...section,
    fields: section.fields.map(cloneCardField),
    ...(section.columns ? { columns: [...section.columns] } : {}),
    ...(section.rows ? { rows: section.rows.map(cloneCardTableRow) } : {})
  };
}

function duplicateArrayItem<T>(items: T[], index: number, cloneItem: (item: T) => T): T[] | null {
  if (!isValidIndex(items, index)) {
    return null;
  }
  return [...items.slice(0, index + 1), cloneItem(items[index]), ...items.slice(index + 1)];
}

function reorderArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] | null {
  if (!isValidIndex(items, fromIndex) || !isValidIndex(items, toIndex) || fromIndex === toIndex) {
    return null;
  }
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

export function updateCardTitle(card: StructuredCard, title: string): StructuredCard {
  return { ...card, title };
}

export function updateCardKind(card: StructuredCard, kind: string): StructuredCard {
  return { ...card, kind };
}

export function addCardTag(card: StructuredCard, tag: string): StructuredCard {
  const nextTag = tag.trim();
  if (!nextTag || card.tags.includes(nextTag)) {
    return card;
  }
  return { ...card, tags: [...card.tags, nextTag] };
}

export function removeCardTag(card: StructuredCard, tag: string): StructuredCard {
  return { ...card, tags: card.tags.filter((cardTag) => cardTag !== tag) };
}

export function addCardSection(card: StructuredCard): StructuredCard {
  return { ...card, sections: [...card.sections, { title: "", fields: [] }] };
}

export function duplicateCardSection(card: StructuredCard, sectionIndex: number): StructuredCard {
  const sections = duplicateArrayItem(card.sections, sectionIndex, cloneCardSection);
  return sections ? { ...card, sections } : card;
}

export function reorderCardSection(
  card: StructuredCard,
  fromIndex: number,
  toIndex: number
): StructuredCard {
  const sections = reorderArrayItem(card.sections, fromIndex, toIndex);
  return sections ? { ...card, sections } : card;
}

export function setCardSectionLayout(
  card: StructuredCard,
  sectionIndex: number,
  layout: CardSectionLayout
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) => {
      if (index !== sectionIndex) {
        return section;
      }
      if (layout === "table") {
        return {
          title: section.title,
          layout,
          fields: [],
          columns: section.columns ?? inferTableColumns(section.rows ?? [], undefined),
          rows: section.rows ?? []
        };
      }
      return {
        title: section.title,
        ...(layout === "grid" ? { layout } : {}),
        fields: section.fields
      };
    })
  };
}

export function updateCardSection(
  card: StructuredCard,
  sectionIndex: number,
  patch: Partial<CardSection>
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex ? { ...section, ...patch } : section
    )
  };
}

export function removeCardSection(
  card: StructuredCard,
  sectionIndex: number
): StructuredCard {
  return {
    ...card,
    sections: card.sections.filter((_, index) => index !== sectionIndex)
  };
}

export function addCardField(
  card: StructuredCard,
  sectionIndex: number
): StructuredCard {
  return addTypedCardField(card, sectionIndex, { label: "", value: "" });
}

export function addTypedCardField(
  card: StructuredCard,
  sectionIndex: number,
  field: CardField = { label: "", value: "" }
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex
        ? { ...section, fields: [...section.fields, normalizeField(field)] }
        : section
    )
  };
}

export function duplicateCardField(
  card: StructuredCard,
  sectionIndex: number,
  fieldIndex: number
): StructuredCard {
  if (!isValidIndex(card.sections, sectionIndex)) {
    return card;
  }
  const fields = duplicateArrayItem(card.sections[sectionIndex].fields, fieldIndex, cloneCardField);
  if (!fields) {
    return card;
  }
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex ? { ...section, fields } : section
    )
  };
}

export function reorderCardField(
  card: StructuredCard,
  sectionIndex: number,
  fromIndex: number,
  toIndex: number
): StructuredCard {
  if (!isValidIndex(card.sections, sectionIndex)) {
    return card;
  }
  const fields = reorderArrayItem(card.sections[sectionIndex].fields, fromIndex, toIndex);
  if (!fields) {
    return card;
  }
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex ? { ...section, fields } : section
    )
  };
}

export function updateCardField(
  card: StructuredCard,
  sectionIndex: number,
  fieldIndex: number,
  patch: Partial<CardField>
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex
        ? {
            ...section,
            fields: section.fields.map((field, innerIndex) =>
              innerIndex === fieldIndex ? { ...field, ...patch } : field
            )
          }
        : section
    )
  };
}

export function addCardTableColumn(
  card: StructuredCard,
  sectionIndex: number,
  column: string
): StructuredCard {
  const nextColumn = column.trim();
  if (!nextColumn) {
    return card;
  }
  return {
    ...card,
    sections: card.sections.map((section, index) => {
      if (index !== sectionIndex) {
        return section;
      }
      const columns = section.columns ?? inferTableColumns(section.rows ?? [], undefined);
      if (columns.includes(nextColumn)) {
        return section;
      }
      return {
        ...section,
        layout: "table",
        fields: [],
        columns: [...columns, nextColumn],
        rows: (section.rows ?? []).map((row) => ({ ...row, [nextColumn]: "" }))
      };
    })
  };
}

export function removeCardTableColumn(
  card: StructuredCard,
  sectionIndex: number,
  column: string
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) => {
      if (index !== sectionIndex) {
        return section;
      }
      return {
        ...section,
        columns: (section.columns ?? []).filter((existingColumn) => existingColumn !== column),
        rows: (section.rows ?? []).map((row) => {
          const { [column]: _removed, ...nextRow } = row;
          return nextRow;
        })
      };
    })
  };
}

export function addCardTableRow(card: StructuredCard, sectionIndex: number): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) => {
      if (index !== sectionIndex) {
        return section;
      }
      const columns = section.columns ?? inferTableColumns(section.rows ?? [], undefined);
      return {
        ...section,
        layout: "table",
        fields: [],
        columns,
        rows: [...(section.rows ?? []), Object.fromEntries(columns.map((column) => [column, ""]))]
      };
    })
  };
}

export function duplicateCardTableRow(
  card: StructuredCard,
  sectionIndex: number,
  rowIndex: number
): StructuredCard {
  if (!isValidIndex(card.sections, sectionIndex)) {
    return card;
  }
  const rows = duplicateArrayItem(card.sections[sectionIndex].rows ?? [], rowIndex, cloneCardTableRow);
  if (!rows) {
    return card;
  }
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex ? { ...section, layout: "table", fields: [], rows } : section
    )
  };
}

export function reorderCardTableRow(
  card: StructuredCard,
  sectionIndex: number,
  fromIndex: number,
  toIndex: number
): StructuredCard {
  if (!isValidIndex(card.sections, sectionIndex)) {
    return card;
  }
  const rows = reorderArrayItem(card.sections[sectionIndex].rows ?? [], fromIndex, toIndex);
  if (!rows) {
    return card;
  }
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex ? { ...section, layout: "table", fields: [], rows } : section
    )
  };
}

export function updateCardTableCell(
  card: StructuredCard,
  sectionIndex: number,
  rowIndex: number,
  column: string,
  value: string
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex
        ? {
            ...section,
            rows: (section.rows ?? []).map((row, innerIndex) =>
              innerIndex === rowIndex ? { ...row, [column]: value } : row
            )
          }
        : section
    )
  };
}

export function removeCardTableRow(
  card: StructuredCard,
  sectionIndex: number,
  rowIndex: number
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex
        ? {
            ...section,
            rows: (section.rows ?? []).filter((_, innerIndex) => innerIndex !== rowIndex)
          }
        : section
    )
  };
}

export function removeCardField(
  card: StructuredCard,
  sectionIndex: number,
  fieldIndex: number
): StructuredCard {
  return {
    ...card,
    sections: card.sections.map((section, index) =>
      index === sectionIndex
        ? {
            ...section,
            fields: section.fields.filter((_, innerIndex) => innerIndex !== fieldIndex)
          }
        : section
    )
  };
}
