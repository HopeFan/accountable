# Status

## Where we are

The MVP is built, phases 0 to 8 of `docs/changes/mvp/plan.md`. The multi-user change (`docs/changes/multi-user/`) is in progress on the `multi-user` branch: all three phases are built: sign-in, author tracking, the Supabase database and the deployment files (Phase 1), the top-bar search (Phase 2) and the user menu (Phase 3). The whole change still needs its by-hand check against a real Supabase project, and the deploy (see Still to do).

## Done

- **Backend** (`backend/`): FastAPI and SQLAlchemy Core over SQLite. Organizations, contacts, deals, activities, follow-ups, the pipeline move endpoint, delete previews and the dashboard figures. Business rules are in `app/rules.py`, today's date in `app/clock.py`.
- **Sample data**: 12 organizations, 35 contacts, 40 deals and about 85 activities, dated relative to today. Created when the database file doesn't exist.
- **Frontend** (`frontend/`): React, Vite and Tailwind in the brand look, with self-hosted fonts. All five sections, record pages, timelines, follow-ups, the drag and drop pipeline (mouse and keyboard) and the dashboard with a line chart, a bar chart, the pipeline strip and the funnel.
- **Tests**: 67 backend (pytest, 97% coverage), 152 frontend (Vitest, 85% branch coverage), 32 end-to-end (Playwright with Chrome).
- **Checks**: `npm run check` runs Prettier, ESLint (TypeScript, React Hooks, accessibility, complexity 15), ruff (including complexity 15), tsc, ty, gitleaks and all tests with at least 80% unit coverage. `npm run check:quick` skips the end-to-end tests and `npm run format` fixes formatting. The existing code was brought up to these rules without weakening any of them.
- **Hooks**: a lefthook pre-commit hook (`lefthook.yml`) first fails the commit if it changes anything outside `docs/` without also updating `docs/STATUS.md`, then formats the staged files and runs lint, types and gitleaks, without the tests. It refuses to run if gitleaks isn't installed and says how to install it. Two Claude Code hooks in `.claude/settings.json` run scripts from `scripts/`: `agent-check-on-stop.mjs` runs `npm run check:quick` when a turn ends and sends a failure back once, then lets the agent stop, and `agent-guard-env.mjs` blocks reading or editing the secrets file, including shell commands that name it. `npm install` sets up the git hook.
- **CI** (`.github/workflows/ci.yml`): one job, `check`, on every push to any branch. It installs a pinned gitleaks (checksum verified) and scans the repo first, then installs Node 26 and the latest uv, and runs `npm run check:quick`, which leaves out the end-to-end tests. Those run locally with `npm run check`, so CI needs no Chrome and uploads no Playwright report. It uses no secrets.
- **Standards**: `docs/STANDARDS.md` says how code is written. `AGENTS.md` points to it and `docs/REVIEW.md` has a Standards pass that checks changes against it.
- **Improve step** (`docs/IMPROVE.md`): at Deploy, after the review fixes and before the merge, look at what went wrong, add corrections for repeated mistakes, remove what is out of date and improve the file itself. `AGENTS.md` points to it.
- **Pipeline fix**: if loading deals fails, the Pipeline page now shows the error with a retry button instead of a skeleton forever. Its drag logic moved into pure functions in `boardMath.ts` so it can be unit tested.
- **Subagents** (`.claude/agents/`): `reviewer` (Haiku, read-only) reviews a branch against `docs/REVIEW.md` and reports by severity. `ui-check` (Haiku, Playwright MCP) screenshots every page in light and dark mode, checks them against `docs/BRAND.md` and `docs/spec.md`, and saves the screenshots in `.playwright-mcp/`. Neither changes any code. A first run of both found nothing broken or Important.

- **Dark mode** (`docs/changes/dark-mode/`): a theme toggle (since replaced by the user menu, see Multi-user, Phase 3), remembered in local storage and applied before the first paint. All colors are tokens in `tokens.css` (a guard test fails on any hex color in a component), with a dark block under `:root[data-theme="dark"]`. The contrast test checks every pairing in both modes. New tests: `theme.test.ts`, `ThemeToggle.test.tsx`, `tokens.test.ts` and `e2e/theme.spec.ts`. Screenshots of the dashboard and pipeline in both modes are in `docs/changes/dark-mode/`. The Lost dot uses its own token (`--lost-dot`) so it stays visible on black. Still to do: a person's by-eye pass in both modes.
- **Split spec**: `docs/spec.md` is now a summary with an index, and the detail is in one file per product area in `docs/specs/` (platform, tables, organizations, contacts, deals, activities, pipeline, dashboard, appearance). The content is unchanged, only moved. `AGENTS.md` says to read the summary first, then only the area files a change touches, and to keep the files a change affects up to date. `docs/REVIEW.md` and the `reviewer` and `ui-check` subagents read the area files too.

