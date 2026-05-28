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
import { CONTEXT_HELP_TOPICS, contextHelpKeys } from "../lib/contextHelp";

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
    expect(Object.keys(en)).toEqual(expect.arrayContaining(Object.keys(FALLBACK_CATALOG)));
  });

  it("keeps the bundled fallback catalog intentionally tiny", () => {
    const en = readCatalog("en");

    expect(Object.keys(FALLBACK_CATALOG).length).toBeLessThan(20);
    for (const key of Object.keys(FALLBACK_CATALOG)) {
      expect(en[key], key).toBeTruthy();
    }
  });

  it("lists fallback UI languages used when the backend config is unavailable", () => {
    expect(AVAILABLE_LANGUAGES).toEqual([
      { code: "en", label: "English", native_label: "English" },
      { code: "ru", label: "Russian", native_label: "Русский" }
    ]);
  });
  it("contains localized help keys for every context help topic", () => {
    const en = readCatalog("en");
    const ru = readCatalog("ru");

    for (const key of contextHelpKeys()) {
      expect(en[key], key).toBeTruthy();
      expect(ru[key], key).toBeTruthy();
    }
    for (const topic of Object.values(CONTEXT_HELP_TOPICS)) {
      expect(topic.bodyKeys).toHaveLength(3);
      expect(topic.shortcutKeys).toHaveLength(1);
    }
  });

  it("uses explicit player-visible and search action labels", () => {
    const en = readCatalog("en");

    expect(en["screen.visible"]).toBe("Shown to Players");
    expect(en["screen.staged"]).toBe("Staged (Hidden)");
    expect(en["screen.showPopupToPlayers"]).toBe("Show to Players");
    expect(en["screen.hidePopupFromPlayers"]).toBe("Hide from Players");
    expect(en["search.otherPane"]).toBe("Open in Other Pane");
    expect(en["search.stage"]).toBe("Stage on Screen");
    expect(en["search.showOnScreen"]).toBe("Show on Screen");
  });

  it("covers the dense pre-release polish labels in both catalogs", () => {
    const en = readCatalog("en");
    const ru = readCatalog("ru");
    const keys = [
      "card.noRows",
      "contextMenu.copyPath",
      "contextMenu.openOtherPane",
      "contextMenu.showOnScreen",
      "contextMenu.stageOnScreen",
      "actions.summary.keys",
      "actions.summary.midi",
      "actions.summary.slots",
      "audio.summary.loaded",
      "audio.summary.playing",
      "audio.summary.quiet",
      "dice.ready",
      "hp.summary.noRows",
      "hp.summary.rows",
      "live.map.noMap",
      "live.output.clear",
      "live.pane.empty",
      "live.prep",
      "llm.field.audience",
      "llm.field.focus",
      "llm.field.tone",
      "llm.providerStatus.checking",
      "llm.providerStatus.error",
      "llm.providerStatus.ready",
      "llm.providerStatus.unavailable",
      "llm.summary.checkingProvider",
      "llm.summary.dmOnly",
      "llm.summary.providerReady",
      "prep.count.errors",
      "prep.count.warnings",
      "prep.filters.label",
      "prep.kind.brokenLink",
      "prep.status.checkFailed",
      "prep.status.notChecked",
      "prep.status.ready",
      "search.resultsGroup",
      "scripts.summary.found",
      "scripts.summary.ready",
      "tools.sectionLabel",
      "workspace.openFileCount",
      "workspace.viewerPane"
    ];

    for (const key of keys) {
      expect(en[key], `en ${key}`).toBeTruthy();
      expect(ru[key], `ru ${key}`).toBeTruthy();
    }

    for (const key of keys.filter((item) => !["search.resultsGroup", "tools.sectionLabel"].includes(item))) {
      expect(ru[key], key).not.toBe(en[key]);
    }
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
