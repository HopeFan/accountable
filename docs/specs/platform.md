# Platform: constraints, data rules, API basics, deployment, sample data, testing

Part of the Accountable spec. The index is in `docs/spec.md`. This file holds what applies to the whole product.

## Constraints and out of scope

- It runs on the web as one shared app for a small team (see Deployment), and locally with one documented command that works on Mac, Linux and Windows (only the Mac is tested). It needs an internet connection, because the data and sign-in are on Supabase. The tests run without one. Fonts are installed from npm (`@fontsource/*`) and served by the app, never loaded from another host.
- Every change is kept: it survives a browser refresh and a restart.
- One documented command resets the data to the sample data.
- Light and dark modes, with a System choice that follows the device and is the default, designed for laptops from 1280px wide. There is no pagination: tables load every record, and the table filters and sort run in the browser, which is fine for a small team's data but needs a rethink as it grows.
- Not part of the product: roles and permissions, sign-up, Google or magic-link sign-in, password reset, moving the old local data to Supabase, phone layouts, AI features, email/calendar/phone integrations, currencies other than US dollars, reports beyond the dashboard, tags and custom fields, editable stages, import and export.

## Libraries

Popular libraries over custom code, as the stack doc asks.

| Need                        | Choice                                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| Routing                     | React Router                                                                    |
| Server data and cache       | TanStack Query                                                                  |
| Tables (sort, search, rows) | TanStack Table                                                                  |
| Forms and validation        | React Hook Form with Zod                                                        |
| Drag and drop               | dnd-kit (supports keyboard dragging)                                            |
| Charts                      | Recharts (line, bar, funnel)                                                    |
| Styling                     | Tailwind CSS with Radix UI primitives for dialogs, menus and selects            |
| Icons                       | Lucide                                                                          |
| Fonts                       | `@fontsource` packages for Instrument Sans, Instrument Serif and JetBrains Mono |
| Backend                     | FastAPI, Pydantic models, SQLAlchemy Core (no raw SQL) over Postgres or SQLite  |
| Sign-in                     | Supabase Auth, email and password                                               |
| Hosting                     | Supabase (Postgres, Auth) and Render (one web service)                          |

## Data model

Postgres on Supabase, reached through `DATABASE_URL`. The tests use their own SQLite files, so column types stay portable and no test touches Supabase. Every table has an integer `id`, `created_at` and `updated_at`. Organizations, contacts, deals and activities also have `created_by` and `updated_by` (see `docs/specs/accounts.md`). The data in the old local SQLite file is not moved: Supabase starts with the sample data.

### Deletion

**Deletion.** Deleting an organization also deletes its contacts, deals and their activities. Deleting a contact deletes their own activities, and their deals stay with no main contact. Deleting a deal deletes its activities. Every delete confirmation says exactly what goes. A `stage_change` entry can be deleted by hand like any entry, but moving a deal never deletes them.

### Other rules

**Other rules.** A contact's organization is optional, because a new lead often has no company yet; a deal always has one. A deal's contact must work at the deal's organization, so the pipeline and the contact pages never disagree. Money reads `USD 48,000` everywhere, and compact on chart axes, such as `USD 50k`.

## API

JSON over `/api`, served by FastAPI on one port in development with the frontend proxied by Vite. Errors return a status code and `{ "detail": ... }`. Validation errors name the field so the form can show them.

### Endpoints shared by all areas

| Resource       | Endpoints                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Delete preview | `GET /organizations/{id}/delete-preview`, same for contacts and deals; returns counts of what would go |
| Session        | `GET /me` (see `docs/specs/accounts.md`)                                                               |
| Search         | `GET /search` (see `docs/specs/search.md`)                                                             |

### Rules worth stating

- Every route needs a signed-in person (R45). The person comes from the token, never from the request.
- Lists return everything (no pagination).
- List responses include the joined names the tables show, such as the organization's name on a deal.

## Reset and persistence

- R36. Every change is saved at once in the database, so it survives refresh and restart.
- R37. When the app starts, migrations bring the database up to date, and the sample data is added once, when the tables are first created. It is not added again, even if everything is later deleted. `npm run seed` deletes the data and recreates the sample data. Because that would wipe the team's data, it asks for "yes" first on any database that isn't SQLite. Migrations and the first seeding run in one transaction: on Postgres a crash part-way rolls everything back and the next start tries again. SQLite commits schema changes on its own, so there a crash can leave empty tables that never get sample data (a known limit).

## Deployment

The app runs on Render's free plan as one web service, built from the `Dockerfile` (Node builds the frontend, then a Python image with uv serves it). FastAPI serves the built frontend and the API from the same address, migrations run when it starts, and it answers at its onrender.com address. `render.yaml` describes the service and its health check. `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are entered in Render and never written in the file or committed. Locally the same three settings live in `.env` (git-ignored, with `.env.example` as the template), which `npm run dev`, `npm start` and `npm run seed` read and the tests never do. The built app can be run on a computer the way Render runs it, signed in against Supabase. A free service can be slow to answer after it has been idle.

`DATABASE_URL` must be Supabase's pooler address in transaction mode, because Render's free plan is IPv4 only and Supabase's direct address is IPv6. Its password must be URL-encoded.

When test sign-in is off (the real mode), the app also refuses to start unless `DATABASE_URL` (or `ACCOUNTABLE_DB`) is set, with the message "Set DATABASE_URL. Without it the app would keep the team's data in a local file." This stops a deployment such as Render from silently keeping the team's data in a local file that disappears with the container. Locally, `npm start` therefore needs `DATABASE_URL` in `.env`.

