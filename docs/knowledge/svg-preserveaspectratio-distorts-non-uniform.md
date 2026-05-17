# SVG `preserveAspectRatio="none"` distorts shapes when the container aspect ≠ viewBox aspect

Brief explainer + the lesson from PR #23's elevation profile.

## What happens

An `<svg viewBox="0 0 800 200" preserveAspectRatio="none">` renders
into whatever box CSS gives it, **without** preserving the 4:1 aspect
ratio. Width and height scale *independently*. If the container is
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

When the SVG content is *intentionally* a stretch-to-fit visual
(e.g. a backdrop gradient that has no recognisable shapes, or a
purely-decorative shape where distortion is acceptable). In any SVG
containing circles, regular polygons, or text whose readability
depends on consistent x/y, `none` is the wrong setting.

## See also

- [MDN — `preserveAspectRatio`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio) — the canonical reference.
- PR #23 commit `a0b4622` (`fix(last-loop-lepin): circular profile pastilles + plug onerror HTML leak`) — worked example.
