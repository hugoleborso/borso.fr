# Standards review — claude/warping-animation-lightspeed-bs2gtz against origin/main

Verdict: PASS
Ledger: c9cc14decde4
Reviewed: 1 file(s). Sealed: 1. Findings: 0.

Third pass over this branch. `pnpm exec tsx scripts/standards/seal.ts verify
--base origin/main` reported ten of the eleven changed files already cleared and
one uncleared, so only `apps/borso-fr/site/src/warp/warp-drive.ts` was in scope.
The ten sealed files were neither re-judged nor re-sealed.

The file was read in full off disk rather than as a diff hunk, which matters
again here: the edit that unsealed it is in the working tree and not yet
committed, so `git diff <merge-base> HEAD` shows the version sealed on
2026-08-19. `scripts/standards/seal.ts` hashes `readFileSync(path)`, so the seal
recorded below is on the working-tree content, which is the content judged.

The delta since the first seal is one named constant and its JSDoc, plus the two
lines that write it:

```ts
const JUMPING_BODY_CLASS = 'jumping';
document.body.classList.add(JUMPING_BODY_CLASS);
document.body.classList.remove(JUMPING_BODY_CLASS);
```

Of the twenty-three bullets in **What only a reviewer can check**, six have a
subject in this file: the four `01. Naming` bullets on verbs, boolean names,
comments and file names, the `02` bullet on `.core.ts` versus `.utils.ts`, and
the `12` bullet on disable reasons (vacuous — `grep -n eslint-disable` on the
file exits 1). The rest address an API, a repository, a transaction, a Drizzle
row type, a query hook, a form, a grid, a route, a `cva` variant table or a
translation key, none of which exist here.

## Findings

None.

## Sealed

- `apps/borso-fr/site/src/warp/warp-drive.ts` — the new JSDoc on lines 15-19 is
  the only comment the previous seal did not cover, and it is the shape bullet
  `01` wants rather than the shape it bans:

  ```ts
  /**
   * Carried on `body` for the length of the jump. `site/index.html` reads it to
   * fade the menu and its button out of the way, so the galaxy is what the
   * reader is looking at while it flies.
   */
  const JUMPING_BODY_CLASS = 'jumping';
  ```

  The claim was checked against the file it names. `apps/borso-fr/site/index.html:45`
  is the `id="burger"` button and now carries
  `[.jumping_&]:pointer-events-none [.jumping_&]:opacity-0`;
  `apps/borso-fr/site/index.html:107` is the `id="menu"` nav and carries the same
  pair. Both sit under `body`, which is where line 23 puts the class, so the
  arbitrary-variant selector resolves and "the menu and its button" is exactly
  what fades. None of that is visible from this module, so the comment documents
  something the code cannot say.

  The rest of the file is unchanged from the content sealed on 2026-08-19 and
  was re-read rather than assumed. The header on lines 1-8 frames the jump
  against the shader — the same clause the second pass judged in
  `warp-jump.core.ts`, and it reads the same way here: "the effect is the
  background that was already there, flying" says how the effect is obtained,
  not what the module declines to do. The block on lines 30-33 names the
  back-forward cache, a browser behaviour no line of the file states.

  Naming: the string literal is a named constant, which is what the standard's
  literal rule asks. `engageJump`, `settleGalaxy`, `jumpBeforeNavigation` and
  `installWarpDrive` are none of the banned verbs `handle`, `process`, `manage`
  or `do`, and none of the table verbs whose promise a reviewer has to check —
  the one `select…` in the file, `selectNavigationMode`, is declared in
  `warp-navigation.core.ts` and was judged in the first pass. No boolean is
  declared here, so there is nothing to un-negate; the four booleans passed to
  `selectNavigationMode` (`isDownloadLink`, `isModifiedClick`,
  `isReducedMotionPreferred`, and `isJumping()`) all read as claims.

  `.core.ts` versus `.utils.ts` does not apply: the module touches
  `document`, `window.location`, `performance.now` and `setTimeout`, so it
  correctly carries neither suffix and neither coverage gate.

  Blueprint: `// @FollowsBlueprint browser-edge-module` on line 63, and it does
  follow `apps/borso-fr/site/src/art/mondrian/cascade-timer.ts` — one exported
  entry point the composition root calls (`home-page.ts:14`), the mutable state
  held in a module-level record outside React (`warp-jump.store.ts:11`), and no
  branch left in the edge module that a pure file could own. The blueprint's
  boolean-keyed action table has no subject here, because there is one action
  rather than an on/off pair.

## Unclear

None.

## Outside the checklist

Advisory only; none of this changed a verdict or a seal.

- **375 pixels was not opened in a browser.** The reviewable file renders
  nothing, and the working-tree change to `index.html` adds only
  `[.jumping_&]:pointer-events-none [.jumping_&]:opacity-0` and widens
  `transition-colors` to `transition-[background-color,color,opacity]`. Neither
  is a layout-bearing class in the sense standard 05 lists, so the bullet had no
  subject and neither `scripts/browser.sh` nor `scripts/argent.sh` was run.
- `apps/borso-fr/VOCABULARY.md` §Jump describes this file as "the click
  listener, the navigation timer, and the reset for a page restored from the
  back-forward cache". That is still true — nothing in the section is now false
  — but the module has since taken on a third job, fading the page chrome
  through the `body` class, and the bullet asks only whether an existing
  definition holds. A fourth sub-bullet naming the class would keep the section
  matching the file.
- The class is removed on `pageshow` and nowhere else. If a navigation is
  cancelled after `event.preventDefault()` without the document being replaced
  or restored, the chrome stays faded and `isJumping()` stays true, which locks
  out later clicks. No bullet covers it and the timer makes it hard to reach;
  noting it because the reset path is single-sourced on one browser event.
- `settleGalaxy` remains a two-line function whose whole content is the reset
  pair, which now justifies it more than it did at the first pass.
