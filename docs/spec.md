# Spec: Accountable

What Accountable is and does today. This is the first document to read. Each change to the product has its own folder in `docs/changes/`, and when a change is done this spec is updated to match. Stack: `docs/TECH_STACK.md`. Look: `docs/BRAND.md`.

## 1. Problem and goal

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies it deals with, who its contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it is a complete sales CRM for one person, running on their own computer. Think of it as a private Salesforce that does the everyday CRM essentials really well, and feels sharp, modern and professional.

The user is a salesperson selling B2B services and software, with deals of about USD 5k to 100k, a few contacts per company and sales cycles of weeks to months. It has five sections: Dashboard, Organizations, Contacts, Deals and Pipeline. The code and data model are meant to be a clean foundation for growth, and every interaction should feel instant, with nothing ever lost.

## 2. Constraints and out of scope

- It runs locally with one documented command that works on Mac, Linux and Windows (only the Mac is tested), and needs no internet connection to use. Fonts are installed from npm (`@fontsource/*`) and served by the app, never loaded from another host.
- Every change is kept: it survives a browser refresh and a restart.
- One documented command resets the data to the sample data.
- Light and dark modes, light by default, designed for laptops from 1280px wide. The device's own dark mode setting is not followed. There is no pagination: tables load every record and search and sort run in the browser, which is fine for one user's data but needs a rethink before team data arrives.
- Not part of the product: sign-in, user accounts or several users, following the device's dark mode setting, phone layouts, AI features, email/calendar/phone integrations, currencies other than US dollars, reports beyond the dashboard, tags and custom fields, editable stages, import and export.

## 3. Libraries

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

`stage_change` is made by the system, never by hand. Its description is generated, such as "Moved from Proposal to Negotiation", the entry hangs on the deal only, and it can't be edited.

**Stage rules**

| Stage       | Usual probability | Open? |
| ----------- | ----------------- | ----- |
| New         | 5%                | yes   |
| Qualified   | 20%               | yes   |
| Proposal    | 40%               | yes   |
| Negotiation | 70%               | yes   |
| Won         | 100%              | no    |
| Lost        | 0%                | no    |

- A new deal gets its stage's usual probability unless one is given.
- Moving a deal to a different stage sets its probability to the new stage's usual one. A probability edited by hand stays until the stage next changes.
- Moving a deal to Won or Lost sets its close date to today.
- Expected revenue of an open deal is `value × probability / 100`. For Won deals it equals the value, for Lost deals it is 0.
- A deal is **late** when it is open and its close date is before today (local date).

**Deletion.** Deleting an organization also deletes its contacts, deals and their activities. Deleting a contact deletes their own activities, and their deals stay with no main contact. Deleting a deal deletes its activities. Every delete confirmation says exactly what goes. A `stage_change` entry can be deleted by hand like any entry, but moving a deal never deletes them.

**Other rules.** A contact's organization is optional, because a new lead often has no company yet; a deal always has one. A deal's contact must work at the deal's organization, so the pipeline and the contact pages never disagree. Money reads `USD 48,000` everywhere, and compact on chart axes, such as `USD 50k`.

**Timelines.** A deal's timeline is all activities with its `deal_id`. A contact's timeline is activities with that `contact_id`, plus activities on deals where they are the main contact. Both are newest first by `occurred_at`.

**Follow-ups.** A follow-up is an activity with a `follow_up_date` and `follow_up_done` false. It is **overdue** when the date is before today and **upcoming** otherwise.

## 5. API

JSON over `/api`, served by FastAPI on one port in development with the frontend proxied by Vite. Errors return a status code and `{ "detail": ... }`. Validation errors name the field so the form can show them.

| Resource       | Endpoints                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Organizations  | `GET /organizations`, `POST`, `GET /organizations/{id}` (with contacts and deals), `PATCH`, `DELETE`     |
| Contacts       | `GET /contacts`, `POST`, `GET /contacts/{id}` (with organization, deals and timeline), `PATCH`, `DELETE` |
| Deals          | `GET /deals`, `POST`, `GET /deals/{id}` (with timeline), `PATCH`, `DELETE`                               |
| Pipeline       | `POST /deals/{id}/move` with `{ stage, position }`                                                       |
| Activities     | `POST /activities`, `PATCH /activities/{id}`, `DELETE /activities/{id}`                                  |
| Follow-ups     | `GET /follow-ups` (open ones, soonest first)                                                             |
| Dashboard      | `GET /dashboard`                                                                                         |
| Delete preview | `GET /organizations/{id}/delete-preview`, same for contacts and deals; returns counts of what would go   |

