# Standards review — claude/warping-animation-lightspeed-bs2gtz against origin/main

Verdict: PASS
Ledger: c9cc14decde4
Reviewed: 1 file(s). Sealed: 1. Findings: 0.

This is a second pass over the same branch. `pnpm exec tsx
scripts/standards/seal.ts verify --base origin/main` reported ten of the eleven
changed files already cleared and one uncleared, so only
`apps/borso-fr/site/src/warp/warp-jump.core.ts` was in scope. The ten sealed
files were neither re-judged nor re-sealed.

The file was read in full off disk, not as a diff hunk. That matters here: the
edit answering the previous pass is in the working tree and not yet committed,
so `git diff <merge-base> HEAD` still shows the old text. `scripts/standards/seal.ts`
hashes `readFileSync(path)`, so the seal records the working-tree content, which
is the content judged below.

Of the twenty-three bullets in **What only a reviewer can check**, seven have a
subject in this file: the four `01. Naming` bullets on verbs, boolean names,
comments and file names, the `02` bullet on `.core.ts` versus `.utils.ts`, and
the `12` bullet on disable reasons (vacuous — the file carries no disable). The
rest address an API, a repository, a transaction, a Drizzle row type, a query
hook, a form, a grid, a route or a translation key, none of which exist here.

## Findings

None.

## Sealed

- `apps/borso-fr/site/src/warp/warp-jump.core.ts` — the three comment blocks each
  say something the code cannot, which is the bullet the previous pass failed
  this file on. The block on lines 23-35 derives `TOP_STAR_SPEED_MULTIPLIER = 120`
  from the shader's own maths, and every number in it holds against the source:
  `galaxy-shaders.ts:169` is `float depth = fract(i + uStarSpeed * uSpeed)`, so
  one unit of `uStarSpeed * uSpeed` is one cycle;
  `galaxy-clock.core.ts:2,41` advance `travelledDistance` by
  `(chargedSeconds * starSpeed) / STAR_SPEED_DIVISOR` with the divisor at 10; and
  `main.tsx:10,13` freeze `starSpeed: 0.3` and `speed: 1.2`, which give the
  0.036 cycles a second the comment calls cruising and 4.32 at the multiplier,
  a star crossing in 0.231 s. None of that chain is visible from this file, so
  the comment earns its place rather than restating the constant.

  The block on lines 39-47 now reads "A cube leaves the first half of the jump
  looking like nothing has happened" — a present-tense claim about the curve,
  checkable against the exponent on line 50, where the previous version narrated
  a discarded first attempt and sent the reader to a `git log` that never held
  it. The second paragraph explains why the progress is clamped rather than
  guarded, which the `Math.min(Math.max(…))` on line 49 cannot say. The file
  header on lines 1-9 names the `uStarSpeed` relationship the multipliers act on;
  its "not a new effect drawn over the page" clause frames what the file is
  against the shader, rather than excusing an absence in the code, so it is not
  the shape the bullet bans.

  The other bullets: all three functions are `select…` and each returns what one
  rule chose — a clamped, squared progress, the intensity at that progress, and
  `CRUISING` or the jump reading depending on whether a jump is running — which
  is the promise `docs/standards/01-naming.md` records for the verb, including
  its note that most `select…` functions here return a single value. There is no
  boolean, so nothing to un-negate. The file name says what it holds, and every
  literal is named (`JUMP_DURATION_MILLISECONDS`, `TOP_STAR_SPEED_MULTIPLIER`,
  `TOP_GLOW_MULTIPLIER`); the bare `1` and `0` sit in the clamp and the identity
  position the standard exempts. The `.core.ts` choice holds: "how hard is the
  galaxy flying during a jump" is a question the product owner would recognise,
  the file sits in the `warp/` context folder beside its siblings rather than in
  a horizontal folder, and it reads nothing outside its arguments — time arrives
  as `nowMilliseconds`, never from a clock.

## Unclear

None.

## Outside the checklist

- `apps/borso-fr/VOCABULARY.md` has no noun for the jump or the warp, although
  the branch adds five files under `site/src/warp/` that talk about one. The
  ledger bullet asks whether an existing definition is still true, not whether a
  new noun was added, so this changes no verdict. Its `## Galaxy` section reads
  "Mounted into `#bg-canvas-wrap` with one frozen parameter set": the prop set in
  `main.tsx` is still frozen, and it is now the uniforms that vary at frame time
  (`Galaxy.tsx:225,233`), so the sentence can be read either way. Both belong to
  files already sealed, and are advisory only.
