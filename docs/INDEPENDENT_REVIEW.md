# Independent review: multi-user

Reviewed the current `multi-user` branch against `fork/main`, including the latest commit `549c717` and the review policy in `docs/REVIEW.md`. Focus: code quality and readability, with checks for bugs, security, spec and plan alignment, standards, and test coverage.

## Important findings

### Contact changes clear a deal's contact without updating its audit author

`backend/app/routes/contacts.py` clears `deal.contact_id` when a contact moves to another organization, and `backend/app/common.py` does the same when a contact is deleted. Both are writes to the deal record, but neither sets `updated_by` to the signed-in user. The deal's “Last changed by” can therefore be stale after its main contact changes. This contradicts `docs/specs/accounts.md`, which says every record write updates `updated_by`.

Pass the current user into these related-row updates and set `updated_by` there. Add coverage for both moving and deleting a contact with an associated deal, asserting the deal's contact is cleared and its `updated_by` is the acting user.

## Nits

### The production build still emits the test auth module as a dynamic-import chunk

`frontend/src/lib/config.ts` now dynamically imports `./testAuth`, which keeps it out of the initial JavaScript chunk. Since the import is statically analyzable, the frontend build still emits a separate chunk for that module. The comment that the production bundle “never carries the test client” overstates the effect. The test credential is not accepted by the production backend unless test auth is enabled, so this is a wording and packaging clarity issue rather than an auth bypass. If excluding it from the production artifact is the goal, gate the module through a build-time test-only entry or revise the comment to say it is code-split.
