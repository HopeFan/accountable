# Plan: the Accountable MVP

Built from `docs/intent.md` and `docs/spec.md`. No code is written yet. The chosen design is mockup A in `docs/mockups/`, including its Pipeline page.

Each phase ends with something that runs, with its tests passing, a commit and an update to `docs/STATUS.md`. Requirement numbers (R1, R9a and so on) refer to `docs/spec.md`.

## Files that change

Everything is new except `.gitignore` and `docs/STATUS.md`. `README.md` is the course's guide and stays as it is.

### Repo root

| File | What it is |
| --- | --- |
| `package.json` | Workspace with `frontend/` and the scripts `dev`, `test` and `seed`. |
| `pyproject.toml`, `uv.lock` | The Python project: FastAPI, SQLAlchemy, Pydantic, pytest. |
| `.gitignore` | Adds `data/`, `node_modules/`, Python caches, Playwright reports. |
| `docs/STATUS.md` | Updated at the end of every phase, including how to run the app. |

### `backend/`

| File | What it is |
| --- | --- |
| `app/main.py` | FastAPI app, routers, error format, serving the built frontend for the single-command run. |
| `app/db.py` | SQLAlchemy Core engine and table definitions. The database path comes from an environment variable. |
| `app/clock.py` | The one place that says what today is. It can be fixed by an environment variable for tests. |
| `app/rules.py` | Stage probabilities, close-date rule, expected revenue, late and overdue, funnel values. No database access, so it's easy to test. |
| `app/schemas.py` | Pydantic models for requests and responses. |
| `app/routes/organizations.py`, `contacts.py`, `deals.py`, `activities.py`, `follow_ups.py`, `dashboard.py` | The API in section 5 of the spec, including the delete previews and the move endpoint. |
| `app/seed.py` | The fixed sample data, dated relative to today, and the reset logic. |
| `app/__main__.py` or `seed_cli.py` | Entry point used by `npm run seed`. |
| `tests/` | pytest files, listed under Proof. |

### `frontend/`

| File | What it is |
| --- | --- |
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Vite and React setup. The dev server proxies `/api` to the backend. |
| `src/theme/tokens.css`, `fonts.css` | Brand tokens as CSS variables and the self-hosted fonts. |
| `src/lib/api.ts`, `queries.ts` | Typed API client and TanStack Query hooks. |
| `src/lib/format.ts` | Money (`USD 48,000`), dates, compact axis values. |
| `src/components/` | `Shell` (sidebar), `DataTable`, `RecordDialog`, `ConfirmDelete`, `StageTag`, `StatusTag`, `Timeline`, `ActivityForm`, `FollowUpList`, `Toast`, `EmptyState`, `Skeleton`. |
| `src/pages/` | `Dashboard`, `Organizations`, `OrganizationPage`, `Contacts`, `ContactPage`, `Deals`, `DealPage`, `Pipeline`. |
| `src/pages/dashboard/` | `FigureTiles`, `PipelineStrip`, `RevenueChart`, `DealsWonChart`, `Funnel`, `RecentActivity`. |
| `src/pages/pipeline/` | `Board`, `Column`, `DealCard`, `boardMath.ts` for the moves and totals. |
| `src/**/*.test.ts(x)` | Vitest files next to the code they test. |

### `e2e/`

| File | What it is |
| --- | --- |
| `playwright.config.ts` | Uses the installed Google Chrome, starts the app on a test database and a fixed date, one worker. |
| `fixtures.ts` | Resets the database before each test and fails any test that sees a console error. |
| `*.spec.ts` | One file per area, listed under Proof. |

## Order of work

Nine phases, numbered 0 to 8. Each is small enough to finish and check on its own. Don't start a phase until the one before it passes.

### Phase 0: Foundation

Done when `npm run dev` shows the sidebar shell with five empty pages in the brand look, and `npm test` runs one backend, one frontend and one end-to-end test.

