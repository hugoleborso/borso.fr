# Visual validation — Scene Mode hosts the app's panels

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T19:34:52Z
- Tooling: agent-browser 0.41.2

Fourth run, at `98b2d1f39` ("keep focus on the stage when the arrow keys change song"). Signed in as the seeded member `hugo`. The seed was regenerated since the last run. The setlist is "Set principal" (`/setlists/3a605a80-6fe2-4e3a-bea9-af0bce578ab3`), reached from the Setlists list. The song is "Slow Burn" (`/catalog/1b010681-c1ae-48f6-b782-dc0d061e3f56`), reached from the Songs list. Desktop runs at 1280 × 800. Phone runs use `scripts/phone.sh` at 375 × 812 with touch emulation.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | What the musician sees 1 | The setlist Scene Mode opens full screen from a setlist, on its dark stage, at desktop width | Setlist page, More actions, Scene Mode, at 1280 × 800 | `./visual-validation-2026-11-19-1930/01-setlist-scene-desktop.png`. URL `/setlists/…/scene`. One modal `<dialog aria-label="Scene Mode">` at 0,0,1280,800, background `rgb(13, 10, 7)` | PASS |
| 01b | What the musician sees 1 | Same, at 375 px wide | Same path in the phone session, both taps by real touch (`isRealTouch: true`) | `./visual-validation-2026-11-19-1930/01b-setlist-scene-375.png`. Stage 375 × 812, modal, background `rgb(13, 10, 7)`, page and stage `scrollWidth` 375 | PASS |
| 02 | What the musician sees 2 | The song Scene Mode opens full screen from a song page | Song page, Chords tab, "Full screen" link, at 1280 × 800 | `./visual-validation-2026-11-19-1930/02-song-scene-desktop.png`. URL `/catalog/…/scene`, modal dialog 1280 × 800, background `rgb(13, 10, 7)` | PASS |
| 02b | What the musician sees 2 | Same, at 375 px wide | Touch on Chords tab, then on "Full screen" (both `isRealTouch: true`) | `./visual-validation-2026-11-19-1930/02b-song-scene-375.png`. Stage 375 × 812, modal, `scrollWidth` 375 | PASS |
| 03 | What the musician sees 3 | Closing the setlist Scene Mode with its close control returns to the page it was opened from | Click "Leave" at desktop; touch "Leave" at 375 px | `./visual-validation-2026-11-19-1930/03-after-leave.png`. Both land on `/setlists/3a60…`, h1 "Set principal", 0 open dialogs | PASS |
| 03b | What the musician sees 3 | Closing the setlist Scene Mode with Escape returns to the page it was opened from | Open Scene Mode from the menu, press Escape with no popup open | URL `/setlists/3a60…`, h1 "Set principal", 0 open dialogs | PASS |
| 03c | What the musician sees 3 | Closing the song Scene Mode with its close control or Escape returns to the page it was opened from | Click "Back"; reopen and press Escape; at 375 px, touch "Back" | `./visual-validation-2026-11-19-1930/03c-song-after-back.png`, `./visual-validation-2026-11-19-1930/03d-song-after-back-375.png`. All three land on `/catalog/1b01…`, h1 "Slow Burn", 0 open dialogs | PASS |
| 04 | What the musician sees 4 | The transition strip opens the transition popup, and the popup shows on top of the stage (desktop) | Click "Show the transition to Lightning" | `./visual-validation-2026-11-19-1930/04-transition-popup-desktop.png`. 2 open dialogs, popup "Transition to Lightning" inside the stage dialog (`stage.contains(popup)` true). `elementFromPoint` at the popup centre hits the popup | PASS |
| 04b | What the musician sees 4 | The popup closes again and the stage stays (desktop) | Click the popup's "Close" | `./visual-validation-2026-11-19-1930/04b-popup-closed-by-button.png`. 1 open dialog, URL still `/scene`, title "Midnight Drive", focus on the strip button | PASS |
| 04c | What the musician sees 4, at 375 px | The strip opens the popup on top of the stage, with a real touch | `scripts/phone.sh touch` on the strip | `./visual-validation-2026-11-19-1930/04c-transition-popup-375.png`. `isRealTouch: true`. Popup "Transition to Midnight Drive" at 0,618,375,194, inside the stage, centre hit-tests inside it, `scrollWidth` 375 | PASS |
| 04d | What the musician sees 4, at 375 px | The popup closes again by touch and the stage stays | `scripts/phone.sh touch` on the popup's Close | `./visual-validation-2026-11-19-1930/04d-popup-closed-375.png`. `isRealTouch: true`. 1 open dialog, URL still `/scene`, title "Slow Burn" | PASS |
| 04e | Goal ("Nothing else on stage changes") with item 4 | Escape closes only the popup and the stage stays | Open the popup, press Escape once | URL still `/scene`, 2 open dialogs became 1, title "Afterglow" kept, focus on the strip button | PASS |
| 05 | What the musician sees 5 | A real touch swipe to the left on the chart opens the next song | `scripts/phone.sh drag` from lyric "the" (x 258) to "Lights" (x 28) on one chart line | `./visual-validation-2026-11-19-1930/05-swipe-left-next.png`. Stage title "Slow Burn" became "Midnight Drive" | PASS |
| 05b | What the musician sees 5 | A real touch swipe to the right on the chart opens the previous song | `scripts/phone.sh drag` from "dashboard," (x 52) to "engine" (x 210) on one chart line | `./visual-validation-2026-11-19-1930/05b-swipe-right-previous.png`. Stage title "Midnight Drive" became "Slow Burn" | PASS |
| 06 | What the musician sees 6 | The arrow keys still change song in the setlist Scene Mode on a desktop browser (fresh stage) | Open Scene Mode, press ArrowRight twice, then ArrowLeft | `./visual-validation-2026-11-19-1930/06-arrows-fresh-stage.png`. Titles went Slow Burn, Midnight Drive, Lightning, Midnight Drive. Focus stayed on the `Scene Mode` dialog | PASS |
| 06b | What the musician sees 6 with item 4 | The arrow keys still change song after the transition popup was closed | Open the popup, close it by clicking Close, then by Enter on Close, then by Escape (separate runs), press the arrow keys three or four times after each | `./visual-validation-2026-11-19-1930/06b-arrows-after-popup-close-button.png`, `./visual-validation-2026-11-19-1930/06b-arrows-after-popup-close-enter.png`. Every press changed song on all three paths (click: Lightning, Afterglow, Runaway Sun, Afterglow). After the first press focus was on the `Scene Mode` dialog, never `<body>` | PASS |
| 06c | What the musician sees 6 | The arrow keys keep working when the strip button holds focus as the song changes | Focus the strip button by script (standing in for Tab), press ArrowLeft, ArrowLeft, ArrowRight. Then Tab to "Leave" and press ArrowRight twice | Titles went Lightning, Midnight Drive, Lightning, then Afterglow, Runaway Sun. Focus moved to the `Scene Mode` dialog after each change | PASS |

The broken-image scan returned an empty list after every screenshot. `agent-browser errors` reported no console errors in the desktop or the phone session.

## Notes

- **06b, the FAIL of the previous run, now passes.** On every close path the strip button gets focus back. After the arrow press that replaces it, focus is on the stage `<dialog>`, not on `<body>`, and every following press changes song (measured).
- **Swipe rows 05 and 05b.** `scripts/phone.sh drag` exited 1 on the right swipe with `isRealDrag: false` and "the browser cancelled the touch to pan or zoom, so the page did not hold the drag". I did not capture its verdict on the left swipe. The page changed song both times, read back from the stage `h2` and visible in the screenshots. The rows pass on page state, not on the tool's verdict.
- To aim taps and drags I added `data-vv` attributes to existing elements at runtime. No app file was changed.
- Not run. The spec makes no claim about `prefers-color-scheme` or `prefers-reduced-motion`, and the stage uses its own dark tokens. The Out of scope line says no screen opens a Sheet on stage yet, so there is no Sheet-on-stage row.

## Verdict: PASS
