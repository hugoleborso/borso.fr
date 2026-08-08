# SVG `preserveAspectRatio="none"` distorts shapes when the container aspect ≠ viewBox aspect

Brief explainer + the lesson from PR #23's elevation profile.

## What happens

An `<svg viewBox="0 0 800 200" preserveAspectRatio="none">` renders
into whatever box CSS gives it, **without** preserving the 4:1 aspect
ratio. Width and height scale _independently_. If the container is
600 × 200 (a 3:1 box), the horizontal scale is `600 / 800 = 0.75`
and the vertical scale is `200 / 200 = 1.0`. A `<circle cx="400"
cy="100" r="10">` is then drawn as an ellipse with rx = 7.5 px and
ry = 10 px.

That's exactly how the elevation-profile pastilles became ovals on
PR #23's preview — the SVG carried `preserveAspectRatio="none"`
because the curve geometry was designed to fill the card body, but
the runner pastilles inherited the non-uniform scaling and were
visibly stretched.

## Fix

Drop the `preserveAspectRatio="none"` (the default is
`xMidYMid meet`, which scales uniformly and centres). The SVG then
fits its container preserving the viewBox aspect, with letterboxing
or pillarboxing as needed. Shapes stay circular.

```diff
- preserveAspectRatio="none"
- width="100%"
- height={PROFILE_MIN_HEIGHT_PX}
+ preserveAspectRatio="xMidYMid meet"
+ width="100%"
+ height="100%"
```

The trade-off: the elevation curve no longer fills the entire card
body in both dimensions; on a wide-but-short card, the curve
letterboxes at top and bottom. That's the price for circular
pastilles, and is mostly invisible because the elevation card is
roughly the same aspect as its 4:1 viewBox anyway.

## When `preserveAspectRatio="none"` IS the right call

When the SVG content is _intentionally_ a stretch-to-fit visual
(e.g. a backdrop gradient that has no recognisable shapes, or a
purely-decorative shape where distortion is acceptable). In any SVG
containing circles, regular polygons, or text whose readability
depends on consistent x/y, `none` is the wrong setting.

## When you genuinely need the full-width stretch AND round shapes

Sometimes letterboxing isn't acceptable — a full-width sparkline _wants_
the curve stretched edge to edge, but its point markers must stay round.
Don't measure the width with a `ResizeObserver` to force the SVG 1:1
(that was PR #31's rejected first attempt — JavaScript to round a
circle). Instead **keep the stretched `<path>`/area inside the
`preserveAspectRatio="none"` SVG** (a stretched curve is fine, and
`vector-effect="non-scaling-stroke"` keeps the line a uniform width) and
**render the round markers as CSS-positioned elements over it**: `left`
as a percentage straight from the data, `top` in px (the vertical axis
stays 1:1 when SVG height = viewBox height), `rounded-full` on a fixed
px box. Pure layout, no measuring, round at any width. See
`apps/pragma/site/src/components/molecules/EnergySparkline.tsx`
(commit `f209f36`).

## Enforcement

This trap recurred in PR #31 despite this very entry existing — a
knowledge doc has no teeth. It's now a lint:
`biome-plugins/no-circle-in-non-uniform-svg.grit` flags `<circle>` /
`<ellipse>` inside an `<svg preserveAspectRatio="none">`, wired into
`apps/pragma/biome.jsonc`. See
[`../dantotsus/circle-went-oval-in-a-stretched-svg-again.md`](../dantotsus/circle-went-oval-in-a-stretched-svg-again.md).

## See also

- [MDN — `preserveAspectRatio`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio) — the canonical reference.
- PR #23 commit `a0b4622` (`fix(last-loop-lepin): circular profile pastilles + plug onerror HTML leak`) — worked example.
- [`biome-grit-jsx-matching.md`](./biome-grit-jsx-matching.md) — how the enforcing GritQL plugin matches JSX.
