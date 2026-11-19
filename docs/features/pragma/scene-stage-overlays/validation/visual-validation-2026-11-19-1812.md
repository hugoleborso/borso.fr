# Visual validation — Scene Mode hosts the app's panels

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T18:16:04Z
- Tooling: agent-browser 0.41.2

Second run, at `b732e7ccd` ("stay on stage when Escape closes the transition popup"). Signed in as the seeded member `hugo`. The setlist is "Set principal" (`/setlists/446f693c-6ac1-4f72-9195-82a4596da46a`). The song is "Slow Burn" (`/catalog/0988052e-e223-48f4-840b-8cc366b01dfa`). Desktop runs at 1280 × 800. Phone runs use `scripts/phone.sh` at 375 × 812 with touch emulation.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | What the musician sees 1 | The setlist Scene Mode opens full screen from a setlist, on its dark stage, at desktop width | Setlist page, More actions, Scene Mode, at 1280 × 800 | `./visual-validation-2026-11-19-1812/01-setlist-scene-desktop.png`. URL `/setlists/…/scene`. One open modal `<dialog>` at 0,0,1280,800, background `rgb(13, 10, 7)` | PASS |
| 01b | What the musician sees 1 | Same, at 375 px wide | Same path in the phone session, both taps by real touch | `./visual-validation-2026-11-19-1812/01b-setlist-scene-375.png`. Stage 375 × 812, page and stage `scrollWidth` 375 | PASS |
| 02 | What the musician sees 2 | The song Scene Mode opens full screen from a song page | Song page, Chords tab, "Full screen" link, at 1280 × 800 | `./visual-validation-2026-11-19-1812/02-song-scene-desktop.png`. URL `/catalog/…/scene`, modal dialog 1280 × 800, background `rgb(13, 10, 7)` | PASS |
| 02b | What the musician sees 2 | Same, at 375 px wide | Touch on "Full screen" in the phone session | `./visual-validation-2026-11-19-1812/02b-song-scene-375.png`. Stage 375 × 812, `scrollWidth` 375 | PASS |
| 03 | What the musician sees 3 | Closing the setlist Scene Mode with its close control returns to the page it was opened from | Click "Leave" | `./visual-validation-2026-11-19-1812/03-after-leave.png`. URL back to `/setlists/446f…`, h1 "Set principal", 0 open dialogs | PASS |
| 03b | What the musician sees 3 | Closing the setlist Scene Mode with Escape returns to the page it was opened from | Reopen Scene Mode, press Escape with no popup open | URL back to `/setlists/446f…`, h1 "Set principal", 0 open dialogs | PASS |
| 03c | What the musician sees 3 | Closing the song Scene Mode with its close control or Escape returns to the page it was opened from | Click "Back", then reopen and press Escape; also a touch on "Back" at 375 px | `./visual-validation-2026-11-19-1812/03c-song-after-back.png`. All three land on `/catalog/0988…`, h1 "Slow Burn", 0 open dialogs | PASS |
| 04 | What the musician sees 4 | The transition strip opens the transition popup, and the popup shows on top of the stage (desktop) | Click "Show the transition to Midnight Drive" | `./visual-validation-2026-11-19-1812/04-transition-popup-desktop.png`. 2 open dialogs, the popup inside the stage. `elementFromPoint(640, 700)` hits the popup's "Then Midnight Drive" line | PASS |
| 04b | What the musician sees 4 | The popup closes again and the stage stays (desktop) | Reopen the popup, click its "Close" | `./visual-validation-2026-11-19-1812/04b-popup-closed-by-button.png`. 1 open dialog, URL still `/scene` | PASS |
| 04c | What the musician sees 4, at 375 px | The strip opens the popup on top of the stage and it closes again, with a real touch | `scripts/phone.sh touch` on the strip, then on the popup's Close | `./visual-validation-2026-11-19-1812/04c-transition-popup-375.png`. Both taps `isRealTouch: true`. Popup centre hit-tests inside the popup. 2 dialogs, then 1, URL still `/scene` | PASS |
| 04d | Goal ("Nothing else on stage changes") with item 4 | Escape closes the popup and the stage stays | Open the popup, press Escape once | `./visual-validation-2026-11-19-1812/04d-escape-closes-popup-only.png`. URL still `/setlists/…/scene`, 1 open dialog, title "Slow Burn". Focus returns to the strip button | PASS |
| 05 | What the musician sees 5 | A real touch swipe to the left on the chart opens the next song | `scripts/phone.sh drag` from the lyric "the" (x 258) to "Lights" (x 28) on one chart line | `./visual-validation-2026-11-19-1812/05-swipe-left-next.png`. Stage title went from "Slow Burn" to "Midnight Drive" | PASS |
| 05b | What the musician sees 5 | A real touch swipe to the right on the chart opens the previous song | `scripts/phone.sh drag` from "Radio" (x 28) to "keeping" (x 215) on one chart line | `./visual-validation-2026-11-19-1812/05b-swipe-right-previous.png`. Stage title went from "Midnight Drive" to "Slow Burn" | PASS |
| 06 | What the musician sees 6 | The arrow keys still change song in the setlist Scene Mode on a desktop browser (fresh stage) | Open Scene Mode, press ArrowRight twice, then ArrowLeft | `./visual-validation-2026-11-19-1812/06-arrow-right-twice.png`. Titles went Slow Burn, Midnight Drive, Lightning, then back to Midnight Drive | PASS |
| 06b | What the musician sees 6 with item 4, and the Goal | The arrow keys still change song after the transition popup was closed with its Close button | Open the popup, close it with "Close" (mouse click, and separately Enter on the focused Close), press ArrowRight twice | `./visual-validation-2026-11-19-1812/06b-arrows-ignored-after-popup-close.png`. Title stays "Slow Burn" after both presses. `document.activeElement` is `BODY` after the close. Reproduced three times | FAIL |

The broken-image scan returned an empty list after every screenshot.

## Notes

- **04d now passes.** The previous run's FAIL (one Escape closed the popup and left Scene Mode) is fixed. Escape closes only the popup, and focus returns to the strip button, so the arrow keys keep working on that path (measured).
- **06b FAIL.** After the transition popup is closed with its Close button, focus lands on `<body>`, outside the stage `<dialog>`. The arrow keys then do nothing until the musician clicks somewhere on the stage. A mouse press on the chart moved focus to the stage dialog and ArrowRight worked again (measured). The same happens with keyboard only, Enter on the focused Close (measured). The stage reads keys through `onKeyDown` on its `<dialog>` (read in `SceneStage.tsx`), so a key fired on `<body>` never reaches it (inferred). `SceneTransitionPreview.tsx` and its hook are untouched by this branch (last changed in #377, read with `git log`), so this probably predates the change (inferred, not checked against a `main` build). It contradicts item 6 as written, which does not exclude the moment after a popup closes. The caller decides whether this fix belongs in this PR. On a phone the swipe path is unaffected.
- **Swipe rows 05 and 05b.** `scripts/phone.sh drag` reported a failed drag each time ("the browser cancelled the touch to pan or zoom", a `pointercancel`). The page still changed song each time, read back from the stage `h2` and visible in the screenshots. The rows pass on that page state, not on the tool's verdict. To aim the drags I added `data-vv` attributes to existing chart spans at runtime. No app file was changed.
- Not run. The spec makes no claim about `prefers-color-scheme` or `prefers-reduced-motion`, and the stage uses its own dark tokens. The Out of scope line says no screen opens a Sheet on stage yet, so there is no Sheet-on-stage row.

## Verdict: FAIL
