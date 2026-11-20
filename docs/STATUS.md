# Status

## Where we are

The MVP is built, phases 0 to 8 of `docs/changes/mvp/plan.md`. All tests and `npm run check` pass.

## Done

- **Backend** (`backend/`): FastAPI and SQLAlchemy Core over SQLite. Organizations, contacts, deals, activities, follow-ups, the pipeline move endpoint, delete previews and the dashboard figures. Business rules are in `app/rules.py`, today's date in `app/clock.py`.
- **Sample data**: 12 organizations, 35 contacts, 40 deals and about 85 activities, dated relative to today. Created when the database file doesn't exist.
- **Frontend** (`frontend/`): React, Vite and Tailwind in the brand look, with self-hosted fonts. All five sections, record pages, timelines, follow-ups, the drag and drop pipeline (mouse and keyboard) and the dashboard with a line chart, a bar chart, the pipeline strip and the funnel.
- **Tests**: 67 backend (pytest, 97% coverage), 152 frontend (Vitest, 85% branch coverage), 32 end-to-end (Playwright with Chrome).
- **Checks**: `npm run check` runs Prettier, ESLint (TypeScript, React Hooks, accessibility, complexity 15), ruff (including complexity 15), tsc, ty, gitleaks and all tests with at least 80% unit coverage. `npm run check:quick` skips the end-to-end tests and `npm run format` fixes formatting. The existing code was brought up to these rules without weakening any of them.
- **Hooks**: a lefthook pre-commit hook (`lefthook.yml`) first fails the commit if it changes anything outside `docs/` without also updating `docs/STATUS.md`, then formats the staged files and runs lint, types and gitleaks, without the tests. It refuses to run if gitleaks isn't installed and says how to install it. Two Claude Code hooks in `.claude/settings.json` run scripts from `scripts/`: `agent-check-on-stop.mjs` runs `npm run check:quick` when a turn ends and sends a failure back once, then lets the agent stop, and `agent-guard-env.mjs` blocks reading or editing the secrets file, including shell commands that name it. `npm install` sets up the git hook.
- **CI** (`.github/workflows/ci.yml`): one job, `check`, on every push to any branch. It installs a pinned gitleaks (checksum verified) and scans the repo first, then installs Node 26 and the latest uv, and runs `npm run check` with the runner's Google Chrome. If it fails, the Playwright report is uploaded. It uses no secrets. It passes on GitHub; its first run failed on one end-to-end test, a timing race in the pipeline test helper that read the cards before they loaded, which is fixed.
- **Standards**: `docs/STANDARDS.md` says how code is written. `AGENTS.md` points to it and `docs/REVIEW.md` has a Standards pass that checks changes against it.
- **Improve step** (`docs/IMPROVE.md`): at Deploy, after the review fixes and before the merge, look at what went wrong, add corrections for repeated mistakes, remove what is out of date and improve the file itself. `AGENTS.md` points to it.
- **Pipeline fix**: if loading deals fails, the Pipeline page now shows the error with a retry button instead of a skeleton forever. Its drag logic moved into pure functions in `boardMath.ts` so it can be unit tested.

- **Dark mode** (`docs/changes/dark-mode/`): a toggle at the bottom of the sidebar, remembered in local storage and applied before the first paint. All colors are tokens in `tokens.css` (a guard test fails on any hex color in a component), with a dark block under `:root[data-theme="dark"]`. The contrast test checks every pairing in both modes. New tests: `theme.test.ts`, `ThemeToggle.test.tsx`, `tokens.test.ts` and `e2e/theme.spec.ts`. Screenshots of the dashboard and pipeline in both modes are in `docs/changes/dark-mode/`. The Lost dot uses its own token (`--lost-dot`) so it stays visible on black. Still to do: a person's by-eye pass in both modes.

## How to run

You need Node 24 or later and uv. The first run needs internet to fetch packages; after that the app works offline.

```
npm install
npm run dev      # API on :8000, app on http://localhost:5173
```

- `npm start` builds the frontend and serves everything from http://localhost:8000.
- `npm run check` runs every check and test; run it before finishing any work. `npm test` runs only the tests. The end-to-end tests start their own server on port 8100 with their own database (`data/e2e.db`) and a fixed date of 2026-11-17, so your data is untouched. It needs Google Chrome installed.
- `npm run seed` resets your data (`data/accountable.db`) to the sample data.

## Known limits

- Only tested on a Mac. Linux and Windows are untested.
- No pagination: tables load every record and search and sort run in the browser.
- Laptop screens from 1280px wide. The device's own dark mode setting isn't followed.
- Sample dates are relative to the day the database was created, so an old database shows stale late and overdue items. `npm run seed` refreshes it.
- The pipeline shows the first five cards of Won and Lost, with a count of the earlier ones.
- Selects are native `<select>` elements, not Radix selects.
- If a contact is moved to another organization, their deals at the old organization lose their main contact.

## Still to do

- TypeScript is pinned to 6.0.3 because typescript-eslint doesn't support 7 yet (it needs below 6.1). Move back to 7 once it does.
- ESLint shows one warning, `react-hooks/incompatible-library` for TanStack Table's `useReactTable` in `DataTable.tsx`. It comes from the library and doesn't fail the check. Revisit if the library or plugin changes.
- The pipeline's keyboard move is tested only end to end, because jsdom can't measure the layout it needs.

- The by-eye pass in a real browser (success criterion 8) by a person, with the console open. Screenshots of every screen are written to `test-results/screens/` by the end-to-end run.