- **Multi-user, Phase 1** (`docs/changes/multi-user/`): every `/api` route needs a signed-in person. The browser signs in with Supabase (email and password, no sign-up) and sends its token. The backend verifies it against the project's public signing keys in `backend/app/auth.py`, and `/healthz` and `/config.json` are the only public addresses. Organizations, contacts, deals and activities record `created_by` and `updated_by`, and the screens show "Added by" and "Last changed by" ("Sample data" when there is no author). The data is in Postgres on Supabase (`DATABASE_URL`) with Alembic migrations that run at start, and in SQLite for the tests and when no `DATABASE_URL` is set. A `Dockerfile` and `render.yaml` deploy it to Render as one web service. The end-to-end tests use a test sign-in that never contacts Supabase. The top bar had the old theme button and a temporary Sign out button until Phase 3.
- **Multi-user, Phase 2** (`docs/changes/multi-user/`): a search box in the top bar, left of the user menu. `GET /search?q=` (`backend/app/routes/search.py`) returns up to 5 organizations, contacts and deals matching the text anywhere in the name, ignoring case, the same on SQLite and Postgres. The box (`SearchBox.tsx`, `lib/search.ts`) waits 250 ms after typing, shows the results in three groups with a context line each (industry, organization, "Organization · Stage"), and the arrow keys wrap across groups. Tests: `test_search.py`, `SearchBox.test.tsx` and `e2e/search.spec.ts`. Spec: `docs/specs/search.md`.
- **Multi-user, Phase 3** (`docs/changes/multi-user/`): the user menu (`UserMenu.tsx`, a Radix dropdown in `TopBar.tsx`) replaces the theme button and the temporary Sign out. A button with the person's initials opens a menu with their email, **Light**, **Dark** and **System** (System follows the device and is the default, and changes with it while the app is open) and **Sign out**. The sign-in screen follows the saved theme too. `ThemeToggle` is deleted. Tests: `UserMenu.test.tsx`, `theme.test.ts` and `e2e/menu.spec.ts`, with `e2e/theme.spec.ts` and `e2e/look.spec.ts` choosing the theme in the menu. `.claude/agents/ui-check.md` now starts the app with the test sign-in on a temporary database, signs in as the test person and changes the theme through the menu.

- **Multi-user, review fixes**: the branch review (`reviewer` subagent) found one Important and four nits, all fixed except one. The test sign-in client is now lazy-imported, so its test password stays out of the production bundle. The search query is capped at 100 characters. A project ref that had been committed in the course instructions is removed (it is still in git history), and out-of-scope changes (the dark-mode screenshots, an unfinished block in `week1day5.md`) are reverted. Left as is: the `onKeyDown` on search options looks unused, but the `jsx-a11y/click-events-have-key-events` rule requires it. The plan's Proof line "two people editing the same record" has no test of exactly that name; `test_edit_changes_updated_by_and_not_created_by` covers most of it.

## How to run

You need Node 24 or later and uv. The first run needs internet to fetch packages, and the app needs internet to reach Supabase.

Set up Supabase once:

