---
date: 2026-06-06
introduced-at: implementation
detected-at: qa
severity: low
related-pr: 31
fix-pr: 31
fix-commits: [f209f36, d7ff9d0]
eradication-level: 2
time-to-detect: hours
tags: [react, svg, biome, grit, plugins, pragma]
---

# The circle went oval in a stretched SVG — the second time

## Symptom

The energy sparkline on the setlist editor rendered its point markers
as horizontally-squashed ovals on desktop. User: _"l'energy bar : les
points sont moches et ovale en mode desktop."_

## Root-cause chain

1. **Why were the dots oval?** They were `<circle>` elements inside an
   `<svg preserveAspectRatio="none">` stretched to the full container
   width. Non-uniform scaling stretches X far more than Y on a wide
   layout, so a circle becomes an ellipse.
2. **Why was this not caught before shipping?** It _had_ been — this
   exact trap was already documented in
   [`docs/knowledge/svg-preserveaspectratio-distorts-non-uniform.md`](../knowledge/svg-preserveaspectratio-distorts-non-uniform.md),
   added in an earlier PR (`c5eb3e0`). The knowledge entry existed and
   still didn't prevent the recurrence.
3. **Why didn't the knowledge entry prevent it?** Knowledge is the
   floor of the eradication ladder — a document only helps the reader
   who happens to recall it at the moment of writing the code. Nothing
   surfaced it at the keystroke that added `<circle … />` under a
   `preserveAspectRatio="none"` SVG.
4. **Why did the first fix make it worse?** The first attempt
   (`f1b5ebf`) reached for a `ResizeObserver` to measure the width and
   render the SVG 1:1 — JavaScript to make a circle round. The user
   pushed back: _"There is no way we need a useEffect to force a circle
   to be round."_ The right fix is pure layout.

**Root cause:** _thought "we documented this SVG-distortion trap, so the
team won't hit it again", actually "a level-5 knowledge entry has no
teeth — only a lint that fires at the offending keystroke prevents a
documented trap from recurring"._

## Detection failure causes

- **Typing:** invisible — JSX/SVG attributes are all valid types.
- **Linter / static analysis:** no rule existed for this shape; the
  knowledge entry was the only line of defence and it's passive.
- **Functional validation locally:** the sparkline was eyeballed at one
  width during development; the distortion is width-dependent and only
  obvious on a wide desktop viewport.
- **CI:** no visual assertion that point markers are round.
- **Code review:** the same blind spot that wrote it would pass it.

## Countermeasure

- **Code:** commit [`f209f36`](https://github.com/hugoleborso/borso.fr/commit/f209f36) —
  keep the smooth area + line in the stretched SVG (a stretched _path_
  is fine, and `vector-effect="non-scaling-stroke"` keeps the line a
  uniform width) and render the point markers as CSS-positioned
  `rounded-full` elements over it: `left` as a percentage straight from
  the data, `top` in px (the vertical axis stays 1:1). No measuring, no
  effect, dots round at any width.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — GritQL Biome plugin) escalating the
existing level-5 knowledge entry to a lint that rejects the
misconception at the keystroke.

**Reference:** [PR #31](https://github.com/hugoleborso/borso.fr/pull/31)
(fix `f209f36`) · kaizen plugin `biome-plugins/no-circle-in-non-uniform-svg.grit`,
wired into `apps/pragma/biome.jsonc`.

**The actual fix:**

```grit
`<svg $props>$children</svg>` where {
  $props <: contains `preserveAspectRatio="none"`,
  $children <: contains or { `<circle $_ />`, `<ellipse $_ />`,
                             `<circle $_></circle>`, `<ellipse $_></ellipse>` },
  register_diagnostic(
    span = $children,
    message = "Round markers (`<circle>`/`<ellipse>`) in an `<svg preserveAspectRatio=\"none\">` render as ovals … overlay the dots as CSS `rounded-full` elements. See docs/knowledge/svg-preserveaspectratio-distorts-non-uniform.md.",
    severity = "error"
  )
}
```

Verified against fixtures and history: the plugin fires on the original
buggy sparkline (`b95e97a`, `<circle>` under `preserveAspectRatio="none"`)
and stays silent on the shipped fix (`f209f36`, dots moved out to CSS)
and the rest of the pragma site (138 files, 0 false positives).

**Sibling defects swept:** none — the existing knowledge entry now
cross-links to this lint, and the lint covers `<circle>` and `<ellipse>`
across all of `apps/pragma`.

## See also

- [`svg-preserveaspectratio-distorts-non-uniform.md`](../knowledge/svg-preserveaspectratio-distorts-non-uniform.md)
  — the knowledge entry this lint gives teeth to.
- [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md)
  — sibling reflex: reaching for a custom mechanism (here a
  `ResizeObserver`) before the simpler primitive (CSS positioning).
