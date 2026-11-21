# Appearance and design

Part of the Accountable spec. The index is in `docs/spec.md`. Look and brand: `docs/BRAND.md`.

## Requirements: light and dark mode

- R38. A toggle at the top right of the page, above the heading, switches between light and dark mode. It is on every page, so every section has it.
- R39. Light mode is the default. The choice is remembered in the browser only (local storage), not in the database, and is applied before the page paints, so a reload in dark mode never flashes light.
- R40. Every screen follows the mode: tables, record pages, the dashboard and its charts, the pipeline, dialogs, forms, menus and the confirmation messages. Nothing stays light in dark mode.
- R41. Light mode looks exactly as it did before dark mode, apart from the toggle.
- R42. Small text in dark mode passes the same 4.5:1 contrast as in light mode, checked for every pairing in the Design section below.

## Design

### Principles

Clean, calm and dense enough to be useful. In light mode, white panels on a pale page; in dark mode, black panels on a deep teal page. One strong accent, numbers in a monospace face, plenty of space. Tone is plain business English: short labels, no jargon, no exclamation marks.

### Tokens

Defined once as CSS variables, which Tailwind reads. Light mode sets them on the page, and dark mode sets the same names again when the page is in dark mode, so no component carries colors of its own. The brand colors (Sea Green, Marigold, Coral, Cerulean, Raspberry) keep their values for fills in both modes. Dark mode changes the surfaces, the ink and the text and tint colors.

| Token             | Light                         | Dark                         | Use                                                                                                   |
| ----------------- | ----------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `--page`          | `#F0F4F5`                     | `#04232E`                    | page background                                                                                       |
| `--panel`         | `#FFFFFF`                     | `#000000`                    | panels, cards, dialogs                                                                                |
| `--ink`           | Midnight `#073B4C`            | Sea Mist `#CDD8DB`           | text                                                                                                  |
| `--muted`         | `#42697A`                     | `#8FA9B2`                    | secondary text, at least 4.5:1 on panels, the page, pills and the pipeline lanes                      |
| `--soft`          | `#E6EDEF`                     | `#0F3340`                    | pills, stat boxes, loading skeletons                                                                  |
| `--lane`          | Sea Mist at 40% over the page | Sea Mist at 8% over the page | pipeline lanes                                                                                        |
| `--primary`       | Sea Green `#06D6A0`           | same                         | primary buttons, selected nav, Negotiation                                                            |
| `--secondary`     | Marigold `#FFC145`            | same                         | highlights, Qualified                                                                                 |
| `--tertiary`      | Coral `#F78C6B`               | same                         | highlights, Proposal                                                                                  |
| `--info`          | Cerulean `#118AB2`            | same                         | info                                                                                                  |
| `--alert`         | Raspberry `#EF476F`           | same                         | overdue and late markers                                                                              |
| `--on-accent`     | Midnight `#073B4C`            | same                         | text on Sea Green, Marigold and Coral fills                                                           |
| `--sidebar`       | Midnight `#073B4C`            | same                         | the sidebar background, in both modes                                                                 |
| `--on-sidebar`    | Sea Mist `#CDD8DB`            | same                         | text on the sidebar                                                                                   |
| `--panel-edge`    | none                          | Sea Mist at 10% opacity      | a 1px ring around every panel, card and dialog, in dark mode only; it is the dark value of `--shadow` |
| `--sidebar-muted` | `#8FA9B2`                     | same                         | the sidebar footer text                                                                               |
| `--float`         | Midnight `#073B4C`            | `#000000`                    | toasts and chart tooltips                                                                             |
| `--on-float`      | `#FFFFFF`                     | Sea Mist `#CDD8DB`           | text on toasts and tooltips                                                                           |
| `--won`           | Midnight `#073B4C`            | Sea Mist `#CDD8DB`           | the Won tag and dot                                                                                   |
| `--on-won`        | `#FFFFFF`                     | Midnight `#073B4C`           | text on the Won tag                                                                                   |
| `--lost`          | Sea Mist `#CDD8DB`            | Midnight `#073B4C`           | the Lost tag                                                                                          |
| `--lost-dot`      | Sea Mist `#CDD8DB`            | slate `#5F808C`              | the Lost dot, at least 3:1 on panels and the page                                                     |
| `--on-lost`       | Midnight `#073B4C`            | Sea Mist `#CDD8DB`           | text on the Lost tag                                                                                  |
| `--alert-solid`   | `#C2284F`                     | same                         | destructive buttons, with white text                                                                  |
| `--info-solid`    | `#0E7394`                     | same                         | the New stage block, with white text                                                                  |
| `--overlay`       | Midnight at 40%               | black at 60%                 | behind dialogs                                                                                        |
| `--field-ring`    | `#CDD8DB`                     | `#245160`                    | the ring around form fields and the chart cursor                                                      |
| `--checkbox-edge` | `#9DB5BE`                     | `#5F808C`                    | the follow-up checkbox border                                                                         |
| `--grid`          | `#E6EDEF`                     | Sea Mist at 12%              | chart gridlines                                                                                       |
| `--axis`          | `#4C7280`                     | `#8FA9B2`                    | chart labels                                                                                          |

