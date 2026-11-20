# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A dark mode with a toggle on every page, across every section. The toggle sits at the bottom of the sidebar.

## Constraints

- Light mode stays the default, and the app remembers the choice in the browser only (local storage, applied before the page paints so there is no flash). It is not saved in the database.
- Light mode looks exactly as it does today, apart from the toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- Text in dark mode meets the same contrast rules as spec.md.
- Charts, dialogs and messages follow the mode too.
- Stage colors get dark-mode variants that stay distinct from each other and keep their meaning: every tag still shows the stage's name, and Raspberry stays for overdue and late things only. Midnight and Sea Mist can't be reused as they are on a dark page.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.

## Success criteria

1. npm run check passes.
2. A new end-to-end test proves that the toggle works and is remembered after a reload.
3. Screenshots of the dashboard and the pipeline in both modes are saved in docs/changes/dark-mode/.
