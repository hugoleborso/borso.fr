---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#171'
fix-pr: none (the kaizen pull request that adds this file)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/talos/site/src/styles/tokens.css]
time-to-detect: days
tags: [talos, frontend, react, drift]
zone: apps/talos/site/src/styles/tokens.css
recurs: [two-copies-that-had-to-agree-and-nothing-made-them]
---

# The dark theme written twice drifted

## Symptom

Rewriting the talos palette on PR #171 with a script that replaced each token in each dark block, the script failed on `--color-scrim`: the second dark block did not declare it. An owner who forced dark mode in the settings got the light scrim, `#191b1666`, behind every sheet and dialog.

## Root-cause chain

1. **Why was the scrim missing?** `tokens.css` declared the dark palette twice: once for a dark system setting (`@media (prefers-color-scheme: dark) :root:not([data-theme='light'])`) and once for a forced dark theme (`:root[data-theme='dark']`).
2. **Why twice?** A CSS rule cannot be both inside and outside a media query, and the two cases need the same values. Copying the block was the shape the artifact guidance and most examples use.
3. **Why did the copies drift?** Nothing compares them. The first block even declared the scrim twice, which looks like the line that was meant for the second block.

**Root cause:** thought two copies of the dark palette stay in step if they are edited together, actually nothing makes them, and the forced theme is the one nobody looks at.

## Detection failure causes

- **Linter / static analysis:** the stylesheet gate checks selectors, not that two blocks agree.
- **Functional validation locally:** the system theme is what every screenshot uses; a forced theme is a settings toggle away.

## Countermeasure

- **Code:** PR #171 added the missing scrim to the second block.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commit adding this file.

**The actual fix:** each colour is written once, in `@theme`, as `light-dark(<light>, <dark>)`. `color-scheme` on the root decides which side applies, `light dark` by default and the forced value under `data-theme`, so there is no second block left to drift. The shadows that carried colours are built from two new colour tokens, `shadow-umbra` and `shadow-edge`, and the focus ring from `surface` and `bronze`.

```diff
-  --color-bg: #ecd6bb;
+  --color-bg: light-dark(#ecd6bb, #111614);
 …
-@layer base {
-  @media (prefers-color-scheme: dark) {
-    :root:not([data-theme='light']) {
-      --color-bg: #111614;
-      …
-  :root[data-theme='dark'] {
-    --color-bg: #111614;
-    …
```

Checked by computing every token in a browser before and after, in six cases (light and dark system, each with no forced theme, forced light and forced dark): all 46 colours are identical in all six. `shadow-2` changes slightly, by design: its second layer is now a 1px edge in both themes, where the light theme had a small drop.

**Sibling defects swept:** no other application has a forced theme; their tokens files declare no `data-theme` block.

## See also

- [`../knowledge/tailwind-v4-theme-and-preflight-traps.md`](../knowledge/tailwind-v4-theme-and-preflight-traps.md)
- [`two-copies-that-had-to-agree-and-nothing-made-them.md`](./two-copies-that-had-to-agree-and-nothing-made-them.md): the same class, a rule written in two places; here the second place is deleted rather than checked.
