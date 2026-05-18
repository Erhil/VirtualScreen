export type UiLanguage = "en" | "ru";

export type UiLanguageOption = {
  code: UiLanguage;
  label: string;
  native_label: string;
};

export const UI_LANGUAGE_STORAGE_KEY = "virtualscreen.uiLanguage";

export const AVAILABLE_LANGUAGES: UiLanguageOption[] = [
  { code: "en", label: "English", native_label: "English" },
  { code: "ru", label: "Russian", native_label: "Русский" }
];

export const en = {
  "app.settings": "Settings",
  "app.settingsTitle": "Settings",
  "app.language": "Language",
  "app.closeSettings": "Close Settings",
  "app.save": "Save",
  "app.cancel": "Cancel",
  "app.close": "Close",
  "app.loading": "Loading...",
  "app.saving": "Saving...",
  "app.none": "None",
  "unlock.label": "VirtualScreen Unlock",
  "unlock.description": "Enter the local table access code to unlock this session.",
  "unlock.accessCode": "Access code",
  "unlock.unlock": "Unlock",
  "unlock.unlocking": "Unlocking...",
  "side.openFolder": "Open Folder",
  "side.newWorld": "New World",
  "side.scan": "Scan",
  "side.trash": "Trash",
  "side.worldFiles": "World files",
  "side.filterWorldTree": "Filter world tree",
  "side.filterWorld": "Filter world",
  "side.collapseAll": "Collapse All",
  "side.loadingWorld": "Loading world...",
  "side.couldNotLoadWorld": "Could not load world.",
  "side.favorites": "Favorites",
  "side.recent": "Recent",
  "world.select": "Select world",
  "world.recent": "Recent",
  "world.library": "World Library",
  "world.openFolderTitle": "Open Folder as World",
  "world.closeOpenFolder": "Close Open Folder as World",
  "world.libraryNotLoaded": "World library is not loaded yet.",
  "world.scanWorlds": "Scan Worlds",
  "world.noWorlds": "No world folders found.",
  "world.addTitle": "Add New World",
  "world.closeAdd": "Close Add New World",
  "world.name": "World name",
  "world.create": "Create World",
  "world.creating": "Creating...",
  "workspace.controls": "Workspace controls",
  "workspace.workspace": "Workspace",
  "workspace.select": "Select workspace",
  "workspace.new": "New",
  "workspace.rename": "Rename",
  "workspace.delete": "Delete",
  "workspace.search": "Search",
  "workspace.capture": "Capture",
  "workspace.newCard": "New Card",
  "workspace.prepCheckStatus": "Prep Check: {status}",
  "workspace.layout": "Workspace layout",
  "workspace.single": "Single",
  "workspace.split": "Split",
  "workspace.openFiles": "Open files",
  "workspace.selectFile": "Select a File",
  "workspace.openFromTree": "Open Markdown, CSV, or media from the world tree.",
  "tools.panel": "DM Tools",
  "tools.title": "Tools",
  "tools.metadata": "Metadata",
  "tools.audio": "Audio",
  "tools.hp": "HP",
  "tools.actions": "Actions",
  "tools.scripts": "Scripts",
  "tools.screen": "Screen",
  "tools.pin": "Pin",
  "tools.pinned": "Pinned",
  "tools.unpin": "Unpin",
  "tools.editing": "Editing",
  "screen.control": "Screen Control",
  "screen.sections": "Screen sections",
  "screen.display": "Display",
  "screen.map": "Map",
  "screen.fullscreenPath": "Fullscreen path",
  "screen.chooseTarget": "Choose fullscreen path",
  "screen.pick": "Pick",
  "screen.blank": "Blank Screen",
  "screen.clearPopups": "Clear Popups",
  "screen.openPlayer": "Open Player Screen",
  "screen.popupPreset": "Popup preset",
  "screen.current": "Current Screen",
  "screen.fullscreen": "Fullscreen",
  "screen.popups": "Popups",
  "screen.visible": "Visible",
  "screen.staged": "Staged",
  "audio.search": "Music Search",
  "audio.stopAll": "Stop All Audio",
  "search.title": "Search",
  "search.close": "Close Search",
  "search.world": "Search World",
  "search.loading": "Searching...",
  "capture.title": "Capture",
  "capture.close": "Close Capture",
  "capture.text": "Capture text",
  "capture.shortcut": "Ctrl+Enter to save",
  "capture.save": "Save Capture",
  "capture.saving": "Saving...",
  "prep.title": "Prep Check",
  "prep.close": "Close Prep Check",
  "pathPicker.title": "Choose World Path",
  "pathPicker.label": "Choose World Path",
  "pathPicker.search": "Search",
  "pathPicker.filter": "Filter world paths",
  "pathPicker.placeholder": "Search world paths",
  "pathPicker.results": "World path results",
  "pathPicker.empty": "No matching paths.",
  "pathPicker.use": "Use Selected Path",
  "pathPicker.allPaths": "All paths",
  "pathPicker.displayablePaths": "Displayable paths",
  "pathPicker.kindPaths": "{kind} paths"
} as const;

export type TranslationCatalog = Record<keyof typeof en, string>;

export type TranslationKey = keyof typeof en;

export type Translator = (
  key: TranslationKey,
  values?: Record<string, string | number | boolean | null | undefined>
) => string;

