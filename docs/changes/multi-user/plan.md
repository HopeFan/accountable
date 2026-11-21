# Plan: sign-in, search and a user menu

Built from `docs/changes/multi-user/intent.md` and `docs/spec.md`, with the detail in `docs/specs/accounts.md`, `docs/specs/search.md` and `docs/specs/platform.md`. No code is written yet. Requirement numbers (R43 to R54) refer to those files.

Each phase ends with something that runs, its tests passing, a commit and an update to `docs/STATUS.md`.

## How it works

- **Which database.** If `ACCOUNTABLE_DB` is set, the app uses that SQLite file, whatever else is set. This is what every test uses, so a stray `DATABASE_URL` in someone's shell or `.env` can never send a test to Supabase. Otherwise `DATABASE_URL` is used (Postgres on Supabase, through the `psycopg` driver). With neither, the app uses the old local SQLite file.
- **Schema.** Alembic migrations create the schema. They run when the app starts, and the sample data is added only in the same start that created the tables. Unit tests keep building their SQLite tables from the table definitions, and one test checks that the migrations produce the same tables.
- **Sign-in.** The browser signs in with `supabase-js` and sends the session's access token as `Authorization: Bearer ...`. The backend verifies the token's signature against Supabase's public keys (`SUPABASE_URL/auth/v1/.well-known/jwks.json`, cached), checks that it hasn't expired and was issued for signed-in users, and reads the email from it. Every router under `/api` gets one dependency, `current_user`, so a new route can't forget it. The route functions receive the email and write it to `created_by` and `updated_by`.
- **No profile data.** The email comes from the token's `email` claim and is stored as text. Nothing is read from Supabase's profile or user metadata.
- **The browser's settings.** The page can't have `.env`, so the backend serves `GET /config.json` (outside `/api`, public), which returns only the Supabase URL and publishable key. The frontend fetches it before it renders anything. In development Vite proxies it. Nothing about Supabase is baked into the build, so the same build runs on Render, on this computer and in the end-to-end tests.
- **Test sign-in.** There is one switch, and it exists for the tests only. It is honored only when `ACCOUNTABLE_TEST_AUTH=1` **and** `ACCOUNTABLE_DB` is set **and** `SUPABASE_URL` is empty, which is never true on Render (where `DATABASE_URL` and `SUPABASE_URL` are set and `ACCOUNTABLE_DB` isn't). In that mode `/config.json` says "test sign-in", the sign-in screen checks a fixed test password in the browser, and the backend accepts tokens of the form `test:<email>`. Without the Supabase settings and without the switch, the backend refuses to start, so a mistake on Render fails loudly instead of running open.
- **Wrong session.** `api.ts` sends the token, and on a `401` it signs out. The sign-in screen replaces the page at the same address, so after signing in the person is where they were (R44) with no redirect to remember.
- **Public routes.** Only two, both outside `/api`: `/config.json` and `/healthz` (Render's health check, returns only `{ "status": "ok" }`). `/api/health`, which the app uses for today's date, stays behind sign-in.
- **The top bar.** `TopBar.tsx` is one small component that `Shell.tsx` renders above the page. Each phase changes it in turn: the first phase puts the old theme button and a temporary **Sign out** button in it, the second adds the search box, the third replaces both buttons with the user menu. It is the only file two phases touch.
- **Contract between backend and frontend** (so the two sides can be built apart): every organization, contact, deal and activity in a response has `created_by: string | null` and `updated_by: string | null`. `GET /api/me` returns `{ "email": string }`. `GET /api/search?q=` returns `{ organizations, contacts, deals }`, each a list of at most 5 of `{ id, name, context }`.

### New dependencies, and why

| Package                     | Where    | Why it's needed                                                                                                                                                                                      |
| --------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `psycopg[binary]`           | backend  | SQLAlchemy needs a Postgres driver to reach Supabase. Version 3 is the one SQLAlchemy 2 recommends.                                                                                                  |
| `alembic`                   | backend  | The intent says migrations run when the app starts. Alembic is SQLAlchemy's own migration tool; the other choice is a hand-written version table, which is the kind of thing the stack doc says not to hand-roll. |
| `pyjwt[crypto]`             | backend  | Checks the token's signature and claims, with a key cache for the JWKS. Verifying a JWT by hand is exactly the security code that shouldn't be hand-rolled.                                          |
| `@supabase/supabase-js`     | frontend | Sign-in, keeping the session in the browser, refreshing the token and signing out. Doing that by hand means writing auth code.                                                                       |

No other new packages. `.env` is read with `uv run --env-file .env` in the dev, start and seed scripts only, so no dotenv package is needed and the test scripts never read it. The search combobox is built by hand with the ARIA combobox pattern, as Radix has no combobox. The menu uses the Radix dropdown that is already installed, which has radio items.

## Files that change

The files are grouped into parts. Within a phase no file belongs to two parts, so the parts of one phase can be built by different agents at the same time. Each file appears once. The three files that a later phase must edit again are listed under "Handovers" at the end.

### Phase 1

#### Part A: Database and migrations (backend)

| File                                                | What changes                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pyproject.toml`, `uv.lock`                         | Adds `psycopg[binary]`, `alembic` and `pyjwt[crypto]` (the last is used by Part B).                                                                                                                                                                          |
| `backend/app/db.py`                                 | Picks the database as described above. Adds `created_by` and `updated_by` (`String(320)`, nullable) to organization, contact, deal and activity. SQLite pragmas only on SQLite, plus a Unicode-aware `lower()` registered on SQLite connections so search matches Postgres. Postgres engine with pre-ping and no prepared statements, so it works through Supabase's pooler. Keeps `write_lock`. |
| `backend/alembic.ini`, `backend/migrations/env.py`  | New. Alembic set up to use the engine from `db.py`.                                                                                                                                                                                                          |
| `backend/migrations/versions/0001_initial.py`       | New. Creates the five tables with the author columns.                                                                                                                                                                                                        |
| `backend/app/seed.py`                               | `ensure_seeded()` runs the migrations, then adds the sample data only if this start created the tables. `reset()` deletes the rows instead of dropping the tables, so it also works on Postgres. Sample rows have no author.                                  |
| `backend/seed_cli.py`                               | Asks for confirmation before wiping when `DATABASE_URL` isn't a local SQLite file (R37).                                                                                                                                                                     |
| `backend/tests/test_db.py`, `test_migrations.py`    | New. See Proof.                                                                                                                                                                                                                                              |
| `backend/tests/test_seed.py`                        | Extended: seeds once, never again after everything is deleted, `reset()` works, sample rows have no author.                                                                                                                                                  |

#### Part B: Sign-in and authorship (backend)

| File                                                                                                                     | What changes                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/auth.py`                                                                                                    | New. Reads the settings, verifies a token (real or test), exposes `current_user`, and decides whether test sign-in is allowed.                                                                                                                       |
| `backend/app/main.py`                                                                                                    | Puts `current_user` on the `/api` router, adds `GET /api/me`, the public `/config.json` and `/healthz`, refuses to start with no Supabase settings and no test switch, serves `index.html` for every address (it already does). Phase 2 adds one line for the search router. |
| `backend/app/common.py`                                                                                                  | `insert_row` takes the person and sets both author fields. The serializers include `created_by` and `updated_by`.                                                                                                                                    |
| `backend/app/routes/organizations.py`, `contacts.py`, `deals.py`, `activities.py`, `follow_ups.py`                       | Each write passes the person: create sets both fields, edit, follow-up done or reopened, and a move set `updated_by`. The stage-change entry gets the mover as `created_by`. Renumbered neighbors are left alone.                                    |
| `backend/app/routes/dashboard.py`, `backend/app/schemas.py`                                                              | Expected to need nothing: recent activity comes from `common.py`, and the input models already ignore fields they don't declare. A test proves a client can't send `created_by`. Touched only if that turns out false.                              |
| `backend/tests/conftest.py`                                                                                              | An autouse fixture removes `DATABASE_URL`, `SUPABASE_*` and the test switch from the environment. The `client` and `seeded` fixtures send a test sign-in header by default; a `signed_out` client is added.                                         |
| `backend/tests/test_auth.py`, `test_authorship.py`                                                                       | New. See Proof.                                                                                                                                                                                                                                      |

#### Part C: Sign-in (frontend)

| File                                                                         | What changes                                                                                                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/package.json`, `package-lock.json` (repo root)                     | Adds `@supabase/supabase-js`.                                                                                                                                                        |
| `frontend/src/lib/config.ts`                                                 | New. Fetches `/config.json`.                                                                                                                                                         |
| `frontend/src/lib/auth.ts`, `supabaseAuth.ts`, `testAuth.ts`                 | New. One small `AuthClient` interface (current session, sign in, sign out, change listener), the Supabase implementation and the test implementation, and a React context with `useSession()`. |
| `frontend/src/components/AuthGate.tsx`                                       | New. Loading, then sign-in screen or the app.                                                                                                                                        |
| `frontend/src/pages/SignIn.tsx`                                              | New. R43: email, password, **Sign in**, "Email or password is wrong". Uses the tokens, no sidebar.                                                                                   |
| `frontend/src/lib/api.ts`                                                    | Adds the `Authorization` header. A `401` signs out.                                                                                                                                  |
| `frontend/src/main.tsx`                                                      | Wraps the app in the auth gate. `App.tsx` doesn't change.                                                                                                                            |
| `frontend/src/components/Shell.tsx`                                          | Renders `<TopBar />` instead of the theme button row. The footer text "Data is saved on this computer" is no longer true and is removed.                                              |
| `frontend/src/components/TopBar.tsx`                                         | New. The old `ThemeToggle` and a temporary **Sign out** button, right-aligned.                                                                                                       |
| `frontend/vite.config.ts`                                                    | Proxies `/config.json` to the backend.                                                                                                                                               |
| `frontend/src/lib/types.ts`                                                  | `created_by` and `updated_by` on the four record types, as in the contract above.                                                                                                    |
| `frontend/src/test/fakeApi.tsx`                                              | `renderApp` renders signed in with a test session, and the fake records carry the two author fields. Part D relies on this.                                                          |
| `frontend/src/lib/auth.test.ts`, `api.test.ts`, `pages/SignIn.test.tsx`, `components/AuthGate.test.tsx` | New or extended. See Proof.                                                                                                                                  |

#### Part D: Who added it (frontend)

| File                                                                                           | What changes                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/lib/format.ts`, `format.test.ts`                                                 | A function that turns an email or `null` into "Added by name@example.com" or "Sample data".                                                         |
| `frontend/src/components/RecordPage.tsx`                                                       | "Added by" and "Last changed by" in the details, muted, the email in mono.                                                                          |
| `frontend/src/pages/OrganizationPage.tsx`, `ContactPage.tsx`, `DealPage.tsx`                   | Pass the two fields to `RecordPage`.                                                                                                                |
| `frontend/src/components/Timeline.tsx`, `Timeline.test.tsx`                                    | Each row shows who added it, in the small print beside the time. Stage-change rows show the person who moved the deal.                              |
| `frontend/src/pages/dashboard/RecentActivity.tsx`, `Dashboard.test.tsx`                        | Each row shows who added the activity.                                                                                                              |
| `frontend/src/components/RecordPage.test.tsx`                                                  | New.                                                                                                                                                |

#### Part E: End-to-end sign-in

| File                          | What changes                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/playwright.config.ts`    | The server's environment sets `ACCOUNTABLE_TEST_AUTH=1`, and empties `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `DATABASE_URL`. The readiness check uses `/healthz`.                                                                                       |
| `e2e/fixtures.ts`             | A `signIn(page)` helper that puts a test session in place before the page loads, and every test uses it by default, so the existing specs keep working untouched. A `signOut(page)` helper for the sign-out tests.                                                |
| `e2e/auth.spec.ts`            | New. Signing in and out, a signed-out visit, the wrong password, the session surviving a reload, the address being kept.                                                                                                                                       |
| `e2e/authors.spec.ts`         | New. Who added a record, "Sample data" on sample records, a stage change shows the person who moved the deal.                                                                                                                                                   |

#### Part F: Running and deploying

| File                     | What changes                                                                                                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` (root)    | `dev`, `start` and `seed` run uv with `--env-file .env`. The test and check scripts don't.                                                                                                                                                                                     |
| `.env.example`           | New. The three settings with placeholder values and a line on where each comes from.                                                                                                                                                                                          |
| `Dockerfile`, `.dockerignore` | New. Two stages: Node builds the frontend, then a Python image with uv serves it. Render's native runtimes are one language each, and this app needs both. Starts `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.                                                       |
| `render.yaml`            | New. One free web service from the Dockerfile, health check `/healthz`, and `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` declared with `sync: false`, so Render asks for them and they are never in the file.                                                  |

#### Part G: Docs (at the end of each phase)

| File                                    | What changes                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/STATUS.md`                        | Updated at the end of every phase. Run instructions: Supabase project, adding people, `.env`, `npm start`, Render. "Known limits": needs the internet; the Render free plan is slow after idle time.                |
| `docs/TECH_STACK.md`                    | The SQLite-only paragraph and the "Later, Supabase" sentence now describe what is true.                                                                                                                            |
| `docs/specs/platform.md`                | Adds `/healthz`, `/config.json` and the Dockerfile to Deployment and Project structure. (`accounts.md` and `search.md` are already written; changed only if building shows they are wrong.)                         |
| `docs/spec.md`                          | Only if the summary or the index changes.                                                                                                                                                                          |
| `.claude/agents/ui-check.md`            | Says to start the app with test sign-in, sign in as the test person, and use the user menu for the theme (updated in Phase 3, when the menu exists).                                                               |

### Phase 2

#### Part H: Search (backend)

| File                           | What changes                                                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/routes/search.py` | New. `GET /search?q=`. Lower-cases both sides, escapes `%`, `_` and the escape character, matches anywhere in the name, contacts on first name, last name or the two joined with a space. 5 per group, ordered by name, blank query returns nothing. Its response shape is declared in this file. |
| `backend/tests/test_search.py` | New. See Proof.                                                                                                                                                                                                             |

#### Part I: Search (frontend)

| File                                                  | What changes                                                                                                                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/lib/useDebouncedValue.ts`, `.test.ts`   | New. Holds a value back for 250 ms.                                                                                                                                                                    |
| `frontend/src/lib/search.ts`                          | New. The result types and the `useSearch` query on the debounced text.                                                                                                                                 |
| `frontend/src/components/SearchBox.tsx`, `.test.tsx`  | New. The combobox: groups, "No results for ...", keyboard through groups, Enter or click to open and clear, Escape to close. Its tests answer `/api/search` themselves, so they don't touch `fakeApi.tsx`. |
| `frontend/src/components/TopBar.tsx`                  | Handover from Part C. Adds the box to the left of the buttons.                                                                                                                                         |

#### Part J: End-to-end search

| File                  | What changes                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `e2e/search.spec.ts`  | New. Finding each kind by part of a name in any case, choosing a result, keyboard, no results.          |

### Phase 3

#### Part K: User menu (frontend and its end-to-end tests)

| File                                                         | What changes                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/UserMenu.tsx`, `.test.tsx`          | New. The initials button and the Radix dropdown: email, **Light**, **Dark**, **System** as radio items, **Sign out**.                                                                                    |
| `frontend/src/lib/theme.ts`, `theme.test.ts`                 | The theme becomes `light`, `dark` or `system`, with System the default. `system` follows `prefers-color-scheme` and updates live when the device changes.                                                |
| `frontend/index.html`                                        | The inline script before first paint also handles `system`.                                                                                                                                             |
| `frontend/src/components/ThemeToggle.tsx`, `.test.tsx`       | Deleted.                                                                                                                                                                                                |
| `frontend/src/components/TopBar.tsx`                         | Handover. Replaces the theme button and the temporary Sign out with `UserMenu`.                                                                                                                         |
| `e2e/fixtures.ts`                                            | Handover from Part E. `signOut(page)` goes through the menu.                                                                                                                                            |
| `e2e/menu.spec.ts`                                           | New. Initials, the menu's contents, the keyboard, Escape and outside click, sign out.                                                                                                                   |
| `e2e/theme.spec.ts`, `e2e/look.spec.ts`                      | The theme choice is made in the menu instead of with the toggle. New cases: System follows the device (`emulateMedia`), the choice is remembered after a reload.                                       |

Parts G and K both want `.claude/agents/ui-check.md` in Phase 3. It belongs to Part G, which does it after Part K lands.

### Handovers

These are the only files edited in more than one phase, always one after the other, never at the same time:

| File                         | Phase 1 (creates or edits) | Phase 2        | Phase 3          |
| ---------------------------- | -------------------------- | -------------- | ---------------- |
| `backend/app/main.py`        | Part B                     | Part H (1 line) | none             |
| `frontend/src/components/TopBar.tsx` | Part C             | Part I         | Part K           |
| `e2e/fixtures.ts`            | Part E                     | none           | Part K           |

## Order of work

### Before Phase 1: what only the person can do

The Supabase project, the people added in its dashboard, and the three settings in `.env` come from the person, because agents can't read `.env`. Phase 1 can be built and tested without them; only the by-hand proof at its end needs them. Ask for them at the start, and ask the person to check that the project uses **JWT signing keys** (the asymmetric ones) and not the legacy shared secret, because the token check depends on it (see Risks).

### Phase 1: Sign-in and the database

Parts A, B, C, D, E and F can be built in parallel; they only meet at the contract above.

1. **Database (A).** Table definitions with the author columns, the database choice, the first migration, the migration test and the seed changes. Ends with: the backend tests pass on SQLite, and the migration builds the same tables as the definitions.
2. **Token check (B).** `auth.py` with the real verifier (tested with a locally generated key, never the network) and the test verifier, the switch rules, then the dependency on the `/api` router, `/api/me`, `/config.json` and `/healthz`. Ends with: every route refuses without a token (R45).
3. **Authorship (B).** The person goes into every write: create, edit, follow-up, move, stage-change entry. Ends with: R46 and R47 hold in the API.
4. **Sign-in screen and gate (C).** Config, the two auth clients, the gate, the sign-in screen, `api.ts`, the top bar with a temporary Sign out. Ends with: signed out you see only the sign-in screen, signed in you see the app (R43, R44, R49).
5. **Who added it (D).** The label function, record pages, timelines and recent activity. Ends with: R46 and R47 show in the screens.
6. **End-to-end (E).** Test sign-in in the config and fixtures, so every existing end-to-end spec runs signed in unchanged, then the two new specs.
7. **Running and deploying (F).** Scripts, `.env.example`, Dockerfile, `render.yaml`.
8. **Docs (G).** `STATUS.md`, `TECH_STACK.md`, `platform.md`.
9. **Close the phase.** `npm run check` passes with no Supabase settings anywhere, then again with the settings exported in the shell. Then, with the person: `npm start` against Supabase, sign in with a real user, add a record, and check "Added by" shows their email. Commit.

### Phase 2: Search

Parts H, I and J can be built in parallel once Phase 1 is committed.

1. **Backend (H).** The query, the escaping, the grouping, the limit, wired into `main.py`.
2. **Frontend (I).** The debounce hook, `useSearch`, then the box and its dropdown, then its place in the top bar.
3. **End-to-end (J).** The search spec.
4. **Close the phase.** `npm run check`, update `STATUS.md` (G), commit.

### Phase 3: The user menu

Part K, with Part G finishing the docs after it.

1. **Theme logic.** `theme.ts` with System, and the inline script in `index.html`, with their unit tests. Ends with: all three choices work through the functions.
2. **The menu.** `UserMenu`, in the top bar in place of the two buttons, and `ThemeToggle` deleted.
3. **End-to-end.** The menu spec, the theme and look specs moved to the menu, the `signOut` helper.
4. **Close the phase.** `npm run check`, `ui-check` in both modes (with `ui-check.md` updated), `reviewer` on the branch, update `STATUS.md` and the spec files that changed, commit. Then Deploy as `AGENTS.md` says: review fixes, `docs/IMPROVE.md`, merge, and first deploy to Render with the settings entered there.

## Risks

1. **The token check may not match the project.** If the Supabase project still uses the legacy shared secret instead of signing keys, there is no public key to verify against, and the settings the intent allows (`SUPABASE_URL`, publishable key) don't include the secret. This is checked first. The fallback is to ask Supabase `/auth/v1/user` with the token, which needs the publishable key and one network call per request (cached for a minute), at the cost of a slower, networked check.
2. **Test sign-in running on Render.** This would put a password-less door on the live app. The guard is three conditions at once (the switch, `ACCOUNTABLE_DB` set, `SUPABASE_URL` empty), plus a start-up refusal when no Supabase settings and no switch are present. Unit tests cover each condition, including that the switch is ignored when `SUPABASE_URL` is set.
3. **Tests reaching Supabase.** `ACCOUNTABLE_DB` wins over `DATABASE_URL`, a fixture clears the settings, the end-to-end config empties them, and the scripts that read `.env` are not the ones the tests use. If any of these fails, a test could write to the team's database, so the unit tests include one that sets `DATABASE_URL` to an unreachable address and still passes.
4. **Supabase's connection.** Render's free plan is IPv4 only, and Supabase's direct database address is IPv6, so `DATABASE_URL` must be the pooler address (transaction mode). That mode rejects prepared statements, hence the engine setting, and a password with special characters has to be URL-encoded. All of this is documented in `.env.example` and `STATUS.md`, and found out only by the by-hand run in Phase 1.
5. **Migrations and table definitions drifting apart.** The unit tests build tables from the definitions, but production uses migrations. The migration test compares the two on SQLite. Postgres-only differences can't be caught without Postgres, so the by-hand run against Supabase is the check. Alembic's import and an upgrade on a temporary file must stay under a second; measured with `pytest --durations` in step 1, and if it doesn't, the migration test is the one to slim down, never the one to skip.
6. **First start on an empty Postgres.** "Seed only when the tables were just created" needs a reliable signal. It is the absence of Alembic's version table before the upgrade. Two instances starting at once could seed twice, which can't happen on a single free Render service and is noted as a limit.
7. **What counts as a change.** The spec says a move changes only the moved deal. Two cases it doesn't settle: deleting a contact clears `contact_id` on their deals, and moving a contact to another organization does the same. The plan treats these as side effects and leaves the deals' `updated_by` alone, in line with the renumbering rule. If that isn't wanted, `accounts.md` needs one more sentence.
8. **Case-insensitive search on two databases.** SQLite's built-in `lower()` handles only ASCII, Postgres's handles accented letters, so "é" would behave differently. The registered `lower()` on SQLite connections fixes it, and a test uses an accented name. A behavior Postgres has but a Python `lower()` doesn't (locale-specific rules) is not covered, and is rare enough to leave.
9. **Existing frontend tests render the shell.** Once the shell holds the top bar and reads the session, every test that renders the app needs a signed-in session. That is one change in `fakeApi.tsx`, made first in Part C, and the risk is that many tests fail at once until it lands.
10. **Unit test speed.** The Supabase client, Radix menus and debounce timers are the likely slow spots. Auth tests use the test auth client and not `supabase-js`, timer tests use fake timers, and every test's time is checked at the end of each phase (see Proof).
11. **`uv run --env-file`.** If a missing `.env` makes it fail, `npm run dev` would break on a fresh clone. This is tried in step 7 of Phase 1. If it fails, the scripts get a tiny wrapper that passes the flag only when the file exists, not a dotenv package.
12. **Free plan cold starts.** After idle time, the service restarts: migrations run, and Supabase answers slowly. The first page can take a while. It is a limit of the plan, written in `STATUS.md`, not something to fix here.
13. **Spec edit.** `/healthz` and `/config.json` are public, which `accounts.md` doesn't say (it says every route under `/api`, which is still true). `platform.md` gets both, in Part G.

## Proof

### Unit tests: backend (pytest)

The whole suite stays at 80% or more, and every test runs in under a second (`uv run pytest --durations=10`).

| File                                  | What it proves                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test_db.py` (new)                    | `ACCOUNTABLE_DB` wins over `DATABASE_URL`. A `postgresql://` URL is rewritten for `psycopg`. With neither, the default file is used. The SQLite `lower()` handles accents. A `DATABASE_URL` pointing nowhere doesn't affect a test run.                                                                              |
| `test_migrations.py` (new)            | Running the migrations on an empty SQLite file creates the same tables and columns as the table definitions, and running them twice changes nothing.                                                                                                                                                          |
| `test_seed.py` (extended)             | Seeds when the tables are new, doesn't seed again after the data is deleted, `reset()` recreates the sample data, sample rows have no `created_by` or `updated_by`.                                                                                                                                           |
| `test_auth.py` (new)                  | With a locally generated key: a valid token gives its email. Missing, malformed, expired, wrong-audience, wrong-issuer and wrongly signed tokens each give `401`, as does a token with no email. Every route under `/api` is found from the app and refuses without a token (so a future route can't skip it). `/healthz` and `/config.json` answer without one, and `/config.json` shows only the URL and the publishable key. Test sign-in is accepted only with all three conditions and ignored when `SUPABASE_URL` is set. The app won't start with no settings and no switch. |
| `test_authorship.py` (new)            | Create sets both fields from the token. Edit changes `updated_by` and not `created_by`. A client sending `created_by` or `updated_by` in a body is ignored. Marking a follow-up done and reopening it set `updated_by`. A move sets `updated_by` on the moved deal only, not on the deals renumbered around it, and the stage-change entry's `created_by` is the mover. Two people editing the same record leave both names where they belong. `/api/me` returns the email. Responses include both fields. |
| `test_search.py` (new)                | Finds each kind by part of a name, in any case. A contact is found by "ada lov". `%` and `_` in the query match themselves. A blank query returns nothing. At most 5 per group, ordered by name. Results carry their context line. Records with an author, and sample records without, are all found (R54). An accented name is found in any case.                                        |
| Existing tests                        | Unchanged in what they check. They run through the signed-in `client` fixture.                                                                                                                                                                                                                               |

### Unit tests: frontend (Vitest)

Coverage stays at 80% or more for statements, branches, functions and lines, and every test runs in under a second.

| File                                       | What it proves                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/auth.test.ts`                         | The test client signs in with the fixed password and refuses another. The session is kept and restored. Signing out clears it. A change is announced to listeners.                                                          |
| `lib/api.test.ts` (extended)               | The token is sent. A `401` signs out. Other errors behave as before.                                                                                                                                                         |
| `pages/SignIn.test.tsx`                    | Both fields and the button, no sign-up or forgotten-password text, the error line on a wrong password, the button can't be pressed twice while working, Enter submits.                                                      |
| `components/AuthGate.test.tsx`             | Loading, then the sign-in screen when signed out, the app when signed in, and back to the sign-in screen when the session ends.                                                                                            |
| `lib/format.test.ts` (extended)            | "Added by name@example.com" and "Sample data".                                                                                                                                                                              |
| `components/RecordPage.test.tsx`, `Timeline.test.tsx`, `pages/Dashboard.test.tsx` | Added by and Last changed by on record pages, the author on timeline rows and recent activity, "Sample data" when there is none, the mover on a stage-change row.                           |
| `lib/useDebouncedValue.test.ts`            | The value follows only after the delay, and only the last of several quick changes.                                                                                                                                         |
| `components/SearchBox.test.tsx`            | Placeholder. Nothing shown for an empty box. Groups in order, empty groups left out. "No results for" and the query. One request after typing stops, not per keystroke. Arrow keys across groups, Enter and click open the page, close the dropdown and clear the box. Escape closes. The combobox and option roles. |
| `lib/theme.test.ts` (extended)             | System is the default. Light and dark apply the attribute. System follows `prefers-color-scheme` and a change of it. A blocked storage still applies the choice.                                                            |
| `components/UserMenu.test.tsx`             | Initials are the first two letters of the email in capitals. The menu shows the email, the three choices with one selected, and **Sign out**. Choosing a theme applies and stores it. Sign out calls the auth client. Keyboard open and close, Escape. |
| `components/ThemeToggle.test.tsx`          | Deleted with the component.                                                                                                                                                                                                 |
| Existing contrast and token tests          | Still pass, now also covering the sign-in screen, the menu and the search dropdown, in both modes.                                                                                                                         |

### End-to-end (Playwright with Chrome)

They run on a test SQLite database with the fixed date and the test sign-in, never reach Supabase, and each one fails on a console error or a request that leaves the computer.

| File                  | What it proves                                                                                                                                                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts`        | A signed-out visit to every section shows only the sign-in screen, and a direct `/api` request answers `401`. A wrong password shows "Email or password is wrong". Signing in opens the page that was asked for. The session survives a reload. Signing out shows the sign-in screen, and Back and a reload don't bring the app back.                                                                                |
| `authors.spec.ts`     | A record added in the browser shows "Added by" the test person, and an edit shows "Last changed by". A sample record shows "Sample data". Moving a deal on the pipeline puts the mover on the stage-change entry. A logged activity shows its author in the timeline and in recent activity.             |
| `search.spec.ts`      | Part of a name in any case finds an organization, a contact and a deal, grouped, with the context line. Choosing a result opens its page and clears the box. The arrow keys and Enter do the same. A nonsense query shows "No results for". The search finds sample records.                              |
| `menu.spec.ts`        | The initials button shows the right letters. The menu holds the email, the theme choice and **Sign out**. It opens and closes with the keyboard, closes on Escape and on a click outside, and has a visible focus ring. Sign out leads to the sign-in screen.                                           |
| `theme.spec.ts`, `look.spec.ts` (updated) | The choice in the menu changes the page and is remembered after a reload. System follows the device's setting, both ways, with `emulateMedia`. Every screen in both modes as before, and the sign-in screen and the open menu in both modes.                                            |
| All existing specs    | Pass unchanged, signed in by the fixture (this is the proof for "signed in, everything works as before").                                                                                                                                                                                          |

### Against the success criteria

| Criterion                                                    | Proof                                                                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. `npm run check` passes and never touches Supabase         | Run twice at the end of Phase 1, with and without the settings exported. The environment tests in `test_db.py` and `conftest.py`. CI is unchanged and uses no secrets. |
| 2. Signed out everything refuses, signed in as before        | `test_auth.py` (every route), `auth.spec.ts`, and all the old specs passing signed in.                                                                       |
| 3. Every record and activity shows who added it              | `test_authorship.py`, the frontend tests above and `authors.spec.ts`.                                                                                        |
| 4. Search finds each kind by part of a name in any case      | `test_search.py` and `search.spec.ts`.                                                                                                                       |
| 5. The theme choice is remembered, System follows the device | `theme.test.ts`, `UserMenu.test.tsx`, `theme.spec.ts`.                                                                                                       |
| 6. The built app runs here the way Render runs it, against Supabase | By hand with the person, because it needs the real settings: `npm start` with `.env`, sign in as a real user, add a record, see the email, search, change the theme, sign out. Then, if Docker is installed, the same with `docker build` and `docker run --env-file .env`. After merge, the same on the onrender.com address. |

Also by eye, before calling it done: `ui-check` and a person in both modes on the sign-in screen, the top bar, the search dropdown and the user menu, against `docs/BRAND.md` and the spec.
