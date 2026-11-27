---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#171'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/talos/site/src/styles/tokens.css]
time-to-detect: days
tags: [talos, frontend, react, drift]
zone: apps/talos/site/src/styles/tokens.css
recurs: [two-copies-that-had-to-agree-and-nothing-made-them]
---

# The dark theme written twice drifted

## User impact

A talos owner who forced dark mode in the settings saw the light scrim behind
every sheet and dialog.

| | Seen | Expected |
| --- | --- | --- |
| Forced dark theme, any sheet open | scrim `#191b1666`, the light theme's | scrim `#000000a6`, as with a dark system setting |
| Dark system setting, no forced theme | `#000000a6` | `#000000a6` |

Found on PR #171, when a script that rewrote each token in each dark block
failed on `--color-scrim` in the second block (measured). Owners on the system
theme were not affected.

## Causal chain

- A forced dark theme showed the light scrim.
  - `:root[data-theme='dark']` declared no `--color-scrim`, so the light value
    from `@theme` applied.
    - `tokens.css` declared the dark palette twice: under
      `@media (prefers-color-scheme: dark) :root:not([data-theme='light'])`
      and under `:root[data-theme='dark']`.
      - Commit `f723bb1fd` (#145) added the dark scrim twice to the first block
        and never to the second (measured with `git show f723bb1fd`):

        ```css
        +      --color-scrim: #000000a6;
        +      --color-scrim: #000000a6; /* ← meant for the forced-dark block */
        ```

        - The twice-written block is the shape the artifact guidance
          prescribes. The Artifact tool's description, loaded in every agent
          session here, says to redefine the colours "for dark mode under
          `@media (prefers-color-scheme: dark)` guarded by
          `:root:not([data-theme="light"])` and again under
          `:root[data-theme="dark"]`" (Material).

## Root cause of occurrence

*Thought the dark palette must be declared once per selector, actually
`light-dark()` with `color-scheme` holds both themes in one declaration.*
(Material)

The guidance in the agent's context named only the two-block shape, so every
new token had to be added in three places. The duplicated line in `f723bb1fd`
shows the writer meant one line per dark block and put both in the first
(inferred from the diff).

## Detection failure causes

- **Linter:** `scripts/check-stylesheet-contents.sh` checks which selectors
  the stylesheet may hold. It never compares the token sets of two blocks.
- **Local validation:** screenshots use the system theme. The forced theme is
  a settings toggle away, so no check rendered it.

## Countermeasure

PR #171 added the missing scrim to the second block.

## Eradication

**Type:** structural impossibility (level 1). In talos, each colour is written
once, so there is no second copy to drift.

**Reference:** the commit adding this file.

Each colour sits in `@theme` as `light-dark(<light>, <dark>)`. `color-scheme`
on the root picks the side: `light dark` by default, the forced value under
`data-theme`. The shadows that carried colours are built from two new tokens,
`shadow-umbra` and `shadow-edge`.

```diff
-  --color-bg: #ecd6bb;
+  --color-bg: light-dark(#ecd6bb, #111614);
 …
-  @media (prefers-color-scheme: dark) {
-    :root:not([data-theme='light']) {
-      --color-bg: #111614;
-  …
-  :root[data-theme='dark'] {
-    --color-bg: #111614;
```

**Proof it can fail:** every token was computed in a browser before and after,
in six cases (light and dark system, each with no forced theme, forced light
and forced dark). All 46 colours are identical in all six (measured).
`shadow-2` changes by design.

**Similar instances:** `grep -ln prefers-color-scheme apps/*/site/src/styles/*.css`
finds `apps/borsouvertures/site/src/styles/tokens.css`. It has no forced
theme, but line 64 redefines every colour token a second time inside
`@media (prefers-color-scheme: dark)`. A token added to `@theme` and not there
keeps its light value in dark mode. Nothing refuses a twice-written block in
any app, talos included, so the level above holds for the talos file only.

**Proposed:** teach `scripts/check-stylesheet-contents.sh` to refuse a
`--color-*` declaration inside a `prefers-color-scheme` or `data-theme` block,
and move borsouvertures to `light-dark()`. A second copy of a colour then
cannot be committed in any app.