1. Root `package.json` with the workspace and the three scripts. `pyproject.toml` with uv.
2. FastAPI app with a health endpoint. Vite app with React Router and the five routes.
3. Brand tokens, self-hosted fonts, the sidebar shell from mockup A.
4. Playwright set up with Chrome, the fixed date and the test database. A smoke test opens the app and checks the sidebar.
5. Confirm the commands work from a clean checkout.

### Phase 1: Data layer and rules

Done when the database is created and seeded on first start, `npm run seed` resets it, and the rules are tested.

1. Table definitions for organizations, contacts, deals and activities.
2. `clock.py` and `rules.py`: probabilities by stage, expected revenue, close date on Won or Lost, late and overdue, funnel values.
3. `seed.py`: about 12 organizations, 35 contacts, 40 deals and 80 activities as described in section 7 of the spec, with the matching stage-change entries.
4. The `npm run seed` command and "create and seed when the file doesn't exist" on start.

### Phase 2: Organizations, and the shared pieces

Done when organizations can be listed, searched, sorted, added, edited and deleted, and each has a page. This phase builds the table and dialog components the next two phases reuse, so it takes the longest of the three.

1. Organizations API with the delete preview.
2. `DataTable` with search, sort, row menu and empty state (R1, R2, R4, R7).
3. `RecordDialog` and form validation (R3). `ConfirmDelete` with the preview text (R5).
4. Organizations table (R16) and page with its contacts and deals lists (R17), which show empty until Phases 3 and 4.

### Phase 3: Contacts

Done when contacts work like organizations, with the status filter.

1. Contacts API with the optional organization and the delete preview.
2. Contacts table with the status filter (R18, R19) and the contact page without its timeline (R20).
3. The organization page now lists its contacts, and "Add contact" there preselects the organization.

### Phase 4: Deals

Done when deals work end to end with the stage rules and late marking.

1. Deals API: create, edit, delete, validation that the contact works at the deal's organization, stage change through edit.
2. Deals table (R22), late marking (R23), deal page with the stage selector (R24) and no timeline yet.
3. Organization and contact pages now list their deals.

### Phase 5: Activities, timelines and follow-ups

Done when everything in section 5 of the intent works except the dashboard.

1. Activities API with the follow-up fields, and the follow-ups list endpoint.
2. Stage-change entries written whenever a deal's stage changes (R29), through any route.
3. `Timeline` and `ActivityForm` on contact and deal pages (R20, R21, R24 to R28), including mark done and reopen.
4. Contact timeline includes activities on their deals.

### Phase 6: Pipeline

Done when a card can be dragged anywhere and everything stays put after a refresh.

1. Move endpoint: stage, position, renumbering, probability, close date and stage-change entry in one transaction.
2. Board, columns and cards from the mockup, with totals from `boardMath.ts` (R30, R31).
3. Drag and drop with dnd-kit, optimistic update and rollback if the server refuses (R32, R33). Keyboard dragging (R35).
4. Add deal in a column (R34). Late cards stand out.

### Phase 7: Dashboard

Done when the dashboard matches mockup A and its figures match the data.

1. Dashboard endpoint returning all figures together.
2. Figure tiles and the open pipeline by stage strip (R9, R9a).
3. Revenue line chart and deals-won bar chart with tooltips (R10, R11). The funnel as bars (R12).
4. Follow-ups with tick to mark done, and recent activity (R13, R14).
5. Every change elsewhere refreshes the dashboard (R15).

### Phase 8: Polish and verification

Done when someone has used the whole app in a real browser and nothing is left on the list.

1. Empty, loading and error states on every screen. Toasts for saves and deletes.
2. The end-to-end run through every criterion, then the by-eye pass on every screen against the spec and the brand (criterion 8).
3. Check contrast, focus rings and keyboard use.
4. `docs/STATUS.md` with how to run, test and reset the app, and the list of known limits (no pagination, light mode only).

## Risks

