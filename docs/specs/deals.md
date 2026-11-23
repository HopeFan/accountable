# Deals

Part of the Accountable spec. The index is in `docs/spec.md`. Moving deals between stages by drag is in `docs/specs/pipeline.md`.

## Data model

**deal**:

- `name` (required)
- `organization_id` (required)
- `contact_id` (optional; must belong to the same organization)
- `stage` (`new`, `qualified`, `proposal`, `negotiation`, `won`, `lost`)
- `value` (whole USD, 0 or more; always stored and edited in USD, and only displayed in the chosen currency, `docs/specs/currency.md`)
- `probability` (0 to 100)
- `close_date` (a date)
- `position` (integer, order within its stage)

### Stage rules

| Stage       | Usual probability | Open? |
| ----------- | ----------------- | ----- |
| New         | 5%                | yes   |
| Qualified   | 20%               | yes   |
| Proposal    | 40%               | yes   |
| Negotiation | 70%               | yes   |
| Won         | 100%              | no    |
| Lost        | 0%                | no    |

- A new deal gets its stage's usual probability unless one is given.
- Moving a deal to a different stage sets its probability to the new stage's usual one. A probability edited by hand stays until the stage next changes.
- Moving a deal to Won or Lost sets its close date to today.
- Expected revenue of an open deal is `value × probability / 100`. For Won deals it equals the value, for Lost deals it is 0.
- A deal is **late** when it is open and its close date is before today (local date).

## API

| Resource | Endpoints                                                                  |
| -------- | -------------------------------------------------------------------------- |
| Deals    | `GET /deals`, `POST`, `GET /deals/{id}` (with timeline), `PATCH`, `DELETE` |

### Rules worth stating

- **Edit** of a deal through `PATCH` that changes `stage` behaves like a move and goes to the end of the new column.
- **Create** of a deal takes an optional `position`; without one it is added at the end of its stage's column.

## Requirements

- R22. Table columns: name, organization, contact, stage, value, probability, close date.
- R23. A late deal shows its close date in Raspberry with a "Late" tag, and the same on its pipeline card.
- R24. Deal page: details, links to its organization and contact, a stage selector that moves it like a drag does, and a timeline newest first.
- R25. A **Log activity** button on the page.
