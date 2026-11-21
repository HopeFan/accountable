# Tables, forms and record pages

Part of the Accountable spec. The index is in `docs/spec.md`. What Organizations, Contacts and Deals share.

## Requirements: every table

- R1. A search box filters rows as you type, over all visible text columns.
- R2. Clicking a column heading sorts ascending, again descending, again clears the sort. The sorted column shows an arrow. Numbers and dates sort by value, not text.
- R3. An "Add" button opens a dialog form. Required fields are marked, errors show under the field, and saving closes the dialog and shows the row.
- R4. Each row has Edit and Delete in a row menu.
- R5. Delete opens a dialog that names the record and, from the delete preview, says what else goes. For example: "Delete Northwind Logistics? This also deletes 4 contacts, 3 deals and 17 activities. This can't be undone." The button says "Delete" in Raspberry. Nothing is removed until confirmed.
- R6. Clicking a row's name opens its page.
- R7. An empty table or no search results shows a plain message and, for an empty table, the Add button.

## Screens

**Table pages.** Heading and Add button, a toolbar with the search box (and the status filter on Contacts), then a white panel with the table. Rows are 48px, the header text is small and muted, numbers are right-aligned in mono. The row menu is a three-dot button.

**Record pages.** A header with the name, its tags (status or stage) and Edit and Delete. Below, two columns: details and linked records on the left, the timeline and Log activity on the right. Timeline items have a type icon in a colored circle. The details show who added the record and who last changed it, or "Sample data" (R46, `docs/specs/accounts.md`). The tables don't have columns for this.

**Dialogs and forms.** Centered, 480 to 560px, one column of fields, Cancel on the left of the actions and the primary action on the right. Primary buttons are Sea Green with Midnight text; destructive ones are Raspberry with white text.
