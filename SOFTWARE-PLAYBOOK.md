# Software playbook

One file: the steps with every prompt, then the blank templates, then lessons. Copy a template into your new project's `docs/` folder when its step says so.
## Quick start: what to do first

1. Make a folder for the app and put `AGENTS.md` and `docs/` in it (templates in Part 2).
2. Open Claude Code in that folder.
3. Don't ask for code. Paste the Step 1 prompt in Part 1 and let it interview you.
4. Work down the steps. After each document, read it, fix it, then commit.
5. Only at Step 6 does it write code, and only from `plan.md`.

The idea behind it: Claude has no memory between sessions. The documents in `docs/` are its memory. Whatever matters goes in a file, never only in the chat.

## Part 1: The steps

The AI-native SDLC has six stages. Each one ends with a document you commit, and in each one you wear a different hat:

| Stage | Your hat | You bring | You commit |
| --- | --- | --- | --- |
| 1. Plan | Product owner | Intent | `docs/intent.md` |
| 2. Design | Product owner | Taste | `docs/spec.md` and a mockup |
| 3. Build | Engineer | Judgment | `docs/plan.md` and the code |
| 4. Test | Engineer | Judgment | Tests and one check command |
| 5. Deploy | Reviewer, then release manager | Accountability | `docs/REVIEW.md` and the merge |
| 6. Maintain | Product owner | Judgment | Notes in `docs/STATUS.md` |

A problem found in Maintain starts the next loop at Plan.

Replace anything in `<angle brackets>`. You review, Claude writes. Every document is read and approved by you before it is the input to the next step.

---

## Step 0: Set up the project

```
mkdir -p ~/projects/<my-app>/docs
cd ~/projects/<my-app>
git init
```

Create `AGENTS.md` and the files in `docs/` from Part 2, or ask Claude: "Create the files from the templates in ~/projects/software-playbook/SOFTWARE-PLAYBOOK.md". Make a first commit (`git add . && git commit -m "Setup"`).

**Branch for the work.** Your `main` holds the finished build. Do the work on a branch and merge it at Deploy:

```
git checkout -b mvp
```

Use a second terminal for git, so Claude's terminal stays free. `git branch` should show `* mvp`.

**If you share your work with a course repo**, fork it on GitHub now (Fork, then Create fork) and add it as a second remote: `git remote add fork https://github.com/<username>/<repo>.git`.

**Ask before pushing.** Set Claude Code to ask before every `git push`.

Done when: `docs/` and `AGENTS.md` exist and `git branch` shows `* mvp`.

---

# Stage 1: Plan (hat: product owner)

## Step 1: Write a rough intent, then be interviewed

First write `docs/intent.md` yourself, even if it's rough. A few lines under Problem and Proposed outcome is enough. Then:

```
Read docs/intent.md and interview me about anything unclear or missing: scope,
users, constraints and what success looks like. Then update intent.md with my answers.
```

If you have no draft at all, use this instead:

```
I want to build <one sentence about the app>. It's for <who>. Interview me, one
question at a time, until you're about 95% sure what I want. Don't suggest features
I didn't ask for. Then write docs/intent.md using the template in docs/intent.md.
```

