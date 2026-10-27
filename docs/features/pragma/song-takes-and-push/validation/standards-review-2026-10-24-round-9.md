# Standards review — claude/pragma-takes-and-push against origin/main

Verdict: PASS
Ledger: 3843abb31417
Reviewed: 2 file(s). Sealed: 2. Findings: 0.

Scope: `scripts/standards/seal.ts verify` at HEAD `5d06f0c1` reported two files `edited-since-it-was-reviewed`, both changed by `5d06f0c1` (44 px touch targets on the take player). `9f9e0fdf` changed only tests and the two i18n catalogues, and none of those files needs a seal. I also read the four test files those two commits touched, in full, against the test-naming bullet: `TakePlayer.test.tsx`, `take-player.core.test.ts`, `RecordingSheet.test.tsx` and `recording-sheet.core.test.ts`. After sealing, `seal.ts verify` reports that all 115 changed files carry a current seal.

## Findings

None.

## Sealed

- apps/pragma/site/src/components/organisms/take-player.core.ts — `placeMomentMarks` still follows `core-view-projection` and returns the marks its name promises. It now gives each mark a reach that ends halfway to its neighbours, and the helper `placeEachMomentOnce` keeps one mark per second. The magic numbers are named (`NO_NEIGHBOUR_BEFORE_PERCENT`, `NO_NEIGHBOUR_AFTER_PERCENT`, `MIDPOINT_DIVISOR`). No booleans are negated and the file has no comments.
- apps/pragma/site/src/components/organisms/TakePlayer.tsx — each mark now draws a 12 by 24 px bar (`aria-hidden`) under a transparent 44 by 44 px button, clipped to its reach. The close button, the delete-comment button and the moment chip gain `min-w-11`. Seeking happens in `onClick`, and nothing writes on `pointerdown`. No new visible text. The marks reuse the existing `takes.player.markAria` key. The one disable reason (line 137) is a claim a reader can check. I read the layout but did not measure it in a browser at 375 px. The `-inset-x-5.5` clip box reaches 22 px past the track and 10 px past the section's `p-3` padding. Its host in `SongTakes.tsx` sits inside a `Card`, so the box should stay inside the viewport. `/visual-validation` has not checked this since `5d06f0c1`.

Tests read (they need no seal): the new and renamed test names state the behaviour and the condition, for example "says nothing was recorded when Stop comes before any audio, and offers no download" and "splits the track halfway between two close marks, so a tap reaches the nearer one only".

## Unclear

None.

## Outside the checklist

- `TakePlayer.test.tsx` checks the touch targets through class names (`h-11`, `w-11`, `min-w-11`), not measured boxes. jsdom has no layout, so a measured 44 px check belongs in the visual-validation pass with `scripts/argent.sh`, not in this suite.
