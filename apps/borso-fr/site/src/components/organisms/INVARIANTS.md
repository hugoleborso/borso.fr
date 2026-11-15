# Invariants of borso-fr, in `site/src/components/organisms`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borso-fr/`.

## Galaxy

- Ported from the react-bits component under its MIT header; the GLSL in
  `galaxy-shaders.ts` is verbatim and only the harness was retyped.
- Mounted into `#bg-canvas-wrap` with one parameter set fixed at mount,
  taking the reader's reduced-motion preference as `isAnimationPaused`.
  Two uniforms move after that: the frame loop scales the star speed and
  the glow by the Jump's intensity.
- `selectStarClock` returns the previous reading while paused, so the
  stars hold position instead of jumping when animation resumes, and it
  accumulates distance per frame rather than deriving it from the clock,
  which is what lets the star speed change mid-flight without tearing.
