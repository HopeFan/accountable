# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong. Pay particular attention to the places where this app can lose or scramble data: deal positions after a move or delete, what gets deleted along with an organization, contact or deal, and the stage, probability and close-date rules.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't. Check that the API validates its input, that database access goes through SQLAlchemy Core with no raw SQL, and that nothing in the app, including fonts and images, is loaded from another host.
- **Matches the spec and plan.md:** the change does what those documents say, with nothing missing and nothing extra. The spec is `docs/spec.md` (the summary and index) and the area files in `docs/specs/` that the change touches; read the index to find them. Flag any code that those files don't describe, any part of them the change makes untrue, and any affected area file or the summary that the change didn't update. The plan is the one in the current change's folder, `docs/changes/<branch name>/plan.md`. For UI work, also check it against `docs/BRAND.md`: the fonts, the colors, plain business English, and money always shown with its currency.
- **Standards:** the change follows `docs/STANDARDS.md`.
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
