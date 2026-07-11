# Аудит кодовой базы VirtualScreen

_Дата: 2026-07-11. Ветка: `dev`. Метод: чтение исходников backend, frontend, тестов и tooling; grep-подсчёты; запуск ruff и vitest._

---

## Общий вердикт

Для пет-проекта уровень **заметно выше среднего**. Backend аккуратно разложен по слоям (`core/` — логика, `api/routes/` — тонкие роутеры), безопасность путей продумана всерьёз, типизация frontend образцовая (**0 `any`, 0 `@ts-ignore`** на весь `src`), локализация en/ru полная (852 ключа, паритет), тестов ~26 000 строк.

Весь стратегический долг сконцентрирован в **одном** решении: во frontend **нет слоя общего состояния**, из-за чего `App.tsx` разросся до **14 125 строк**. Плюс кластер конкретных технических рисков на backend (SQLite-конкуренция, блокировка event loop, обход DMS-trust). Ничего не «сгнило» — проект в рабочем, развивающемся состоянии.

**Метрики масштаба:**

| Область | Значение |
|---|---|
| Backend Python | 58 файлов, ~12 325 строк |
| Frontend TS/TSX | 89 файлов, ~34 584 строки |
| `App.tsx` | **14 125 строк** (сам `App()` ≈ 5 514) |
| Backend-тесты (pytest) | 37 файлов, ~9 895 строк |
| Frontend unit (vitest) | 38 файлов, 377 тестов, ~8 458 строк (зелёные, 1.3 c) |
| E2E (Playwright) | 11 спеков, 181 тест, ~7 618 строк |
| Локализация | en/ru по 852 ключа, паритет 0 |

---

## 1. ⚠️ Незакоммиченная работа — приоритет №1

На ветке `dev` лежит **большой незакоммиченный бандл**: ~50 изменённых файлов (+2600 строк) + 12 новых untracked. Это одна связная фича-ветка, готова на **~85–90%**, покрыта тестами, но **не в git** — риск потери. Коммит — первый логичный шаг.

Три связанных потока («reference-media & board handling»):

- **PDF-просмотрщик + закладки** (готов больше всех): `backend/app/core/pdf_bookmarks.py`, `routes/pdf_bookmarks.py` (уже подключён в `main.py:78`), `frontend/src/components/PdfViewer.tsx` (pdfjs-dist), `lib/pdfBookmarks.ts`. Закладки в `.virtualscreen/pdf-bookmarks.json`. PDF пока только в пульте мастера, на `/screen` не выводится.
- **Folder Kanban**: `lib/folderKanban.ts` + `FolderKanbanView` в `App.tsx`. Папка открывается доской, карточки перетаскиваются по колонкам (группировка по полю метаданных), drag-drop переписывает поле карточки. Потребовал нового `"folder"` mediaKind в `core/workspace.py`.
- **Content rotation**: новые `POST /api/map/rotate` и `/api/display/fullscreen/rotate`; поле `rotation` (0/90/180/270) прокинуто через `MapState`/`DisplayItem`/`DisplayPopup` в `/screen`.

Плюс: `lib/panelWidth.ts` (ресайз панели), `components/IconButton.tsx`, предупреждение prep-health `untrusted_dms`, паритет en/ru сохранён (+145/+161 ключей).

Качество новых файлов высокое — они демонстрируют модульность (`components/` + делегирование в `lib/`), которой не хватает старому коду.

---

## 2. Карта функций (зрелость)

| Функция | Поверхность | Зрелость |
|---|---|---|
| Файлы мира (CRUD, trash/restore, поиск, инкрем. индекс) | `routes/world.py`, `core/index.py`, `links.py` | ✅ Solid |
| Markdown + `.dms` редактор (CodeMirror, автодополнение, split-preview) | `pages`, `scripts` | ✅ Solid |
| Структурные карточки `.cs` (NPC/монстр/предмет/…, computed-поля) | `card_templates`, `core/cards.py` | ✅ Solid (computed V2 — частично) |
| Экран игроков `/screen` (fullscreen, попапы, image-maps) | `display`, `events`, `PlayerScreen.tsx` | ✅ Solid |
| Карты (фон, туман, сетка, пины, замер, пресеты) | `map`, `MapCanvas.tsx` | ✅ Solid (+ rotation в разработке) |
| Аудио (шины ambient/music/effect, плейлисты, fade) | `audio`, `lib/audio.ts` | ✅ Solid (только в браузере мастера) |
| Кубики | `dice`, `core/dice.py` | ✅ Solid |
| Live-инструменты (Quick Capture, HP, Prep Check, снапшоты, fast-slots) | `capture`, `prep_health`, `table_snapshots`, `fast_slots` | ✅ Solid |
| Клавиатура + MIDI-биндинги | `lib/actionBindings.ts` | ✅ Solid (MIDI зависит от браузера) |
| LLM-ассистент (форма-промпт, V2.8) | `llm`, `lib/llmForms.ts` | 🟡 Partial — выключен без провайдера |
| System Packs / World Library / контекст-справка | `system_packs`, `worlds` | ✅ Solid |
| PDF-viewer + закладки / Folder Kanban | `pdf_bookmarks`, `folderKanban` | 🧪 В разработке (§1) |
| Legacy `/api/scenarios` | `scenarios` | ⛔ Deprecated, по умолчанию off |

