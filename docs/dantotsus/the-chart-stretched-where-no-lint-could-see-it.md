---
date: 2026-11-09
introduced-at: implementation
detected-at: production
severity: low
related-pr: '#281'
fix-pr: none (the kaizen pull request for PR #281 carries it)
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/quality/dashboard-page.core.ts, scripts/quality/check-dashboard-page.ts]
time-to-detect: 2 days
tags: [svg, frontend, gates, meta, mobile]
zone: scripts/quality/dashboard/index.html
weak-point: prose-stands-in-for-a-check
recurs: [circle-went-oval-in-a-stretched-svg-again]
---

# The chart stretched where no lint could see it

## User impact

The third occurrence of one trap. The operator opened the 3S board on a phone
and the bars, the axis ticks and their text were all stretched sideways.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-09, phone | Bars, ticks and tick labels stretched horizontally, the text visibly wider than tall | Bars at their drawn width and text at its font size, as on the desktop |

The first occurrence was PR #23's elevation-profile pastilles, which became
ovals. The second was PR #31's energy sparkline, same shape, after a knowledge
entry describing the trap already existed; that one shipped the ESLint rule
`no-circle-in-non-uniform-svg`. This is the third, in a file neither the entry
nor the rule can reach.

## Causal chain

- Bars, ticks and labels stretched on a phone
  - The chart's `<svg>` carried `preserveAspectRatio="none"` with a `viewBox`
    measured at one width
    - So the next width scaled x and y by different factors instead of
      redrawing, and everything inside scaled with it
      - Nothing refused the attribute: `eslint-rules/no-circle-in-non-uniform-svg.js`
        reads JSX attributes on a `<svg>` element and looks for `<circle>` or
        `<ellipse>` children
        - The board's page is `.html`, which oxlint does not lint here, and it
          sets the attribute from d3 as `.attr('preserveAspectRatio', 'none')`,
          which is a call and not an attribute
          - And the things distorted were `<rect>` bars and `<text>` labels,
            which the rule's victim list does not name either

## Root cause of occurrence

*Thought the trap was round markers in JSX, actually it is non-uniform scaling
of anything whose shape carries meaning, in any file the repository draws SVG
in.*

The rule and the knowledge entry it enforces were both written from the two
occurrences that happened to be circles in components:

> Round markers (`<circle>`/`<ellipse>`) in an `<svg preserveAspectRatio="none">`
> render as ovals

[docs/knowledge/svg-preserveaspectratio-distorts-non-uniform.md](../knowledge/svg-preserveaspectratio-distorts-non-uniform.md)
states the general rule correctly in prose — *"In any SVG containing circles,
regular polygons, or text whose readability depends on consistent x/y, `none` is
the wrong setting"* — and the enforcement built from it kept only the circles.

## Detection failure causes

- **Linter:** `no-circle-in-non-uniform-svg` matches `JSXAttribute` nodes. The
  page is HTML with inline d3, so the rule never ran on the file and would not
  have matched the call form if it had.
- **Local validation:** the chart was drawn once, at the width it was measured
  at. Distortion appears only at a second width, which nothing drew.
- **CI:** no browser, and no gate read the page at all. See
  [the-page-nobody-rendered-before-the-operator](./the-page-nobody-rendered-before-the-operator.md).
- **The corpus:** the knowledge entry says what to do and is the only thing
  that said it for this file. It did not stop the second hit either, which is
  what `circle-went-oval-in-a-stretched-svg-again` is about.

## Countermeasure

`ee60d9d` dropped the attribute and gave the svg its measured height, so it
scales one to one and a box with no width yet draws nothing and waits for the
width change that redraws it.

## Eradication

**Type:** DevX check (level 2)

**Reference:** this commit, on the kaizen branch for PR #281.

`listNonUniformScalings` in `scripts/quality/dashboard-page.core.ts` reads the
page as text and refuses both spellings, the markup attribute and the d3 call:

```diff
+const NON_UNIFORM_SCALING = /preserveAspectRatio["'\s]*[,=]?["'\s]*none/g;
+
+export function listNonUniformScalings(pageHtml: string): readonly string[] {
+  return [...pageHtml.matchAll(NON_UNIFORM_SCALING)].map(...);
+}
```

It runs from `scripts/quality/check-dashboard-page.ts` on push and in CI, over
the one file in this repository that draws SVG outside a linted `.tsx`.

The JSX rule was deliberately left as it is. Widening its victim list to
`<rect>` and `<text>` would fire on nothing:
`grep -rn '<text\|<rect' apps/*/site/src --include=*.tsx` finds them only in
`InterfaceGlyphs.tsx` and `ElevationProfile.tsx`, whose SVGs carry
`xMidYMid meet` and `xMidYMid slice`, and the one `preserveAspectRatio="none"`
in the tree, `EnergySparkline.tsx`, holds a `<path>` and a gradient. A rule
named after circles that also flags text is a name that has stopped describing
its behaviour, bought for a defect that has never occurred in JSX.

**Proof it can fail:** `.attr('preserveAspectRatio', 'none')` put back into the
page's chart, as `ee60d9d` found it:

```
  preserveAspectRatio', 'none scales the x and y axes by different factors, so bars, ticks and label text stretch when the box is redrawn at another width
```

**Similar instances:** `grep -rn preserveAspectRatio` over `apps/`, `scripts/`,
`infra/` and `eslint-rules/` finds four live uses: two `xMidYMid` in
`ElevationProfile.tsx`, one `xMidYMid meet` in `architecture-graph-view.ts`, and
`EnergySparkline.tsx`'s `none`, which is the documented case where the stretch
is wanted and the round markers sit outside the svg in CSS.
