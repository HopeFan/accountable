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
- **Pipeline fix**: if loading deals fails, the Pipeline page now shows the error with a retry button instead of a skeleton forever. Its drag logic moved into pure functions in `boardMath.ts` so it can be unit tested.

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
- Light mode only, laptop screens from 1280px wide.
- Sample dates are relative to the day the database was created, so an old database shows stale late and overdue items. `npm run seed` refreshes it.
- The pipeline shows the first five cards of Won and Lost, with a count of the earlier ones.
- Selects are native `<select>` elements, not Radix selects.
- If a contact is moved to another organization, their deals at the old organization lose their main contact.

## Still to do

- TypeScript is pinned to 6.0.3 because typescript-eslint doesn't support 7 yet (it needs below 6.1). Move back to 7 once it does.
- ESLint shows one warning, `react-hooks/incompatible-library` for TanStack Table's `useReactTable` in `DataTable.tsx`. It comes from the library and doesn't fail the check. Revisit if the library or plugin changes.
- CI (a GitHub Actions workflow) is the next step of the harness and isn't added yet.
- The pipeline's keyboard move is tested only end to end, because jsdom can't measure the layout it needs.

- The by-eye pass in a real browser (success criterion 8) by a person, with the console open. Screenshots of every screen are written to `test-results/screens/` by the end-to-end run.