---

## 3. Правила и инварианты (соблюдать в любой доработке)

1. **Local-first**, не облако.
2. **Мир = обычные файлы**; в SQLite — только перестраиваемый индекс, не исходный контент.
3. **`.virtualscreen/`** — скрытые внутренности, не видны в браузере мира.
4. **Path safety** — весь доступ через `core/paths.py` (`normalize_relative_path`/`resolve_under_root`/`WorldPathError`) + отклонение симлинков/reparse-точек. Перед правкой path/index/edit/display/auth/DMS писать тесты.
5. **Отложенная атомарная запись DMS** — запись только после успешного завершения скрипта.
6. **`.dms` — доверенный локальный Python**, гейтится флагом доверия мира, исполняется в backend `.venv`.
7. **LLM только форма-промпт** — без RAG/автономных инструментов/скрытых чтений/тихих записей; мастер видит и подтверждает контекст; вывод временный, пока мастер явно не сохранит.
8. **`/screen` публичный, но строго read-only** — читает только то, что сейчас показано, и вложенные медиа.
9. **i18n без правки кода**; en/ru в паритете.
10. **Release-hygiene gate** (`scripts/release-hygiene.ps1`) блокирует мусор в релизе.

Гейт проверки — `scripts/test.ps1`: hygiene → pytest → ruff → vitest → build → smoke e2e.

---

## 4. Сильные стороны

- Чистая слоистость backend; централизованная безопасность путей (`resolve_under_root`, отклонение симлинков/reparse-точек); реально безопасный `/screen` (capability-модель — читать можно только показанное).
- Frontend `lib/` — ~40 связных, юнит-тестированных чистых модулей; `api.ts` — аккуратный типизированный клиент (93 типизированные функции над 3 обёртками), не свалка.
- Типобезопасность frontend исключительная: **0 `any`, 0 `@ts-ignore`, 0 non-null-assertion**, 56 `as`-каст (почти все — сужение union). `dangerouslySetInnerHTML` пропущен через DOMPurify.
- Новые untracked-файлы — эталонного качества (`PdfViewer.tsx` с ленивым импортом pdfjs, ResizeObserver, аккуратной очисткой).
- Селекторы e2e аккуратные: 1288 `getByRole`, 0 `getByTestId`, 0 `.nth()`.

---

## 5. Ключевые проблемы (приоритизировано)

### HIGH

1. **Монолит `frontend/src/App.tsx` — 14 125 строк**, сам `App()` ≈ 5 514 строк со **100 `useState` / 43 `useEffect` / 25 `useRef`**. Первопричина — **нет слоя состояния** (0 `useContext`/`createContext`/`useReducer` во всём коде) → всё прокидывается пропсами: `ToolsPanel` (`App.tsx:7859`) принимает **~150 пропсов**, 5 ref-ов зеркалят state (46 присваиваний `.current =`) ради борьбы со stale-closure. Логика уже вынесена в `lib/`, поэтому фикс — ввести доменные Context/store и вынести уже существующие внутри файла `*Tool`/`*Dialog` в `components/` (~44 компонента и ~104 функции живут в одном файле).
2. **SQLite без защиты от конкуренции** (`core/database.py:53`): нет WAL, нет `busy_timeout`, дефолтная изоляция. Watcher + потоки запросов FastAPI + DMS-воркеры пишут в одну БД → `database is locked` и 500. Дёшево чинится (`PRAGMA journal_mode=WAL` + `busy_timeout`), высокий ROI.
3. **Watcher блокирует event loop** (`core/watcher.py:106`): полный `rebuild_index` вызывается синхронно внутри async-цикла — во время перестройки большого мира встают все запросы. Аналогично `routes/worlds.py:88,110`.
4. **Тяжёлый реиндекс на чтение**: `/page/backlinks` (`routes/pages.py:323`) и `/prep-health` (`core/prep_health.py:167`) переиндексируют **весь мир на каждый запрос-открытие**. Плюс «инкрементальный» индекс на деле удаляет и пересобирает все ссылки при любом сохранении (`core/index.py:400`).
5. **Гейт доверия DMS обходится** (`core/scripts.py:193`): флаг доверия лежит в **переносимой** `.virtualscreen/dms-trust.json` → скопированный/расшаренный мир приходит уже «доверенным» и выполняет произвольный Python (`.dms` не в песочнице по замыслу — `scripts.py:668`). Хранить доверие надо на уровне приложения, ключ по идентичности мира.
6. **Дыры в tooling**: `mypy` в зависимостях (`pyproject.toml:24`), но **не запускается** нигде → нулевой type-check Python; CI на PR гоняет только smoke-e2e (~25 из 181 теста), а новые спеки `pdf-bookmarks`/`rotation-kanban`/`release-regressions` без тега `@smoke` → **в CI не запускаются вообще**; измерения покрытия (pytest-cov/vitest coverage) нет нигде.

