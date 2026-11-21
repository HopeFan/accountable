# Plan: dark mode

Built from `docs/changes/dark-mode/intent.md` and `docs/spec.md`. No code is written yet. Requirement numbers (R38 to R42 and so on) refer to `docs/spec.md`.

Each phase ends with something that runs, with its tests passing, a commit and an update to `docs/STATUS.md`.

## How it works

- The page's `<html>` element carries `data-theme="dark"` in dark mode and nothing in light mode. `tokens.css` sets every color variable on `:root` for light, then sets the same variables again under `:root[data-theme="dark"]`. Tailwind already reads these variables (`@theme inline`), so components change color without carrying any dark styles of their own.
- The choice is stored in the browser's local storage under one key. A small inline script in `index.html` reads it and sets the attribute before the first paint, so there is no flash.
- Today some colors are hard-coded (the chart colors, a checkbox border, the sidebar footer, `#fff`), and the token `--ink` is used for fills as well as text. Both have to move to tokens first, with light mode left looking exactly as it does now. That is Phase 0, and it is the riskiest part of the change.
- No backend change and no new dependency.

## Files that change

### `frontend/`

| File | What changes |
| --- | --- |
| `index.html` | An inline script that sets `data-theme` from local storage before the page paints. |
| `src/theme/tokens.css` | New tokens (`--on-accent`, `--sidebar`, `--on-sidebar`, `--float`, `--on-float`, `--won`, `--on-won`, `--lost`, `--on-lost`, `--alert-solid`, `--info-solid`, `--overlay`, `--field-ring`, `--checkbox-edge`, `--grid`, `--axis`) with light values equal to today's colors. Then the dark block with the spec's values, and `color-scheme: light` or `dark` so native selects, date pickers and scrollbars follow the mode. |
| `src/lib/theme.ts` | New. Read, store and apply the theme, with local storage failures handled. |
| `src/components/ThemeToggle.tsx` | New. The button at the top right of the content area. |
| `src/components/Shell.tsx` | Sidebar uses `--sidebar` and `--on-sidebar`, the footer text a token, and the toggle is added above the page content, at the top right. |
| `src/components/ui.tsx` | Buttons, tags and the stage styles use the new tokens: `--on-accent` on green fills, `--alert-solid` on the destructive button, `--won` and `--lost` for those tags and dots. |
| `src/components/Toast.tsx` | Uses `--float` and `--on-float` instead of `bg-ink text-white`. |
| `src/components/RecordDialog.tsx` | The overlay uses `--overlay`, and the Save button `--on-accent`. |
| `src/components/FollowUpList.tsx` | The checkbox border uses `--checkbox-edge`. |
| `src/components/DataTable.tsx`, `src/pages/Contacts.tsx` | The search fields use `--field-ring` instead of `ring-mist`. |
| `src/pages/dashboard/Charts.tsx` | Axis, grid, cursor, dot, label and tooltip colors come from tokens instead of hex values. |
| `src/pages/dashboard/PipelineStrip.tsx` | Block colors use `--info-solid` and `--on-accent`. |
| `src/test/contrast.test.ts` | Reads both modes, and checks every pairing in each. |
| `src/lib/theme.test.ts`, `src/components/ThemeToggle.test.tsx`, `src/test/tokens.test.ts` | New unit tests. |

### `e2e/`

| File | What changes |
| --- | --- |
| `theme.spec.ts` | New. The toggle, the remembered choice, every screen in both modes, and the screenshots. |
| `look.spec.ts` | Unchanged unless the new toggle needs a selector. |

### Docs

| File | What changes |
| --- | --- |
| `docs/spec.md` | The token table gains the extra tokens above, and `--panel-edge` is described as the dark value of `--shadow`. |
| `docs/STATUS.md` | Updated at the end of every phase. Dark mode moves out of "Known limits". |
| `docs/changes/dark-mode/` | The four screenshots (dashboard and pipeline, light and dark). |

## Order of work

### Phase 0: Tokens first, with light mode unchanged

1. Before touching anything, take screenshots of all eight screens in light mode (the list in `look.spec.ts`) and keep them outside the repo as the baseline.
2. Add the new tokens to `tokens.css` with the light values equal to what the code uses today, and map each in `@theme inline`.
3. Replace each hard-coded color and each use of `ink` as a fill with the matching token: the files listed above. `ink` stays for text only.
4. Take the eight screenshots again and compare them with the baseline. They must be identical. Run the unit and end-to-end tests.
5. Add `tokens.test.ts`, which fails if any `.tsx` file outside the tests contains a hex color, so colors stay in one place.

Ends with: the app looks exactly as before, and the guard test is in.

### Phase 1: The theme logic and the toggle

1. Write `theme.ts`: `readTheme()` returns `"dark"` only when the stored value is `"dark"`, otherwise `"light"`. `applyTheme()` sets or removes the attribute. `storeTheme()` saves the choice. Any local storage error falls back to light.
2. Add the inline script to `index.html`.
3. Add `ThemeToggle` with an icon and the label of the mode it will switch to, and put it at the top right of the content area, above the page heading.
4. Unit tests for `theme.ts` and the toggle.

Ends with: the toggle switches the attribute and is remembered. Dark colors aren't defined yet, so nothing looks different.

### Phase 2: The dark tokens

