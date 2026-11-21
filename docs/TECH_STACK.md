This project will use the following high level technical stack:

1. Node.js 26, the current LTS (24 or later works) / TypeScript for the frontend, using React and Vite, in `frontend/`
2. Python 3.12 for the backend using uv, with FastAPI, in `backend/`, with `pyproject.toml` and `uv.lock` at the repo root

The frontend gets its data from the backend's JSON API. The backend keeps the data in a local SQLite database file, using SQLAlchemy Core with no raw SQL (the SQLite connection settings in `backend/app/db.py`, such as write-ahead logging, are the one exception), and fills it with the sample data when the database is new.

Prefer popular, well-supported libraries to custom code, such as for the data tables, the charts and the drag-and-drop pipeline. Don't hand-roll what a mature library does well.

For now it runs locally. Later, Supabase will provide sign-in and the database, and the app will be deployed to Render.

Commands are npm scripts in a `package.json` at the repo root, with `frontend/` as an npm workspace, so they work the same on Mac, Linux and Windows:

- `npm run dev` starts the backend and the frontend together
- `npm test` runs all the tests and fails if any test fails
- `npm run seed` resets the database to the sample data
- `npm run check` runs every check and test and fails if any fails; `npm run check:quick` skips the end-to-end tests; `npm run format` fixes the formatting

`docs/STATUS.md` says how to run the app. `README.md` is the course's own guide, so leave it as it is.

Testing will cover:

1. Unit tests for the frontend, using Vitest
2. Unit tests for the backend, using pytest
3. End-to-end tests of the whole app in a browser, in `e2e/`, using Playwright Test (`@playwright/test`) with the installed Google Chrome. They start the app themselves, so `npm test` needs nothing else running.

Code quality checks, all run by `npm run check`:

1. Frontend: Prettier for formatting, ESLint (flat config in `eslint.config.mjs`) with the recommended TypeScript, React Hooks and accessibility (jsx-a11y) rules, and `tsc` for types. TypeScript is held at 6.0.x until typescript-eslint supports 7.
2. Backend: `ruff format` and `ruff check`, and `ty` for types
3. A cyclomatic complexity of at most 15 per function, from ESLint's `complexity` rule and ruff's `C901` rule
4. `gitleaks` for secrets across the repo, with the git-ignored `.env` allowed (`.gitleaks.toml`)
5. Unit test coverage of at least 80%, measured by pytest-cov for the backend and Vitest's v8 coverage for the frontend

The tests use a database of their own, so running them never changes your data.
