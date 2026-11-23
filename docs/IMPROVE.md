# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Look at what went wrong on this change: the review's findings, what the person corrected and what the checks caught. `git log main..HEAD` shows the `Fix:` commits, and `docs/STATUS.md` shows what earlier changes learned, so a mistake can be matched against past ones.
2. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead.
3. Run `git status` after a test run and revert any generated file the change doesn't own. Tests must not write into `docs/changes/`, which is history.
4. Remove anything out of date.
5. Improve this file, so that the next round makes a better change. Keep this as the last step.