- **Text and tint colors**: Sea Green, Marigold and Coral are too bright for small text on a light background, so light mode uses darkened versions (Sea Green about `#05795B`), each on a pale tint. Dark mode does the opposite and lightens them (Sea Green `#4DE3B8`, Cerulean `#62C4E6`, Raspberry `#FF8DA6`, Marigold `#FFC145`, Coral `#FFA98C`), each on a dark tint (for example `#0B3A31` for green). The tokens are `--primary-text`, `--info-text`, `--alert-text`, `--marigold-text`, `--coral-text` and `--primary-tint`, `--info-tint`, `--alert-tint`, `--marigold-tint`, `--coral-tint`. Each pairing must pass 4.5:1 and is checked, not assumed.
- **Solid fills with white text**: destructive buttons use the darker Raspberry `#C2284F` and the New stage uses the darker Cerulean `#0E7394`, both with white text, in both modes.
- **Fonts**: Instrument Sans for headings and body, JetBrains Mono for all numbers, money, dates in tables, and identifiers, Instrument Serif only for the dashboard's greeting line.
- **Shape**: panels and cards are rounded (12px), separated from the page by their fill (white on pale in light mode, black on deep teal in dark mode). Light mode has no outline and uses a soft shadow. A shadow is too faint to see in dark mode, and black on deep teal is only 1.29:1, so dark mode uses a faint 1px ring all the way around each panel, card and dialog (`--panel-edge`) in its place. No single-edge borders and no top-of-page rule. Gradients are not used, except possibly one subtle fill in a chart area.
- **Spacing**: 4px base unit; panel padding 20 to 24px; page margin 32px.

### Stage colors

Used for pipeline column accents, stage tags and funnel bars.

| Stage       | Light mode                    | Dark mode                      |
| ----------- | ----------------------------- | ------------------------------ |
| New         | Cerulean                      | same                           |
| Qualified   | Marigold                      | same                           |
| Proposal    | Coral                         | same                           |
| Negotiation | Sea Green (darkened for text) | Sea Green (lightened for text) |
| Won         | Midnight, with white text     | Sea Mist, with Midnight text   |
| Lost        | Sea Mist, with Midnight text  | Midnight, with Sea Mist text   |

Raspberry is kept for overdue and late things, so a Lost deal doesn't look like an alert. Won and Lost use Midnight and Sea Mist, swapped in dark mode so Won still stands out and Lost still recedes (the Lost dot is a lighter slate in dark mode so it stays visible on black), and that keeps Sea Green and Raspberry free for meaning "go" and "alert". Color is never the only signal: every tag also has the stage's name.

### Layout

- A fixed left sidebar, 232px wide, Midnight background in both modes, with the product name in Instrument Sans, five nav items with icons and the active one marked by a Sea Green pill, text in Sea Mist.
- A content area on the page color, max width about 1440px. At its top right, above the page heading, sits the light and dark mode toggle. It shows the mode it will switch to ("Dark mode" or "Light mode") with an icon, and has a visible focus ring like every other control. Below it is the page heading with its main action on the right.
- Minimum supported width 1280px.

### States and feel

- Every list and chart has an empty state with a one-line message.
- Loading shows quiet skeleton shapes, not spinners over blank pages.
- If a list, page or the pipeline can't load, it shows an error with a retry button, never a skeleton that doesn't go away.
- Saving a change shows a short confirmation at the bottom, such as "Deal moved to Proposal".
- Hover, focus and active states exist on everything clickable, with a visible focus ring (Cerulean).
- Pipeline and checkbox updates are optimistic, so the app feels instant.
