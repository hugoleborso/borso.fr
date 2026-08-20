# Standards review — claude/warping-animation-lightspeed-bs2gtz against origin/main

Verdict: PASS
Ledger: c9cc14decde4
Reviewed: 3 file(s). Sealed: 3. Findings: 1, raised and fixed while the review was open.

## Findings

### apps/borso-fr/site/src/warp/warp-jump.core.ts:63 — raised, then fixed

Bullet: `reviewer` checks that a comment documents something the code cannot say, and is not a restatement, a history note, or a description of what the code does not do.

The content read at the start of this review carried, in the JSDoc on `selectJumpProgress`:

```ts
 * The floor is what stops a reading from before the jump being squared into a
 * positive one. There is no ceiling at the end of the jump, only the one at
 * `HIGHEST_PROGRESS`, which is what lets the field keep building while the
 * destination is still loading.
```

The second sentence failed the bullet twice over. It described what the code does not do — the clamp at `1` that the previous revision had and this one dropped, which makes it a history note written in the present tense — and its remaining half restated the JSDoc `HIGHEST_PROGRESS` already carries fifteen lines above: *"The jump does not stop building when the browser is asked to leave, because the page is still on screen until the destination answers."* The first sentence, on the floor, is the part a reader cannot deduce, and it stands on its own.

The sentence was removed from the working tree while the review was open. The file now reads:

```ts
 * The floor is what stops a reading from before the jump being squared into a
 * positive one.
 */
```

I read the file in full again at that content and sealed it. The seal is on the fixed content; the note on it records what the earlier content held, so the next reviewer does not have to rediscover why this comment block has now been rewritten twice.

## Sealed

- apps/borso-fr/site/src/warp/warp-drive.ts — the two cross-file claims in its comments are true as written: `--transition-hold` is read back by `12-travaux/index.html:22` and `art/mondrian/index.html:17,21` as `duration-[var(--transition-hold)]`, and the `jumping` body class by `index.html:45` and `:107` as `[.jumping_&]:opacity-0`. Callers agree with the new default — `home-page.ts:16` passes `JUMP_DURATION_MILLISECONDS`, the two galaxy-less entry points call `installWarpDrive()` bare. Shape still matches `browser-edge-module`: one exported entry, mutable state held outside React in `warp-jump.store.ts`, the decision delegated to `warp-navigation.core.ts`.
- apps/borso-fr/site/src/warp/warp-jump.core.ts — sealed after the finding above was fixed. Both documented numbers check out against the cruising rate of 0.036 cycles a second the comment states: `TOP_STAR_SPEED_MULTIPLIER = 200` gives 7.2 cycles a second and 8.3 frames a crossing at 60 Hz, against the claimed 7.2, 0.14 s and eight frames; `HIGHEST_PROGRESS = 1.6` gives 319.4×, 11.5 cycles a second and 5.2 frames, against the claimed five, and √1.6 = 1.26 of the jump duration, which is the "quarter again" the comment claims. Pure, `now` enters as an argument, every literal named.
- apps/borso-fr/site/src/home-page.ts — not in the list I was handed, but its 18:12 seal no longer held: the file was edited at 08:29 and `verify` reported it uncleared. Read in full and re-sealed. The delta is the `JUMP_DURATION_MILLISECONDS` import and the argument at line 16; the comment on line 15 makes a comparison this file cannot show, and it is true — `art/mondrian/main.tsx:34` and `12-travaux/main.tsx:8` call `installWarpDrive()` bare and take the 420 ms fade, this page takes 800 ms.

## Unclear

- None.

## Outside the checklist

- The `.core.ts` choice for `warp-jump.core.ts` is right under 02: `warp/` is the feature's own folder and the vocabulary — jump, cruising, glow — is the one the site talks in, which is the "would a product manager recognise the name" test. Recording it so the next pass does not re-litigate it.
- `warp-drive.ts:6-8` — *"Nothing is drawn over either: the effect is what was already there, leaving."* is also an absence, and a reader could ask why it did not fall under the same bullet as the finding above. The distinction applied: the finding explained a line of code a reader might expect and not find, which is the case the standard tells you to fix by rewriting the code; the header states the module's defining property, for which there is no code to rewrite. It also stands unchanged in substance from the content sealed at 08:22.
- `PAGE_FADE_DURATION_MILLISECONDS` living in `warp-jump.core.ts` stretches the file's own header, which introduces the file as being about how hard the galaxy is flying. The name `warp-jump` still covers it, so no bullet fails; if a third hold length ever appears, the header is what needs widening.
- The file list handed to this review was stale by one file. `home-page.ts` had been edited six minutes before the review started and its seal had already lapsed, so "the other nine are already sealed" was true when it was written and not when it was acted on. Trust `seal.ts verify` at the moment of review rather than a list.
