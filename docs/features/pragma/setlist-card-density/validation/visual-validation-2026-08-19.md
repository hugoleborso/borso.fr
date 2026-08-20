# Visual validation — setlist card density and the energy bar

**Date:** 2026-08-19, re-run 2026-08-20 after the front-end review
**Branch:** `claude/pragma-song-chips-height-oe43sy`
**Verdict:** PASS

Driven against a local `pragma` (`pnpm dev`, seeded through
`POST /api/__test/seed`) rather than a preview, because the branch had not been
pushed yet when the first measurements were taken. Three drivers: `agent-browser`
for the measurements and the screenshots, `scripts/argent.sh` for taps, and raw
CDP `Input.dispatchTouchEvent` for the gestures argent does not support on
Chromium (`gesture-swipe` and `gesture-custom` both decline it).

## What was measured

| Assertion | How | Result |
|---|---|---|
| A song card is shorter at 375 px | `getBoundingClientRect().height` on every card, on the pre-change code in a worktree and on the branch | 231 px → 189 px, all six cards |
| No blank space inside the card | screenshot, 375 px | the action column is gone; see `02-phone-375-after.png` |
| The energy bar takes a real tap | CDP `touchStart` / `touchEnd` on the eighth segment of a row reading 3 | the readout reads 8 |
| A sideways touch drag sets each level it crosses | CDP touch drag from segment 8 to segment 2 | the readout reads 2 |
| **A vertical swipe that starts on the bar scrolls and writes nothing** | CDP `touchStart` on the bar, three upward `touchMove`s, `touchEnd` | `scrollTop` 0 → 95, `aria-valuenow` stays 3 |
| **A text selection dragged across the bar writes nothing** | CDP mouse press on the song title, eight moves across the bar, release | `aria-valuenow` unchanged, selection reads the title |
| A drag writes one value per level crossed, not per pointer event | counting `PUT /api/setlists/…/entries/…` in the dev-server log across the full bar | 10 writes for 10 levels |
| The desktop layout still reads as one row | screenshot, 1280 px | label, readout, bar, actions on one line; see `03-desktop-1280-after.png` |
| The energy curve is legible on a phone | screenshot, 375 px | 56 px instead of 36 px; the swing between entries is visible |

The two bold rows are the defects the front-end review found and this pass
re-ran after the fix. Both wrote a song's energy silently, with no undo.

## Screenshots

- `01-phone-375-before.png` — the reported defect: a 231 px card whose right
  half is an empty column under three stacked buttons.
- `02-phone-375-after.png` — 189 px, with the ten-segment energy bar.
- `03-desktop-1280-after.png` — the same card at 1280 px.

## Not verified from here

A screen reader. `role="slider"` is what iOS VoiceOver and TalkBack map to their
adjustable trait, and the arrow keys they synthesize are covered by
`EnergyBar.test.tsx`, but no screen reader was run against the page.
