# Visual validation — The flames show what a member gained, what a missed day costs, and the band's scores

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-23T13:49:44Z
- Tooling: agent-browser 0.41.2

## How the week states were reached

The seeded local app on Monday 2026-11-23 only produces `active`, `open` and `future` cells. To render `joker`, `missed`, session days and spent jokers through the real components, a scratchpad init script wrapped `window.fetch` and replaced the `/api/streaks` answer inside the `POST /api/read-batch` response with a hand-written payload of the spec's shape. The payload set `today` to Friday 2026-11-27 (mock 1), Thursday 2026-11-26 (mock 2) or Sunday 2026-11-29 (mock 3). The core of the script:

```js
const idx = reads.map((r) => r.path.split('?')[0]).indexOf('/api/streaks');
data.answers[idx] = { status: 200, contentType: 'application/json', body: mock };
```

Rows marked "real" use the unmocked seeded API.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | Home, at 375 px: the title line keeps one chip on its right | Sign in as Hugo (real), 375 x 812, measure chip and h1 | `./visual-validation-2026-11-23-1345/01-home-chip.png`. One `[aria-label*=flame]` element, chip x 237 to 359, h1 ends at x 225, both at y 8 | PASS |
| 02 | Result | The chip holds the Blaze mark and the member's days, a 1 px rule, then the Bonfire mark and the band's days | Inspect chip DOM | `svg[data-flame-mark=blaze]`, "5", `span.w-px.bg-rule-strong`, `svg[data-flame-mark=bonfire]`, "1". Screenshot 01 | PASS |
| 03 | Result | A tap opens the sheet | `scripts/phone.sh touch 'button[aria-label^="Your flame"]'` as Sarah | `./visual-validation-2026-11-23-1345/10-phone-tap-sheet.png`. `isRealTouch: true`, dialog present after the tap | PASS |
| 04 | Result | Its accessible name says both flames with their units | Read `aria-label` | Real: "Your flame, 5 days. Band flame, 1 day." Mock 1: "Your flame, 0 days. Band flame, 12 days." | PASS |
| 05 | Result | The streak sheet, at 375 px, fits inside 812 px with no scroll | Open sheet, measure dialog box and scrollable descendants, real and mock 1 | `./visual-validation-2026-11-23-1345/02-sheet-375.png`, `./visual-validation-2026-11-23-1345/04-sheet-mock-states.png`. Dialog bottom = 812, document scrollHeight = 812, no descendant with `overflow-y: auto/scroll` exceeding its client height | PASS |
| 06 | Result | Sheet order: title, your flame, week, jokers card, rule, the band, member list | Accessibility snapshot of the dialog | Order heading "Flames", region "Your flame", list of 7, group "Jokers", separator, region "The band", list of 4. Screenshot 02 | PASS |
| 07 | Use case: Home chip | One `FlameChip` replaces the two. Each mark keeps its tone rule | Count chips, read `data-tone` real (counted/counted) and mock 1 (open/out-ish outline for 0 days) | Screenshots 01 and `./visual-validation-2026-11-23-1345/03-home-chip-mock-plural.png`. One button only | PASS |
| 08 | Use case: Home chip | The visible numbers are the two day counts, with no unit | Chip `innerText` | "5\n1" (real), "0", "12" (mock 1) | PASS |
| 09 | Use case: Home chip | Accessible name with plural forms | Labels across real and mocks, en and fr | "1 day", "5 days", "0 days", "12 days"; fr "Ta flamme, 0 jour. Flamme du groupe, 12 jours." | PASS |
| 10 | Use case: Personal hero | Blaze mark at `lg`, overline "Your flame", "N days" in the display face, pluralised ("1 day", "0 days") | Inspect hero region in mocks 1 and 3 | Blaze svg width 40, "Your flame" Geist uppercase, "0 days" / "1 day" in Newsreader. `./visual-validation-2026-11-23-1345/06-sheet-mock3.png` | PASS |
| 11 | Use case: Personal hero | The line "today counted" and the jokers sentence are gone | Search dialog `innerText` | No "today counted", no "jokers left" | PASS |
| 12 | Use case: Week timeline | Seven cells, Monday to Sunday of today's week, each under its one-letter weekday in the locale | Read cell letters in en and fr | en "M T W T F S S"; fr "L M M J V S D". `./visual-validation-2026-11-23-1345/11-sheet-fr.png` | PASS |
| 13 | Use case: Week timeline | `active`: Blaze `counted`, on `accent-soft` | Computed style of mock 1 Tuesday | `data-tone=counted`, background rgb(226,233,242) = `--color-accent-soft` #e2e9f2. Screenshot 04 | PASS |
| 14 | Use case: Week timeline | `joker`: dashed `ink-faint` border, Blaze `out`, caption "joker" in `ink` and semibold | Computed style of mock 1 Monday and Wednesday | Border dashed 1px rgb(107,98,86) = `--color-ink-faint`, `data-tone=out`, caption span `font-semibold text-ink` computed weight 600, colour rgb(29,25,20) = `--color-ink`. Screenshot 04 | PASS |
| 15 | Use case: Week timeline | `missed`: an empty cell with a `rule` border | Mock 1 Thursday | No svg, border solid 1px rgb(226,218,203) = `--color-rule`, sr "Thursday, missed". Screenshot 04 | PASS |
| 16 | Use case: Week timeline | `open`: today, not yet active, Blaze `open` | Mock 1 Friday, mock 3 Sunday | `data-tone=open`, `data-today=true`. Screenshots 04, 06 | PASS |
| 17 | Use case: Week timeline | `future`: empty cell, `rule` border, no caption | Mock 1 Saturday and Sunday, real Tuesday to Sunday | No svg, border rgb(226,218,203), caption empty. Screenshots 02, 04 | PASS |
| 18 | Use case: Week timeline | Today's cell has a 2 px `accent` border and the caption "today" | Real Monday (active), mock 1 Friday (open), mock 2 Thursday (active + session) | Border solid 2px rgb(45,95,160) = `--color-accent`, caption "today" in all three. `./visual-validation-2026-11-23-1345/05-sheet-mock2.png` | PASS |
| 19 | Use case: Week timeline | A session day has the caption "session", unless it is a joker day or today | Mock 1 Tuesday (session), mock 1 Friday (today + session), mock 2 Thursday (today + session), mock 3 Friday | "session" on non-today session days, "today" on today session days. Screenshots 04, 05, 06 | PASS |
| 20 | Use case: Week timeline | Each cell's accessible name says the weekday and its state | Snapshot list items | "Monday, saved by a joker", "Tuesday, counted", "Thursday, missed", "Friday, not yet today", "Saturday, still to come"; fr "jeudi, manqué" | PASS |
| 21 | Use case: Jokers | Card titled "Jokers · L of 3", L = `jokersLeftThisWeek` | Mocks with L = 1, 2, 0 and real L = 3 | "Jokers · 1 of 3", "2 of 3", "0 of 3", "3 of 3". Screenshots 02, 04, 05, 06 | PASS |
| 22 | Use case: Jokers | Dashed pip per spent joker, oldest first, labelled with the short weekday it saved, then a filled `accent` pip per joker left | Inspect pips in mocks 1 and 3 | Mock 1: dashed "Mon", dashed "Wed", one `bg-accent` pip. Mock 3: "Mon", "Tue", "Thu", no filled pip. Screenshots 04, 06 | PASS |
| 23 | Use case: Jokers | The card ends with "Back on Monday" | Card text | Last child "Back on Monday" in every run | PASS |
| 24 | Use case: Jokers | The pips and the timeline always agree | Compare joker cells to pip labels | Mock 1 joker cells Mon, Wed = pips Mon, Wed. Mock 2 Wed = Wed. Mock 3 Mon, Tue, Thu = Mon, Tue, Thu | PASS |
| 25 | Use case: No milestone | Nothing replaces the milestone card. The jokers card takes the full width | Screenshot, snapshot | No milestone or record element. Jokers card spans the sheet content width. Screenshot 04 | PASS |
| 26 | Use case: Band hero | A `rule` separator, then Bonfire at `lg`, overline "The band" and "N days", same layout as the personal hero | Inspect separator and band region | Separator colour rgb(226,218,203) = `--color-rule`, bonfire svg width 40, "The band" Geist uppercase, "12 days" Newsreader. Screenshot 04 | PASS |
| 27 | Use case: Member scores | Every current member including the reader, sorted by flame days descending, then by first name | Real data and mocks with ties, payload order shuffled in mock 1 | Real: Hugo 5, Léa 1, Marc 0, Sarah 0. Mock 1 (sent Sarah, Hugo, Marc, Léa): Marc 3, Sarah 3, Léa 1, Hugo 0. Mock 2: Hugo 4, Léa 4, Sarah 2, Marc 1. Phone as Sarah: Hugo 5, Léa 1, Sarah 1, Marc 0 | PASS |
| 28 | Use case: Member scores | Colour dot, first name, "not yet today" in `ink-soft` when the day has not counted, Blaze in the member's tone with the count | Inspect rows in mock 3 | `rounded-pill size-2.5` dot in the member colour, "not yet today" `text-ink-soft`, blaze `data-tone` open/out per member, count shown. Screenshots 04, 06 | PASS |
| 29 | Use case: Member scores | Rows are at least 44 px tall | `getBoundingClientRect().height` per row | 44, 44, 44, 44 | PASS |
| 30 | Use case: 20:00 push | With jokers left: title "Your N-day flame is waiting", body names J = `jokersLeftThisWeek - 1` | None possible | A push notification at 20:00 cannot be triggered or displayed from a browser session on the local dev server | UNVERIFIABLE |
| 31 | Use case: 20:00 push | With no joker left, `streak-at-risk-last`: "Your N-day flame goes out at midnight" | None possible | Same limit as row 30 | UNVERIFIABLE |
| 32 | Use case: 20:00 push | The band-count pushes are unchanged | None possible | Same limit as row 30 | UNVERIFIABLE |
| 33 | Use case: Assistant read | `get_me` keeps its projection and does not gain the week | None possible | An MCP tool response is not rendered on any screen | UNVERIFIABLE |
| 34 | Q.O.D. | Home layout variant A, one chip with both flames | Same as rows 01, 02 | Screenshot 01 | PASS |
| 35 | Q.O.D. | Nudge ("Relancer") not built | Search sheet for a nudge button | Dialog buttons are only "Close" and "Dismiss" | PASS |
| 36 | Q.O.D. | Moment of the day, milestones not built | Screenshot, snapshot | None present. Screenshot 04 | PASS |
| 37 | Q.O.D. | Sheet order: personal flame, timeline and jokers, band, every member's score | Same as row 06 | Screenshot 02 | PASS |
| 38 | Edge: dark mode | Sheet readable under `prefers-color-scheme: dark` | `set media dark`, mock 1 | `./visual-validation-2026-11-23-1345/07-sheet-dark.png`. All states, pips and captions visible | PASS |
| 39 | Edge: reduced motion | Flicker stops under `prefers-reduced-motion: reduce` | `set media light reduced-motion`, chip svg `animationName` | `none`, `none` | PASS |
| 40 | Edge: 320 px | Chip and sheet do not overflow horizontally at 320 x 640 | Measure scrollWidth and elements past x 320 | `./visual-validation-2026-11-23-1345/08-home-320.png`, `./visual-validation-2026-11-23-1345/09-sheet-320.png`. document and dialog scrollWidth 320, 0 elements past the edge. The chip wraps under the title and the sheet scrolls, both outside the 375 x 812 claim | PASS |

Broken-image scan returned `[]` after every screenshot.

## Notes

- Rows 30 to 32: the at-risk push is sent by the server at 20:00 and shown by the service worker. No browser action on the dev server shows its title or body. The template keys are left to the technical validation's tests.
- Row 33: `get_me` is an assistant tool response with no screen. It is not a visual assertion.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