export const ru: TranslationCatalog = {
  "app.settings": "Настройки",
  "app.settingsTitle": "Настройки",
  "app.language": "Язык",
  "app.closeSettings": "Закрыть настройки",
  "app.save": "Сохранить",
  "app.cancel": "Отмена",
  "app.close": "Закрыть",
  "app.loading": "Загрузка...",
  "app.saving": "Сохранение...",
  "app.none": "Нет",
  "unlock.label": "Разблокировка VirtualScreen",
  "unlock.description": "Введите локальный код доступа к игровой сессии.",
  "unlock.accessCode": "Код доступа",
  "unlock.unlock": "Открыть",
  "unlock.unlocking": "Открываем...",
  "side.openFolder": "Открыть папку",
  "side.newWorld": "Новый мир",
  "side.scan": "Сканировать",
  "side.trash": "Корзина",
  "side.worldFiles": "Файлы мира",
  "side.filterWorldTree": "Фильтр дерева мира",
  "side.filterWorld": "Фильтр мира",
  "side.collapseAll": "Свернуть всё",
  "side.loadingWorld": "Загрузка мира...",
  "side.couldNotLoadWorld": "Не удалось загрузить мир.",
  "side.favorites": "Избранное",
  "side.recent": "Недавние",
  "world.select": "Выберите мир",
  "world.recent": "Недавние",
  "world.library": "Библиотека миров",
  "world.openFolderTitle": "Открыть папку как мир",
  "world.closeOpenFolder": "Закрыть выбор папки мира",
  "world.libraryNotLoaded": "Библиотека миров ещё не загружена.",
  "world.scanWorlds": "Сканировать миры",
  "world.noWorlds": "Папки миров не найдены.",
  "world.addTitle": "Добавить новый мир",
  "world.closeAdd": "Закрыть добавление мира",
  "world.name": "Название мира",
  "world.create": "Создать мир",
  "world.creating": "Создаём...",
  "workspace.controls": "Управление рабочей областью",
  "workspace.workspace": "Область",
  "workspace.select": "Выбор рабочей области",
  "workspace.new": "Новая",
  "workspace.rename": "Переименовать",
  "workspace.delete": "Удалить",
  "workspace.search": "Поиск",
  "workspace.capture": "Заметка",
  "workspace.newCard": "Новая карта",
  "workspace.prepCheckStatus": "Проверка: {status}",
  "workspace.layout": "Разметка рабочей области",
  "workspace.single": "Одна",
  "workspace.split": "Разделить",
  "workspace.openFiles": "Открытые файлы",
  "workspace.selectFile": "Выберите файл",
  "workspace.openFromTree": "Откройте Markdown, CSV или медиа из дерева мира.",
  "tools.panel": "Инструменты ведущего",
  "tools.title": "Инструменты",
  "tools.metadata": "Метаданные",
  "tools.audio": "Аудио",
  "tools.hp": "HP",
  "tools.actions": "Действия",
  "tools.scripts": "Скрипты",
  "tools.screen": "Экран",
  "tools.pin": "Закрепить",
  "tools.pinned": "Закреплено",
  "tools.unpin": "Открепить",
  "tools.editing": "Редактирование",
  "screen.control": "Управление экраном",
  "screen.sections": "Разделы экрана",
  "screen.display": "Показ",
  "screen.map": "Карта",
  "screen.fullscreenPath": "Путь для полного экрана",
  "screen.chooseTarget": "Выбрать путь для полного экрана",
  "screen.pick": "Выбрать",
  "screen.blank": "Очистить экран",
  "screen.clearPopups": "Убрать всплывающие окна",
  "screen.openPlayer": "Открыть экран игроков",
  "screen.popupPreset": "Шаблон окна",
  "screen.current": "Текущий экран",
  "screen.fullscreen": "Полный экран",
  "screen.popups": "Всплывающие окна",
  "screen.visible": "Видимые",
  "screen.staged": "Подготовленные",
  "audio.search": "Поиск музыки",
  "audio.stopAll": "Остановить всё аудио",
  "search.title": "Поиск",
  "search.close": "Закрыть поиск",
  "search.world": "Поиск по миру",
  "search.loading": "Ищем...",
  "capture.title": "Быстрая заметка",
  "capture.close": "Закрыть заметку",
  "capture.text": "Текст заметки",
  "capture.shortcut": "Ctrl+Enter для сохранения",
  "capture.save": "Сохранить заметку",
  "capture.saving": "Сохраняем...",
  "prep.title": "Проверка подготовки",
  "prep.close": "Закрыть проверку",
  "pathPicker.title": "Выбор пути мира",
  "pathPicker.label": "Выбор пути мира",
  "pathPicker.search": "Поиск",
  "pathPicker.filter": "Фильтр путей мира",
  "pathPicker.placeholder": "Искать пути мира",
  "pathPicker.results": "Результаты путей мира",
  "pathPicker.empty": "Подходящих путей нет.",
  "pathPicker.use": "Использовать путь",
  "pathPicker.allPaths": "Все пути",
  "pathPicker.displayablePaths": "Пути для показа",
  "pathPicker.kindPaths": "Пути: {kind}"
};

const catalogs: Record<UiLanguage, TranslationCatalog> = {
  en,
  ru
};

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === "en" || value === "ru";
}

export function createTranslator(language: UiLanguage): Translator {
  const catalog = catalogs[language] ?? en;

  return (key, values = {}) => {
    const template = catalog[key];
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
  configured
}: {
  stored?: unknown;
  configured?: unknown;
}): UiLanguage {
  if (isUiLanguage(stored)) {
    return stored;
  }
  if (isUiLanguage(configured)) {
    return configured;
  }
  return "en";
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
