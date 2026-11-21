# Organizations

Part of the Accountable spec. The index is in `docs/spec.md`.

## Data model

**organization**: `name` (required, unique ignoring case), `website`, `industry`, `notes`.

## API

| Resource      | Endpoints                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Organizations | `GET /organizations`, `POST`, `GET /organizations/{id}` (with contacts and deals), `PATCH`, `DELETE` |

## Requirements

- R16. Table columns: name, industry, website, contacts (count), open deals (count), open deal value.
- R17. Organization page: details with an Edit button, a contacts table with an Add contact action that preselects this organization, and a deals table with an Add deal action that does the same. Linked rows open their own pages.