1. Create a Supabase project. Under Project Settings, JWT Keys, make sure it uses **JWT signing keys** (the asymmetric ones), not the legacy shared secret. The token check depends on it.
2. Add each person under Authentication, Users, with an email and a password. There is no sign-up page.
3. Copy `.env.example` to `.env` and fill in its three settings: `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. `DATABASE_URL` must be the **pooler** address in **transaction mode** (Connect, Transaction pooler), not the direct address, with the password URL-encoded. Use the publishable key, never the secret or service_role key.

Then:

```
npm install
npm run dev      # API on :8000, app on http://localhost:5173
```

- `npm start` builds the frontend and serves everything from http://localhost:8000, signed in against Supabase. `npm run dev`, `npm start` and `npm run seed` read `.env`; the tests never do. The app refuses to start in real sign-in mode unless `DATABASE_URL` is set ("Set DATABASE_URL. Without it the app would keep the team's data in a local file."), so `npm start` needs it in `.env`, and so does Render.
- `/docs`, `/redoc` and `/openapi.json` are switched off; `/healthz` and `/config.json` are the only public addresses.
- To deploy on Render, create a Web Service from this repo (it finds `render.yaml` and the `Dockerfile`) and enter the same three settings when Render asks. The health check is `/healthz`. Migrations run when it starts, and the sample data is added the first time.
- `npm run check` runs every check and test; run it before finishing any work. `npm test` runs only the tests. The end-to-end tests start their own server on port 8100 with their own database (`data/e2e.db`) and a fixed date of 2026-11-17, so your data is untouched. It needs Google Chrome installed.
- `npm run seed` resets the data to the sample data. It deletes everything in the database `DATABASE_URL` points to, so it asks for "yes" on any database that isn't SQLite (tested).

## Known limits

- The app needs an internet connection, because the data and sign-in are on Supabase. The tests don't.
- Render's free plan sleeps after a while idle, so the first page after that can take a while (the service restarts, runs migrations and waits for Supabase).
- Migrations and first seeding run in one transaction. On Postgres a crash mid-seed rolls back and the next start retries (not tested without a real Postgres). On SQLite schema changes commit on their own, so a crash there can leave empty tables that never get sample data.
- Two instances starting at the same time on an empty database could add the sample data twice. A single free Render service can't do this.
- The `dev`, `start` and `seed` scripts use `$(test -f .env && ...)`, which needs a POSIX shell (Mac, Linux, Git Bash or WSL), not plain Command Prompt or PowerShell.
- The old local data in `data/accountable.db` isn't moved to Supabase, which starts with the sample data.
- Only tested on a Mac. Linux and Windows are untested.
- CI doesn't run the end-to-end tests. Run `npm run check` locally before merging, because a broken end-to-end test won't fail CI.
- No pagination: tables load every record and search and sort run in the browser.
- Laptop screens from 1280px wide.
- Sample dates are relative to the day the database was created, so an old database shows stale late and overdue items. `npm run seed` refreshes it.
- The pipeline shows the first five cards of Won and Lost, with a count of the earlier ones.
- Selects are native `<select>` elements, not Radix selects.
- If a contact is moved to another organization, their deals at the old organization lose their main contact.

## Still to do

- Multi-user, by hand with the person, because it needs the real settings: run `npm start` with the settings file against the real Supabase project, sign in as a real user, add a record and check that "Added by" shows their email, search, change the theme in the menu and sign out. Also check that `npm run check` passes with the three settings exported in the shell. Only this finds problems specific to Postgres or the pooler. If Docker is installed, repeat it with `docker build` and `docker run` using the settings file.
- Multi-user, Deploy per `AGENTS.md`: review fixes, `docs/IMPROVE.md`, merge, then the first deploy to Render with the three settings entered there, and the same by-hand check on the onrender.com address.
- TypeScript is pinned to 6.0.3 because typescript-eslint doesn't support 7 yet (it needs below 6.1). Move back to 7 once it does.
- ESLint shows one warning, `react-hooks/incompatible-library` for TanStack Table's `useReactTable` in `DataTable.tsx`. It comes from the library and doesn't fail the check. Revisit if the library or plugin changes.
- The pipeline's keyboard move is tested only end to end, because jsdom can't measure the layout it needs.
- Minor layout issues from `ui-check`, in both modes: money and phone values wrap onto several lines (Organizations "Open deal value", Contacts Phone, Deals Value and late close dates, the dashboard pipeline strip, the deal record follow-up pill and "Mark done"). On the Pipeline page "Expected" runs into the amount with no space, and the Negotiation header may be missing its stage dot.

- Found while checking, not caused by the multi-user change and not fixed:
  - `frontend/src/theme/tokens.css` has an unlayered `button, input, select, textarea { font: inherit; color: inherit }` that overrides Tailwind text colours. In dark mode Sea Green buttons (the shared primary Button, dialog submit buttons) get light text at about 1.3:1 instead of Midnight. The sign-in button is patched with `text-on-accent!`. The proper fix is to wrap that rule in `@layer base` and recheck every button in both modes.
  - Layout issues seen by `ui-check`: pipeline column footers read "ExpectedUSD 11,550" with no space, and money, dates and phone numbers wrap in the Organizations, Contacts and Deals tables.

- The by-eye pass in a real browser (success criterion 8) by a person, with the console open. Screenshots of every screen are written to `test-results/screens/` by the end-to-end run.
