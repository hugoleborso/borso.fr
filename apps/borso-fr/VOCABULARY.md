# Vocabulary — borso-fr

`borso-fr` is a personal site with no server and no accounts. It holds a
landing page with an animated star field, a Mondrian composition
generator, a page tracking a year of self-set challenges, and two static
pages for family.

There is no single application. Vite's root is `site/`, and
`vite.config.ts` lists five HTML inputs: `index`, `mom`, `sisters`,
`mondrian` and `twelveLabours`. Each is its own page with its own script,
and nothing routes between them but links.

This file names the things the site talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is
taken from the type, pure helper or data module named beside it.

## Animation mode

Which way a composition moves on screen, chosen in the studio rail.

Lives in: `site/src/art/mondrian/animation.core.ts`

- Four values: `still`, `drift`, `breathe`, `cascade`, resolving onto a
  `CanvasTransform` of `none`, `drift` or `breathe`. Under reduced motion
  every mode resolves to `none`.
- The inkbloom is separate: the entry animation a rectangle plays when
  first drawn, staggered across 600 ms by index and jittered by its id.

## Cascade

The mode that keeps replacing the composition on a timer.

Lives in: `site/src/art/mondrian/cascade-timer.ts`

- The interval is 5500 ms and each tick replaces the history entry rather
  than stacking one per tick.
- The handle lives in one module-level record, so switching the mode is
  an event handler rather than an effect. `isCascadeMode` is false under
  reduced motion, so the timer never starts there.

Not to be confused with: the other three modes, which transform the same
rectangles. Cascade changes the seed instead.

## Challenge

One thing the site's owner set out to do in a given month.

Lives in: `site/src/labours/labours.types.ts`

- `titleKey`, `kind` and `status` are required; `noteKey` and `proofs`
  are optional. Every reader-facing string is a `TranslationKey`.
- `kind` is one of `daily`, `count`, `oneshot`. `status` is one of
  `done`, `partial`, `failed`, `abandoned`, `doing`, `todo`; only the
  first two weigh in a score.

Not to be confused with: a labour. The page is called the twelve labours,
but the unit the code counts and scores is a challenge.

## Composition

One Mondrian picture: the rectangles, their colours, and the title and
work number that name it.

Lives in: `site/src/art/mondrian/`

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

## Departure

What any page of the site does between the click on an internal link and the
browser leaving. Every page has one: a Jump where there is a Galaxy, a Fade
where there is not. `warp-drive.ts` installs it on all three built pages. A
page with something longer to play passes its own length for the click to be
held; the two that fade take the default.

Lives in: `site/src/warp/`

## Edition

One year of the twelve labours, with its months.

Lives in: `site/src/labours/`

- `titleKey`, `subtitleKey` and `months` are all required.
- `LABOURS.editions` is keyed by year, and `listAvailableYears` relies on
  numeric-looking keys enumerating in ascending order. Two ship,
  `EDITION_2025` and `EDITION_2026`, each in its own file.

## Entry point

One of the five HTML files Vite builds, each its own page.

Lives in: `vite.config.ts`

- `site/index.html` loads `site/src/main.tsx`, which mounts the galaxy,
  and `site/src/home-page.ts`, which reads `fr.json` directly rather than
  carrying the i18next runtime onto the landing page.
- `site/art/mondrian/index.html` and `site/12-travaux/index.html` are the
  React pages; `site/family/` holds the two static ones.
- The burger menu links them. Its items live under `home.menu`, and their
  fan-out delay and Escape behaviour are decided in `home-menu.core.ts`.

## Fade

What a page with no Galaxy does while the browser leaves it: its own content
goes to nothing and the paper it was printed on stays. The other half of the
Departure, beside the Jump.

Lives in: `site/src/warp/`

- Held for 420 ms against the Jump's 800 ms. A fade has nothing to build up
  to, so the whole of it is the wait.
- Driven by the `jumping` class on `body` and the `--transition-hold` custom
  property, both written by `warp-drive.ts`, so the length of the fade and the
  length of the hold are one number.

## Galaxy

The animated star field behind the landing page.

Lives in: `site/src/components/organisms/`

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

## Jump

The lightspeed acceleration the Galaxy makes while the browser leaves the
landing page. Never "warp animation": the Galaxy is already travelling, and a
jump is that travel taken up, not a second effect laid over it. Not a synonym
for Departure either — a jump is the one kind of departure a page with a
Galaxy can make.

Lives in: `site/src/warp/`

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

## Month

One row of an edition: a number, a name and its challenges.

Lives in: `site/src/labours/labours.types.ts`

- `monthNumber`, `nameKey` and `challenges` are required; `coverImage` is
  optional. A month with no explicit cover lends its first photo proof,
  and only when it has at least two (`listMonthCoverImages`).
- `selectCurrentMonthNumber` answers null unless the edition on screen is
  the current year, which is what marks a month as live.

