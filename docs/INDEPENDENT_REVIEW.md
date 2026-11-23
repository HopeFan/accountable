# Independent review: currency switch

Reviewed the current `currency` branch against `main`, using `docs/REVIEW.md`. Focus: bugs, security, spec and plan alignment, standards, and test coverage. Style findings were skipped as requested.

## Findings

No Important findings.

The shared formatter covers the amount display call sites, the currency choice is stored only in browser local storage, and the changed docs describe the feature. The added unit and end-to-end tests cover conversion, selection, persistence, dashboard/table/pipeline displays, and the USD deal form. No security issue or untested changed behavior found in the reviewed diff.

## Nits

None reported.
