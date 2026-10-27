# Visual validation — take player touch targets (`5d06f0c1`)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/ (`pnpm dev` in `apps/pragma`, local Postgres through its `dev:db`)
- Run at: 2026-10-24T17:54Z to 17:59Z
- Tooling: agent-browser 0.35.2 through `scripts/browser.sh`, with `AGENT_BROWSER_USER_AGENT` set on every call (desktop Linux Chrome at 1280, Android Pixel 8 at 375). Real touch through CDP `Input.dispatchTouchEvent` on the same browser, per `docs/knowledge/real-touch-gestures-over-cdp.md`. argent was not used.
- Branch: `claude/pragma-takes-and-push` at `b0ff278d`
- Scope: the brief's three checks on `5d06f0c1` (44 × 44 px mark tap areas, `min-w-11` on Close, delete-comment and the moment chip) and the reworded empty-recording message.

## Harness

- Upload bucket: `AWS_ENDPOINT_URL_S3=http://localhost:9000` pointed at a small HTTP stand-in that stores `PUT` bodies and serves them back with range support and CORS; `UPLOADS_BUCKET=pragma-local` and dummy AWS keys on the dev process.
- The take: a 20.008 s Opus/WebM sine tone made with `ffmpeg`, signed with `POST /api/takes/sign`, uploaded to the stand-in and created with `POST /api/takes` as Hugo on "Last Call" (`durationSeconds: 20`). Léa then posted five comments through `curl`: at 0:00, at 0:20 (the take's end), at 0:09 and 0:10 (1 s apart), and one with no moment.
- Touch: `Emulation.setDeviceMetricsOverride` 375 × 812 mobile and `Emulation.setTouchEmulationEnabled` with 5 points gave `maxTouchPoints` 5, `(pointer: coarse)` true and `(hover: none)` true. Each tap is `touchStart`, 60 ms, `touchEnd`. Capture listeners logged every tap as `pointerdown` (`pointerType: touch`), `touchstart`, `touchend`, `click` (`pointerType: touch`) on the intended button.
- Before every mark tap the audio was paused and moved to another second (5 s, or 3 s before 0:10), so a moved `currentTime` proves the tap.
- `E/` stands for `./visual-validation-2026-10-24-take-player/`.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Brief 1 | At 1280 px, no horizontal page scroll and nothing clipped or overlapping with the player open | take player open on "Last Call", timeline scrolled into view; scanned for scrollers | `scrollWidth` 1280 = viewport; no element with `overflow-x: auto/scroll` has `scrollWidth > clientWidth`; the two outer reach clips (−314…436, 757…1522) sit inside the `overflow-hidden` wrapper and add no scroll; four marks drawn at 0%, 45%, 50%, 100% of the bar, end marks centred on the bar ends and inside the card; `E/01-1280-take-player.png` | PASS |
| 02 | Brief 1 | At 375 px, the same | same at 375 × 812, Android user agent | `scrollWidth` 375 = viewport, `body.scrollWidth` 375, `scrollTo(400, y)` leaves `scrollX` 0, no inner scroller overflows; marks at x 46, 173.3, 187.5, 329 on a bar 46…329; the 0:09 and 0:10 bars sit 2 px apart without overlapping; `E/02-375-take-player.png` | PASS |
| 03 | Brief (`5d06f0c1`) | Close, delete-comment and the moment chip are at least 44 × 44 px | `getBoundingClientRect` at 1280 and at 375 | Close 44 × 44; each of the five "Delete comment" 44 × 44; chips 0:00, 0:20, 0:09, 0:10 each 44 × 44, at both widths | PASS |
| 04 | Brief 2 | Tapping the 0:00 mark moves the player to 0:00 | touch tap at the mark's centre (46, 405.8) | `currentTime` 5 → 0; events on "Go to 0:00" with `pointerType: touch`; the comment toggle reads "At 0:00", unchecked (see Notes) | PASS |
| 05 | Brief 2 | Tapping the 0:09 mark moves the player to 0:09 | touch tap at (173.3, 405.8) | `currentTime` 5 → 9; toggle "At 0:09", checked; events on "Go to 0:09" | PASS |
| 06 | Brief 2 | Tapping the 0:10 mark moves the player to 0:10 | touch tap at (187.5, 405.8) | `currentTime` 3 → 10; toggle "At 0:10", checked; events on "Go to 0:10" | PASS |
| 07 | Brief 2 | Tapping the mark at the take's end moves the player there | touch tap at (329, 405.8) | `currentTime` 5 → 20; toggle "At 0:20", checked; events on "Go to 0:20" | PASS |
| 08 | Brief 2 | Between the two close marks, a tap at each mark's centre hits that mark and not its neighbour | `elementFromPoint` at each visible centre, plus touch taps 3 px off-centre towards the neighbour | at 173.3 → "Go to 0:09", at 187.5 → "Go to 0:10"; touch at 176.3 → `currentTime` 9, touch at 184.5 → 10 | PASS |
| 09 | Brief 2 | Each mark's tap area is at least 44 px tall | `elementFromPoint` scan down each mark's centre x in 0.5 px steps | every mark hits from y 383 to 427.5, i.e. 44 px, against a 24 px visible bar (393.8…417.8); a touch tap 9 px above the visible 0:10 bar moved `currentTime` 3 → 10 | PASS |
| 10 | Brief 2 | The close marks split the width between them; the end marks reach 22 px past the bar | `elementFromPoint` scan across the bar's centre line in 0.5 px steps; touch taps 20 px past each end | 0:00 hits 23.5…67.5 (44 px, from 22.5 px left of the bar start); 0:09 hits 150.5…179 (~29 px); 0:10 hits 179.5…209 (~30 px); 0:20 hits 306.5…350.5 (44 px, to 21.5 px past the bar end). The 0:09/0:10 boundary is at 179.25, about 1 px left of the 180.4 midpoint. Touch at x 26 (outside the bar) → `currentTime` 0; touch at x 349 → 20 | PASS |
| 11 | Brief 3 | An empty recording shows "Nothing was recorded, so no take was saved." | 375 × 812 with touch; every `dataavailable` chunk replaced by an empty `Blob` (wrapping `MediaRecorder.prototype.addEventListener`); touch tap on "Record a take of Last Call", 3 s, touch tap on Stop | the sheet reads "Last Call · Nothing was recorded, so no take was saved. · Close", with no download link; IndexedDB `pragma-takes/queued-takes` 0 before and 0 after, 4 s later; no `fetch` after Stop; the stand-in logged no new `PUT`; `GET /api/takes?songId=<Last Call>` still returns the one seeded take; `E/03-375-empty-recording-message.png` | PASS |

The broken-image scan returned `[]` on every screen with a screenshot. `scripts/browser.sh errors` returned nothing at the end of the run.

## Notes

- **04:** after a tap on the 0:00 mark, the comment toggle reads "At 0:00" but stays unchecked. That is `isMomentToggleOnByDefault`, which turns the toggle on only when `currentSeconds > 0`. This is the designed behaviour, not a failure of the tap.
- **11, how it was driven:** this browser has no fake media device, and the real `getUserMedia` threw `NotFoundError`. So `navigator.mediaDevices.getUserMedia` was swapped for an `AudioContext` oscillator stream, and the chunks were emptied at the `MediaRecorder` event boundary, the same way the recheck did it. Everything from `recorder.adapter.ts` onward ran unmodified.
- **Observations outside the brief, not rows:** the thread lists moment comments in creation order (0:00, 0:20, 0:09, 0:10), not timeline order. A comment with no moment has no chip, so its author name starts 52 px further left than the others (visible in `E/01` and `E/02`).

## Verdict: PASS