### Public addresses

Two addresses outside `/api` need no sign-in, and nothing else does. FastAPI's `/docs`, `/redoc` and `/openapi.json` are switched off, so the map of the API isn't public.

- `GET /healthz` returns only `{ "status": "ok" }`. Render uses it as the health check.
- `GET /config.json` returns only what the page may know: the Supabase URL and the publishable key (or `{ "testAuth": true }` in test sign-in). The page fetches it before it renders anything, so nothing about Supabase is built into the frontend and one build runs everywhere.

`/api/health`, which the app uses for today's date, stays behind sign-in.

### Test sign-in

Sign-in has a test mode, so the tests never contact Supabase. It is on only when `ACCOUNTABLE_TEST_AUTH=1`, `ACCOUNTABLE_DB` is set and `SUPABASE_URL` is empty, all three at once. That is never the case on Render, where `SUPABASE_URL` is set and `ACCOUNTABLE_DB` isn't. In this mode the sign-in screen checks a fixed test password in the browser and the backend accepts tokens of the form `test:<email>`. When test sign-in is off and `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` is missing, the app refuses to start, so a mistake in the settings fails loudly instead of running open. `ACCOUNTABLE_DB` also wins over `DATABASE_URL`, so a test can never reach Supabase.

## Sample data

Created by the backend with dates relative to the day it runs so overdue and late deals are true on any day (a database created months ago drifts, and `npm run seed` refreshes it). It is fixed in code, not random, so tests can rely on it. The same code serves the first start and `npm run seed`. Sample records have no author, so they show "Sample data" (R46).

- **12 organizations** across software, logistics, healthcare, manufacturing, finance, retail, education and energy, with realistic names, websites and short notes.
- **About 35 contacts**, 2 to 4 per organization, with a few leads and a few customers with no deals open. Statuses are roughly 40% lead, 25% qualified, 35% customer.
- **About 40 deals**, values USD 5k to 100k:
  - 12 Won with close dates spread over the past 12 months (so both charts have a shape, with a clear peak and a dip),
  - 5 Lost in the past months,
  - about 20 open across New, Qualified, Proposal and Negotiation, with expected close dates over the next 4 months,
  - 3 to 4 open deals that are late.
- **About 80 activities**: notes, calls and emails over the past 90 days, 10 to 12 follow-ups open (3 overdue, the rest due in the next 2 weeks), and a few done. Every deal that isn't New has the stage-change entries that match its stage.
- Probabilities follow the stage rules, with two or three set by hand.

## Project structure

```
frontend/         React app (Vite)
backend/          FastAPI app, SQLAlchemy Core tables, sign-in check, seed code
backend/migrations/ Alembic migrations, run when the app starts
e2e/              Playwright tests
eslint.config.mjs ESLint rules for the frontend and e2e
.gitleaks.toml    secret scan settings (allows the git-ignored .env)
data/             local SQLite files, for tests and offline use (git-ignored)
Dockerfile        builds the frontend and serves everything, for Render
.dockerignore     keeps data, secrets and node_modules out of the image
render.yaml       the Render web service
.env.example      the three settings to copy to .env (git-ignored)
package.json      workspace and scripts at the repo root
pyproject.toml    uv project at the repo root
uv.lock
```

Scripts as in the stack doc: `npm run dev`, `npm test`, `npm run seed`, and `npm run check` (every check and test), `npm run check:quick` (the same without the end-to-end tests) and `npm run format`. `docs/STATUS.md` gets the run instructions, including that Node and uv must be installed and that the first run needs internet to fetch packages.

## Testing

- **Backend (pytest)**: a missing, invalid or expired token refused on every route and the person taken from the token; `created_by` and `updated_by` on create, edit, follow-up changes and moves; search on SQLite (case, part of a name, contacts by full name, `%` and `_`); the stage, probability, close-date and late rules; move and reorder (positions stay consecutive, probability and stage-change entry written); delete cascades and previews; timeline composition; follow-up states; dashboard figures against a small known data set; seed idempotence.
- **Frontend (Vitest)**: money and date formatting, table sort and search logic, optimistic pipeline totals, the pipeline's drag and drop rules, form validation, and each page's loading, empty and error states.
- **End to end (Playwright with Chrome)**: one test per area of behavior, on a test SQLite database with a fixed clock and a test sign-in that never contacts Supabase, covering signing in and out, a signed-out visit, who added a record, the top-bar search, add, table filter, sort, edit, delete with confirmation, status filter, drag to another column and within one with a refresh in between, logging an activity and a follow-up, marking it done, the dashboard changing when a deal is won, and the theme choice in the user menu working, System following the device and the choice being remembered after a reload. Each test also fails if the browser console shows an error.
- **Speed**: every unit test runs in under a second, because CI runs on a slower machine than a laptop.
- **Coverage**: unit test coverage must stay at 80% or more, for the backend (statements) and the frontend (statements, branches, functions and lines). `npm run check` fails below that.
- **Checks**: `npm run check` also runs Prettier and ESLint (TypeScript, React Hooks and accessibility rules), ruff format and check, tsc, ty and gitleaks. No function may have a cyclomatic complexity above 15 (ESLint `complexity`, ruff `C901`). Rules are fixed in the code, not switched off.
- **Contrast**: a unit test reads the tokens and checks every text and background pairing used for small text, in light and in dark mode, at 4.5:1 or more.
- **By eye**: before calling it done, someone uses it end to end in a real browser, in both modes, and checks every screen against this spec and the brand.
