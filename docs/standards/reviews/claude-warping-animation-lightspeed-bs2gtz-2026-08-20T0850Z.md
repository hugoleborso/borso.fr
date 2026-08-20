# Standards review — claude/warping-animation-lightspeed-bs2gtz against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 1 file(s). Sealed: 1. Findings: 1.

Scope this pass: `seal.ts verify --base origin/main` reported one uncleared file
of eleven changed — `apps/borso-fr/site/src/warp/warp-jump.core.ts`. It was read
in full at working-tree content. The finding below is against a file the seal
predicate does not cover, so it does not hold a seal back; it is a checklist
bullet all the same and the branch should not ship with it.

## Findings

### apps/borso-fr/VOCABULARY.md:140

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, which is prose against code and therefore nothing a rule can do." (01. Naming)

```markdown
- Only the landing page installs it. The other pages have no Galaxy, so
  there is nothing there to accelerate.
```

Three entry points call `installWarpDrive()`, not one:
`apps/borso-fr/site/src/home-page.ts:16` (`installWarpDrive(JUMP_DURATION_MILLISECONDS)`),
`apps/borso-fr/site/src/12-travaux/main.tsx:8` and
`apps/borso-fr/site/src/art/mondrian/main.tsx:34` (both bare `installWarpDrive()`,
taking the `PAGE_FADE_DURATION_MILLISECONDS` default). The sentence sits directly
under the `warp-drive.ts` bullet, so "it" reads as the drive, and the drive is
installed everywhere; `warp-drive.ts:2` says so itself — "The transition every
page of borso.fr plays before the browser leaves it." Under the narrower reading
where "it" is the Jump, the first clause survives but the second is still wrong:
the other pages do install something, they fade instead of accelerating.
What would satisfy it: say that every page installs the drive, and only the
landing page has a Galaxy to accelerate — the others hold the same click for
`PAGE_FADE_DURATION_MILLISECONDS` and fade.

## Sealed

- `apps/borso-fr/site/src/warp/warp-jump.core.ts` — read in full. Every number a
  comment asserts was checked against its source rather than taken on trust:
  cruising 0.036 cycles a second is `starSpeed 0.3` and `speed 1.2` from
  `main.tsx:10,13` over `STAR_SPEED_DIVISOR` in `galaxy-clock.core.ts:2`; 200
  takes that to 7.2, a crossing in 0.139 s, 8.3 frames at 60 Hz; `HIGHEST_PROGRESS`
  1.6 gives a 319.4x multiplier, 11.5 cycles a second, 0.087 s, 5.2 frames, and is
  reached at `sqrt(1.6) = 1.265` of the jump, which is "just over a quarter again".
  The line this pass exists for — "The sibling test pins it, so it changes in two
  places" — is true: `warp-jump.core.test.ts` hard-codes `200` or `199` on lines
  23, 33, 37, 44, 50 and 61. On the other bullets: `select…` on all three
  functions matches "what a rule chooses" in 01's table and the sibling
  `selectStarClock` / `selectNavigationMode`; no `find…` or `get…` to check; no
  boolean, so nothing to negate; `.core.ts` over `.utils.ts` is right under 02
  because Jump is a noun `apps/borso-fr/VOCABULARY.md:123` defines; the file is
  pure and `nowMilliseconds` arrives as a parameter at line 84; no
  `@FollowsBlueprint` tag, so no blueprint claim to verify; nothing renders, so
  the 375-pixel bullet has no subject.

## Unclear

- None.

## Outside the checklist

- The 08:45 advisory is discharged. The comment now reads "This is the number to
  move if the jump feels wrong. The sibling test pins it, so it changes in two
  places" (`warp-jump.core.ts:37-38`), and both halves check out against the test.
- `warp-jump.core.ts:22-24` — *"It lives here so every length a click is held for
  is one file."* is a placement rationale rather than a fact about the constant.
  Not faulted: it is neither a restatement, a history note, nor a description of
  an absence, and the sentence before it carries a real why (a fade has nothing
  to build up to). Recording it so a later pass does not read it as new.
- `warp-jump.core.ts:44-45` — *"The jump does not stop building when the browser
  is asked to leave"* opens as an absence, and the strict reading of the "what
  the code does not do" clause could reach it. Not faulted, on the distinction
  the 08:45 pass drew for line 7: the clause completes positively on the next
  line — "It keeps accelerating on the same curve" — and it is the only way to
  explain a ceiling set above 1.
