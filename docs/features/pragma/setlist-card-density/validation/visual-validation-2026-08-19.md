# Visual validation — setlist card density and the energy bar

**Date:** 2026-08-19
**Branch:** `claude/pragma-song-chips-height-oe43sy`
**Verdict:** PASS

Driven against a local `pragma` (`pnpm dev`, seeded through
`POST /api/__test/seed`) rather than a preview, because the branch had not been
pushed yet when the measurements were taken. Two browsers: `agent-browser` for
the measurements and the screenshots, `scripts/argent.sh` for the touch input,
since a synthetic click is not a tap.

## What was measured

| Assertion | How | Result |
|---|---|---|
| A song card is shorter at 375 px | `getBoundingClientRect().height` on every card, on the pre-change code in a worktree and on the branch | 231 px → 165 px, all six cards |
| No blank space inside the card | screenshot, 375 px | the action column is gone; see `02-phone-375-after.png` |
| The energy bar takes a real tap | `argent gesture-tap` on the eighth segment of the row reading 3 | the readout reads 8 |
| A drag along the bar sets each level it crosses | `argent gesture-drag` across the full bar, counting `PUT /api/setlists/…/entries/…` in the dev-server log | 10 writes for 10 levels, none repeated |
| The desktop layout still reads as one row | screenshot, 1280 px | label, bar, readout, actions on one line; see `03-desktop-1280-after.png` |
| The energy curve is legible on a phone | screenshot, 375 px | 56 px instead of 36 px; the swing between entries is visible |

## Screenshots

- `01-phone-375-before.png` — the reported defect: a 231 px card whose right
  half is an empty column under three stacked buttons.
- `02-phone-375-after.png` — 165 px, with the ten-segment energy bar.
- `03-desktop-1280-after.png` — the same card at 1280 px.

## Not verified from here

A real vertical touch scroll starting on the bar. `touch-action: pan-y` is what
guarantees it, and argent's `gesture-swipe` is unsupported on Chromium, so the
scroll could not be driven as touch input. Worth one thumb on the preview.
