# Search

Part of the Accountable spec. The index is in `docs/spec.md`. This is the search box in the top bar. The filter box on each table is R1 in `docs/specs/tables.md`, and is a separate thing.

## API

| Resource | Endpoints                                                                       |
| -------- | ------------------------------------------------------------------------------- |
| Search   | `GET /search?q=...`, returns `{ organizations, contacts, deals }`, up to 5 each |

### Rules worth stating

- Matching ignores case and finds the text anywhere in the name, and it behaves the same on SQLite and Postgres. The characters `%` and `_` in the query mean themselves.
- Organizations match on `name`. Deals match on `name`. Contacts match on first name, last name or the two together, so "ada lov" finds Ada Lovelace.
- Within a group, results are ordered by name. A query of only spaces returns nothing.
- Each result has what the dropdown shows: the name and one line of context (an organization's industry, a contact's organization, a deal's organization and stage).

## Requirements

- R50. Every page has a search box in the top bar, to the left of the user menu. Placeholder: "Search organizations, contacts and deals".
- R51. Typing shows a dropdown under the box that updates as you type, without a request for every keystroke. It lists the results in three groups headed **Organizations**, **Contacts** and **Deals**, a few in each. A group with no results is left out.
- R52. A query with no results shows "No results for" and the query. An empty box shows no dropdown.
- R53. Choosing a result opens its page, closes the dropdown and clears the box. A click or Enter does it, and the up and down arrows move through the results across groups. Escape closes the dropdown.
- R54. The search works for every organization, contact and deal, whoever added it, including sample data.

## Screen

The box is a rounded field in the top bar, on the page color with a magnifying glass icon, and the same field ring as other inputs. The dropdown is a panel like the user menu's: rounded, white in light mode and black with a faint ring in dark mode. Group headings are small and muted. Each row has the name in the body font and its context line in muted text. The highlighted row uses `--soft`. The box is a combobox for screen readers, with the results as its options.
