# Invariants of borso-fr, in `site/src/art/mondrian`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borso-fr/`.

## Animation mode

- Four values: `still`, `drift`, `breathe`, `cascade`, resolving onto a
  `CanvasTransform` of `none`, `drift` or `breathe`. Under reduced motion
  every mode resolves to `none`.
- The inkbloom is separate: the entry animation a rectangle plays when
  first drawn, staggered across 600 ms by index and jittered by its id.

## Cascade

- The interval is 5500 ms and each tick replaces the history entry rather
  than stacking one per tick.
- The handle lives in one module-level record, so switching the mode is
  an event handler rather than an effect. `isCascadeMode` is false under
  reduced motion, so the timer never starts there.

## Composition

- Fully determined by a seed and a rectangle count, so the same pair
  paints the same picture forever (`generateLayout`).
- The address bar is the only store. `composition-url.ts` reads it with
  `useSyncExternalStore`; composing pushes a history entry, changing the
  palette replaces one.
- Composing is a click on the frame, a tap, or the space bar, which
  `isComposeKeyEvent` ignores while the focus is in an input.
- The screen is two regions: the **studio rail**, which holds the three
  sliders (complexity 6 to 60, line weight 1 to 14, colour balance 0 to
  1) and the palette, animation, compose and download controls, and the
  **composition stage**, which holds the frame and its labels. Everything
  but the seed and the palette is React state in `App.tsx`.
- The PNG export re-draws the same rectangles into a 2000 px square SVG
  and rasterises that, rather than reading the DOM.

## Palette

- Five keys: `classic`, `muted`, `nocturne`, `garden`, `custom`. A
  palette is a `bg`, a `line`, and a list of fills, each a hex plus the
  `TranslationKey` of its name.
- The presets repeat a fill to weight it in the draw, so
  `listDistinctFills` de-duplicates for the swatch row and
  `splitPaletteFills` counts only the first `bg` match as the neutral.

## Rectangle

- Coordinates are on the unit square, so the frame scales without
  touching the data. `id` is the index the rectangle ended up at.
- No cut leaves a side below `MIN_RECT_DIMENSION`, which is 0.06, so the
  loop ends even when the requested count is unreachable.
- `generateLayout` produces uncoloured rectangles; `colorize` returns
  `ColoredRect`, adding a `fill` hex and that colour's name key.

## Seed

- Carried in the query string as up to eight hexadecimal digits, beside
  `palette`. A visit with no seed, or an unreadable one, draws a fresh
  one and mirrors it back into the address bar.
- It feeds `mulberry32`, and the layout, the colouring and the title each
  mix it with a different constant. `freshSeed` takes the random number
  as an argument, which keeps the picker pure.

## Title

- Drawn from the seed: an adjective, a noun, and the name of the colour
  covering the most area, which ignores the paper and the line.
- An adjective is reachable only through the gender of the noun that
  governs it, so a French title cannot come out ungrammatical.
- It is what the `Announcer` reads out when a composition is drawn.
