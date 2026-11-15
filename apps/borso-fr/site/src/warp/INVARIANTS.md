# Invariants — borso-fr, `site/src/warp`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borso-fr/`.

## Fade

- Held for 420 ms against the Jump's 800 ms. A fade has nothing to build up
  to, so the whole of it is the wait.
- Driven by the `jumping` class on `body` and the `--transition-hold` custom
  property, both written by `warp-drive.ts`, so the length of the fade and the
  length of the hold are one number.

## Jump

- `warp-navigation.core.ts` decides whether a click earns a departure. Only a
  plain left click on a same-origin link that replaces this document does.
- `warp-jump.core.ts` holds the curve and the two multipliers, the arithmetic
  tying the peak to the shader's cycle rate, and both hold lengths.
- `warp-jump.store.ts` holds the start time outside React, because the
  Galaxy's frame loop lives inside the effect that owns its WebGL context.
- `warp-drive.ts` is the browser edge: the click listener, the navigation
  timer, and the reset for a page restored from the back-forward cache.
- The curve keeps climbing after the browser is asked to leave, because the
  page is still on screen until the destination answers.
