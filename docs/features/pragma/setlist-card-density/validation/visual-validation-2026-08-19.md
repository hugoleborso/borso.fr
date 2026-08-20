# Visual validation — setlist card density and the energy bar

**Date:** 2026-08-19, re-run 2026-08-20 after the front-end review and again
after the operator's second pass
**Branch:** `claude/pragma-song-chips-height-oe43sy`
**Verdict:** PASS

Driven against a local `pragma` (`pnpm dev`, seeded through
`POST /api/__test/seed`) rather than a preview. Three drivers: `agent-browser`
for the measurements and the screenshots, `scripts/argent.sh` for taps, and raw
CDP `Input.dispatchTouchEvent` / `dispatchMouseEvent` for the gestures argent
does not support on Chromium (`gesture-swipe` and `gesture-custom` both decline
it).

## What was measured

| Assertion | How | Result |
|---|---|---|
| A song card is shorter at 375 px | `getBoundingClientRect().height` on every card, on the pre-change code in a worktree and on the branch | 231 px → **137 px**, or 161 px when the member avatars wrap |
| No blank space inside the card | screenshot, 375 px | see `02-phone-375-after.png` |
| Every level is labelled inside its segment | screenshot, 375 px | the segments read 1 to 10 |
| One `⋯` carries the row's actions | reading the row's buttons from the DOM with the panel open | `Drag to reorder`, `Actions`, `Lineup`, `Remove` |
| A card only moves vertically while dragged | CDP mouse drag 220 px right and 100 px down from the drag handle, reading the computed transform mid-drag | `matrix(1, 0, 0, 1, 0, 100)` — the horizontal half is dropped, and the card's left edge stays at 16 px |
| The energy bar takes a real tap | CDP `touchStart` / `touchEnd` on the eighth segment of a row reading 3 | the readout reads 8 |
| A sideways touch drag sets each level it crosses | CDP touch drag from segment 8 to segment 2 | the readout reads 2 |
| **A vertical swipe that starts on the bar scrolls and writes nothing** | CDP `touchStart` on the bar, three upward `touchMove`s, `touchEnd` | `scrollTop` 0 → 95, `aria-valuenow` stays 3 |
| **A text selection dragged across the bar writes nothing** | CDP mouse press on the song title, eight moves across the bar, release | `aria-valuenow` unchanged, selection reads the title |
| A drag writes one value per level crossed, not per pointer event | counting `PUT /api/setlists/…/entries/…` in the dev-server log across the full bar | 10 writes for 10 levels |
| The desktop layout still reads as one row | screenshot, 1280 px | label, bar and `⋯` on one line; see `03-desktop-1280-after.png` |
| The energy curve is legible on a phone | screenshot, 375 px | 56 px instead of 36 px; the swing between entries is visible |

The two bold rows are the defects the front-end review found, re-run after the
fix. Both wrote a song's energy silently, with no undo.

## Screenshots

- `01-phone-375-before.png` — the reported defect: a 231 px card whose right
  half is an empty column under three stacked buttons.
- `02-phone-375-after.png` — 137 px, with the numbered ten-segment bar.
- `03-desktop-1280-after.png` — the same cards at 1280 px.
- `04-phone-375-actions-open.png` — what `⋯` opens: key, capo, notes, then
  Lineup and Remove.

## Not verified from here

A screen reader. `role="slider"` is what iOS VoiceOver and TalkBack map to their
adjustable trait, and the arrow keys they synthesize are covered by
`EnergyBar.test.tsx`, but no screen reader was run against the page.