Claude asks multiple-choice questions, and you can type your own answer instead. Read every change (VS Code's Source Control view shows each edit) and fix whatever Claude got wrong.

Done when: you can read intent.md and say "yes, that's what I want". It has Problem, Proposed outcome, Affected users and systems, Constraints, Success criteria and Open questions.

Commit: `git add . && git commit -m "Plan: intent.md agreed"`

---

# Stage 2: Design (hat: product owner)

## Step 2: Stack and brand

```
Read docs/intent.md. Fill in docs/TECH_STACK.md and docs/BRAND.md. Keep my defaults
in TECH_STACK.md unless the intent needs something else, and tell me each place you
changed one and why. For BRAND.md ask me for fonts and colors, or propose a scheme and
check every text and background pair for a 4.5:1 contrast ratio.
```

Done when: you've approved both. Changing the stack later is expensive.

Commit: `git commit -am "Design: stack and brand"` (use `git add .` first for new files).

## Step 3: The spec

```
Read docs/intent.md and write docs/spec.md with the requirements and the design for
the MVP. Use the brand skill (or docs/BRAND.md). List any concerns at the top.
```

For more rigor, add: "First list every place the intent is vague or silent (deleting things, empty states, rules that interact, what 'today' means, offline use), with your default and why. Number every requirement (R1, R2...) so tests can point to them. Add the API, the database tables and the libraries."

Then resolve the concerns: answer each one and ask Claude to update spec.md.

Product owner checks:
- [ ] It solves the problem in intent.md
- [ ] The open questions are answered or carried forward
- [ ] Each concern is resolved
- [ ] The mockup follows the brand

Commit: `git add . && git commit -m "Design: spec.md"`

## Step 4: Choose the look

```
Make three different mockups of the MVP's dashboard and pipeline as HTML files in
docs/mockups/, following spec.md and the brand skill. Take a screenshot of each
with Playwright and save it beside the HTML.
```

(Use your own main screens in place of "dashboard and pipeline".) Open the screenshots in VS Code and pick the one you like best. Make them visibly different in layout, not just color.

```
I choose mockup <x>. Record my choice and my reasons in docs/spec.md, and delete the others.
```

Done when: you've signed off spec.md and the mockup. This is your taste.

Commit: `git add . && git commit -m "Design: chosen mockup"`

---

# Stage 3: Build (hat: engineer)

No code until you accept a plan.

## Step 5: The plan

`docs/plan.md` has four sections: **Files that change**, **Order of work**, **Risks** and **Proof**.

```
Read docs/intent.md and docs/spec.md and write docs/plan.md with four sections:
Files that change, Order of work, Risks and Proof. Order the work in phases. Proof
lists the unit and end-to-end tests. Don't write any code yet.
```

Question it:
- What could this break?
- Which step is riskiest?
- What did you decide against?

Revise until another engineer could build from plan.md alone. Check that every requirement in the spec has a test in Proof.

Commit: `git add . && git commit -m "Build: plan.md"`

(Anthropic's version of this stage runs in plan mode, where Claude can't edit files until you approve. The course works in Auto mode and commits plan.md with the code. Either works, and plan mode is a good choice for large changes.)

## Step 6: Build the MVP in a fresh session

1. Check you're on the branch: `git branch` shows `* mvp`.
2. `/clear` to start with clean context.
3. Prompt:

```
Implement docs/plan.md, following its order of work. Write the tests in its Proof
section and run them as you go. Leave the commits to me.
```

Add if you like: "Update docs/STATUS.md at the end of each phase. If the spec and plan disagree, stop and ask me."

Commit: `git add . && git commit -m "Build: the MVP"`

---

# Stage 4: Test (hat: engineer)

Give Claude a way to check its own work: change the code, run the checks, fix what failed, repeat until they pass. You then check it yourself.

## Step 7: Close the loop

One command runs all the tests:

```
Make sure npm test runs all the unit and end-to-end tests and fails if any fail. Add
it to AGENTS.md, run it, fix failures until it passes, and show me the output.
```

Check the look:

```
Start the app, use Playwright to compare it with the chosen mockup, and fix what
differs. Show me the screenshots.
```

Check it yourself: run the command, open the app with the browser console open, and check each success criterion in intent.md. Click everything, add, edit and delete records, and try bad input.

Commit: `git add . && git commit -m "Test: check command"`

---

# Stage 5: Deploy (hat: reviewer, then release manager)

Claude reviews first, then a person approves. "The agent that wrote the code has no way to approve it."

## Step 8: Review the branch

1. Write the policy. `docs/REVIEW.md` has Passes (bugs, security, matches spec.md and plan.md), Important (breaks behavior, leaks data or breaks a policy) and Nits (style and naming, at most five per review).

```
Create docs/REVIEW.md by hand, using the policy in course/instructions/week1day3.md,
and change anything you'd judge differently.
```

Without the course folder, start from the template in Part 2 and add the places this app could lose or scramble data.

2. `/clear` so the reviewer starts fresh, then:

```
Review this branch against main with docs/REVIEW.md. Report only, skip style.
```

3. Fix what matters:

```
Fix what matters, use your judgment to spot check, then git add.
```

For each Important finding that touched data, ask to see the test that fails without the fix.

Commit: `git commit -m "Deploy: review fixes"`

## Step 9: You merge it

You accept the MVP by merging into main. Only a person does this.

1. Run the check on the branch (the command in AGENTS.md) and confirm it passes after the fixes.
2. `git checkout main`
3. `git merge mvp`, then `git branch -d mvp`

`git log --oneline` should show a commit for each stage, newest first:

```
Deploy: review fixes
Test: check command
Build: the MVP
Build: plan.md
Design: chosen mockup
Design: spec.md
Plan: intent.md agreed
Setup
```

---

# Stage 6: Maintain (hat: product owner)

Production incidents and new ideas feed back into Stage 1. A trigger (an alert, a ticket, a message or a schedule) leads Claude to diagnose read-only first, with fixes going through review. The finding becomes a new intent.md and the loop starts again at Plan. The owner decides: fix now, schedule or dismiss.

For now, gather feedback by using the MVP yourself.

## Step 10: Use the app and write it down

1. Run it the way `docs/STATUS.md` says.
2. Use it like a real user would. For a CRM: add a deal, move it along the pipeline, log a follow-up. What's missing or wrong?
3. Prompt:

```
Here's what I noticed using the app: [your notes]. Add these to docs/STATUS.md
under Ideas for later, one line each.
```

Commit: `git add . && git commit -m "Maintain: ideas for later"`

Later, for a running service, watch one metric such as the error rate after a deploy: at 1 standard deviation log it, at 2 let Claude diagnose read-only, at 3 let it open a pull request or run a preapproved runbook.

---

## Step 11: Share your documents (optional, for a course)

```
Share today's documents in a pull request to community_contributions, following
course/for_agents/AGENT_GIT_GUIDE.md.
```

Approve each push when Claude asks. The PR comes from a new branch off the course repo's `main`, and adds one folder with five files, all in your folder:

```
community_contributions/<your folder>/
    intent.md  spec.md  plan.md  REVIEW.md  README.md
```

Check on GitHub that the Files changed tab lists those five files and nothing else. The manual commands:

```
mkdir -p community_contributions/<folder>
cp docs/intent.md docs/spec.md docs/plan.md docs/REVIEW.md community_contributions/<folder>/
# write a short README.md in that folder linking to your fork
git push -u fork main                      # your full app, for the README link
git stash -u
git fetch origin
git checkout --no-track -b share-<topic> origin/main
git stash pop
git add community_contributions/<folder>
git commit -m "<message>"
git diff --numstat origin/main...HEAD      # max 5 files, no deletions, only community_contributions/
git push -u fork share-<topic>
```

Then open the pull request on GitHub (base: the course repo's `main`) and `git checkout main`. Never push to someone else's repo directly. The course maintainer merges the PR.

---

## Your repo when you're done

- [ ] `docs/STATUS.md` says how to run it
- [ ] The check in AGENTS.md passes
- [ ] `git log --oneline` shows a commit for each stage
- [ ] `git status` is clean on main
- [ ] Your chosen mockup is in `docs/mockups/`

```
<my-app>/
├── backend/
├── docs/
│   ├── mockups/
│   ├── intent.md
│   ├── plan.md
│   ├── REVIEW.md
│   ├── spec.md
│   └── STATUS.md
├── e2e/
├── frontend/
├── AGENTS.md
├── package.json
└── pyproject.toml
```

## Starting the next project

Repeat from Step 0 in a new folder. Then add anything you learned to Part 3 of this file.

---

## Part 2: Templates

For each one, create the file at the path shown and fill in the `<angle brackets>`.

### AGENTS.md: `AGENTS.md`

````markdown
# <App name>

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/spec.md`: the exact behavior, with numbered requirements
- `docs/plan.md`: the order of work and the tests
- `docs/REVIEW.md`: how changes are reviewed
- `docs/STATUS.md`: what's done so far and how to run it
- `lessons.md`: mistakes to avoid

Update `docs/STATUS.md` when you finish a piece of work.

## Testing

`npm test` runs every test (backend, frontend and end-to-end). It stops and fails if any fail. Run it before finishing any piece of work and fix failures until it passes. Never skip, weaken or delete a test to get to green. Tests use their own database and a fixed date, so they never touch real data.

## Rules

- Don't commit or push unless asked. The user commits.
- If the spec and the plan disagree, or the request is unclear, ask before building.
- Nothing is loaded from another host (fonts, images, scripts).
- Keep to the stack in `docs/TECH_STACK.md`. Ask before adding a different one.
````

### intent: `docs/intent.md`

````markdown
# Intent: <app name>

## Problem

<Who has the problem, and what is painful today? Two or three sentences, plain words.>

## Proposed outcome

<What the app is, in a paragraph. Who uses it, where it runs, and how it should feel.>

### Affected users and systems

- **<Who uses it and what they do>**
- **<Other systems it touches, or "none">**

### Sections (screens)

- **<Section>**: <what it shows and what you can do there>
- **<Section>**: <...>

Say what every list or table can do (search, sort, add, edit, delete) and what deleting asks and warns about.

### Kinds of record

- **<Record>**: <its fields, and what it links to>
- **<Record>**: <...>

State the rules between records: what is required, what is optional, and what is deleted along with what.

### Sample data

<How much, how realistic, and whether dates are relative to today.>

## Constraints

- <Must work offline, must run on one laptop, budget, deadline, data it must not store.>

## Success criteria

- <Things you can check by using the app, for example "I can add a deal and see it on the dashboard".>

## Open questions

- <Things you don't know yet. Claude answers or carries them into spec.md.>

## Out of scope for now

- <Things you've decided not to build yet.>

## Later

- <Where this is going, so the first version doesn't block it.>
````

### Tech stack: `docs/TECH_STACK.md`

````markdown
This project will use the following high level technical stack:

1. Node.js (current LTS) / TypeScript for the frontend, using React and Vite, in `frontend/`
2. Python 3.12 or later for the backend using uv, with FastAPI, in `backend/`, with `pyproject.toml` and `uv.lock` at the repo root

The frontend gets its data from the backend's JSON API. The backend keeps the data in a local SQLite database file, using SQLAlchemy Core with no raw SQL (the SQLite connection settings are the one exception), and fills it with sample data when the database is new.

Prefer popular, well-supported libraries to custom code, such as for data tables, charts and drag and drop. Don't hand-roll what a mature library does well.

For now it runs locally. <Later: sign-in, hosted database, deployment.>

Commands are npm scripts in a `package.json` at the repo root, with `frontend/` as an npm workspace, so they work the same on Mac, Linux and Windows:

- `npm run dev` starts the backend and the frontend together
- `npm test` runs all the tests and fails if any test fails
- `npm run seed` resets the database to the sample data

`docs/STATUS.md` says how to run the app.

Testing will cover:

1. Unit tests for the frontend, using Vitest
2. Unit tests for the backend, using pytest
3. End-to-end tests of the whole app in a browser, in `e2e/`, using Playwright Test with the installed Google Chrome. They start the app themselves, so `npm test` needs nothing else running.

The tests use a database of their own and a fixed date, so running them never changes your data.

<Change anything above that this app needs differently, and say why.>
````

### Brand: `docs/BRAND.md`

````markdown
# Brand

## Fonts

- **Headings and body**: <font>
- **Accent (a tagline or a quote)**: <font>
- **Code, numbers and identifiers**: <font>

The app must work offline, so install fonts from npm (`@fontsource/*`) and never load them from another host.

## Colors

- **Primary**: <name `#hex`>, <text color>
- **Secondary**: <name `#hex`>, <text color>
- **Tertiary**: <name `#hex`>, <text color>
- **Information**: <name `#hex`>, <text color>
- **Highlight or alert**: <name `#hex`>, <text color>
- **Ink on light backgrounds**: <name `#hex`>
- **Ink on dark backgrounds**: <name `#hex`>

Say which colors to use when three, four or five things sit side by side (stages, chart series). Every text and background pairing must reach a 4.5:1 contrast ratio. Bright colors are usually too light for small text, so darken them for text on light backgrounds.

## Surfaces

- **Light mode**: page background `<hex>`, panels and cards `<hex>`
- **Dark mode**: page background `<hex>`, panels and cards `<hex>`

## Avoid

- <Borders on one edge, heavy gradients, anything else you dislike.>

## Tone

Plain business English. Short labels, no jargon, no exclamation marks. Money is always shown with its currency. Down-to-earth language, with no pithy lines like "It's not X. It's Y."
````

### Spec: `docs/spec.md`

````markdown
# Spec: <app name>

Source: `docs/intent.md`. Stack: `docs/TECH_STACK.md`. Look: `docs/BRAND.md`. Chosen design: `docs/mockups/<x>`.

## Concerns

Read these first. Each has the default I chose, so you can overrule it before building.

**Confirmed by you:** <list the numbers you've decided.>

1. **<Vague spot in the intent>.** <The default, and why.>
2. **Offline use.** Fonts and assets come from npm and are served by the app.
3. **Deleting records.** <For each record: what goes with it, and what stays.>
4. **Rules that interact.** <For example, closing something changes a date, or a link must be consistent.>
5. **What "today" means.** One module says what today is, and tests can fix it.
6. **Sample data dates.** <Relative to the day the data is created?>
7. **Money and numbers.** <Format and currency.>
8. **Not covered yet.** <Accessibility, minimum screen width, pagination, other platforms.>

## Requirements

Number each one (R1, R2...). A test should name the requirement it covers.

### <Area, for example Records>

- **R1.** <One testable sentence.>
- **R2.** <...>

### <Area, for example Screens>

- **R10.** <...>

## Data

| Table | Fields | Notes |
| --- | --- | --- |
| <table> | <fields> | <keys, required, defaults> |

## API

| Method and path | What it does | Errors |
| --- | --- | --- |
| `GET /api/<things>` | <...> | <...> |

Validation errors use one format, for example `{detail: [{field, message}]}`.

## Libraries

| Need | Library | Why |
| --- | --- | --- |
| <table, charts, drag and drop, forms> | <name and major version> | <...> |

## Screens

<For each screen: what is on it, the empty state, the error state, and what each button does.>
````

### Plan: `docs/plan.md`

````markdown
# Plan: <app name>

Built from `docs/intent.md` and `docs/spec.md`. The chosen design is in `docs/mockups/`.

Each phase ends with something that runs, its tests passing, a commit and an update to `docs/STATUS.md`. Requirement numbers (R1, R9a and so on) refer to `docs/spec.md`.

## Files that change

### Repo root

| File | What it is |
| --- | --- |
| `package.json` | Workspace with `frontend/` and the scripts `dev`, `test` and `seed`. |
| `pyproject.toml`, `uv.lock` | The Python project. |
| `.gitignore` | `data/`, `node_modules/`, Python caches, Playwright reports. |
| `docs/STATUS.md` | Updated at the end of every phase. |

### `backend/`

| File | What it is |
| --- | --- |
| `app/main.py` | App, routers, error format. |
| `app/db.py` | Engine and tables. The database path comes from an environment variable. |
| `app/clock.py` | The one place that says what today is. |
| `app/rules.py` | Business rules with no database access, so they're easy to test. |
| `app/routes/<thing>.py` | One file per kind of record. |
| `app/seed.py` | The sample data and the reset logic. |
| `tests/` | pytest files, listed under Proof. |

### `frontend/`

| File | What it is |
| --- | --- |
| `src/theme/` | Brand tokens and fonts. |
| `src/lib/` | API client, types, formatting. |
| `src/components/` | Shared pieces. |
| `src/pages/` | One per screen. |

### `e2e/`

| File | What it is |
| --- | --- |
| `playwright.config.ts`, `fixtures.ts` | Own server, own database, fixed date. Fails on console errors and on requests to other hosts. |
| `<area>.spec.ts` | One per area. |

## Order of work

### Phase 0: Skeleton

<What exists at the end: the app starts, `npm test` runs and passes with a single test.>

### Phase 1: Rules and database

<Rules and tables first. Unit tests only.>

### Phase 2: API

<One record at a time. Each endpoint has tests, including errors and deletes.>

### Phase 3: Screens

<One screen at a time, with unit and end-to-end tests.>

### Phase 4: Polish

<Empty states, errors, keyboard use, contrast.>

## Risks

| Risk | How we avoid it |
| --- | --- |
| <What could break or go wrong> | <The step, test or decision that prevents it> |

## Proof

Every test, the requirement it covers, and what would make it fail.

| Test | Covers | Fails if |
| --- | --- | --- |
| `<test name>` | R1 | <what breaks> |

Also required:

- An end-to-end test that no request goes to another host.
- A test that fails on any console error.
- Concurrency tests for anything that renumbers data.

## Done when

- Every phase is finished and `npm test` passes.
- You've used the app by eye with the browser console open.
- The open defaults at the top of the spec are confirmed.
````

### Status: `docs/STATUS.md`

````markdown
# Status

## Where we are

<One or two sentences: which phase, whether tests pass, whether anything is uncommitted.>

## Done

- <Piece of work>: <what exists and where>
- **Tests**: <counts for each kind>

## How to run

You need <Node version> and uv. The first run needs internet to fetch packages.

```
npm install
npm run dev
```

- `npm test` runs all tests.
- `npm run seed` resets the data to the sample data.

## Known limits

- <Things not tested or not built yet.>

## Ideas for later

- <One line each, from using the app.>
````

### Review policy: `docs/REVIEW.md`

````markdown
# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong. Pay particular attention to the places where this app can lose or scramble data: <list them, for example positions after a move or delete, what is deleted along with a record, and rules between dates and states>.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't. Check that the API validates its input, that database access goes through SQLAlchemy Core with no raw SQL, and that nothing in the app, including fonts and images, is loaded from another host.
- **Matches spec.md and plan.md:** the change does what those documents say, with nothing missing and nothing extra. For UI work, also check it against `docs/BRAND.md`: the fonts, the colors, plain business English, and money always shown with its currency.
- **Tests:** new or changed behavior has a test that would fail without it, and no test has been skipped, weakened or deleted to get to green.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change:

- breaks behavior that should work,
- loses, duplicates or reorders data it shouldn't,
- leaks data or lets someone do what they shouldn't,
- breaks a rule in AGENTS.md or the stack in `docs/TECH_STACK.md`, or
- changes behavior with no test covering it.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.
````

## Part 3: Lessons

From building Accountable (a sales CRM). Add to this after every project.

## Process

- Pick a mockup before writing a spec, and a spec before a plan. Each document is the input to the next.
- List the vague spots in the spec at the top with a default for each. Things like "what happens to a contact's deals when it's deleted" cost far more to fix after the build.
- Number the requirements (R1, R2...) so every test can name the one it covers.
- Write the review policy before the code, then review against it. Ask for "report only" first, then "fix what matters".
- When a fix touches data, ask to see the test that fails without it.
- Commit after every step, with a short message that says which step.

## Tests

- One `npm test` that runs everything and fails on any failure. Put it in AGENTS.md.
- Give tests their own database and a fixed date, so results don't change by day and your data is safe.
- An end-to-end fixture should fail on any console error and any request to another host.
- Wait for visible data before counting things on a page, or the test is flaky.
- Use a tall browser window when a test drags things around.
- If a test can't fail, it proves nothing. Break the code once to check the test notices.

## Data

- Anything that renumbers (positions after a move or delete) needs one transaction and a lock, and a test that does many at once.
- Preview and delete should use the same plan, so the confirmation always matches what happens.
- Sort text without caring about upper and lower case.
- Closing a deal sets its close date to today. Rules like this belong in one file with no database access.

## Frontend

- Pin library majors that have types you depend on (TanStack Table v8, not v9).
- Don't refetch a record that was just deleted, or you get 404 errors in the console.
- Drag and drop: keep the overlay unrotated on the outer element, or keyboard dragging breaks. Guard against update loops in the drag-over handler.
- Fonts from npm (`@fontsource`), never from Google, so the app works offline.
- Check every text and background pair for 4.5:1 contrast with a test. Bright brand colors usually fail as text.
- Money always shows its currency.

## Tools

- Raw SQL only in the database connection settings. Everything else through the ORM.
- Don't run the dev server on a port something else uses. Check first.
- Heredocs with many files can be refused by the shell. Write the files with the editor tool.

## Part 4: Working with the agent (context, compact, clear, tips)

### What "context" is

Everything in the current chat (your messages, the files it read, command output) sits in a limited window. As it fills, answers get worse: it forgets early decisions and repeats itself. `/context` shows how full it is.

### Start, continue, clear, compact: which one when

| Situation | Do this |
| --- | --- |
| New app, or a new unrelated task | `/clear`, then start with the prompt below |
| Same task, chat is getting long (about half full) | `/compact`, with instructions |
| A step is finished and committed | `/clear` before the next step. The docs carry the memory. |
| Closed the terminal, want yesterday's chat | `claude --continue` (last session) or `/resume` (pick one) |
| Claude went down a wrong path | Press Esc twice (or `/rewind`) to go back, and don't argue in the same thread |
| Claude is stuck in a loop or repeating itself | `/clear` and restate the goal in one short prompt |
| You want a second opinion on its work | `/clear` first, so the reviewer starts fresh and isn't biased by the build |

Rule of thumb: finish a step, commit, `/clear`. Don't carry a whole project in one chat.

### Prompt to start a fresh session (after /clear)

```
Read AGENTS.md, docs/STATUS.md and docs/plan.md. Tell me in five lines where we
are and what the next step is. Don't change anything yet.
```

### Prompt to compact

```
/compact Keep: the goal, decisions we made and why, the files we changed, failing
tests and their error text, and what's left to do. Drop: file listings, successful
command output and anything we've abandoned.
```

### Prompt before you stop for the day

```
Update docs/STATUS.md: what's done, what's half done, what to do next, and any
decision we made today that isn't written down yet. Don't commit.
```

### Prompt when it feels lost

```
Stop. Read docs/spec.md and docs/plan.md again. Tell me which phase we're in, what
you were about to do, and whether it matches the plan. Don't change anything yet.
```

### Prompt when a test fails and it wants to change the test

```
Don't change the test. Explain why it fails, and show me which of the code or the test
is wrong, with the requirement from docs/spec.md that says so.
```

### Tips that matter

1. **Documents before code.** Intent, spec, plan, then build. Most bad results come from skipping one.
2. **One step at a time.** A big vague request gets a big vague result. Say what "done" looks like.
3. **Say what not to do.** "Leave the commit to me", "Report only", "Don't change anything yet".
4. **Use plan mode** (Shift+Tab until it says plan) to have it propose before it edits. Good for anything that touches many files.
5. **Make it prove it.** Ask for the test that fails without a fix, and for the actual output of `npm test`, not "it passes".
6. **Check the tests aren't weakened.** Ask: "Did you skip, loosen or delete any test?"
7. **Read what it wrote.** Documents, tests and the diff. If you can't explain a change, ask it to explain.
8. **Review with a fresh chat.** Reviewing in the chat that built the code is weaker. `/clear`, then review against `docs/REVIEW.md`.
9. **Commit often, and commit yourself.** A commit after each step is your undo button. `git log --oneline` shows where you are.
10. **Put rules in AGENTS.md, not in chat.** If you've said the same thing twice, it belongs in the file. Keep it short, because it's read every session.
11. **Ask it to ask.** "Ask me before you assume anything" avoids silent guesses. Ask for the vague spots to be listed with a default each.
12. **Look at it yourself.** Run the app with the browser console open. Tests only check what someone thought of.
13. **When it's wrong twice, change the approach.** Clear, rewrite the prompt with what you learned, and don't keep patching.
14. **Control access.** Nothing is pushed, deleted or installed globally without your go-ahead. Never paste passwords or keys into the chat.
15. **Keep secrets and personal data out of files it writes**, and check `git status` before every push.
16. **Add to the lessons.** Every time something bites you, add a line to Part 3.

### Files and what each is for

| File | Purpose | Who reads it |
| --- | --- | --- |
| `AGENTS.md` | Short rules and a map of the docs | Claude, every session |
| `docs/intent.md` | What and why | You, and Claude when it needs the big picture |
| `docs/spec.md` | Exact behavior, numbered | Claude when building, tests point to it |
| `docs/plan.md` | Order of work and the tests | Claude, every build session |
| `docs/STATUS.md` | Where we are and how to run it | Claude at the start, you after a break |
| `docs/REVIEW.md` | What counts as a problem | The reviewer chat |

If your tool reads `CLAUDE.md` and not `AGENTS.md`, make a `CLAUDE.md` with one line, `@AGENTS.md`, so there is one set of rules.
