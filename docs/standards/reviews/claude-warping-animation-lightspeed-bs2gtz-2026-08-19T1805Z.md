# Standards review — claude/warping-animation-lightspeed-bs2gtz against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 11 file(s). Sealed: 10. Findings: 1.

The eleven files are exactly what `pnpm exec tsx scripts/standards/seal.ts
verify --base origin/main` asks a seal for, which matches `isReviewablePath` in
`scripts/standards/seal.core.ts`: under `apps/` or `infra/`, ending `.ts` or
`.tsx`, and not a test or a `.d.ts`. Each was read in full off disk, not as a
diff hunk.

Every judgement below comes from the **What only a reviewer can check** section
of `docs/standards/enforcement-ledger.md`. Nine of its twenty-three bullets have
no subject here: `borso-fr` is a front-end-only application with no API, no
repository, no transaction, no Drizzle row type, no query hook, no form and no
grid, so the back end, typing-derivation, data-fetching and database bullets are
vacuous rather than passed.

Four of the eleven files change only by an import path, because
`use-animation.ts` and `use-reduced-motion.ts` were renamed to carry the `.hook`
suffix. They were still read in full and judged as whole files, since the seal
is on content.

## Findings

### apps/borso-fr/site/src/warp/warp-jump.core.ts:41

Bullet: `reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do. (01. Naming)

```ts
/**
 * Squared, so the galaxy answers the click straight away and still spends most
 * of its speed at the end. Cubed was the first try and it left the first half
 * of the jump looking like nothing had happened.
```

The first sentence is what the bullet wants: it says why the exponent is two,
which the expression on line 50 cannot. The second narrates a discarded earlier
attempt, which is the "we used to do X" shape `docs/standards/01-naming.md`
§Comments sends to `git log` — and this attempt never reached `git log` at all,
so the sentence is the only record of a version of the file that never existed.

What would satisfy it: state the same fact as a present-tense claim about the
curve, which stays checkable for as long as the constant does — e.g. "A cube
leaves the first half of the jump looking like nothing has happened." The
finding is narrow and the fix is one sentence; nothing else in the file fails a
bullet, and the block comment above `TOP_STAR_SPEED_MULTIPLIER` on lines 23-35
is a good example of the same bullet passing, because the shader relationship it
describes appears nowhere in the code.

## Sealed

- `apps/borso-fr/site/src/warp/warp-navigation.core.ts` — `selectNavigationMode`
  returns one of the two modes a rule chose, which is what `select…` promises,
  and `isModifiedClick` is a boolean read as a claim rather than a negation. The
  `.core.ts` choice holds: "should this link warp or should the browser take
  it" is a question the product owner would recognise, and the file reads
  nothing outside its arguments.
- `apps/borso-fr/site/src/warp/warp-jump.store.ts` — module-level mutable state
  is correct here rather than a purity break, because the file is a `.store.ts`
  and the header says what the code cannot: React state would re-run the effect
  that owns the WebGL context.
- `apps/borso-fr/site/src/warp/warp-drive.ts` — follows `browser-edge-module`,
  and does: one exported entry point, the mutable handle held outside React (in
  `warp-jump.store.ts`), and the decision delegated to a pure `.core.ts` rather
  than branched inline.
- `apps/borso-fr/site/src/components/organisms/Galaxy.tsx` — the surviving
  effect's disable reason names the external system it synchronises with ("the
  ogl WebGL renderer, which owns its own canvas, resize listener and animation
  frame lifecycle"), which is bullet 07, and it is a claim about that line a
  reader can check, which is bullet 12. The vendored header the
  `vendored-third-party` blueprint asks for is intact on lines 1-11. The four
  boolean props are four independent switches, not one variant axis split into
  booleans, so bullet 05's prop check passes.
- `apps/borso-fr/site/src/components/organisms/galaxy-clock.core.ts` — pure,
  with time arriving as `timestamp` rather than a clock read, and the two new
  comments both say something the code cannot: what a hundred-millisecond frame
  means, and why distance is accumulated instead of derived.
- `apps/borso-fr/site/src/home-page.ts` — `getElementById` and `getDialogById`
  both throw when the element is absent, which is the half of the verb table
  only a reviewer can check. `home.menu.open-label` names the screen and the
  element. The i18next comment on lines 7-10 was the closest call in this
  review: it has the shape of a library justification, which the standard sends
  to an ADR, but what it actually records is a measured cost local to this one
  import, and without it a later reader would "fix" the file back onto the
  runtime it deliberately avoids.
- `apps/borso-fr/site/src/art/mondrian/use-animation.hook.ts` — the effect's
  reason names `requestAnimationFrame` and its lifecycle, which is the one case
  standard 07 keeps an effect for.
- `apps/borso-fr/site/src/art/mondrian/use-reduced-motion.hook.ts` — matches
  `hook-external-store` line for line: `useSyncExternalStore` with subscribe,
  snapshot and server snapshot declared at module level.
- `apps/borso-fr/site/src/art/mondrian/App.tsx` — composes two organisms and an
  atom, and owns one grid wrapper. Measured against the sealed exemplar for the
  same bullet, `apps/pragma/site/src/routes/catalog/CatalogPage.tsx`, a wrapper
  `div` carrying layout classes is not what "owns no layout primitive" excludes.
- `apps/borso-fr/site/src/components/organisms/MondrianFrame.tsx` — composes the
  `MondrianRect` atom, and `mondrian.stage.frame-label` names the screen and the
  element.

## Unclear

None. Every file reached a verdict.

## Outside the checklist

Advisory only; none of this changed a verdict or a seal.

- **375 pixels was not opened in a browser.** No file in this diff adds or
  changes a layout-bearing class: `App.tsx`, `MondrianFrame.tsx` and both hooks
  move an import, and `Galaxy.tsx` changes only what the frame loop computes.
  The bullet had no subject, so `agent-browser` and `scripts/argent.sh` were not
  run. A reader who wants that evidence has the screenshots this branch commits
  under `docs/features/borso-fr/lightspeed-jump/validation/screenshots/`.
- `apps/borso-fr/site/src/warp/warp-drive.ts` carries no layer suffix, so
  `convention-drift.md` counts it under "nothing in the name says". The
  blueprint it follows has the same gap — `cascade-timer.ts` is listed at layer
  `unknown` — so the pattern, not the file, is where that would be fixed. The
  branch still moves the budget down, from 15 unlayered files to 14, because the
  two hook renames pay for it.
- `apps/borso-fr/site/src/art/mondrian/App.tsx:83` renders a raw `<button>` with
  a thirty-class string where an atom would normally sit. `borso-fr` has no
  `Button` atom for it to use, and no bullet covers an inlined interactive
  primitive in a file that is in no bucket, so this is a note rather than a
  finding. It predates the branch.
- `settleGalaxy` in `warp-drive.ts:26` is a one-line wrapper whose only content
  is a call to `endJump`, and it exists to carry its own comment. Nothing fails,
  but the back-forward-cache note would read the same on the `pageshow`
  listener.
- The four changed test files are outside the seal predicate, so they were not
  judged for a verdict. Read anyway against bullet 10: every name states a
  behaviour and its condition, e.g. "charges a background tab returning after a
  minute as a single long frame".
