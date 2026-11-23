# Spec: Accountable

What Accountable is and does today. This is the first document to read. It is a summary with an index: the detail lives in one file per product area in `docs/specs/`. Each change to the product has its own folder in `docs/changes/`, and when a change is done the area files it affects are updated to match. Stack: `docs/TECH_STACK.md`. Look: `docs/BRAND.md`.

## Problem and goal

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies it deals with, who its contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it is a complete sales CRM that a small team shares on the web, where everyone signs in and works on the same data. Think of it as a private Salesforce that does the everyday CRM essentials really well, and feels sharp, modern and professional.

The user is a salesperson selling B2B services and software, with deals of about USD 5k to 100k, a few contacts per company and sales cycles of weeks to months. It has five sections: Dashboard, Organizations, Contacts, Deals and Pipeline. The code and data model are meant to be a clean foundation for growth, and every interaction should feel instant, with nothing ever lost.

## How it works in short

- It runs on the web, on Render, with the data and sign-in on Supabase. It also runs locally with one command, and needs an internet connection either way. Every change is saved at once and survives a refresh and a restart.
- People sign in with an email and password. There is no sign-up page, because people are added in Supabase's dashboard, and everyone can do everything. Each record shows who added it, by email address.
- A search box in the top bar finds organizations, contacts and deals. A menu under the person's initials holds the theme, the currency (US or Australian dollars, shown with a flag) and Sign out.
- Data is organizations, contacts, deals and activities. Deals move through six stages, and the stage sets their probability and close date.
- The API is JSON over `/api`, served by FastAPI and open only to signed-in people, with a React frontend.
- Light, dark and System themes, designed for laptops from 1280px wide.
- Requirements are numbered R1 to R61 across the area files. Each is testable, and tests and plans refer to them by number.

## Index

| File                                                    | What it covers                                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/specs/platform.md`](specs/platform.md)           | Constraints and out of scope, libraries, deletion and other data rules, API basics, persistence, deployment, sample data, structure, testing |
| [`docs/specs/accounts.md`](specs/accounts.md)           | Sign-in, who added and changed each record, the user menu (R43 to R49)                                                                       |
| [`docs/specs/currency.md`](specs/currency.md)           | The US and Australian dollar switch, its rate and formats (R55 to R61)                                                                       |
| [`docs/specs/search.md`](specs/search.md)               | The top-bar search for organizations, contacts and deals (R50 to R54)                                                                        |
| [`docs/specs/tables.md`](specs/tables.md)               | What every table shares (R1 to R7), table pages, record pages, dialogs and forms                                                             |
| [`docs/specs/organizations.md`](specs/organizations.md) | Organization data, API and pages (R16, R17)                                                                                                  |
| [`docs/specs/contacts.md`](specs/contacts.md)           | Contact data, API and pages (R18 to R21)                                                                                                     |
| [`docs/specs/deals.md`](specs/deals.md)                 | Deal data, stage rules, API and pages (R22 to R25)                                                                                           |
| [`docs/specs/activities.md`](specs/activities.md)       | Activities, timelines, follow-ups (R26 to R29)                                                                                               |
| [`docs/specs/pipeline.md`](specs/pipeline.md)           | The pipeline board, move and reorder (R30 to R35)                                                                                            |
| [`docs/specs/dashboard.md`](specs/dashboard.md)         | The dashboard, its figures and charts (R8 to R15, R9a)                                                                                       |
| [`docs/specs/appearance.md`](specs/appearance.md)       | Light, dark and System themes (R38 to R42), tokens, stage colors, layout, states and feel                                                    |