Rules worth stating:

- **Move** runs in one transaction: it changes the stage if needed, applies the probability and close-date rules, and `position` is the new index in the target column. The others in the source and target columns are renumbered so positions stay consecutive. A stage change also writes its `stage_change` activity.
- **Edit** of a deal through `PATCH` that changes `stage` behaves like a move and goes to the end of the new column.
- **Create** of a deal takes an optional `position`; without one it is added at the end of its stage's column.
- **Dashboard** returns all figures in one response so the figures always agree with each other.
- Lists return everything (no pagination).
- List responses include the joined names the tables show, such as the organization's name on a deal.

## 6. Requirements by section

Each is testable. "R" numbers are referenced by tests and plans.

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
- R12. **Sales funnel**: for each stage from New to Won, the value of non-lost deals at that stage or later (each deal counts at its current stage and every earlier one), with a plain note giving the value of Lost deals.
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

### Appearance

- R38. A toggle at the bottom of the sidebar switches between light and dark mode. It is on every page, so every section has it.
- R39. Light mode is the default. The choice is remembered in the browser only (local storage), not in the database, and is applied before the page paints, so a reload in dark mode never flashes light.
- R40. Every screen follows the mode: tables, record pages, the dashboard and its charts, the pipeline, dialogs, forms, menus and the confirmation messages. Nothing stays light in dark mode.
- R41. Light mode looks exactly as it did before dark mode, apart from the toggle.
- R42. Small text in dark mode passes the same 4.5:1 contrast as in light mode, checked for every pairing in section 8.

## 7. Sample data

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

## 8. Design

### Principles

Clean, calm and dense enough to be useful. In light mode, white panels on a pale page; in dark mode, black panels on a deep teal page. One strong accent, numbers in a monospace face, plenty of space. Tone is plain business English: short labels, no jargon, no exclamation marks.

### Tokens

Defined once as CSS variables, which Tailwind reads. Light mode sets them on the page, and dark mode sets the same names again when the page is in dark mode, so no component carries colors of its own. The brand colors (Sea Green, Marigold, Coral, Cerulean, Raspberry) keep their values for fills in both modes. Dark mode changes the surfaces, the ink and the text and tint colors.

| Token             | Light                         | Dark                         | Use                                                                                                   |
| ----------------- | ----------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `--page`          | `#F0F4F5`                     | `#04232E`                    | page background                                                                                       |
| `--panel`         | `#FFFFFF`                     | `#000000`                    | panels, cards, dialogs                                                                                |
| `--ink`           | Midnight `#073B4C`            | Sea Mist `#CDD8DB`           | text                                                                                                  |
| `--muted`         | `#42697A`                     | `#8FA9B2`                    | secondary text, at least 4.5:1 on panels, the page, pills and the pipeline lanes                      |
| `--soft`          | `#E6EDEF`                     | `#0F3340`                    | pills, stat boxes, loading skeletons                                                                  |
| `--lane`          | Sea Mist at 40% over the page | Sea Mist at 8% over the page | pipeline lanes                                                                                        |
| `--primary`       | Sea Green `#06D6A0`           | same                         | primary buttons, selected nav, Negotiation                                                            |
| `--secondary`     | Marigold `#FFC145`            | same                         | highlights, Qualified                                                                                 |
| `--tertiary`      | Coral `#F78C6B`               | same                         | highlights, Proposal                                                                                  |
| `--info`          | Cerulean `#118AB2`            | same                         | info                                                                                                  |
| `--alert`         | Raspberry `#EF476F`           | same                         | overdue and late markers                                                                              |
| `--on-accent`     | Midnight `#073B4C`            | same                         | text on Sea Green, Marigold and Coral fills                                                           |
| `--sidebar`       | Midnight `#073B4C`            | same                         | the sidebar background, in both modes                                                                 |
| `--on-sidebar`    | Sea Mist `#CDD8DB`            | same                         | text on the sidebar                                                                                   |
| `--panel-edge`    | none                          | Sea Mist at 10% opacity      | a 1px ring around every panel, card and dialog, in dark mode only; it is the dark value of `--shadow` |
| `--sidebar-muted` | `#8FA9B2`                     | same                         | the sidebar footer text                                                                               |
| `--float`         | Midnight `#073B4C`            | `#000000`                    | toasts and chart tooltips                                                                             |
| `--on-float`      | `#FFFFFF`                     | Sea Mist `#CDD8DB`           | text on toasts and tooltips                                                                           |
| `--won`           | Midnight `#073B4C`            | Sea Mist `#CDD8DB`           | the Won tag and dot                                                                                   |
| `--on-won`        | `#FFFFFF`                     | Midnight `#073B4C`           | text on the Won tag                                                                                   |
| `--lost`          | Sea Mist `#CDD8DB`            | Midnight `#073B4C`           | the Lost tag and dot                                                                                  |
| `--on-lost`       | Midnight `#073B4C`            | Sea Mist `#CDD8DB`           | text on the Lost tag                                                                                  |
| `--alert-solid`   | `#C2284F`                     | same                         | destructive buttons, with white text                                                                  |
| `--info-solid`    | `#0E7394`                     | same                         | the New stage block, with white text                                                                  |
| `--overlay`       | Midnight at 40%               | black at 60%                 | behind dialogs                                                                                        |
| `--field-ring`    | `#CDD8DB`                     | `#245160`                    | the ring around form fields and the chart cursor                                                      |
| `--checkbox-edge` | `#9DB5BE`                     | `#5F808C`                    | the follow-up checkbox border                                                                         |
| `--grid`          | `#E6EDEF`                     | Sea Mist at 12%              | chart gridlines                                                                                       |
| `--axis`          | `#4C7280`                     | `#8FA9B2`                    | chart labels                                                                                          |