## Palette

The colours a composition is painted with.

Lives in: `site/src/art/mondrian/palettes.utils.ts`

- Five keys: `classic`, `muted`, `nocturne`, `garden`, `custom`. A
  palette is a `bg`, a `line`, and a list of fills, each a hex plus the
  `TranslationKey` of its name.
- The presets repeat a fill to weight it in the draw, so
  `listDistinctFills` de-duplicates for the swatch row and
  `splitPaletteFills` counts only the first `bg` match as the neutral.

Not to be confused with: the paper theme in `paper-theme.ts`, five values
keyed by the same `PaletteKey` and written onto the document element as
`--color-atelier-*` properties. It colours the studio page around a
composition rather than the composition.

## Proof

The evidence attached to a challenge.

Lives in: `site/src/labours/labours.types.ts`

- `type` is one of `photo`, `video`, `link`, `note`, `stat`, and `value`
  carries a media path, an address or a measured figure depending on it.
- `listProofSections` splits a challenge's proofs into a media carousel
  (`photo` and `video`) and a row of chips, dropping either when empty.
- Media files live under `site/public/media/12-travaux/`, referenced
  absolutely so they stay clear of the `/12-travaux/` route.

## Rectangle

One field of a composition.

Lives in: `site/src/art/mondrian/painting.utils.ts`

- Coordinates are on the unit square, so the frame scales without
  touching the data. `id` is the index the rectangle ended up at.
- No cut leaves a side below `MIN_RECT_DIMENSION`, which is 0.06, so the
  loop ends even when the requested count is unreachable.
- `generateLayout` produces uncoloured rectangles; `colorize` returns
  `ColoredRect`, adding a `fill` hex and that colour's name key.

Not to be confused with: the interface's word for the same thing, which
is *field*. The complexity slider and the stage metadata both read
"fields", and `CompositionStage` takes `fieldCount`.

## Score

How much of an edition or a month has been completed.

Lives in: `site/src/labours/labours.core.ts`

- `completed` and `total`, where `total` is the challenge count. A `done`
  challenge is worth 1 and a `partial` one 0.5, so `completed` may carry
  a half.
- `formatScore` writes it in the `fr-FR` locale, so a half point reads
  with a comma and matches the distances written on the same page.

## Seed

The 32-bit number that decides a composition.

Lives in: `site/src/art/mondrian/url-state.utils.ts`

- Carried in the query string as up to eight hexadecimal digits, beside
  `palette`. A visit with no seed, or an unreadable one, draws a fresh
  one and mirrors it back into the address bar.
- It feeds `mulberry32`, and the layout, the colouring and the title each
  mix it with a different constant. `freshSeed` takes the random number
  as an argument, which keeps the picker pure.

Not to be confused with: the work number the stage prints, which is the
seed modulo 9999 padded to four digits (`formatWorkNumber`).

## Title

The sentence a composition is named by.

Lives in: `site/src/art/mondrian/titles.utils.ts`

- Drawn from the seed: an adjective, a noun, and the name of the colour
  covering the most area, which ignores the paper and the line.
- An adjective is reachable only through the gender of the noun that
  governs it, so a French title cannot come out ungrammatical.
- It is what the `Announcer` reads out when a composition is drawn.

## Token namespace

The prefix that says which piece a design token belongs to.

Lives in: `site/src/styles/tokens.css`

- Three in one `@theme` block: `apex-` for the landing page, `atelier-`
  for the Mondrian studio, `labours-` for the twelve labours.
- A token is a Tailwind utility wherever it is known at build time. The
  colours the twelve labours page picks at runtime are exported from
  `site/src/theme/twelve-labours.theme.ts` as `var(...)` references.

## Words we do not use

- **user**, **account**: nobody has one. The person is the **reader**.
- **painting**, **artwork**, **canvas** for the generated picture. It is
  a **composition**. *Painting* survives in `painting.utils.ts` and one
  hint string, *artwork* in the `mondrian.artwork-title.*` keys; neither
  should spread.
- **tile**, **cell**, **block** for a piece of one. It is a **rectangle**
  in code and a **field** in the interface.
- **task**, **goal**, **objective** for something the owner set out to
  do. It is a **challenge**, and its evidence is a **proof**.
- **travaux**, **douze**, or any other French noun in an identifier. The
  route is `/12-travaux`, but the code says **labours**, **edition**,
  **month**, **challenge**.
- **colour** in identifiers: code spells `color` (`ColoredRect`,
  `customColor1`) while catalogue keys spell `colour`
  (`mondrian.colour.vermillion`). A new identifier follows the code.
- **theme** unqualified. Say **palette** for what paints a composition,
  **paper theme** for the studio page around it, and **token namespace**
  for the prefixes in `tokens.css`.
- **route**, **router**. Each page is its own **entry point**, and moving
  between them is a full page load.
