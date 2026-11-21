# Pipeline

Part of the Accountable spec. The index is in `docs/spec.md`. Stage rules are in `docs/specs/deals.md`.

## API

| Resource | Endpoints                                          |
| -------- | -------------------------------------------------- |
| Pipeline | `POST /deals/{id}/move` with `{ stage, position }` |

### Rules worth stating

- **Move** runs in one transaction: it changes the stage if needed, applies the probability and close-date rules, and `position` is the new index in the target column. The others in the source and target columns are renumbered so positions stay consecutive. A stage change also writes its `stage_change` activity.

## Requirements

- R30. Six columns in stage order. A header shows the stage name, the number of deals, their total value and their expected revenue.
- R31. Cards show deal name, organization, value, probability, close date and the late tag if it applies. Clicking a card opens the deal page.
- R32. Dragging a card to another column changes its stage. Dragging within a column changes its place. A card can drop anywhere in a column and stays there after a refresh.
- R33. The board's summary strip shows total value and expected revenue of the open deals. Column headers and the strip update the moment a card is dropped, before the server replies. If the server rejects the move, the card goes back and a message says why.
- R34. Each column has an "Add deal" action that opens the new-deal form with that stage preselected.
- R35. Keyboard dragging works: focus a card, press Space, move with arrow keys, press Space to drop.

## Screen

**Pipeline.** The design is in `docs/mockups/dashboard-a-overview.html` (click Pipeline), with a screenshot in `docs/mockups/dashboard-a-pipeline.png`. A summary strip across the top (open deals, total value, expected revenue), then six columns of equal width that fit a laptop without sideways scrolling, each with a stage-colored dot in its header. Each column sits on a pale Sea Mist lane and its header shows the stage name, deal count, total value and expected revenue. Cards show the deal name, organization, value, probability and close date, and a late deal has its date in Raspberry with a "Late" tag. Cards are white with rounded corners and a soft shadow, lifting and tilting slightly while dragged. The column a card would drop into is tinted in Sea Green. After a stage change a short message says "Moved from X to Y". Won and Lost show their most recent cards and a count of the earlier ones. Each column ends with an Add deal button.
