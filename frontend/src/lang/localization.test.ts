import { describe, expect, it } from "vitest";

import {
  AVAILABLE_LANGUAGES,
  UI_LANGUAGE_STORAGE_KEY,
  createTranslator,
  en,
  isUiLanguage,
  loadStoredUiLanguage,
  resolveInitialLanguage,
  ru,
  saveStoredUiLanguage,
  type TranslationKey
} from ".";

describe("localization catalogs", () => {
  it("keeps English and Russian key coverage identical", () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  });

  it("lists the available UI languages", () => {
    expect(AVAILABLE_LANGUAGES).toEqual([
      { code: "en", label: "English", native_label: "English" },
      { code: "ru", label: "Russian", native_label: "Русский" }
    ]);
  });
});

describe("createTranslator", () => {
  it("translates and interpolates simple UI labels", () => {
    const t = createTranslator("en");

    expect(t("workspace.prepCheckStatus", { status: "OK" })).toBe("Prep Check: OK");
  });

  it("returns a visible deterministic fallback for missing keys", () => {
    const t = createTranslator("en");

    expect(t("missing.key" as TranslationKey)).toBe("[[missing.key]]");
  });
});

describe("language resolution", () => {
  it("validates supported languages", () => {
    expect(isUiLanguage("en")).toBe(true);
    expect(isUiLanguage("ru")).toBe(true);
    expect(isUiLanguage("de")).toBe(false);
  });

  it("prefers stored language over backend config and falls back to English", () => {
    expect(resolveInitialLanguage({ stored: "ru", configured: "en" })).toBe("ru");
    expect(resolveInitialLanguage({ stored: "bad", configured: "ru" })).toBe("ru");
    expect(resolveInitialLanguage({ stored: null, configured: "bad" })).toBe("en");
  });

  it("loads and saves the stored language defensively", () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    } as unknown as Storage;

    expect(loadStoredUiLanguage(fakeStorage)).toBeNull();
    saveStoredUiLanguage("ru", fakeStorage);

    expect(storage.get(UI_LANGUAGE_STORAGE_KEY)).toBe("ru");
    expect(loadStoredUiLanguage(fakeStorage)).toBe("ru");

    storage.set(UI_LANGUAGE_STORAGE_KEY, "bad");
    expect(loadStoredUiLanguage(fakeStorage)).toBeNull();
  });
});
