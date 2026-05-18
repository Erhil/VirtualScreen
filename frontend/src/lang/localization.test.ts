import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AVAILABLE_LANGUAGES,
  FALLBACK_CATALOG,
  UI_LANGUAGE_STORAGE_KEY,
  createTranslator,
  isUiLanguage,
  loadStoredUiLanguage,
  resolveInitialLanguage,
  saveStoredUiLanguage,
  type TranslationCatalog
} from ".";

function readCatalog(code: string): TranslationCatalog {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "..", "lang", `${code}.json`), "utf-8")
  ) as TranslationCatalog;
}

describe("localization catalogs", () => {
  it("keeps English and Russian key coverage identical", () => {
    const en = readCatalog("en");
    const ru = readCatalog("ru");

    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(en).sort()).toEqual(Object.keys(FALLBACK_CATALOG).sort());
  });

  it("lists fallback UI languages used when the backend config is unavailable", () => {
    expect(AVAILABLE_LANGUAGES).toEqual([
      { code: "en", label: "English", native_label: "English" },
      { code: "ru", label: "Russian", native_label: "Русский" }
    ]);
  });
});

describe("createTranslator", () => {
  it("translates and interpolates simple UI labels from a loaded catalog", () => {
    const t = createTranslator(readCatalog("en"));

    expect(t("workspace.prepCheckStatus", { status: "OK" })).toBe("Prep Check: OK");
  });

  it("falls back to bundled English for missing loaded catalog keys", () => {
    const t = createTranslator({});

    expect(t("app.settings")).toBe("Settings");
  });

  it("returns a visible deterministic fallback for unknown keys", () => {
    const t = createTranslator(readCatalog("en"));

    expect(t("missing.key")).toBe("[[missing.key]]");
  });
});

describe("language resolution", () => {
  it("validates safe language codes", () => {
    expect(isUiLanguage("en")).toBe(true);
    expect(isUiLanguage("ru")).toBe(true);
    expect(isUiLanguage("pt-BR")).toBe(true);
    expect(isUiLanguage("../secret")).toBe(false);
  });

  it("prefers stored language over backend config and falls back to English", () => {
    const available = [
      { code: "en", label: "English", native_label: "English" },
      { code: "zz", label: "Test", native_label: "Test" }
    ];

    expect(resolveInitialLanguage({ stored: "zz", configured: "en", available })).toBe("zz");
    expect(resolveInitialLanguage({ stored: "bad", configured: "zz", available })).toBe("zz");
    expect(resolveInitialLanguage({ stored: null, configured: "ru", available })).toBe("en");
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

    storage.set(UI_LANGUAGE_STORAGE_KEY, "../bad");
    expect(loadStoredUiLanguage(fakeStorage)).toBeNull();
  });
});