### MED

- `core/map.py:551` — ~350 строк копипасты мутаторов (все rebuild-ят `MapState` по полям; решается одним `dataclasses.replace`, минус ~350 строк). Тройной байт-в-байт дубль websocket-хаба: `events.py:50`, `display.py:341`, `map.py:809`.
- **~58 мёртвых экспортов** во frontend: весь клиент scenarios (`fetchScenarios`/`runScenario`/…), все `live*Summary` кроме `livePrepHealthLabel`, устаревшие предшественники в `api.ts` (`renameWorldFile`→`moveWorldPath` и т.п.).
- `.webp` не в `IMAGE_EXTENSIONS` (`core/links.py:43`), хотя `index.py`/`world.py` считают его картинкой → на `/screen` вложенные webp отдают 403.
- `world-browser.spec.ts` — **монолит 4 174 строки / 125 тестов** (единственный `test.describe` на весь файл), 11 `waitForTimeout`-сна — семена флаки.
- `database.py:62` — `initialize_database` гоняет полный DDL + проверки миграций **на каждый вызов** (несколько раз за запрос).
- pdf_bookmarks: lost-update при конкурентном PUT + тихая потеря невалидных записей (`core/pdf_bookmarks.py:134,149`).
- `test_file_safety.py` — единственный happy-path тест: не проверяет исчерпание ретраев (ветку, защищающую от потери данных).
- Legacy `/api/scenarios` (по умолчанию off, `config.py:26`) несёт дремлющий RCE (`core/scenarios.py:188`).

### LOW

- Auth: сравнение токена не constant-time (`core/auth.py:49`), токен принимается в query-строке WS, cookie `secure=False` захардкожен.
- `IndexedPage` dataclass не используется (`core/index.py:28`); неиспользуемый параметр `created_at` в `_execute_script`; `WatcherManager.switch` — алиас на `start`.
- 9 диалогов вручную дублируют overlay-скелет (нет общего `<Modal>`); повторяющийся паттерн `fetch→{idle|loading|ready|error}` десятки раз без общего `useAsync`.
- Дублирование валидации карточек между `scripts.py:510` и `card_templates.validate_card_shape`.
- Дублирующие фикстуры `make_client`/`make_world` по 36 route-тестам (не вынесены в `conftest.py`).

---

## 6. Легаси и deprecated

- **`/api/scenarios` + `.virtualscreen/scenarios`** — явно deprecated, держатся ради совместимости и compat-тестов; по умолчанию выключены (`enable_legacy_scenarios=False`). Новая автоматизация — только `.dms`.
- Frontend-клиент scenarios (`lib/scenarios.ts`, `api.ts`) — мёртв, ни к какому UI не подключён.

---

## 7. План дальнейшей работы

### Этап 0 — зафиксировать текущее (сегодня)
- Закоммитить бандл `dev` (PDF/kanban/rotation) — готов и покрыт тестами. Прогнать `scripts/test.ps1`. Проверить бандлинг pdfjs-worker в проде.

### Этап 1 — дешёвые фиксы высокого ROI (несколько часов)
- SQLite: `PRAGMA journal_mode=WAL` + `busy_timeout`.
- `rebuild_index` увести с event loop (`asyncio.to_thread`); убрать полный реиндекс из `/page/backlinks` и `/prep-health`.
- Добавить `.webp` в `core/links.py`.
- Включить `mypy backend` в `test.ps1` и CI (или убрать из зависимостей); протегать новые спеки `@smoke` либо гонять `-E2E full` на PR.

### Этап 2 — безопасность
- Перенести DMS-trust на уровень приложения (ключ по идентичности мира, не в папке мира).

### Этап 3 — стратегический рефакторинг (постепенно)
- Ввести 4–6 доменных Context/store (`WorkspaceContext`, `ScreenContext`, `AudioContext`, `ToolsContext`), поэтапно вынести `*Tool`/`*Dialog` из `App.tsx` в `components/`.
- Ввести `<Modal>`-примитив и `useAsync`/`AsyncState<T>`.
- Удалить ~58 мёртвых экспортов (начать с scenarios и `live*Summary`).
- Разбить `world-browser.spec.ts` по фичам; заменить `waitForTimeout` на ожидания-ассерты.

### Этап 4 — гигиена
- Схлопнуть копипаст `map.py` через `dataclasses.replace`, объединить websocket-хабы, добавить измерение покрытия, покрыть `core/index.py`/`world_operations.py` прямыми тестами.