- **Text and tint colors**: Sea Green, Marigold and Coral are too bright for small text on a light background, so light mode uses darkened versions (Sea Green about `#05795B`), each on a pale tint. Dark mode does the opposite and lightens them (Sea Green `#4DE3B8`, Cerulean `#62C4E6`, Raspberry `#FF8DA6`, Marigold `#FFC145`, Coral `#FFA98C`), each on a dark tint (for example `#0B3A31` for green). The tokens are `--primary-text`, `--info-text`, `--alert-text`, `--marigold-text`, `--coral-text` and `--primary-tint`, `--info-tint`, `--alert-tint`, `--marigold-tint`, `--coral-tint`. Each pairing must pass 4.5:1 and is checked, not assumed.
- **Solid fills with white text**: destructive buttons use the darker Raspberry `#C2284F` and the New stage uses the darker Cerulean `#0E7394`, both with white text, in both modes.
- **Fonts**: Instrument Sans for headings and body, JetBrains Mono for all numbers, money, dates in tables, and identifiers, Instrument Serif only for the dashboard's greeting line.
- **Shape**: panels and cards are rounded (12px), separated from the page by their fill (white on pale in light mode, black on deep teal in dark mode). Light mode has no outline and uses a soft shadow. A shadow is too faint to see in dark mode, and black on deep teal is only 1.29:1, so dark mode uses a faint 1px ring all the way around each panel, card and dialog (`--panel-edge`) in its place. No single-edge borders and no top-of-page rule. Gradients are not used, except possibly one subtle fill in a chart area.
- **Spacing**: 4px base unit; panel padding 20 to 24px; page margin 32px.

### Stage colors

Used for pipeline column accents, stage tags and funnel bars.

| Stage       | Light mode                    | Dark mode                      |
| ----------- | ----------------------------- | ------------------------------ |
| New         | Cerulean                      | same                           |
| Qualified   | Marigold                      | same                           |
| Proposal    | Coral                         | same                           |
| Negotiation | Sea Green (darkened for text) | Sea Green (lightened for text) |
| Won         | Midnight, with white text     | Sea Mist, with Midnight text   |
| Lost        | Sea Mist, with Midnight text  | Midnight, with Sea Mist text   |

Raspberry is kept for overdue and late things, so a Lost deal doesn't look like an alert. Won and Lost use Midnight and Sea Mist, swapped in dark mode so Won still stands out and Lost still recedes, and that keeps Sea Green and Raspberry free for meaning "go" and "alert". Color is never the only signal: every tag also has the stage's name.

### Chart colors

Revenue line: Sea Green. Deals bars: Cerulean. Funnel bars: the stage colors. All charts have plain labels and axis titles, light gridlines, and hover tooltips with the exact figure. Money axes use the compact form (`USD 50k`). In dark mode the labels, axis titles, gridlines and tooltips take the dark tokens (gridlines a faint Sea Mist, tooltips on the black panel color), and the series colors stay the same.

