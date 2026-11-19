# Visual validation — Scene Mode hosts the app's panels

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T18:07:29Z
- Tooling: agent-browser 0.41.2

Signed in as the seeded member `hugo`. The setlist is "Set principal" (`/setlists/446f693c-6ac1-4f72-9195-82a4596da46a`). The song is "Slow Burn" (`/catalog/0988052e-e223-48f4-840b-8cc366b01dfa`). Desktop runs at 1280 × 800. Phone runs use `scripts/phone.sh` at 375 × 812 with touch emulation.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | What the musician sees 1 | The setlist Scene Mode opens full screen from a setlist, on its dark stage, at desktop width | Setlist page, More actions, Scene Mode, at 1280 × 800 | `./visual-validation-2026-11-19-1803/01-setlist-scene-desktop.png`. URL `/setlists/…/scene`. The only fixed element is a modal `<dialog>` at 0,0,1280,800 with background `rgb(13, 10, 7)` | PASS |
| 01b | What the musician sees 1 | Same, at 375 px wide | Same path in the phone session at 375 × 812 | `./visual-validation-2026-11-19-1803/01b-setlist-scene-375.png`. Stage 375 × 812, `scrollWidth` 375, no sideways overflow | PASS |
| 02 | What the musician sees 2 | The song Scene Mode opens full screen from a song page | Song page, Chords tab, "Full screen" link, at 1280 × 800 | `./visual-validation-2026-11-19-1803/02-song-scene-desktop.png`. URL `/catalog/…/scene`, modal dialog 1280 × 800, dark background | PASS |
| 02b | What the musician sees 2 | Same, at 375 px wide | `/catalog/…/scene` in the phone session | `./visual-validation-2026-11-19-1803/02b-song-scene-375.png`. Stage 375 × 812, `scrollWidth` 375 | PASS |
| 03 | What the musician sees 3 | Closing the setlist Scene Mode with its close control returns to the page it was opened from | Click "Leave" | `./visual-validation-2026-11-19-1803/03-after-leave.png`. URL back to `/setlists/446f…`, h1 "Set principal", no open dialog | PASS |
| 03b | What the musician sees 3 | Closing the setlist Scene Mode with Escape returns to the page it was opened from | Press Escape with no popup open | URL back to `/setlists/446f…`, h1 "Set principal", 0 open dialogs | PASS |
| 03c | What the musician sees 3 | Closing the song Scene Mode with its close control or Escape returns to the page it was opened from | Click "Back", then reopen and press Escape | `./visual-validation-2026-11-19-1803/03b-song-after-back.png`. Both land on `/catalog/0988…`, h1 "Slow Burn", 0 open dialogs | PASS |
| 04 | What the musician sees 4 | The transition strip opens the transition popup, and the popup shows on top of the stage (desktop) | Click "Show the transition to Midnight Drive" | `./visual-validation-2026-11-19-1803/04-transition-popup-desktop.png`. A second dialog is open inside the stage. `elementFromPoint(640, 700)` hits the popup's "Then Midnight Drive" line, inside the stage | PASS |
| 04b | What the musician sees 4 | The popup closes again and the stage stays (desktop) | Click the popup's "Close" | `./visual-validation-2026-11-19-1803/04b-transition-popup-closed.png`. 1 open dialog (the stage), URL still `/scene` | PASS |
| 04c | What the musician sees 4, at 375 px | The strip opens the popup on top of the stage and it closes again, with a real touch | `scripts/phone.sh touch 'button[aria-label^="Show the transition"]'`, then touch on the popup's Close | `./visual-validation-2026-11-19-1803/04c-transition-popup-375.png`. Both taps report `isRealTouch: true`. 2 dialogs open after the first tap, 1 after the second, URL still `/scene` | PASS |
| 04d | Goal ("Nothing else on stage changes") with item 4 | The popup closes again on Escape and the stage stays | Open the popup, press Escape once | One key press closed the popup and Scene Mode both. Logged `keydown Escape`, then `cancel` and `close` on the popup dialog. URL went to `/setlists/446f…`, 0 open dialogs. Reproduced twice | FAIL |
| 05 | What the musician sees 5 | A real touch swipe to the left on the chart opens the next song | `scripts/phone.sh drag` from the chord "G" to the chord "Am" on the same chart line (129 px left) | `./visual-validation-2026-11-19-1803/05-swipe-left-next.png`. Stage title went from "Slow Burn" to "Midnight Drive" | PASS |
| 05b | What the musician sees 5 | A real touch swipe to the right on the chart opens the previous song | `scripts/phone.sh drag` from "Keys" (x 64) to "the" (x 172) on the same chart line | `./visual-validation-2026-11-19-1803/05b-swipe-right-previous.png`. Stage title went from "Midnight Drive" to "Slow Burn" | PASS |
| 06 | What the musician sees 6 | The arrow keys still change song in the setlist Scene Mode on a desktop browser | Press ArrowRight twice, then ArrowLeft | `./visual-validation-2026-11-19-1803/06-arrow-right-twice.png`. Titles went Slow Burn, Midnight Drive, Lightning, then back to Midnight Drive | PASS |

The broken-image scan returned an empty list after every screenshot.

## Notes

- **04d FAIL.** With the transition popup open, one Escape press closes the popup and also leaves Scene Mode for the setlist page. A musician who presses Escape to dismiss the popup loses the stage. My instrumentation saw native `cancel` and `close` events only on the popup dialog, never a native `close` on the stage dialog. Even so, the stage's leave handler ran (measured). The likely cause is that React propagates the popup's `onClose` up the component tree to the stage `<dialog onClose={leaveScene}>` (inferred). The branch diff against `origin/main` does not touch `SceneTransitionStrip.tsx`, so this probably predates this change and came with PR #377 (inferred, not checked against a `main` build). The spec's item 4 only says the popup "closes again", and its Close button does that correctly. I judged the Escape path against the Goal line "Nothing else on stage changes". The caller should decide whether this belongs in this PR.
- **Swipe rows 05 and 05b.** `scripts/phone.sh drag` gave a negative verdict on both swipes, with "the browser cancelled the touch to pan or zoom" (a `pointercancel`). The page still changed song each time, read back from the stage `h2`. The rows pass on that page state, not on the tool's verdict. To give the drag tool fixed targets, I added `data-vv` attributes to two existing chart spans at runtime. The app's code was not changed.
- **Observation outside the assertions.** Leaving the song Scene Mode returns to the song page on the Info tab, but it was opened from the Chords tab (`?tab=chords` is dropped). The spec says "returns to the page it was opened from", and the route matches, so 03c passes. The diff does not change `leaveScene`.
- **Observation outside the assertions.** `http://localhost:5174/songs`, a route that does not exist, renders a fully blank page with no not-found notice (measured, body text empty).
- Not run. The spec makes no claim about `prefers-color-scheme` or `prefers-reduced-motion`, and the stage uses its own dark tokens. The Out of scope line says no screen opens a Sheet on stage yet, so no Sheet-on-stage row exists.

## Verdict: FAIL