| Risk | Why it matters | What to do |
| --- | --- | --- |
| **Drag and drop is hard to test and easy to break.** dnd-kit uses pointer events, and Playwright's default drag doesn't trigger them. | Criterion 4 depends on it, including drops in the middle of a column. | Test with explicit mouse down, stepped moves and mouse up. Keep the move maths in `boardMath.ts` with unit tests, so most of the logic doesn't need a browser. Build the endpoint and its tests before the UI. |
| **Position renumbering bugs.** Dropping in the middle shifts other cards in two columns. | Cards can end up duplicated, lost or reordered after a refresh. | Do it in one transaction on the server. Test dropping first, last, middle, same column and empty column. Check positions are 0 to n-1 after every move. |
| **Optimistic updates disagree with the server.** The board changes before the server answers. | Totals could flash wrong or stay wrong after a refused move. | Compute totals from the same data in both places. Roll back on error. Refetch after every move. |
| **"Today" differs between the server, the browser and the tests.** | Late, overdue and the monthly charts would change with the date. | One clock on the server, fixed in tests. The API sends `today` and flags like `is_late`, so the browser doesn't guess. |
| **Sample dates drift.** Seed dates are relative to the day they were created. | An old database shows stale overdue and late items. | Documented in `STATUS.md`. `npm run seed` refreshes it. Test that seeding twice gives the same data. |
| **Commands must work on Mac, Linux and Windows.** | It's a constraint in the intent. | Only npm scripts, with no shell-specific syntax. Use `uv run` for Python and a cross-platform runner to start both servers. Only the Mac is tested here, so Windows and Linux are untested and `STATUS.md` says so. |
| **The app must work offline.** | A constraint in the intent. | Self-hosted fonts, no CDN, no external images. An end-to-end test fails on any request to another host. |
| **Parallel tests share one database.** | Flaky or order-dependent tests. | Run end-to-end tests on one worker. Reset the database before each test. |
| **Mockup to React drift.** Mockup A is plain HTML with hand-drawn charts. | The real screens may look different. | Take the tokens and layout from the mockup, then compare the screenshots side by side in Phase 8. Use Recharts for the line and bar charts. The funnel and pipeline strip are plain elements, as in the mockup. |
| **Contrast of brand colors.** Sea Green and Marigold are too light for text. | Unreadable or inaccessible small text. | Use the darkened text colors defined in the spec, and check each pairing. |
| **Deleting cascades remove a lot.** | A mistake loses sales history. | The delete preview comes from the same code that does the delete. Test that the counts shown equal the rows removed. |
| **Scope creep.** | The "Not in the MVP" list is long and tempting. | Any new idea goes in the spec's concerns or a later intent, not into the build. |
| **The spec's open defaults.** No pagination, close date on Won or Lost, contact deletion rule. | They are decisions the user hasn't all confirmed. | Raise them before the phase that depends on them (Phases 4 and 5). |

## Proof

`npm test` runs everything below and fails if any test fails. Tests use their own database and a fixed date of 2026-11-17, so they never touch your data.

### Backend unit tests (pytest)

