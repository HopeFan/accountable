# Platform: constraints, data rules, API basics, sample data, testing

Part of the Accountable spec. The index is in `docs/spec.md`. This file holds what applies to the whole product.

## Constraints and out of scope

- It runs locally with one documented command that works on Mac, Linux and Windows (only the Mac is tested), and needs no internet connection to use. Fonts are installed from npm (`@fontsource/*`) and served by the app, never loaded from another host.
- Every change is kept: it survives a browser refresh and a restart.
- One documented command resets the data to the sample data.
- Light and dark modes, light by default, designed for laptops from 1280px wide. The device's own dark mode setting is not followed. There is no pagination: tables load every record and search and sort run in the browser, which is fine for one user's data but needs a rethink before team data arrives.
- Not part of the product: sign-in, user accounts or several users, following the device's dark mode setting, phone layouts, AI features, email/calendar/phone integrations, currencies other than US dollars, reports beyond the dashboard, tags and custom fields, editable stages, import and export.

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
| Backend                     | FastAPI, Pydantic models, SQLAlchemy Core (no raw SQL) over SQLite              |

## Data model

SQLite, one file at `data/accountable.db` (git-ignored). The tests use their own file, set by an environment variable. Column types stay portable so the move to Supabase/Postgres later is simple. Every table has an integer `id`, `created_at` and `updated_at`.

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

### Rules worth stating

- Lists return everything (no pagination).
- List responses include the joined names the tables show, such as the organization's name on a deal.

## Reset and persistence

- R36. Every change is saved at once in SQLite, so it survives refresh and restart.
- R37. The database is created and seeded when its file doesn't exist. `npm run seed` deletes the data and recreates the sample data.

## Sample data

Created by the backend with dates relative to the day it runs so overdue and late deals are true on any day (a database created months ago drifts, and `npm run seed` refreshes it). It is fixed in code, not random, so tests can rely on it. The same file serves `npm run dev` and `npm run seed`.

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
backend/          FastAPI app, SQLAlchemy Core tables, seed code
e2e/              Playwright tests
eslint.config.mjs ESLint rules for the frontend and e2e
.gitleaks.toml    secret scan settings (allows the git-ignored .env)
data/             SQLite file (git-ignored)
package.json      workspace and scripts at the repo root
pyproject.toml    uv project at the repo root
uv.lock
```

Scripts as in the stack doc: `npm run dev`, `npm test`, `npm run seed`, and `npm run check` (every check and test), `npm run check:quick` (the same without the end-to-end tests) and `npm run format`. `docs/STATUS.md` gets the run instructions, including that Node and uv must be installed and that the first run needs internet to fetch packages.

## Testing

- **Backend (pytest)**: the stage, probability, close-date and late rules; move and reorder (positions stay consecutive, probability and stage-change entry written); delete cascades and previews; timeline composition; follow-up states; dashboard figures against a small known data set; seed idempotence.
- **Frontend (Vitest)**: money and date formatting, table sort and search logic, optimistic pipeline totals, the pipeline's drag and drop rules, form validation, and each page's loading, empty and error states.
- **End to end (Playwright with Chrome)**: one test per area of behavior, on a test database with a fixed clock, covering add, search, sort, edit, delete with confirmation, status filter, drag to another column and within one with a refresh in between, logging an activity and a follow-up, marking it done, the dashboard changing when a deal is won, and the dark mode toggle working and being remembered after a reload. Each test also fails if the browser console shows an error.
- **Coverage**: unit test coverage must stay at 80% or more, for the backend (statements) and the frontend (statements, branches, functions and lines). `npm run check` fails below that.
- **Checks**: `npm run check` also runs Prettier and ESLint (TypeScript, React Hooks and accessibility rules), ruff format and check, tsc, ty and gitleaks. No function may have a cyclomatic complexity above 15 (ESLint `complexity`, ruff `C901`). Rules are fixed in the code, not switched off.
- **Contrast**: a unit test reads the tokens and checks every text and background pairing used for small text, in light and in dark mode, at 4.5:1 or more.
- **By eye**: before calling it done, someone uses it end to end in a real browser, in both modes, and checks every screen against this spec and the brand.
