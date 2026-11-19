# Visual validation — Scene Mode hosts the app's panels

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T18:21:15Z
- Tooling: agent-browser 0.41.2

Third run, at `4a0c29151` ("give focus back to the stage when the transition popup closes"). Signed in as the seeded member `hugo`. The setlist is "Set principal" (`/setlists/446f693c-6ac1-4f72-9195-82a4596da46a`). The song is "Slow Burn" (`/catalog/0988052e-e223-48f4-840b-8cc366b01dfa`). Desktop runs at 1280 × 800. Phone runs use `scripts/phone.sh` at 375 × 812 with touch emulation.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | What the musician sees 1 | The setlist Scene Mode opens full screen from a setlist, on its dark stage, at desktop width | Setlist page, More actions, Scene Mode, at 1280 × 800 | `./visual-validation-2026-11-19-1817/01-setlist-scene-desktop.png`. URL `/setlists/…/scene`. One modal `<dialog>` at 0,0,1280,800, background `rgb(13, 10, 7)` | PASS |
| 01b | What the musician sees 1 | Same, at 375 px wide | Same path in the phone session, both taps by real touch (`isRealTouch: true`) | `./visual-validation-2026-11-19-1817/01b-setlist-scene-375.png`. Stage 375 × 812, modal, page and stage `scrollWidth` 375 | PASS |
| 02 | What the musician sees 2 | The song Scene Mode opens full screen from a song page | Song page, Chords tab, "Full screen" link, at 1280 × 800 | `./visual-validation-2026-11-19-1817/02-song-scene-desktop.png`. URL `/catalog/…/scene`, modal dialog 1280 × 800, background `rgb(13, 10, 7)` | PASS |
| 02b | What the musician sees 2 | Same, at 375 px wide | Touch on Chords tab, then on "Full screen" | `./visual-validation-2026-11-19-1817/02b-song-scene-375.png`. Stage 375 × 812, `scrollWidth` 375 | PASS |
| 03 | What the musician sees 3 | Closing the setlist Scene Mode with its close control returns to the page it was opened from | Click "Leave" | `./visual-validation-2026-11-19-1817/03-after-leave.png`. URL `/setlists/446f…`, h1 "Set principal", 0 open dialogs | PASS |
| 03b | What the musician sees 3 | Closing the setlist Scene Mode with Escape returns to the page it was opened from | Open Scene Mode, press Escape with no popup open | URL `/setlists/446f…`, h1 "Set principal", 0 open dialogs | PASS |
| 03c | What the musician sees 3 | Closing the song Scene Mode with its close control or Escape returns to the page it was opened from | Click "Back"; reopen and press Escape; at 375 px, touch "Back" | `./visual-validation-2026-11-19-1817/03c-song-after-back.png`. All three land on `/catalog/0988…`, h1 "Slow Burn", 0 open dialogs | PASS |
| 04 | What the musician sees 4 | The transition strip opens the transition popup, and the popup shows on top of the stage (desktop) | Click "Show the transition to Midnight Drive" | `./visual-validation-2026-11-19-1817/04-transition-popup-desktop.png`. 2 open dialogs, popup "Transition to Midnight Drive" inside the stage dialog. `elementFromPoint(640, 560)` hits the popup content | PASS |
| 04b | What the musician sees 4 | The popup closes again and the stage stays (desktop) | Click the popup's "Close" | `./visual-validation-2026-11-19-1817/04b-popup-closed-by-button.png`. 1 open dialog, URL still `/scene`, focus on the strip button | PASS |
| 04c | What the musician sees 4, at 375 px | The strip opens the popup on top of the stage and it closes again, with a real touch | `scripts/phone.sh touch` on the strip, then on Close | `./visual-validation-2026-11-19-1817/04c-transition-popup-375.png`. Both taps `isRealTouch: true`. Popup centre hit-tests inside the popup. 2 dialogs, then 1, URL still `/scene` | PASS |
| 04d | Goal ("Nothing else on stage changes") with item 4 | Escape closes only the popup and the stage stays | Open the popup, press Escape once | URL still `/scene`, 1 open dialog, title "Slow Burn", focus on the strip button | PASS |
| 05 | What the musician sees 5 | A real touch swipe to the left on the chart opens the next song | `scripts/phone.sh drag` from lyric "the" (x 258) to "Lights" (x 28) on one chart line | `./visual-validation-2026-11-19-1817/05-swipe-left-next.png`. Stage title "Slow Burn" became "Midnight Drive" | PASS |
| 05b | What the musician sees 5 | A real touch swipe to the right on the chart opens the previous song | `scripts/phone.sh drag` from "dashboard," (x 52) to "engine" (x 210) on one chart line | `./visual-validation-2026-11-19-1817/05b-swipe-right-previous.png`. Stage title "Midnight Drive" became "Slow Burn" | PASS |
| 06 | What the musician sees 6 | The arrow keys still change song in the setlist Scene Mode on a desktop browser (fresh stage) | Open Scene Mode, press ArrowRight twice, then ArrowLeft | `./visual-validation-2026-11-19-1817/06-arrows-fresh-stage.png`. Titles went Slow Burn, Midnight Drive, Lightning, Midnight Drive | PASS |
| 06b | What the musician sees 6 with item 4 | The arrow keys still change song after the transition popup was closed | Open the popup, close it (Close by click, Enter on Close, and Escape, each run separately), press ArrowRight three times | `./visual-validation-2026-11-19-1817/06b-arrows-stuck-after-popup-close.png`, `./visual-validation-2026-11-19-1817/06b-arrows-after-popup-close.png`. First press goes to "Midnight Drive". `document.activeElement` is then `BODY` and the next presses (ArrowRight and ArrowLeft) do nothing. Same on all three close paths | FAIL |

The broken-image scan returned an empty list after every screenshot.

## Notes

- **06b FAIL, narrowed since the last run.** Closing the popup now gives focus to the strip button (measured on all three close paths), so the first arrow press works. That press changes song, and the strip button that held focus is replaced. The old node reads `isConnected: false` and a new button "Show the transition to Lightning" takes its place (measured). Focus falls to `<body>`, outside the stage `<dialog>`, and every following arrow press is ignored until the musician clicks the stage (measured: a mouse press on the chart moved focus to the `Scene Mode` dialog and ArrowLeft worked again). A musician who checks a transition and closes it gets one song change from the arrows, then a dead keyboard.
- **The same loss happens without the popup.** With focus put on the strip button by script (standing in for Tab), ArrowRight changed song once, then focus was on `<body>` and the second press did nothing (measured, `./visual-validation-2026-11-19-1817/06c-arrows-stuck-after-strip-remount.png`). So the cause is the strip button being remounted on a song change while focused (inferred), and this branch's fix routes every popup close onto that path. The fix belongs where focus is held across a song change, not in the popup.
- **Swipe rows 05 and 05b.** `scripts/phone.sh drag` reported `isRealDrag: false` each time ("the browser cancelled the touch to pan or zoom"). The page still changed song each time, read back from the stage `h2` and visible in the screenshots. The rows pass on page state, not on the tool's verdict. To aim taps and drags I added `data-vv` attributes to existing elements at runtime. No app file was changed.
- Not run. The spec makes no claim about `prefers-color-scheme` or `prefers-reduced-motion`, and the stage uses its own dark tokens. The Out of scope line says no screen opens a Sheet on stage yet, so there is no Sheet-on-stage row.

## Verdict: FAIL
