# Iteration Plan: Player Screen UX V2

## Summary

Add preset-based popup presentation and one-click display shortcuts for the table-facing `/screen` view. This is a focused UX iteration: no drag/resize editor, no map tool, no new scripting commands.

## Success Criteria

- Display popups support `plain`, `note`, `letter`, `portrait`, and `clue` presets.
- Old display states without a preset still load as `plain`.
- The DM Screen tool can choose a popup preset and open the active file using it.
- The DM Screen tool has a compact `Clear + Fullscreen` action that clears popups and shows the active file fullscreen.
- Screen popup fast slots can store an optional preset.
- `/screen` renders preset-specific popup classes while keeping fullscreen rendering unchanged.
- Existing screen, DMS, audio, world, edit, search, and PDF behavior remains green.

## Backend TDD Tasks

1. Add failing display tests.
   - Popup without preset defaults to `plain`.
   - Popup with preset `letter` persists and appears in `/api/screen/display/state`.
   - Invalid popup preset returns a request validation error.
   - `POST /api/display/show-active` with `clear_existing: true` clears popups and sets fullscreen.
   - `POST /api/display/show-active` with popup mode opens one preset popup after clearing old display state.

2. Implement display preset support.
   - Add `DisplayPopupPreset` literal validation.
   - Add `preset` to `DisplayPopup`.
   - Normalize missing/unknown persisted preset safely to `plain` when reading old state.
   - Extend `add_popup(root, item, preset=\"plain\")`.

3. Implement display shortcut route.
   - Add request model with `path`, `mode`, optional `preset`, and `clear_existing`.
   - Reuse the existing path resolver and event queue.
   - Mutate state through small core helpers to keep route code thin.

4. Add fast-slot backend tests and implementation.
   - `screen_popup` accepts optional `preset`.
   - Invalid `screen_popup.preset` is rejected.
   - Legacy popup slots without preset still round-trip.

## Frontend TDD Tasks

1. Add Vitest coverage for display helpers.
   - Preset class names map deterministically.
   - Missing popup preset resolves to `plain`.

2. Add Vitest coverage for fast slots.
   - `screen_popup` drafts include optional preset.
   - Slot summary includes preset only when useful.

3. Implement API/types.
   - Add `DisplayPopupPreset`.
   - Add `preset` to `DisplayPopup`.
   - Let `openDisplayPopup(path, preset?)` send preset.
   - Add `showActiveOnDisplay(...)` helper if the backend route is implemented.

4. Implement DM Screen tool UX.
   - Add compact preset selector.
   - `Open Active as Popup` uses the selected preset.
   - Add `Clear + Fullscreen`.
   - Popup list displays preset and title.

5. Implement player rendering.
   - Add preset-specific class names to popup sections.
   - Keep fullscreen layout untouched.
   - Add CSS for `plain`, `note`, `letter`, `portrait`, and `clue`.

6. Add Playwright coverage.
   - Letter preset appears on `/screen`.
   - Portrait preset appears on `/screen`.
   - `Clear + Fullscreen` removes existing popups and shows active file.
   - Popup fast slot with preset triggers correctly.

## Verification

Run:

```powershell
.\.venv\Scripts\python -m pytest backend\tests\test_display_routes.py backend\tests\test_fast_slots_routes.py
.\.venv\Scripts\python -m ruff check backend
npm run test -- src/lib/display.test.ts src/lib/fastSlots.test.ts
npm run build
npm run test:e2e -- --grep "screen|popup|display|fast slot"
.\scripts\test.ps1
```

Report final counts and any build warnings.
