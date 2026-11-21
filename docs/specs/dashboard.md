# Dashboard

Part of the Accountable spec. The index is in `docs/spec.md`.

## API

| Resource  | Endpoints        |
| --------- | ---------------- |
| Dashboard | `GET /dashboard` |

### Rules worth stating

- **Dashboard** returns all figures in one response so the figures always agree with each other.

## Requirements

- R8. Opens at `/`, the landing page.
- R9. **Figure tiles**: open pipeline value, expected revenue of the open pipeline, revenue won this month (with deals won this month), and overdue follow-ups.
- R10. **Revenue won** line chart, the last 12 months including this one, from Won deals' close dates.
- R11. **Deals won** bar chart for the same 12 months.
- R12. **Sales funnel**: for each stage from New to Won, the value of non-lost deals at that stage or later (each deal counts at its current stage and every earlier one), with a plain note giving the value of Lost deals.
- R13. **Recent activity**: the latest 10 activities of all types, including stage changes, each linking to its deal or contact.
- R14. **Follow-ups**: open follow-ups, overdue ones first and marked in Raspberry, then upcoming by date. Each has a checkbox that marks it done and removes it from the list at once, and a link to its deal or contact.
- R9a. **Open pipeline by stage**: a strip under the tiles with one block per open stage (New to Negotiation), as wide as its share of the open value. Each block shows the stage, its deal count and its value. A slim bar below shows the stage's probability of close, with the expected revenue it stands for.
- R15. Every figure comes from `GET /dashboard`, and it refreshes after any change anywhere in the app.

## Screen

**Dashboard.** The design is mockup A, `docs/mockups/dashboard-a-overview.html` (screenshot beside it). The mockup shows light mode; dark mode is the same layout with the dark tokens. Top: a greeting line in Instrument Serif and today's date. Then the four figure tiles in a row, and under them the open pipeline by stage strip. Then a two-thirds and one-third row: the revenue line chart next to the funnel. Then the deals-won bar chart next to the follow-ups list. The recent activity list sits at the bottom, full width.

## Chart colors

Revenue line: Sea Green. Deals bars: Cerulean. Funnel bars: the stage colors. All charts have plain labels and axis titles, light gridlines, and hover tooltips with the exact figure. Money axes use the compact form (`USD 50k`). In dark mode the labels, axis titles, gridlines and tooltips take the dark tokens (gridlines a faint Sea Mist, tooltips on the black panel color), and the series colors stay the same.
