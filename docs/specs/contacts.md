# Contacts

Part of the Accountable spec. The index is in `docs/spec.md`.

## Data model

**contact**: `first_name`, `last_name` (required), `email`, `phone`, `job_title`, `organization_id` (optional), `status` (`lead`, `qualified`, `customer`; default `lead`).

## API

| Resource | Endpoints                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Contacts | `GET /contacts`, `POST`, `GET /contacts/{id}` (with organization, deals and timeline), `PATCH`, `DELETE` |

## Requirements

- R18. Table columns: name, organization, job title, email, phone, status.
- R19. A status filter (All, Lead, Qualified, Customer) sits beside the search box and combines with it.
- R20. Contact page: details, organization link, their deals, and a timeline of their activities, newest first.
- R21. A **Log activity** button on the page.