### Layout

- A fixed left sidebar, 232px wide, Midnight background in both modes, with the product name in Instrument Sans, five nav items with icons and the active one marked by a Sea Green pill, text in Sea Mist. The light and dark mode toggle sits at the bottom of the sidebar, shows the mode it will switch to ("Dark mode" or "Light mode") with an icon, and has a visible focus ring like every other control.
- A content area on the page color, max width about 1440px, with a page heading and its main action on the right.
- Minimum supported width 1280px.

### Screens

**Dashboard.** The design is mockup A, `docs/mockups/dashboard-a-overview.html` (screenshot beside it). The mockup shows light mode; dark mode is the same layout with the dark tokens. Top: a greeting line in Instrument Serif and today's date. Then the four figure tiles in a row, and under them the open pipeline by stage strip. Then a two-thirds and one-third row: the revenue line chart next to the funnel. Then the deals-won bar chart next to the follow-ups list. The recent activity list sits at the bottom, full width.

**Table pages.** Heading and Add button, a toolbar with the search box (and the status filter on Contacts), then a white panel with the table. Rows are 48px, the header text is small and muted, numbers are right-aligned in mono. The row menu is a three-dot button.

**Record pages.** A header with the name, its tags (status or stage) and Edit and Delete. Below, two columns: details and linked records on the left, the timeline and Log activity on the right. Timeline items have a type icon in a colored circle.

**Pipeline.** The design is in `docs/mockups/dashboard-a-overview.html` (click Pipeline), with a screenshot in `docs/mockups/dashboard-a-pipeline.png`. A summary strip across the top (open deals, total value, expected revenue), then six columns of equal width that fit a laptop without sideways scrolling, each with a stage-colored dot in its header. Each column sits on a pale Sea Mist lane and its header shows the stage name, deal count, total value and expected revenue. Cards show the deal name, organization, value, probability and close date, and a late deal has its date in Raspberry with a "Late" tag. Cards are white with rounded corners and a soft shadow, lifting and tilting slightly while dragged. The column a card would drop into is tinted in Sea Green. After a stage change a short message says "Moved from X to Y". Won and Lost show their most recent cards and a count of the earlier ones. Each column ends with an Add deal button.

**Dialogs and forms.** Centered, 480 to 560px, one column of fields, Cancel on the left of the actions and the primary action on the right. Primary buttons are Sea Green with Midnight text; destructive ones are Raspberry with white text.

### States and feel

- Every list and chart has an empty state with a one-line message.
- Loading shows quiet skeleton shapes, not spinners over blank pages.
- If a list, page or the pipeline can't load, it shows an error with a retry button, never a skeleton that doesn't go away.
- Saving a change shows a short confirmation at the bottom, such as "Deal moved to Proposal".
- Hover, focus and active states exist on everything clickable, with a visible focus ring (Cerulean).
- Pipeline and checkbox updates are optimistic, so the app feels instant.

## 9. Project structure

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

## 10. Testing

- **Backend (pytest)**: the stage, probability, close-date and late rules; move and reorder (positions stay consecutive, probability and stage-change entry written); delete cascades and previews; timeline composition; follow-up states; dashboard figures against a small known data set; seed idempotence.
- **Frontend (Vitest)**: money and date formatting, table sort and search logic, optimistic pipeline totals, the pipeline's drag and drop rules, form validation, and each page's loading, empty and error states.
- **End to end (Playwright with Chrome)**: one test per area of behavior, on a test database with a fixed clock, covering add, search, sort, edit, delete with confirmation, status filter, drag to another column and within one with a refresh in between, logging an activity and a follow-up, marking it done, the dashboard changing when a deal is won, and the dark mode toggle working and being remembered after a reload. Each test also fails if the browser console shows an error.
- **Coverage**: unit test coverage must stay at 80% or more, for the backend (statements) and the frontend (statements, branches, functions and lines). `npm run check` fails below that.
- **Checks**: `npm run check` also runs Prettier and ESLint (TypeScript, React Hooks and accessibility rules), ruff format and check, tsc, ty and gitleaks. No function may have a cyclomatic complexity above 15 (ESLint `complexity`, ruff `C901`). Rules are fixed in the code, not switched off.
- **Contrast**: a unit test reads the tokens and checks every text and background pairing used for small text, in light and in dark mode, at 4.5:1 or more.
- **By eye**: before calling it done, someone uses it end to end in a real browser, in both modes, and checks every screen against this spec and the brand.
