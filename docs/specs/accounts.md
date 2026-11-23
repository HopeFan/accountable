# Accounts: sign-in, who did what, and the user menu

Part of the Accountable spec. The index is in `docs/spec.md`. Search is in `docs/specs/search.md`, the theme choice in `docs/specs/appearance.md`.

A small team shares one Accountable. Everyone signs in, everyone sees and changes the same organizations, contacts and deals, and each record shows who added it. There are no roles: everyone can do everything.

## How sign-in works

- Sign-in is Supabase Auth with an email and a password. The browser holds only the publishable key (`SUPABASE_PUBLISHABLE_KEY`) and talks to `SUPABASE_URL`.
- There is no sign-up page. People are added in Supabase's dashboard.
- Not included: Google sign-in, magic links, password reset, roles and permissions.
- The browser sends the session's token with every API request. The backend checks it on every request and takes the person from it. A person named in a request body or a query is never trusted.
- A person is identified and shown by their email address, everywhere. Nothing comes from a Supabase profile or user metadata.

## Data model

Each organization, contact, deal and activity has two more fields, set by the backend and never accepted from the client:

- `created_by`: the email of the person who added it
- `updated_by`: the email of the person who last changed it

Both are empty for sample data. They are stored as the email text read from the token at the time, so an email changed later in Supabase doesn't rewrite old records.

A change means any write to the record: an edit, a follow-up marked done or reopened, a move on the pipeline. A move changes the moved deal only. The other deals that are renumbered to keep positions consecutive keep their `updated_by`.

## API

| Resource | Endpoints                                                      |
| -------- | -------------------------------------------------------------- |
| Session  | `GET /me`, returns the signed-in person's email (for the menu) |

Every route under `/api`, this one included, answers `401` with `{ "detail": ... }` when the token is missing, invalid or expired. Records in responses include `created_by` and `updated_by`. Outside `/api` only `/healthz` and `/config.json` are public; `/docs`, `/redoc` and `/openapi.json` are switched off.

## Requirements

- R43. Signed out, every address shows the sign-in screen and nothing else of the app. It has an email field, a password field and a **Sign in** button. A wrong email or password shows "Email or password is wrong" under the form. Nothing about sign-up or a forgotten password appears.
- R44. Signed in, the app works as it did before. The session survives a refresh and a restart of the browser until Supabase expires it. When the session is no longer valid, the app returns to the sign-in screen and, after signing in again, opens the address the person was on.
- R45. Signed out, every API route refuses with `401`. This holds for the pages' data, the search, the dashboard and the moves alike.
- R46. Each record and activity shows who added it as "Added by name@example.com", and "Sample data" when it has no author. Record pages also show "Last changed by" with the same rule. Timeline rows and recent activity rows show who added the activity.
- R47. A stage change entry records the person who moved the deal. It is shown the same way, as the person who added that entry.
- R48. The top right of every page has a button with the person's initials, the first two letters of their email address, in capitals. It opens a menu with, from the top: their email address, the theme choice (**Light**, **Dark**, **System**, one marked as selected), the currency choice (**US dollar**, **Australian dollar**, one marked as selected, `docs/specs/currency.md`) and **Sign out**. The menu opens and closes with the keyboard, has a visible focus ring and closes on Escape or a click outside.
- R49. **Sign out** ends the session and shows the sign-in screen. Back and refresh don't show the app again.

## Screens

**Sign-in.** A centered panel on the page color with the product name, the two fields and the button. It uses the tokens, so it follows the saved theme like every other screen. Errors use `--alert-text`. No sidebar and no top bar.

**User menu.** A small rounded panel under the initials button. The initials sit in a Sea Green circle with Midnight text, with the current currency's flag as a small badge at its corner. The theme choice is a group of three radio-style items, and the selected one has a check. In dark mode the panel has the usual faint ring.

**Who added it.** Plain muted text in the details on a record page, in mono for the email. On a timeline row it sits in the row's small print beside the time.

## Tests and sign-in

The end-to-end tests and the ui-check agent sign in without anyone's real password and never contact Supabase. The backend's token check can be replaced in tests by one that accepts a fixed test person, and that replacement can't be switched on by the settings Render uses. CI needs no secrets and `npm run check` passes with or without the Supabase settings in `.env`.
