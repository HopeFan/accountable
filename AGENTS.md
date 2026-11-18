# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Testing

`npm test` runs every test: the backend unit tests (pytest), the frontend unit tests (Vitest) and the end-to-end tests (Playwright with Chrome). It stops and fails if any of them fail. Run it before finishing any piece of work, and fix failures until it passes. It needs `uv` and Google Chrome installed, and it uses its own database, so it never touches your data.
