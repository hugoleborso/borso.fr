---
date: 2026-05-03
introduced-at: conception
detected-at: qa
severity: high
related-pr: #6
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [e5cb098]
eradication-level: 2
time-to-detect: hours
tags: [react, spec, validators, url-state]
---

# Mount-time side-effects must be asserted in the spec, not implied

## Symptom

A fresh visit to `/art/mondrian/` (no `?seed=`) generated a seed and rendered the painting, but never wrote the seed back into the URL via `history.replaceState`. Same gap on `?seed=garbage` — the page silently regenerated internally and left the bogus seed in the address bar. Both broke the share-by-URL contract: a friend copying the URL would not see the painting that was on screen.

The defect was caught by the `visual-validator` agent (rows 03 + 29 in `visual-validation-2026-05-03-2202.md`). The earlier `technical-validator` runs had not flagged it.

## Root-cause chain

1. **Why** did the URL not mirror the resolved state on first paint?
   `App.tsx` had a popstate listener (read URL → React state) and a `compose()` callback (write URL via `pushState`), but no mount-time effect doing the reverse mirror (read React state → write URL via `replaceState`).

2. **Why** did the implementer not write that effect?
   The spec's Q7 said *"Compose updates URL via `pushState`; palette change updates URL via `replaceState`. Cascade auto-replaces."* It did not list "on mount, mirror the resolved seed and palette into the URL via `replaceState`." The implementer wrote effects for everything the spec explicitly named.

3. **Why** did `/technical-validation` not catch it?
   The validator's category A walks every Q.O.D. row and every *Files-to-change* entry, asserting the *named* code paths exist. Mount-time URL mirroring was not a named row. The validator's rule on `useEffect` checks misuses of effects that exist; it has no way to detect missing effects.

4. **Why** did the spec leave it implicit?
   The author thought *"URL state is bidirectional; the read side is obvious"* — and it is, on read. The *write side* on mount is what was missed. The asymmetry was invisible because the spec discussed URL behaviour only in terms of user-driven mutations (compose, palette change, cascade), never as an arrival assertion.

5. **Why** is this a recurring pattern, not a one-off?
   Any feature that mirrors React state to an external system (URL, localStorage, document title, focus, analytics) has the same shape: the spec naturally talks about the user-driven mutations, and the on-mount mirror is structurally invisible to a "list the assertions" validator unless someone names it.

**Root cause:** *thought* "the URL is mirrored to React state" was a single round-trip assertion in the spec; *actually* it is two assertions (mount-time write, user-driven write) and only the second was named, so the first was never tested by either validator.

## Detection failure causes

- **Typing:** N/A.
- **Linter / static analysis:** N/A — `useEffect` was *missing*, not *misused*; lint can't see the gap.
- **Functional validation locally:** The implementer's `pnpm dev` smoke-test never opened `/art/mondrian/` without a `?seed=` query (the screenshot script always passed one).
- **CI (tests / build):** Builds green. Unit tests on `*.utils.ts` cover the pure functions; the missing call site lives in `App.tsx`, not in a util.
- **Code review:** Diff added several `useEffect` blocks that all looked correct on their own; absence of an additional one wasn't flagged.
- **`/technical-validation`:** Walks named spec rows. Cannot detect missing effects against an under-specified spec.
- **`/visual-validation`:** Caught it because the validator opens the running app and *observes* the URL; it doesn't depend on the spec naming the assertion. This is the validator's job and it worked.

## Countermeasure

Add a mount-time `useEffect` that calls `window.history.replaceState({ seed, paletteKey }, '', buildSearch({ seed, paletteKey }))` once on first paint, using `replaceState` (not `pushState`) so the back-button doesn't land on a "before the page loaded" entry.

- **Code:** commit [`e5cb098`](https://github.com/hugoleborso/borso.fr/commit/e5cb098) added the mount-time effect to `apps/borso-fr/site/art/mondrian/App.tsx`.
- **Operator action:** None.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — `/specification` template requirement)

**Reference:** PR (this kaizen) · commit `<kaizen-commit>`

**The actual fix:** the `/specification` skill template gains a required *On-mount side-effects* sub-section under *Use cases / edge cases*. Every spec that mirrors React state to an external system (URL, storage, document title, focus, analytics, …) must list each on-mount mirror as a discrete assertion — same status as a happy-path step. The technical-validator then has a category-A row to verify the code exists; the visual-validator has a row to verify the *observable effect* on first paint.

The misconception (*"the on-mount mirror is implied by the user-driven assertion"*) becomes structurally impossible because the template forces the author to name it before the spec is approved.

```diff
+ ### On-mount side-effects
+
+ > *List every external-system mirror that must fire on first paint
+ > (URL, localStorage, document title, focus, analytics events, etc.).
+ > Each row is a discrete assertion that both validators check.*
+
+ - <subsystem>: <state> mirrored via <call> on mount with <push|replace|other>.
```

`.claude/skills/specification/template.md` and `.claude/skills/specification/SKILL.md` updated.

**Sibling defects swept:** the same shape exists at any future feature where state lives in a non-React store. The template change applies prospectively.

## See also

- `docs/features/borso-fr/mondrian-atelier/validation/visual-validation-2026-05-03-2202.md` — the report that surfaced the defect.
- [`docs/dantotsus/vite-non-module-script-tags-arent-bundled.md`](./vite-non-module-script-tags-arent-bundled.md) — same PR; another "this slipped past the technical validator" pattern that shows up only at the visual / production layer.
