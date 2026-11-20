# Status

## Where we are

The MVP is built, phases 0 to 8 of `docs/changes/mvp/plan.md`. All tests pass. Nothing is committed yet.

## Done

- **Backend** (`backend/`): FastAPI and SQLAlchemy Core over SQLite. Organizations, contacts, deals, activities, follow-ups, the pipeline move endpoint, delete previews and the dashboard figures. Business rules are in `app/rules.py`, today's date in `app/clock.py`.
- **Sample data**: 12 organizations, 35 contacts, 40 deals and about 85 activities, dated relative to today. Created when the database file doesn't exist.
- **Frontend** (`frontend/`): React, Vite and Tailwind in the brand look, with self-hosted fonts. All five sections, record pages, timelines, follow-ups, the drag and drop pipeline (mouse and keyboard) and the dashboard with a line chart, a bar chart, the pipeline strip and the funnel.
- **Tests**: 66 backend (pytest), 46 frontend (Vitest), 30 end-to-end (Playwright with Chrome).

## How to run

You need Node 24 or later and uv. The first run needs internet to fetch packages; after that the app works offline.

```
npm install
npm run dev      # API on :8000, app on http://localhost:5173
```

- `npm start` builds the frontend and serves everything from http://localhost:8000.
- `npm test` runs all tests. The end-to-end tests start their own server on port 8100 with their own database (`data/e2e.db`) and a fixed date of 2026-11-17, so your data is untouched. It needs Google Chrome installed.
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

- The by-eye pass in a real browser (success criterion 8) by a person, with the console open. Screenshots of every screen are written to `test-results/screens/` by the end-to-end run.
