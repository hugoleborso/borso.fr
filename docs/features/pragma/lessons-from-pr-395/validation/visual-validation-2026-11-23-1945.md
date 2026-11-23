# Visual validation — Spoken joker days and a cache keyed by response shapes

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-23T19:48:40Z
- Tooling: agent-browser 0.41.2

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | A member opens the flames sheet | On Home, a tap on the flame chip opens the sheet titled "Flames". | Signed in as hugo in the `phone` session, `scripts/phone.sh touch 'button[aria-label^="Your flame"]'`, then read the accessibility tree | Touch verdict `isRealTouch: true`, pointerdown, touchstart, touchend and click all `isOnTarget: true`. Tree then shows `dialog "Flames"` with `heading "Flames" [level=2]`. Screenshot `./visual-validation-2026-11-23-1945/02-flames-sheet-hugo-jokers-left.png` | PASS |
| 02 | A member opens the flames sheet | In the jokers card, each spent joker shows its short weekday, such as "Wed", under its pip. | Streaks answer mocked with Tuesday and Wednesday as `joker` days (see Notes), real tap on the chip, card scrolled into view | `./visual-validation-2026-11-23-1945/03-jokers-card-spent-weekdays-375.png` shows "Tue" and "Wed" under the two dashed pips. DOM `data-joker="spent"` spans hold `<span aria-hidden="true">Tue</span>` and `<span aria-hidden="true">Wed</span>` under the pip | PASS |
| 03 | A member opens the flames sheet | A screen reader hears that pip as "Wed, saved by a joker", and does not hear the bare "Wed". | Same page, `agent-browser snapshot` of the accessibility tree | Tree under `group "Jokers · 1 of 3"` reads `StaticText "Tue, saved by a joker"`, `StaticText "Wed, saved by a joker"`, `StaticText "Back on Monday"`. No bare "Tue" or "Wed" node. The visible weekday is `aria-hidden="true"`, the spoken one is `sr-only` | PASS |
| 04 | A member opens the flames sheet | A joker still left shows no weekday and nothing is read for it. | Real seed (hugo, 3 of 3 left) and mocked case (1 left), outerHTML and tree of the card | Each `data-joker="left"` span holds only `<span aria-hidden="true" class="size-6 rounded-pill bg-accent">` with no text. The tree lists no node for it, as both cases show. Screenshots `./visual-validation-2026-11-23-1945/02-flames-sheet-hugo-jokers-left.png` and `./visual-validation-2026-11-23-1945/03-jokers-card-spent-weekdays-375.png` | PASS |
| 05 | A member opens the flames sheet | The card fits a 375 px wide screen without horizontal scroll. | `window.innerWidth` = 375 with two spent jokers and one left. Measured the card, the dialog and every element's right edge | `innerWidth 375`, `documentElement.scrollWidth 375`, card spans 16 to 359 px, card `scrollWidth 341` = `clientWidth 341`, dialog `scrollWidth 375` = `clientWidth 375`, elements past the right edge: none. `./visual-validation-2026-11-23-1945/03-jokers-card-spent-weekdays-375.png` | PASS |
| 06 | A member reloads the app | After a first load, the browser's `localStorage` holds `pragma.query-cache`, and its `buster` is a 12-character hexadecimal string, not `'3'`. | Signed in as hugo, Home loaded, read and parsed `localStorage['pragma.query-cache']` | `buster = "cc0ea6773ce5"`, type string, length 12, `/^[0-9a-f]{12}$/` true. Keys `buster, timestamp, clientState`. 18 persisted queries, including `["streaks"]`. Screenshot `./visual-validation-2026-11-23-1945/01-home-first-load.png` | PASS |
| 07 | A member reloads the app | After a reload, Home shows the same flame chip and sessions, without an error screen. | `agent-browser reload`, networkidle plus settle, snapshot, `agent-browser errors` | Before and after the reload the chip reads `"Your flame, 5 days. Band flame, 1 day."`, the next session is `"Mon, Nov 30, 2026 · 20:45"` and the six songs are the same. `errors` printed nothing. The buster is still `"cc0ea6773ce5"`. `./visual-validation-2026-11-23-1945/07-home-after-reload.png` | PASS |

The broken-image scan returned `[]` after every screenshot.

## Notes

- Rows 02, 03 and 05 use a mocked `/api/streaks` answer. The run date is Monday 2026-11-23, and the joker week resets on Monday. So the local seed has no spent joker this week, and every member shows "Jokers · 3 of 3". pragma batches its GET reads into one POST, which `agent-browser network route` on `/api/streaks` does not catch. The phone session was therefore launched with an init script, kept in the scratchpad and not committed. It wraps `window.fetch` and replaces the `/api/streaks` answer inside the batch response. The rest of the page stayed live. The mocked `mine.week` was Monday `active`, Tuesday `joker`, Wednesday `joker`, Thursday `active`, Friday `open`, Saturday and Sunday `future`, with `jokersLeftThisWeek: 1`. These three rows check how the front end renders a spent joker. They do not check that the server marks a day as `joker`.
- Every tap went through `scripts/phone.sh touch`. That script exited 1 after each tap, because the page measured 1280 px wide after the gesture, even though the touch reached the target. The viewport was set back to 375 × 812 and `window.innerWidth` read 375 before each measurement and screenshot.

## Verdict: PASS
