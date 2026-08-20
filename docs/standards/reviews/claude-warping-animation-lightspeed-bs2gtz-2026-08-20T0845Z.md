# Standards review — claude/warping-animation-lightspeed-bs2gtz against origin/main

Verdict: PASS
Ledger: c9cc14decde4
Reviewed: 1 file(s). Sealed: 1. Findings: 0.

Re-review of the single file left uncleared by the 08:35 pass. `seal.ts verify
--base origin/main` named `apps/borso-fr/site/src/warp/warp-jump.core.ts` and
nothing else; the other ten changed files still carry a current seal, so they
were out of scope here. `verify` now reports 11 of 11 sealed.

## Findings

None.

The 08:35 finding is fixed. The comment above `selectJumpProgress` now reads, in
full:

```ts
/**
 * Squared, so the galaxy answers the click straight away and still spends most
 * of its speed at the end. A cube leaves the first half of the jump looking
 * like nothing has happened.
 *
 * The floor is what stops a reading from before the jump being squared into a
 * positive one.
 */
```

The sentence from *"There is no ceiling"* to *"still loading"* is gone. What is
left is the part no rule and no name can carry: why the exponent is two rather
than three, and why `Math.max(elapsedMilliseconds / JUMP_DURATION_MILLISECONDS, 0)`
on line 66 needs the floor — a negative elapsed reading would square into a
positive one and jump the galaxy before the click. Neither is a restatement, a
history note, or an absence.

## Sealed

- `apps/borso-fr/site/src/warp/warp-jump.core.ts` — read in full at working-tree
  content. I re-derived every numeric comment from source rather than trusting
  the previous report, because a seal is worth only what the reviewer checked
  this session:
  - `main.tsx:10` `starSpeed: 0.3` and `main.tsx:13` `speed: 1.2` are the
    galaxy's shipped settings; `galaxy-clock.core.ts:41` advances travelled
    distance by `(chargedSeconds * starSpeed) / STAR_SPEED_DIVISOR` with the
    divisor `10` on line 2; `galaxy-shaders.ts:169` reads
    `float depth = fract(i + uStarSpeed * uSpeed);`, so one cycle of
    `uStarSpeed * uSpeed` is one crossing. The formula on line 32,
    `starSpeed * multiplier / 10 * speed`, is the code's, and cruising is
    `0.3 / 10 * 1.2 = 0.036` cycles a second — a crossing in 27.8 s, the
    *"half a minute"* on line 34.
  - `TOP_STAR_SPEED_MULTIPLIER = 200` (line 40): `0.036 × 200 = 7.2` cycles a
    second, a crossing in 0.139 s, 8.3 frames at 60 Hz — the *"0.14 s, eight
    frames"* on line 35.
  - `HIGHEST_PROGRESS = 1.6` (line 55): the multiplier is
    `1 + 1.6 × 199 = 319.4`, so `0.3 × 319.4 / 10 × 1.2 = 11.5` cycles a second
    and `60 / 11.5 = 5.2` frames — the *"five frames"* on line 48. `√1.6 = 1.26`
    of the jump duration, the *"quarter again"* on line 52.
  - Naming: `selectJumpProgress`, `selectJumpIntensity` and `selectIntensityAt`
    each return the value their verb names; no `find…` or `get…`; no boolean, so
    nothing to negate. The `.core.ts` suffix says what the file holds and the
    file is pure — no `new Date()`, `nowMilliseconds` arrives as a parameter on
    line 84.
  - No `@FollowsBlueprint` tag, so there is no blueprint claim to check. The
    shape matches the `core-*` family in `blueprint-index.md` anyway: one
    exported selector, constants at module scope, time injected.

## Unclear

- None.

## Outside the checklist

- `warp-jump.core.ts:37-38` — *"This is the number to move if the jump feels
  wrong; nothing else depends on it."* is true of the source (no other constant
  is calibrated against `TOP_STAR_SPEED_MULTIPLIER`; `TOP_GLOW_MULTIPLIER` is
  independent), but six assertions in `warp-jump.core.test.ts` hard-code `200`
  and `199` — lines 23, 33, 37, 44, 50, 61. Someone reading *"nothing else
  depends on it"* will still have a red suite after moving it. Advisory only: no
  bullet covers a comment that is accurate about the source and silent about its
  test, and the failure is loud rather than silent.
- `warp-jump.core.ts:7` — *"a jump is therefore not a new effect drawn over the
  page"* is phrased as an absence, and a strict reading of the *"describes what
  the code does not do"* clause could reach it. I did not fault it, on the same
  distinction the 08:35 pass drew for `warp-drive.ts:6-8`: it names the module's
  defining mechanism, and the sentence completes positively — *"it is the same
  galaxy with its travel rate and its glow taken up"*. There is no code to
  rewrite that would say it instead. Recording the reasoning so a later pass does
  not re-litigate it in the other direction.
