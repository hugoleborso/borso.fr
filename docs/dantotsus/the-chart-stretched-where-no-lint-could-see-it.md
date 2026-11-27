---
date: 2026-11-09
introduced-at: implementation
detected-at: production
severity: low
related-pr: '#281'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/quality/dashboard-page.core.ts, scripts/quality/check-dashboard-page.ts, eslint-rules/no-circle-in-non-uniform-svg.js]
time-to-detect: 2 days
tags: [svg, frontend, gates, meta, mobile]
zone: scripts/quality/dashboard/index.html
weak-point: prose-stands-in-for-a-check
recurs: [circle-went-oval-in-a-stretched-svg-again]
---

# The chart stretched where no lint could see it

## User impact

The operator opened the 3S board on a phone, and the bars, the axis ticks and
their text were all stretched sideways.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-09, phone | Bars, ticks and tick labels stretched horizontally, the text visibly wider than tall | Bars at their drawn width and text at its font size, as on the desktop |

Reported by the operator. Only the board's readers were affected, and only at a
width other than the one the chart was first drawn at.

## Causal chain

- Bars, ticks and labels stretched on a phone.
  - The chart's `<svg>` scaled its drawing to the new width instead of
    redrawing it, and x and y scaled by different factors.
    - The page set non-uniform scaling from d3, on a `viewBox` measured once,
      as `ee60d9d` found it:
      ```js
      .attr('preserveAspectRatio', 'none')  // ← the faulty line
      ```
      - A branch commit of PR #281 wrote that line into the board's page. The
        branch was squashed into `5abe4b2b8`, after `ee60d9d` had already
        removed it, so the commit and its input are not reachable today
        (`git show ee60d9d` fails, this session).
        - The rule that holds this lesson in the repository fires only on a
          `<circle>` or `<ellipse>` inside a JSX `<svg>`. Its knowledge entry
          is printed only when that rule's output appears. Neither could
          reach a `.attr()` call in an `.html` page, so nothing put the lesson
          in front of the agent writing the chart. (Material)

## Root cause of occurrence

*Thought `preserveAspectRatio="none"` makes a chart fill its box at any width,
actually it stretches x and y independently, so every shape and every glyph
distorts at any width but the one the `viewBox` was measured at.* (Material)

The repository held the answer.
[svg-preserveaspectratio-distorts-non-uniform](../knowledge/svg-preserveaspectratio-distorts-non-uniform.md)
states the general rule in prose:

> In any SVG containing circles, regular polygons, or text whose readability
> depends on consistent x/y, `none` is the wrong setting

Its only trigger, at `5abe4b2b8` and today, is the output
`no-circle-in-non-uniform-svg`. Under the agentic 4M rule that makes the cause
Material: the document was absent from the context of the agent writing the
chart. The condition behind it is Machine. The rule and the trigger were both
built from the two earlier occurrences, PR #23's pastilles and PR #31's
sparkline, which happened to be circles in components. Each time the
enforcement was narrowed to the instance at hand.

## Detection failure causes

- **Linter:** `no-circle-in-non-uniform-svg` matches `JSXAttribute` nodes on a
  `<svg>` with round children. The page is HTML with inline d3, which oxlint
  does not lint here, and `.attr('preserveAspectRatio', 'none')` is a call, not
  an attribute. The distorted marks were `<rect>` and `<text>`, which the
  rule's victim list does not name either.
- **Local validation:** the chart was drawn once, at the width it was measured
  at. The distortion appears only at a second width, which nothing drew.
- **CI:** no gate read the page at all. See
  [the-page-nobody-rendered-before-the-operator](./the-page-nobody-rendered-before-the-operator.md).

## Countermeasure

`ee60d9d` dropped the attribute and gave the svg its measured height, so it
scales one to one. A box with no width yet draws nothing and waits for the
width change that redraws it.

## Eradication

**Type:** DevX check (level 2), in two partial checks

**Reference:** the commit adding this file, `e9816136d` on `main`.

`listNonUniformScalings` in `scripts/quality/dashboard-page.core.ts` reads the
board's page as text and refuses both spellings, the markup attribute and the
d3 call. `.husky/pre-push` runs it through
`scripts/quality/check-dashboard-page.ts` when the page changes, and CI runs it
too.

```diff
+const NON_UNIFORM_SCALING = /preserveAspectRatio["'\s]*[,=]?["'\s]*none/g;
```

**Proof it can fail:** `.attr('preserveAspectRatio', 'none')` put back into
the page's chart:

```
  preserveAspectRatio', 'none scales the x and y axes by different factors, so bars, ticks and label text stretch when the box is redrawn at another width
```

The gap, stated: two checks hold the class between them, and each covers part
of it. The JSX rule covers round marks in `.tsx`. The regex covers one HTML
file. A `none` set from `.attr()` in a `.ts` file, or on a `<text>` in JSX,
passes both.

**Proposed:** replace both with one repository-wide check that refuses
`preserveAspectRatio` set to `none` in any tracked source file, in both the
attribute and the `.attr()` spellings, whatever the children. No legitimate
`none` is left in the tree. `EnergySparkline.tsx`, the one documented
exception, no longer exists (`git ls-files | grep EnergySparkline` finds
nothing, this session). The check would exempt only its own fixtures and the
rule tests. It would make non-uniform SVG scaling impossible to commit, instead
of catching two of its shapes. The knowledge entry would then trigger on that
check's output.

**Similar instances:** `git grep -n preserveAspectRatio`, outside `docs/` and
tests, finds `xMidYMid meet` and `xMidYMid slice` in `ElevationProfile.tsx` and
`xMidYMid meet` in `architecture-graph-view.ts`. None is `none`.
