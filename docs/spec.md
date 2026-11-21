# Spec: the Accountable MVP

Source: `docs/intent.md`. Stack: `docs/TECH_STACK.md`. Look: `docs/BRAND.md`.

## Concerns

Read these first. Each has the decision I made in this spec, so you can overrule it before building.

**Confirmed by you:** concern 3 (stage colors), 5 (funnel counts current stage or later), 8 (deleting a contact keeps their deals, with no main contact) and 9 (a contact's organization is optional). The rest are my defaults and stand unless you say otherwise.

1. **There is no brand skill.** Only `docs/BRAND.md` exists, so the design follows that. If you meant a different skill, point me to it.
2. **The brand's Google Fonts conflict with "no internet needed".** The app must work offline, so the fonts are installed from npm (`@fontsource/*`) and served by the app, never loaded from Google.
3. **Six stages, five brand colors.** I map them as in "Stage colors" below. Raspberry is kept for overdue and late things, so a Lost deal doesn't look like an alert.
4. **Stage changes are timeline entries, but the intent's activity types are only note, call and email.** I add a fourth, system-made type, `stage_change`. These entries can't be edited. They can be deleted by hand, like any entry, but moving a deal never deletes them.
5. **"How much value reaches each stage" needs a definition.** Stage history for Lost deals is thin, so the funnel counts each non-lost deal at its current stage and every earlier one. Lost deals aren't counted and are shown beside the funnel as a separate figure.
6. **Closing a deal changes its close date.** The intent says "expected or actual close date". Moving a deal to Won or Lost sets its close date to today. Revenue won per month depends on this.
7. **A deal's contact must work at the deal's organization.** The intent doesn't say. I validate it, so the pipeline and the contact pages never disagree.
8. **Deletion rules the intent leaves open.** Organization: deletes its contacts, deals and activities (decided). Contact: their own activities are deleted, their deals stay with no main contact. Deal: its activities are deleted. The confirmation says exactly what goes.
9. **A contact without an organization is allowed** (a new lead often has no company yet). A deal always has one.
10. **Sample dates are relative to the day the data is created.** That keeps overdue and late deals true on any day, but a database created months ago drifts. `npm run seed` refreshes it.
11. **Money format.** "Always shown with its currency" is tight in tables, so amounts read `USD 48,000` everywhere and compact on chart axes, such as `USD 50k`.
12. **Library and tooling choices the stack doc leaves open** are listed in "Libraries". Say so if you'd choose differently.
13. **No pagination.** Sample data is about 100 records and one user's data stays small, so tables load everything and search and sort run in the browser. This needs a rethink before the team data arrives.
14. **Not covered yet:** keyboard accessibility of drag and drop, and a minimum screen width. I design for laptops from 1280px wide and include keyboard dragging because the chosen library supports it.

---

## 1. Goal

A complete sales CRM for one person, running on their own computer, that feels sharp and professional. The user is a salesperson selling B2B services and software, with deals of about USD 5k to 100k. It has five sections: Dashboard, Organizations, Contacts, Deals and Pipeline.

Success is the eight criteria in `docs/intent.md` plus its ninth: daily use, demo-ready, a clean foundation for growth, fast and reliable.

## 2. Out of scope

Sign-in and users, dark mode, phone layouts, AI, email/calendar/phone integrations, other currencies, extra reports, tags and custom fields, editable stages, import and export. The tokens in section 8 are built so dark mode can be added later.

## 3. Libraries

Popular libraries over custom code, as the stack doc asks.

| Need | Choice |
| --- | --- |
| Routing | React Router |
| Server data and cache | TanStack Query |
| Tables (sort, search, rows) | TanStack Table |
| Forms and validation | React Hook Form with Zod |
| Drag and drop | dnd-kit (supports keyboard dragging) |
| Charts | Recharts (line, bar, funnel) |
| Styling | Tailwind CSS with Radix UI primitives for dialogs, menus and selects |
| Icons | Lucide |
| Fonts | `@fontsource` packages for Instrument Sans, Instrument Serif and JetBrains Mono |
| Backend | FastAPI, Pydantic models, SQLAlchemy Core (no raw SQL) over SQLite |

## 4. Data model

SQLite, one file at `data/accountable.db` (git-ignored). The tests use their own file, set by an environment variable. Column types stay portable so the move to Supabase/Postgres later is simple. Every table has an integer `id`, `created_at` and `updated_at`.

**organization**: `name` (required, unique ignoring case), `website`, `industry`, `notes`.

**contact**: `first_name`, `last_name` (required), `email`, `phone`, `job_title`, `organization_id` (optional), `status` (`lead`, `qualified`, `customer`; default `lead`).

**deal**:
- `name` (required)
- `organization_id` (required)
- `contact_id` (optional; must belong to the same organization)
- `stage` (`new`, `qualified`, `proposal`, `negotiation`, `won`, `lost`)
- `value` (whole USD, 0 or more)
- `probability` (0 to 100)
- `close_date` (a date)
- `position` (integer, order within its stage)

**activity**:
- `type` (`note`, `call`, `email`, `stage_change`)
- `contact_id` (optional), `deal_id` (optional), at least one required
- `description`
- `occurred_at` (date and time, default now)
- `follow_up_date` (optional date)
- `follow_up_done` (boolean)

For `stage_change` entries the description is generated, such as "Moved from Proposal to Negotiation", and the entry hangs on the deal only.

**Stage rules**

| Stage | Usual probability | Open? |
| --- | --- | --- |
| New | 5% | yes |
| Qualified | 20% | yes |
| Proposal | 40% | yes |
| Negotiation | 70% | yes |
| Won | 100% | no |
| Lost | 0% | no |

- A new deal gets its stage's usual probability unless one is given.
- Moving a deal to a different stage sets its probability to the new stage's usual one. A probability edited by hand stays until the stage next changes.
- Moving a deal to Won or Lost sets its close date to today.
- Expected revenue of an open deal is `value × probability / 100`. For Won deals it equals the value, for Lost deals it is 0.
- A deal is **late** when it is open and its close date is before today (local date).

**Timelines.** A deal's timeline is all activities with its `deal_id`. A contact's timeline is activities with that `contact_id`, plus activities on deals where they are the main contact. Both are newest first by `occurred_at`.

**Follow-ups.** A follow-up is an activity with a `follow_up_date` and `follow_up_done` false. It is **overdue** when the date is before today and **upcoming** otherwise.

## 5. API

JSON over `/api`, served by FastAPI on one port in development with the frontend proxied by Vite. Errors return a status code and `{ "detail": ... }`. Validation errors name the field so the form can show them.

| Resource | Endpoints |
| --- | --- |
| Organizations | `GET /organizations`, `POST`, `GET /organizations/{id}` (with contacts and deals), `PATCH`, `DELETE` |
| Contacts | `GET /contacts`, `POST`, `GET /contacts/{id}` (with organization, deals and timeline), `PATCH`, `DELETE` |
| Deals | `GET /deals`, `POST`, `GET /deals/{id}` (with timeline), `PATCH`, `DELETE` |
| Pipeline | `POST /deals/{id}/move` with `{ stage, position }` |
| Activities | `POST /activities`, `PATCH /activities/{id}`, `DELETE /activities/{id}` |
| Follow-ups | `GET /follow-ups` (open ones, soonest first) |
| Dashboard | `GET /dashboard` |
| Delete preview | `GET /organizations/{id}/delete-preview`, same for contacts and deals; returns counts of what would go |

Rules worth stating:

- **Move** runs in one transaction: it changes the stage if needed, applies the probability and close-date rules, and `position` is the new index in the target column. The others in the source and target columns are renumbered so positions stay consecutive. A stage change also writes its `stage_change` activity.
- **Edit** of a deal through `PATCH` that changes `stage` behaves like a move and goes to the end of the new column.
- **Create** of a deal takes an optional `position`; without one it is added at the end of its stage's column.
- **Dashboard** returns all figures in one response so the figures always agree with each other.
- Lists return everything (concern 13).
- List responses include the joined names the tables show, such as the organization's name on a deal.

## 6. Requirements by section

Each is testable. "R" numbers are for the build plan and tests.

### Every table (Organizations, Contacts, Deals)

- R1. A search box filters rows as you type, over all visible text columns.
- R2. Clicking a column heading sorts ascending, again descending, again clears the sort. The sorted column shows an arrow. Numbers and dates sort by value, not text.
- R3. An "Add" button opens a dialog form. Required fields are marked, errors show under the field, and saving closes the dialog and shows the row.
- R4. Each row has Edit and Delete in a row menu.
- R5. Delete opens a dialog that names the record and, from the delete preview, says what else goes. For example: "Delete Northwind Logistics? This also deletes 4 contacts, 3 deals and 17 activities. This can't be undone." The button says "Delete" in Raspberry. Nothing is removed until confirmed.
- R6. Clicking a row's name opens its page.
- R7. An empty table or no search results shows a plain message and, for an empty table, the Add button.

### Dashboard

- R8. Opens at `/`, the landing page.
- R9. **Figure tiles**: open pipeline value, expected revenue of the open pipeline, revenue won this month (with deals won this month), and overdue follow-ups.
- R10. **Revenue won** line chart, the last 12 months including this one, from Won deals' close dates.
- R11. **Deals won** bar chart for the same 12 months.
- R12. **Sales funnel**: for each stage from New to Won, the value of non-lost deals at that stage or later (concern 5), with a plain note giving the value of Lost deals.
- R13. **Recent activity**: the latest 10 activities of all types, including stage changes, each linking to its deal or contact.
- R14. **Follow-ups**: open follow-ups, overdue ones first and marked in Raspberry, then upcoming by date. Each has a checkbox that marks it done and removes it from the list at once, and a link to its deal or contact.
- R9a. **Open pipeline by stage**: a strip under the tiles with one block per open stage (New to Negotiation), as wide as its share of the open value. Each block shows the stage, its deal count and its value. A slim bar below shows the stage's probability of close, with the expected revenue it stands for.
- R15. Every figure comes from `GET /dashboard`, and it refreshes after any change anywhere in the app.

### Organizations

- R16. Table columns: name, industry, website, contacts (count), open deals (count), open deal value.
- R17. Organization page: details with an Edit button, a contacts table with an Add contact action that preselects this organization, and a deals table with an Add deal action that does the same. Linked rows open their own pages.

### Contacts

- R18. Table columns: name, organization, job title, email, phone, status.
- R19. A status filter (All, Lead, Qualified, Customer) sits beside the search box and combines with it.
- R20. Contact page: details, organization link, their deals, and a timeline of their activities, newest first.
- R21. A **Log activity** button on the page.

### Deals

- R22. Table columns: name, organization, contact, stage, value, probability, close date.
- R23. A late deal shows its close date in Raspberry with a "Late" tag, and the same on its pipeline card.
- R24. Deal page: details, links to its organization and contact, a stage selector that moves it like a drag does, and a timeline newest first.
- R25. A **Log activity** button on the page.

### Activities

- R26. The Log activity form: type (note, call, email), description, when it happened (default now), an optional follow-up date.
- R27. A timeline row shows the type icon, description, time, and its follow-up with its state (open, done, overdue) if there is one. A follow-up can be marked done or reopened from the row.
- R28. Notes, calls and emails can be edited and deleted from the timeline. Stage-change entries have Delete only.
- R29. Moving a deal to another stage, by drag, by the stage selector or by editing, adds "Moved from X to Y" to its timeline and to recent activity.

### Pipeline

- R30. Six columns in stage order. A header shows the stage name, the number of deals, their total value and their expected revenue.
- R31. Cards show deal name, organization, value, probability, close date and the late tag if it applies. Clicking a card opens the deal page.
- R32. Dragging a card to another column changes its stage. Dragging within a column changes its place. A card can drop anywhere in a column and stays there after a refresh.
- R33. The board's summary strip shows total value and expected revenue of the open deals. Column headers and the strip update the moment a card is dropped, before the server replies. If the server rejects the move, the card goes back and a message says why.
- R34. Each column has an "Add deal" action that opens the new-deal form with that stage preselected.
- R35. Keyboard dragging works: focus a card, press Space, move with arrow keys, press Space to drop.

### Reset and persistence

- R36. Every change is saved at once in SQLite, so it survives refresh and restart.
- R37. The database is created and seeded when its file doesn't exist. `npm run seed` deletes the data and recreates the sample data.

## 7. Sample data

Created by the backend with dates relative to the day it runs (concern 10). It is fixed in code, not random, so tests can rely on it. The same file serves `npm run dev` and `npm run seed`.

- **12 organizations** across software, logistics, healthcare, manufacturing, finance, retail, education and energy, with realistic names, websites and short notes.
- **About 35 contacts**, 2 to 4 per organization, with a few leads and a few customers with no deals open. Statuses are roughly 40% lead, 25% qualified, 35% customer.
- **About 40 deals**, values USD 5k to 100k:
  - 12 Won with close dates spread over the past 12 months (so both charts have a shape, with a clear peak and a dip),
  - 5 Lost in the past months,
  - about 20 open across New, Qualified, Proposal and Negotiation, with expected close dates over the next 4 months,
  - 3 to 4 open deals that are late.
- **About 80 activities**: notes, calls and emails over the past 90 days, 10 to 12 follow-ups open (3 overdue, the rest due in the next 2 weeks), and a few done. Every deal that isn't New has the stage-change entries that match its stage.
- Probabilities follow the stage rules, with two or three set by hand.

## 8. Design

### Principles

Clean, calm and dense enough to be useful. White panels on a pale page, one strong accent, numbers in a monospace face, plenty of space. Tone is plain business English: short labels, no jargon, no exclamation marks.

### Tokens

Defined once as CSS variables, which Tailwind reads, so a dark theme can be added by changing them.

| Token | Value | Use |
| --- | --- | --- |
| `--page` | `#F0F4F5` | page background |
| `--panel` | `#FFFFFF` | panels, cards, dialogs |
| `--ink` | Midnight `#073B4C` | text |
| `--ink-muted` | `#42697A` | secondary text, 5.9:1 on white and 4.8:1 on the pipeline lanes |
| `--primary` | Sea Green `#06D6A0` | primary buttons (Midnight text), selected nav, Won |
| `--secondary` | Marigold `#FFC145` | highlights (Midnight text) |
| `--tertiary` | Coral `#F78C6B` | highlights (Midnight text) |
| `--info` | Cerulean `#118AB2` | links, info (white text) |
| `--alert` | Raspberry `#EF476F` | overdue, late, destructive (white text) |
| `--ink-on-dark` | Sea Mist `#CDD8DB` | text on the dark sidebar |

- **Text on light backgrounds**: Sea Green and Marigold are too bright for small text, so text uses darkened versions (Sea Green about `#05795B`). Each must pass 4.5:1 on white and is checked, not assumed.
- **Fonts**: Instrument Sans for headings and body, JetBrains Mono for all numbers, money, dates in tables, and identifiers, Instrument Serif only for the dashboard's greeting line.
- **Shape**: panels and cards are rounded (12px) with no outline, separated from the page by their white fill and a soft shadow. No single-edge borders and no top-of-page rule. Gradients are not used, except possibly one subtle fill in a chart area.
- **Spacing**: 4px base unit; panel padding 20 to 24px; page margin 32px.

### Stage colors

Used for pipeline column accents, stage tags and funnel bars.

| Stage | Color |
| --- | --- |
| New | Cerulean |
| Qualified | Marigold |
| Proposal | Coral |
| Negotiation | Sea Green (darkened for text) |
| Won | Midnight |
| Lost | Sea Mist, with Midnight text |

Won in Midnight and Lost in Sea Mist keep Sea Green and Raspberry free for meaning "go" and "alert". Color is never the only signal: every tag also has the stage's name.

### Chart colors

Revenue line: Sea Green. Deals bars: Cerulean. Funnel bars: the stage colors. All charts have plain labels and axis titles, light gridlines, and hover tooltips with the exact figure. Money axes use the compact form (`USD 50k`).

### Layout

- A fixed left sidebar, 232px wide, Midnight background, with the product name in Instrument Sans, five nav items with icons and the active one marked by a Sea Green pill, text in Sea Mist.
- A content area on the page color, max width about 1440px, with a page heading and its main action on the right.
- Minimum supported width 1280px.

### Screens

**Dashboard.** The chosen design is mockup A, `docs/mockups/dashboard-a-overview.html` (screenshot beside it). Top: a greeting line in Instrument Serif and today's date. Then the four figure tiles in a row, and under them the open pipeline by stage strip. Then a two-thirds and one-third row: the revenue line chart next to the funnel. Then the deals-won bar chart next to the follow-ups list. The recent activity list sits at the bottom, full width.

**Table pages.** Heading and Add button, a toolbar with the search box (and the status filter on Contacts), then a white panel with the table. Rows are 48px, the header text is small and muted, numbers are right-aligned in mono. The row menu is a three-dot button.

**Record pages.** A header with the name, its tags (status or stage) and Edit and Delete. Below, two columns: details and linked records on the left, the timeline and Log activity on the right. Timeline items have a type icon in a colored circle.

**Pipeline.** The chosen design is in `docs/mockups/dashboard-a-overview.html` (click Pipeline), with a screenshot in `docs/mockups/dashboard-a-pipeline.png`. A summary strip across the top (open deals, total value, expected revenue), then six columns of equal width that fit a laptop without sideways scrolling, each with a stage-colored dot in its header. Each column sits on a pale Sea Mist lane and its header shows the stage name, deal count, total value and expected revenue. Cards show the deal name, organization, value, probability and close date, and a late deal has its date in Raspberry with a "Late" tag. Cards are white with rounded corners and a soft shadow, lifting and tilting slightly while dragged. The column a card would drop into is tinted in Sea Green. After a stage change a short message says "Moved from X to Y". Won and Lost show their most recent cards and a count of the earlier ones. Each column ends with an Add deal button.

**Dialogs and forms.** Centered, 480 to 560px, one column of fields, Cancel on the left of the actions and the primary action on the right. Primary buttons are Sea Green with Midnight text; destructive ones are Raspberry with white text.

### States and feel

- Every list and chart has an empty state with a one-line message.
- Loading shows quiet skeleton shapes, not spinners over blank pages.
- Saving a change shows a short confirmation at the bottom, such as "Deal moved to Proposal".
- Hover, focus and active states exist on everything clickable, with a visible focus ring (Cerulean).
- Pipeline and checkbox updates are optimistic, so the app feels instant.

## 9. Project structure

```
frontend/         React app (Vite)
backend/          FastAPI app, SQLAlchemy Core tables, seed code
e2e/              Playwright tests
data/             SQLite file (git-ignored)
package.json      workspace and scripts at the repo root
pyproject.toml    uv project at the repo root
uv.lock
```

Scripts as in the stack doc: `npm run dev`, `npm test`, `npm run seed`. `docs/STATUS.md` gets the run instructions, including that Node and uv must be installed and that the first run needs internet to fetch packages.

## 10. Testing

- **Backend (pytest)**: the stage, probability, close-date and late rules; move and reorder (positions stay consecutive, probability and stage-change entry written); delete cascades and previews; timeline composition; follow-up states; dashboard figures against a small known data set; seed idempotence.
- **Frontend (Vitest)**: money and date formatting, table sort and search logic, optimistic pipeline totals, form validation.
- **End to end (Playwright with Chrome)**: one test per success criterion in the intent, on a test database with a fixed clock, covering add, search, sort, edit, delete with confirmation, status filter, drag to another column and within one with a refresh in between, logging an activity and a follow-up, marking it done, and the dashboard changing when a deal is won. Each test also fails if the browser console shows an error.
- **By eye**: before calling it done, someone uses it end to end in a real browser and checks every screen against this spec and the brand (criterion 8).

## 11. Suggested build order

Each step ends with something that runs and is checked.

1. **Foundation**: repo scripts, FastAPI and Vite wired together, SQLite tables, theme tokens and fonts, the sidebar shell with five empty pages.
2. **Data and seed**: the full model, the seed data, `npm run seed`, reset test.
3. **Organizations**: API, table, add/edit/delete with confirmation, record page. This builds the shared table and dialog components the next two reuse.
4. **Contacts**, with the status filter and their pages.
5. **Deals**, with the stage rules and late marking.
6. **Activities and timelines**, including follow-ups and stage-change entries.
7. **Pipeline**, with drag and drop, ordering and totals.
8. **Dashboard**, with the charts.
9. **Polish and verification**: empty and loading states, the full end-to-end run, the by-eye pass, `docs/STATUS.md`.
