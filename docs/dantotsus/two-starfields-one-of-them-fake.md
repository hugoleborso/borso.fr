---
date: 2026-08-20
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#63'
fix-pr: '#63'
fix-commits: [efd65da]
eradication-level: 4
time-to-detect: 40 minutes
tags: [frontend, animation, webgl, conception, tailwind]
---

# Two starfields, one of them fake

## Symptom

The ask was a lightspeed warp when a link is clicked on borso.fr. What shipped
first was a DOM overlay drawn on top of the landing page: a dark veil, ninety-six
absolutely positioned streak elements flying outwards, and a white bloom, all on
CSS keyframes. It passed every gate — lint, typecheck, 100% coverage, 100%
mutation, a browser pass — and was rejected on sight:

> ce n'est pas la même galaxie qui fait un saut vitesse lumière, tu as rajouté un
> truc moche par dessus

The landing page already renders a WebGL galaxy the viewer is travelling
through. The overlay covered it with a second, unrelated starfield. Two
starfields, one of them fake.

## Root-cause chain

1. **Why did the page end up with two starfields?**
   Because the warp was built as a new thing drawn over the page rather than as
   a change to the thing already on it.

2. **Why was it built as a new thing?**
   Because the effect was designed from the words in the request — streaks,
   speed, a flash — rather than from the page it would play on.

3. **Why was it designed from the words rather than the page?**
   Because the page's existing visual was treated as a backdrop the effect sits
   in front of, not as material the effect could be made out of.

4. **Why was it treated as a backdrop?**
   Because `Galaxy.tsx` was never opened. `index.html`, `home-page.ts` and
   `tokens.css` were all read while scoping the work; the one component that
   draws the thing the effect is about was not.

5. **Why was that component not opened?**
   Because nothing asked. The files read were the ones the new code would touch,
   and a component the new code does not import never came up.

**Root cause:** thought *a lightspeed effect is something you add to a page*,
actually *this page already renders a starfield the viewer travels through, and
the effect is that starfield's own travel rate going up*. Had that been known
first, the first version would have been the four lines in the frame loop that
the second version turned out to be — and `uStarSpeed`, the shader's own
distance-travelled uniform, was sitting there the whole time.

## Detection failure causes

- **Typing:** nothing type-level distinguishes an effect that duplicates an
  existing visual from one that does not.
- **Linter / static analysis:** every rule passed. The overlay was clean code;
  being clean is orthogonal to being the wrong thing.
- **Functional validation locally:** the browser pass checked that the overlay
  did what the overlay was designed to do. A validation written against the
  implementation cannot discover that the implementation is the wrong idea.
- **CI:** green throughout, for the same reason.
- **Code review:** this is where it was caught, by the operator, on the first
  look at the preview. The cost was the round trip, not the miss.
- **PO / QA validation:** the operator is the PO here; see above.

The honest reading is that no automated layer could have caught this, because
every layer checks the artefact against its own design. The gap is upstream of
all of them, at conception.

## Countermeasure

- **Code:** commit `efd65da` — the overlay is deleted entirely (the veil, the
  ninety-six streaks, the bloom, three `@keyframes` and three `@utility` blocks
  in `tokens.css`, and a whole pure module of streak geometry). The jump becomes
  the galaxy's own travel rate and glow climbing, read once per frame from a
  module outside React. `tokens.css` returned byte-identical to `main`.

Two changes were needed to make the galaxy able to jump at all, and both are the
interesting residue of the pivot:

- `selectStarClock` accumulates distance frame by frame instead of deriving it
  from elapsed time. Under the old formula, multiplying `starSpeed` mid-flight
  moved the whole starfield by that factor in a single frame — a tear, not an
  acceleration.
- The intensity is read from a module the frame loop imports, not from React
  state, because the loop lives inside the effect that owns the WebGL context
  and a state change would rebuild the context mid-jump.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a reviewer bullet, which the ledger collects and
the standards-review agent enforces)

**Reference:** [PR #63](https://github.com/hugoleborso/borso.fr/pull/63) ·
kaizen PR for this entry

**The actual fix:**

```diff
+- `reviewer` checks that a visual effect added to an existing screen is made
+  out of what that screen already renders, where it can be. An effect drawn
+  over a page that already draws something similar is two of that thing, one of
+  them fake; see docs/dantotsus/two-starfields-one-of-them-fake.md.
```

Added to the `## Enforced by` block of
[`docs/standards/08-styling.md`](../standards/08-styling.md). This is not
decoration: `scripts/standards/enforcement-ledger.ts` collects every `reviewer`
bullet into the *What only a reviewer can check* section of
[`enforcement-ledger.md`](../standards/enforcement-ledger.md), and that section
is the entire scope of the [`/standards-review`](../../.claude/skills/standards-review/SKILL.md)
agent. Adding the bullet adds the question to every future review of a
front-end change, and the seal records the answer.

Level 4 rather than 2 is the honest ceiling. No linter can ask whether a new
effect duplicates an existing one — that comparison is between a diff and a
screen, and only a reader can make it.

**Sibling defects swept:** the favicon in the same PR was the same shape at
smaller scale — a `b` monogram designed and shipped without showing a cheap
preview first, rejected in one line, reverted in `040542e`. Both are the
conception-stage habit of building the artefact before checking what it has to
live with.

## See also

- [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md)
  — the same misconception pointed outwards at dependencies instead of inwards
  at the page. That entry asks "does a library already do this?"; this one asks
  "does this screen already draw this?".
- [`a-tailwind-variant-that-compiled-to-nothing.md`](./a-tailwind-variant-that-compiled-to-nothing.md)
  — a second silent failure from the same PR, in the styling toolchain.
- [`../knowledge/judging-an-animation-you-cannot-watch.md`](../knowledge/judging-an-animation-you-cannot-watch.md)
  — why the overlay looked acceptable from this harness for as long as it did.
