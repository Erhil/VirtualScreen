import type { AppConfig, TranslationCatalog, UiLanguage } from "../lib/api";

export type { TranslationCatalog, UiLanguage };

export type UiLanguageOption = AppConfig["available_languages"][number];

export const UI_LANGUAGE_STORAGE_KEY = "virtualscreen.uiLanguage";

export const FALLBACK_LANGUAGE: UiLanguage = "en";

export const AVAILABLE_LANGUAGES: UiLanguageOption[] = [
  { code: "en", label: "English", native_label: "English" },
  { code: "ru", label: "Russian", native_label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" }
];

export const FALLBACK_CATALOG: TranslationCatalog = {
  "app.cancel": "Cancel",
  "app.close": "Close",
  "app.closeSettings": "Close Settings",
  "app.continue": "Continue",
  "app.language": "Language",
  "app.loading": "Loading...",
  "app.save": "Save",
  "app.saving": "Saving...",
  "app.settings": "Settings",
  "app.settingsTitle": "Settings"
};

export type TranslationKey = string;

export type Translator = (
  key: TranslationKey,
  values?: Record<string, string | number | boolean | null | undefined>
) => string;

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{1,31}$/.test(value);
}

export function createTranslator(catalog: TranslationCatalog = FALLBACK_CATALOG): Translator {
  return (key, values = {}) => {
    const template = catalog[key] ?? FALLBACK_CATALOG[key];
    if (!template) {
      return `[[${String(key)}]]`;
    }
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => {
      const value = values[name];
      return value === undefined || value === null ? match : String(value);
    });
  };
}

export function resolveInitialLanguage({
  stored,
  configured,
  available
}: {
  stored?: unknown;
  configured?: unknown;
  available?: readonly UiLanguageOption[];
}): UiLanguage {
  const availableCodes = new Set((available ?? AVAILABLE_LANGUAGES).map((language) => language.code));
  if (isUiLanguage(stored) && availableCodes.has(stored)) {
    return stored;
  }
  if (isUiLanguage(configured) && availableCodes.has(configured)) {
    return configured;
  }
  return FALLBACK_LANGUAGE;
}

export function loadStoredUiLanguage(storage: Storage | undefined = globalThis.localStorage): UiLanguage | null {
  try {
    const value = storage?.getItem(UI_LANGUAGE_STORAGE_KEY);
    return isUiLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveStoredUiLanguage(
  language: UiLanguage,
  storage: Storage | undefined = globalThis.localStorage
): void {
  try {
    storage?.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Local storage is a convenience; rendering should not depend on it.
  }
}
