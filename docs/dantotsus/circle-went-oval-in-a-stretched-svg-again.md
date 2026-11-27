---
date: 2026-06-06
introduced-at: implementation
detected-at: qa
severity: low
related-pr: '#31'
fix-commits: [f209f3665c, d7ff9d0647]
eradication-level: 2
eradication-paths: [eslint-rules/no-circle-in-non-uniform-svg.js, .oxlintrc.json]
time-to-detect: hours
tags: [react, svg, biome, grit, plugins, pragma]
zone: apps/pragma/site/src/components/molecules
weak-point: prose-stands-in-for-a-check
---

# The energy dots went oval on desktop, three days after the trap was written down

## User impact

The energy sparkline of the pragma setlist editor drew its points as flattened ovals on a desktop screen. The operator: "l'energy bar : les points sont moches et ovale en mode desktop" (the energy bar's points are ugly and oval on desktop).

| | Seen | Expected |
| --- | --- | --- |
| Sparkline points on a wide screen | Ovals stretched sideways | Round dots at every width |

Phone widths looked close to right. The wider the screen, the flatter the dots.

## Causal chain

- The sparkline points rendered as ovals on desktop.
  - The SVG scaled its x axis far more than its y axis on a wide container.
    - `EnergySparkline.tsx` drew the points as `<circle>` inside an SVG stretched to the container's width:

      ```tsx
      <svg ... preserveAspectRatio="none">  {/* ← x and y scale independently */}
        ...
        <circle key={index} cx={x} cy={y} r="2.5" fill={accent} />
      ```

      - Commit `b884c228d` (2026-05-20, an agent) wrote the molecule.
        - `docs/knowledge/svg-preserveaspectratio-distorts-non-uniform.md` had described this trap since 2026-05-17 (`c5eb3e0`). Knowledge entries were then read only when someone searched for them. Delivery by trigger arrived on 2026-10-12, in #159 (`8a5828581`).

## Root cause of occurrence

*Thought a `<circle>` stays round inside any SVG, actually `preserveAspectRatio="none"` scales x and y by different factors and turns every circle into an ellipse.* (Material)

The document that held the answer existed, but nothing loaded it into the agent's context when it wrote the line (inferred, the transcript is gone). The knowledge entry explains:

> An `<svg viewBox="0 0 800 200" preserveAspectRatio="none">` renders into whatever box CSS gives it, **without** preserving the 4:1 aspect ratio. Width and height scale *independently*.

## Detection failure causes

- **Typing:** every attribute is valid JSX.
- **Linter:** no rule read this shape at the time. The knowledge entry was the only defence, and it waited to be searched.
- **Local validation:** the sparkline was checked at one width. The distortion grows with width.
- **CI:** no visual assertion that markers are round.
- **Review:** the same session wrote and reviewed it.

## Countermeasure

A first attempt (`f1b5ebf`) measured the width with a `ResizeObserver` to render the SVG one to one. The operator refused it: "There is no way we need a useEffect to force a circle to be round."

Commit [`f209f36`](https://github.com/hugoleborso/borso.fr/commit/f209f3665c) kept the stretched area and line in the SVG, with `vector-effect="non-scaling-stroke"`, and drew the points as CSS `rounded-full` elements placed over it. The dots stayed round at any width. The sparkline itself was later removed with its feature, in `e42eda8fd`.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`d7ff9d0`](https://github.com/hugoleborso/borso.fr/commit/d7ff9d0647) added the check as a Biome GritQL plugin. When the repository left Biome (`314f24821`, then oxlint in `9dcf74547`), it became `eslint-rules/no-circle-in-non-uniform-svg.js`. `.oxlintrc.json` enables `"borso/no-circle-in-non-uniform-svg": "error"` for `apps/*/site/**/*.{ts,tsx}`, so every app's site refuses the shape at lint, in the pre-commit hook and in CI. Its message:

> A <circle> or <ellipse> inside an <svg preserveAspectRatio="none"> renders as an oval, because non-uniform scaling stretches the x and y axes by different factors. Keep the stretched path in the SVG, and overlay the dots as CSS rounded-full elements.

**Proof it can fail:** `eslint-rules/no-circle-in-non-uniform-svg.test.js` holds `valid` and `invalid` cases for the rule. The original plugin fired on the buggy sparkline (`b95e97a`) and stayed silent on the fix (`f209f36`) and on the other 138 pragma files, as measured when it shipped.

**Similar instances:** `grep -rn 'preserveAspectRatio' apps/*/site/src --include=*.tsx` finds only `xMidYMid` values in last-loop-lepin's `ElevationProfile.tsx`, which scale uniformly.