| File | What it proves |
| --- | --- |
| `test_rules.py` | Usual probability for each stage. Expected revenue for open, Won and Lost deals. Late is true only for open deals with a close date before today. Overdue and upcoming follow-ups. Funnel counts each non-lost deal at its stage and earlier ones. |
| `test_deals.py` | Creating a deal takes the stage's probability unless one is given. Changing the stage resets the probability. A hand-set probability stays until the stage changes. Moving to Won or Lost sets the close date to today. A contact from another organization is refused. |
| `test_move.py` | Moving to another column, within a column, to the first, middle and last place, and into an empty column. Positions stay 0 to n-1 in both columns. Probability and close date follow the rules. Exactly one stage-change entry is written. A move to the same place changes nothing. |
| `test_organizations.py`, `test_contacts.py` | Create, read, update and delete. Required fields. Unique organization names. A contact with no organization. Contact status values. |
| `test_delete.py` | Deleting an organization removes its contacts, deals and their activities. Deleting a contact removes their own activities and keeps their deals, with no main contact. Deleting a deal removes its activities. For each, the counts in the preview equal the rows removed. |
| `test_activities.py` | Create, edit and delete. At least one of contact or deal is required. Follow-up done and reopen. Stage-change entries can't be edited. |
| `test_timelines.py` | A deal's timeline and a contact's timeline (including their deals' activities) are newest first. |
| `test_follow_ups.py` | Open follow-ups only, overdue first, then upcoming by date. A done follow-up disappears. |
| `test_dashboard.py` | On a small known data set, every figure: open pipeline, expected revenue, won this month, overdue count, the 12 monthly values for revenue and deals won, funnel values, the Lost figure and the 10 recent items. A deal marked Won changes the figures. |
| `test_seed.py` | The seed creates the counts promised in the spec, every stage and every status is present, there are late deals and both overdue and upcoming follow-ups, and every non-New deal has matching stage-change entries. Seeding twice gives the same data. Reset replaces changes. |

### Frontend unit tests (Vitest)

| File | What it proves |
| --- | --- |
| `format.test.ts` | Money always shows `USD`, thousands separators, compact axis values, dates. |
| `DataTable.test.tsx` | Search filters across columns. Sort cycles ascending, descending, none. Numbers and dates sort by value. Empty and no-result messages. |
| `forms.test.ts` | Required fields and email format. Value can't be negative. Probability stays within 0 to 100. |
| `boardMath.test.ts` | Totals and expected revenue for each column and for the open deals after a move. Won and Lost don't count toward open totals. A card dropped in the middle takes that place. Late flag after moving to Won or Lost. |
| `Timeline.test.tsx` | Items are newest first. Follow-up states show as open, done and overdue. Stage-change items have no edit action. |
| `ConfirmDelete.test.tsx` | The message names the record and lists the linked records from the preview. Nothing is deleted until confirmed. |
| `Dashboard.test.tsx` | Tiles, chart data and funnel rows come from the API response without extra maths. |

### End-to-end tests (Playwright with Chrome)

Every test starts from freshly seeded data and fails on any console error or any request leaving the computer.

| File | Criterion | What it does |
| --- | --- | --- |
| `start.spec.ts` | 1 | Opens the app, lands on the dashboard, and checks every section shows sample data. |
| `organizations.spec.ts`, `contacts.spec.ts`, `deals.spec.ts` | 2, 3 | For each: add a record, find it by search, sort by a column, edit it, delete it after the confirmation, and check each change survives a refresh. Contacts: the status filter. Each record's page shows its linked records. Deleting an organization shows the counts and removes the linked records. |
| `persistence.spec.ts` | 2 | Makes changes, restarts the backend, and checks they are still there. Then runs the reset command and checks the sample data is back. |
| `pipeline.spec.ts` | 4 | Drags a card to another column and checks its stage, probability, the deals list and the totals, with no refresh. Drags a card to the top, middle and bottom of a column, refreshes, and checks it stayed. Adds a deal in a column and checks its stage. Checks late deals stand out on the cards and in the deals table. |
| `activities.spec.ts` | 5 | Logs a note, a call and an email with a follow-up on a deal and on a contact. Checks the timeline order. Edits and deletes an entry. Moves a deal and checks the "Moved from X to Y" entry in its timeline and in recent activity. |
| `dashboard.spec.ts` | 5, 6 | Checks the figures against the seed. Marks a follow-up done and checks the list and the overdue count. Moves a deal to Won and checks the tiles, charts and funnel change. Adds a follow-up and checks it appears. |
| `look.spec.ts` | 7 | Takes a screenshot of every screen and checks the fonts load, the page has no horizontal scroll at 1280px, and the dashboard shows a line chart, a bar chart and the pipeline strip. Screenshots go to a folder for the by-eye review. |
| `offline.spec.ts` | Constraints | Runs the main flows with all external network requests blocked. |

### By eye (criterion 8)

Before the work is called done, one person uses the app in Chrome as a salesperson would:

- Every section and every action in the intent, from the dashboard to the pipeline.
- Each screen compared with its mockup and the brand: fonts, colors, spacing, tone, money shown with its currency.
- The browser console open the whole time, with no errors.
- Dragging with a real mouse, and with the keyboard.

Passing tests is necessary, but it isn't enough.
