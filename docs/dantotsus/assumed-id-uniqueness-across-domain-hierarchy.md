---
date: 2026-05-05
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/8
fix-pr: https://github.com/hugoleborso/borso.fr/pull/8
fix-commits: [99e91a4]
eradication-level: 1
time-to-detect: hours
tags: [react, identifiers, domain-model, borsouvertures]
---

# Assumed variation IDs were globally unique — they aren't

## Symptom

The "Switch to Play with this scope" button in Learn-tree should carry the
*drilled* opening + variation into Play mode. The visual-validator caught
the wrong opening in the resulting scope:

> **Row #12** — Scope shown was *"Modern Defense / Main Line / Modern
> Defense"* rather than the drilled *"Italian Game / Main Line /
> Italian Game C50"*. Switch happened; scope-mapping correctness is
> questionable.

The handler did:

```ts
function handleSwitchToPlayWithVariation(variation: Variation): void {
  const openingId = openings.find((opening) =>
    opening.variations.some((v) => v.id === variation.id),
  )?.id;
  setPlayScope({
    openingIds: openingId ? [openingId] : [],
    variationIds: [variation.id],
    lineIds: [],
  });
  ...
}
```

`openings.find(...)` returns the *first* opening whose variations contain a
variation with the given ID. Many openings have a variation named `main`
(slug: `main`). The first one in the dataset's iteration order is "Modern
Defense", not "Italian Game" — so the user who drilled Italian Game's
Main Line saw the Play view configured against Modern Defense.

## Root-cause chain

1. **Why did the lookup return the wrong opening?**
   Because variation IDs (`'main'`, `'classical'`, etc.) are not globally
   unique — they're scoped under their parent opening. `.find()` over the
   whole list collides on the shared slug.
2. **Why did I write the lookup that way?**
   Because I treated `Variation.id` as if it were sufficient to identify a
   variation, ignoring that the dataset's `slugify(variation.name)`
   produces collisions across openings (many openings have a "Main Line"
   variation → all slug to `main`).
3. **Why isn't the domain model stricter?**
   Because `Variation` has no back-reference to its parent `Opening`, and
   the typed API of `handleSwitchToPlayWithVariation` accepted only a
   `Variation`, encouraging exactly this lookup pattern.
4. **Why didn't a test catch it?**
   Because the only fixture used in `bookEngine.utils.test.ts` was
   single-opening (`italianMain` / `sicilian`); the cross-opening collision
   scenario was never asserted. The visual-validator caught it instead.

**Root cause:** *thought* `Variation.id` was a primary key; *actually*
it's a *child* key — only unique within its parent opening. The handler
was structurally permitted to write the wrong relationship because the
function signature didn't require both halves of the (opening, variation)
pair.

## Detection failure causes

- **Typing:** Both openings have variations typed `Variation`; TS can't
  distinguish "an Italian variation" from "a Modern Defense variation"
  without a brand.
- **Linter:** Can't catch domain-modelling errors.
- **Functional validation locally:** Single-opening manual testing missed
  it; you have to switch between openings to see the collision.
- **CI / unit tests:** Tests used fixtures with unique IDs across openings
  by coincidence; no cross-opening-with-shared-slug test.
- **`/visual-validation`:** Caught it (run 1508 row #12).

## Countermeasure

`handleSwitchToPlayWithVariation` was changed in commit `99e91a4` to take
*both* the opening and the variation as parameters, and to write both IDs
directly without a lookup:

```diff
- function handleSwitchToPlayWithVariation(variation: Variation): void {
-   const openingId = openings.find((opening) =>
-     opening.variations.some((v) => v.id === variation.id),
-   )?.id;
-   setPlayScope({
-     openingIds: openingId ? [openingId] : [],
-     variationIds: [variation.id],
-     lineIds: [],
-   });
+ function handleSwitchToPlayWithVariation(
+   opening: Opening,
+   variation: Variation,
+ ): void {
+   setPlayScope({
+     openingIds: [opening.id],
+     variationIds: [variation.id],
+     lineIds: [],
+   });
```

`ModeLearnTree` resolves both via `findOpening(openings, selection.openingId)`
+ `findVariation(opening, selection.variationId)` (which already has the
parent in scope) and passes both forward.

## Eradication (mandatory — code-level)

**Type:** Structural impossibility (level 1 — the function signature now
requires both `Opening` and `Variation`, so the wrong-lookup pattern is
no longer expressible at the call site).

**Reference:** [PR #8](https://github.com/hugoleborso/borso.fr/pull/8) ·
commit [`99e91a4`](https://github.com/hugoleborso/borso.fr/commit/99e91a4).

**The actual fix:** see the diff above. The function now takes both
identities; the bug is structurally impossible to reintroduce without
changing the signature again.

**Sibling defects swept:**
- The same `openings.find((o) => o.variations.some((v) => v.id === …))`
  pattern is not used anywhere else in the codebase (verified via grep
  in PR #9, this kaizen PR's prep step).
- A pre-emptive check added in `bookEngine.utils.test.ts` covers the
  cross-opening-collision case using a fixture where two openings share
  a variation slug, asserting `gatherCandidates` resolves correctly.
  *(Shipped in this kaizen PR.)*

## See also

- [`docs/dantotsus/described-screenshot-without-checking-pixels.md`](./described-screenshot-without-checking-pixels.md) —
  the sibling visual-validator finding from the same run (#12 was the
  PASS_WITH_NOTE that surfaced this dantotsu).
