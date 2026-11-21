# Activities, timelines and follow-ups

Part of the Accountable spec. The index is in `docs/spec.md`.

## Data model

- `type` (`note`, `call`, `email`, `stage_change`)
- `contact_id` (optional), `deal_id` (optional), at least one required
- `description`
- `occurred_at` (date and time, default now)
- `follow_up_date` (optional date)
- `follow_up_done` (boolean)
- `created_by`, `updated_by` (see `docs/specs/accounts.md`)

`stage_change` is made by the system, never by hand. Its description is generated, such as "Moved from Proposal to Negotiation", the entry hangs on the deal only, and it can't be edited. Its `created_by` is the person who moved the deal, and sample ones have none.

### Timelines

**Timelines.** A deal's timeline is all activities with its `deal_id`. A contact's timeline is activities with that `contact_id`, plus activities on deals where they are the main contact. Both are newest first by `occurred_at`.

### Follow-ups

**Follow-ups.** A follow-up is an activity with a `follow_up_date` and `follow_up_done` false. It is **overdue** when the date is before today and **upcoming** otherwise.

## API

| Resource   | Endpoints                                                               |
| ---------- | ----------------------------------------------------------------------- |
| Activities | `POST /activities`, `PATCH /activities/{id}`, `DELETE /activities/{id}` |
| Follow-ups | `GET /follow-ups` (open ones, soonest first)                            |

## Requirements

- R26. The Log activity form: type (note, call, email), description, when it happened (default now), an optional follow-up date.
- R27. A timeline row shows the type icon, description, time, who added it ("Sample data" if no one did), and its follow-up with its state (open, done, overdue) if there is one. A follow-up can be marked done or reopened from the row.
- R28. Notes, calls and emails can be edited and deleted from the timeline. Stage-change entries have Delete only.
- R29. Moving a deal to another stage, by drag, by the stage selector or by editing, adds "Moved from X to Y" to its timeline and to recent activity.