1. Add the dark block to `tokens.css` with the spec's values, the dark tints and text colors, the lane at 8%, `--shadow` replaced by the faint ring (`--panel-edge`), and `color-scheme`.
2. Extend `contrast.test.ts` so every pairing is checked in both modes at 4.5:1, plus the dark lane. Fix any value that fails by adjusting the token, never the rule.

Ends with: the whole app turns dark, with the charts the last thing to fix.

### Phase 3: Make every screen follow

1. Charts: confirm the chart colors really follow the variables, and fix anything that doesn't (see Risks).
2. Go through the eight screens, the dialogs (add, edit and delete), the row menu, the toasts, the loading and error states, the drag lift on the pipeline, and the empty states in dark mode. Fix what doesn't follow.
3. Check the Won and Lost tags, the funnel and the pipeline blocks against the spec's stage table.

Ends with: nothing stays light in dark mode (R40).

### Phase 4: Proof and finish

1. Write `theme.spec.ts` and the screenshot step.
2. Run `npm run check` and fix failures until it passes.
3. Take the four screenshots into `docs/changes/dark-mode/`.
4. Update `docs/spec.md` for the extra tokens and `docs/STATUS.md`.
5. Go through the intent's success criteria by eye, in both modes.

## Risks

- **Light mode changes by accident.** Moving `ink` and the hard-coded colors touches most files. Mitigation: the baseline screenshots in Phase 0, which must match exactly, and each new token starts with the old value.
- **Charts may not follow.** The chart colors are hex strings today. Recharts may not resolve `var(--x)` in every attribute it sets. Mitigation: try variables first and check the result in the browser. If some attributes don't resolve, read the computed values once and pass them in, with a small hook that updates on toggle.
- **Native controls stay light.** Selects, date inputs, scrollbars and autofill ignore our tokens. Mitigation: `color-scheme` set per mode, checked by eye.
- **A flash of light mode on reload.** Mitigation: the inline script runs before the page paints, and the end-to-end test checks the attribute at the first possible moment.
- **Local storage is unavailable** (a private window, blocked storage). Mitigation: every access is wrapped, the page falls back to light, and a test covers it. A console error would also fail the end-to-end tests.
- **Dark contrast fails.** The dark values are chosen by calculation. Mitigation: the contrast test covers every pairing, so a failing value is found before it ships.
- **Dark panels look flat.** Black on deep teal is only 1.29:1. Mitigation: the faint ring in the spec, and a by-eye pass on the dashboard and the pipeline.
- **Stage colors blur together.** Won and Lost are swapped in dark mode. Mitigation: check the tags, the funnel and the pipeline dots by eye, and keep the stage name on every tag.
- **Coverage drops.** New code needs tests to keep coverage at 80% or more, which the toggle and theme logic have.
- **Screenshots are large.** Four PNG files in the repo. Acceptable, and the intent asks for them.

## Proof

### Frontend unit tests (Vitest)

- **`theme.test.ts`**: with nothing stored, the theme is light. A stored `"dark"` gives dark. Any other stored value gives light. A local storage that throws gives light and doesn't crash. Applying sets and removes the attribute. Storing writes the choice.
- **`ThemeToggle.test.tsx`**: in light mode it shows "Dark mode", and clicking it sets the attribute, stores the choice and changes the label to "Light mode". Clicking again goes back. It can be reached and used with the keyboard.
- **`contrast.test.ts`**: every pairing passes 4.5:1 in light mode, as today, and in dark mode, including the lane. Light values match the values before this change.
- **`tokens.test.ts`**: no `.tsx` file outside the tests contains a hex color, so colors stay in `tokens.css`. Every token the dark block sets also exists in the light block.
- **Existing tests**: all pass unchanged. Coverage stays at 80% or more.

### End-to-end tests (Playwright with Chrome)

- **`theme.spec.ts`: the toggle works and is remembered.** A fresh visit is light. Clicking the toggle makes the page dark, and after a reload it is still dark, including after moving to another page. Switching back to light is remembered the same way.
- **No flash.** With dark stored, the attribute is already set when the document first loads.
- **Every screen has the toggle and follows the mode.** On each of the eight screens, in both modes, the toggle is there and the page background and panel colors are the spec's values (`#04232E` and `#000000` in dark). The chart text and gridlines on the dashboard take the dark values.
- **Storage blocked.** With local storage unavailable, the app opens in light mode with no console error.
- **Dialogs and messages.** An add dialog and a toast in dark mode use the dark colors.
- **Screenshots.** The dashboard and the pipeline in both modes are saved to `docs/changes/dark-mode/`.
- Every test already fails on a console error or on a request that leaves the computer.
- **Existing end-to-end tests**: all 32 pass unchanged.

### By eye

Someone opens the app, in both modes, and goes through the intent's success criteria: the dashboard, all five sections, a dialog, the row menu, a delete confirmation, a toast, a drag on the pipeline and a reload in dark mode. They check the contrast, the flat-panel risk and the stage colors.

### Criteria in the intent

1. `npm run check` passes: Phase 4.
2. A new end-to-end test proves the toggle works and is remembered after a reload: `theme.spec.ts`.
3. Screenshots of the dashboard and the pipeline in both modes are saved in `docs/changes/dark-mode/`: Phase 4.
