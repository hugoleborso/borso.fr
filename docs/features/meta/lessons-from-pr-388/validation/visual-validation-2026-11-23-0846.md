# Visual validation — A member's colour dot or ring is hidden from a screen reader

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-23T08:50:17Z
- Tooling: agent-browser 0.41.2

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | What the musician sees 1 | The Flames sheet lists each member as a dot, then the written first name, the flame and the count. | Signed in as hugo, home at 1280 × 800, clicked "Band flame, 1 day" | `./visual-validation-2026-11-23-0846/01-flames-sheet-desktop.png` shows four rows (Hugo, Léa, Marc, Sarah), each dot, name, flame glyph, count | PASS |
| 02 | What the musician sees 2 | A task row with an assignee shows the dot, then the written first name. | Session "Le Petit Bain" > Tasks, added a task assigned to Léa | `./visual-validation-2026-11-23-0846/02-session-task-row-desktop.png` shows green dot then "Léa" before the "to do" badge | PASS |
| 03 | What the musician sees 3 | A setlist row with a lineup change tonight shows the member's dot (or ring when they sit out), then the written first name. | Set principal > Slow Burn > Lineup, took Léa off Guitare (sits out) and gave Marc Chœurs | `./visual-validation-2026-11-23-0846/03-setlist-lineup-change-desktop.png` shows a green ring then "Léa", and a blue dot then "Marc" with his instrument glyphs | PASS |
| 04a | What the musician sees 4 | Flames sheet: each dot has `aria-hidden="true"`, and the first name is readable text. | `eval` over `[role=dialog] li` and full accessibility snapshot | All 4 dots are `<span … aria-hidden="true">`. The tree lists `listitem` > `StaticText "Hugo"` (and Léa, Marc, Sarah), and the dots have no node | PASS |
| 04b | What the musician sees 4 | Task row: the dot has `aria-hidden="true"`, and the first name is readable text. | `eval` over the dots in `ul[aria-label="Who does what"]` and accessibility snapshot | Dot is `aria-hidden="true"`. Its parent is not hidden and reads "Léa". The tree shows `StaticText "Léa"` | PASS |
| 04c | What the musician sees 4 | Setlist row: each dot or ring has `aria-hidden="true"`, and the first name is readable text. | `eval` over `[data-lineup-change]` and accessibility snapshot | The ring (Léa) and the dot (Marc) are each `aria-hidden="true"`. The names are visible text, and the screen reader gets them through the enclosing `image "Tonight: Léa sits out · Marc: Chœurs, Basse"` | PASS |
| 05a | What the musician sees 5 | Flames sheet works at 375 px wide. | `set viewport 375 812` with the sheet open | `./visual-validation-2026-11-23-0846/05a-flames-sheet-375.png`. scrollWidth = clientWidth = 375 | PASS |
| 05b | What the musician sees 5 | Task row works at 375 px wide. | `set viewport 375 812` on session Tasks | `./visual-validation-2026-11-23-0846/05b-session-task-row-375.png`. scrollWidth = clientWidth = 375 | PASS |
| 05c | What the musician sees 5 | Setlist row with a lineup change works at 375 px wide. | `set viewport 375 812` on Set principal | `./visual-validation-2026-11-23-0846/05c-setlist-lineup-change-375.png`. scrollWidth = clientWidth = 375, and the ring, dot and names are on one line inside the row | PASS |

The broken-image scan returned `[]` after every screenshot. `agent-browser errors` reported no console errors on the setlist page.

## Notes

- No FAIL or UNVERIFIABLE rows.
- Measured: the seed has no session task with an assignee and no setlist entry with a lineup override. Rows 02, 03, 04b, 04c and 05b, 05c rest on data created in the browser for this run. The task "Bring spare strings" (assigned to Léa) and the Slow Burn lineup override were removed afterwards, the override through "Use the song's lineup". The local database is back to its seeded state for these two screens.
- Row 04c. Each member chip inside the setlist row's lineup-change badge is itself `aria-hidden="true"`, so the written first name is not a separate accessibility node. The name reaches a screen reader through the badge's `role="img"` label. I count that as readable because the spec asks only that the dot never stand for the name, and the label names every member.

## Verdict: PASS
