# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: what the product is and does today. Read this first
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/STATUS.md`: what's done so far

Each change has its own folder, `docs/changes/<branch name>/`, with its `intent.md` (what the change is for) and `plan.md` (how it gets built). Only read the folder of the change you're working on, which is the one named after the current branch. Other folders are history. When a change is done, update `docs/spec.md` so it describes the product as it now stands.

Update `docs/STATUS.md` when you finish a piece of work

At Deploy, after the review fixes and before the merge, follow `docs/IMPROVE.md`.

## Checks

`npm run check` runs everything that must pass before work is done: Prettier and ESLint (TypeScript, React Hooks, accessibility, complexity ≤ 15), ruff format and ruff check (including C901 ≤ 15), tsc, ty, gitleaks, and `npm test` with unit coverage of at least 80%. `npm run check:quick` is the same without the end-to-end tests. `npm run format` fixes formatting. Fix what the checks find; never weaken a rule. If a rule doesn't suit the project, ask first.

## Testing

`npm test` runs every test: the backend unit tests (pytest), the frontend unit tests (Vitest) and the end-to-end tests (Playwright with Chrome). It stops and fails if any of them fail. Run it before finishing any piece of work, and fix failures until it passes. It needs `uv` and Google Chrome installed, and it uses its own database, so it never touches your data.
