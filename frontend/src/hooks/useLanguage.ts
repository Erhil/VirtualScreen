import { useEffect, useMemo, useState } from "react";

import {
  AVAILABLE_LANGUAGES,
  createTranslator,
  loadStoredUiLanguage,
  resolveInitialLanguage,
  saveStoredUiLanguage,
  type UiLanguage
} from "../lang";
import {
  fetchAppConfig,
  fetchLanguageCatalog,
  type AppConfig,
  type TranslationCatalog
} from "../lib/api";

// The server's app config and the UI language: which one, its catalogue, and the translator
// built from it. A catalogue that fails to load falls back to English, then to built-in text.
export function useLanguage() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(() =>
    resolveInitialLanguage({ stored: loadStoredUiLanguage() })
  );
  const [uiCatalog, setUiCatalog] = useState<TranslationCatalog | null>(null);
  const t = useMemo(() => createTranslator(uiCatalog ?? undefined), [uiCatalog]);

  function applyLanguage(language: UiLanguage, catalog: TranslationCatalog, persist: boolean) {
    setUiLanguage(language);
    setUiCatalog(catalog);
    if (persist) {
      saveStoredUiLanguage(language);
    }
  }

  function loadLanguage(language: UiLanguage, persist = false) {
    fetchLanguageCatalog(language)
      .then((catalog) => applyLanguage(language, catalog, persist))
      .catch(() => {
        if (language !== "en") {
          void fetchLanguageCatalog("en")
            .then((catalog) => applyLanguage("en", catalog, persist))
            .catch(() => {
              setUiLanguage("en");
              setUiCatalog(null);
            });
          return;
        }
        setUiLanguage("en");
        setUiCatalog(null);
      });
  }

  useEffect(() => {
    let mounted = true;
    fetchAppConfig()
      .then((config) => {
        if (!mounted) {
          return;
        }
        setAppConfig(config);
        loadLanguage(
          resolveInitialLanguage({
            stored: loadStoredUiLanguage(),
            configured: config.language,
            available: config.available_languages
          })
        );
      })
      .catch(() => {
        if (mounted) {
          loadLanguage(resolveInitialLanguage({ stored: loadStoredUiLanguage() }));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return {
    appConfig,
    uiLanguage,
    t,
    availableLanguageOptions: appConfig?.available_languages ?? AVAILABLE_LANGUAGES,
    handleLanguageChange: (language: UiLanguage) => loadLanguage(language, true)
  };
}
