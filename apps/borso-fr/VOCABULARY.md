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

The rules each term holds, and the tests that hold them, sit beside the code
in the `INVARIANTS.md` its `Invariants:` line names. The repository's own
words are in [`docs/VOCABULARY.md`](../../docs/VOCABULARY.md).

## Animation mode

Which way a composition moves on screen, chosen in the studio rail.

Lives in: `site/src/art/mondrian/animation.core.ts`

Invariants: `site/src/art/mondrian/INVARIANTS.md`

## Cascade

The mode that keeps replacing the composition on a timer.

Lives in: `site/src/art/mondrian/cascade-timer.ts`

Invariants: `site/src/art/mondrian/INVARIANTS.md`

Not to be confused with: the other three modes, which transform the same
rectangles. Cascade changes the seed instead.

## Challenge

One thing the site's owner set out to do in a given month.

Lives in: `site/src/labours/labours.types.ts`

Invariants: `site/src/labours/INVARIANTS.md`

Not to be confused with: a labour. The page is called the twelve labours,
but the unit the code counts and scores is a challenge.

## Composition

One Mondrian picture: the rectangles, their colours, and the title and
work number that name it.

Lives in: `site/src/art/mondrian/`

Invariants: `site/src/art/mondrian/INVARIANTS.md`

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

Invariants: `site/src/labours/INVARIANTS.md`

## Entry point

One of the five HTML files Vite builds, each its own page.

Lives in: `vite.config.ts`

Invariants: `INVARIANTS.md`

## Fade

What a page with no Galaxy does while the browser leaves it: its own content
goes to nothing and the paper it was printed on stays. The other half of the
Departure, beside the Jump.

Lives in: `site/src/warp/`

Invariants: `site/src/warp/INVARIANTS.md`

## Galaxy

The animated star field behind the landing page.

Lives in: `site/src/components/organisms/`

Invariants: `site/src/components/organisms/INVARIANTS.md`

## Jump

The lightspeed acceleration the Galaxy makes while the browser leaves the
landing page. Never "warp animation": the Galaxy is already travelling, and a
jump is that travel taken up, not a second effect laid over it. Not a synonym
for Departure either — a jump is the one kind of departure a page with a
Galaxy can make.

Lives in: `site/src/warp/`

Invariants: `site/src/warp/INVARIANTS.md`

## Month

One row of an edition: a number, a name and its challenges.

Lives in: `site/src/labours/labours.types.ts`

Invariants: `site/src/labours/INVARIANTS.md`

## Palette

The colours a composition is painted with.

Lives in: `site/src/art/mondrian/palettes.utils.ts`

Invariants: `site/src/art/mondrian/INVARIANTS.md`

Not to be confused with: the paper theme in `paper-theme.ts`, five values
keyed by the same `PaletteKey` and written onto the document element as
`--color-atelier-*` properties. It colours the studio page around a
composition rather than the composition.

## Proof

The evidence attached to a challenge.

Lives in: `site/src/labours/labours.types.ts`

Invariants: `site/src/labours/INVARIANTS.md`

## Rectangle

One field of a composition.

Lives in: `site/src/art/mondrian/painting.utils.ts`

Invariants: `site/src/art/mondrian/INVARIANTS.md`

Not to be confused with: the interface's word for the same thing, which
is *field*. The complexity slider and the stage metadata both read
"fields", and `CompositionStage` takes `fieldCount`.

## Score

How much of an edition or a month has been completed.

Lives in: `site/src/labours/labours.core.ts`

Invariants: `site/src/labours/INVARIANTS.md`

## Seed

The 32-bit number that decides a composition.

Lives in: `site/src/art/mondrian/url-state.utils.ts`

Invariants: `site/src/art/mondrian/INVARIANTS.md`

Not to be confused with: the work number the stage prints, which is the
seed modulo 9999 padded to four digits (`formatWorkNumber`).

## Title

The sentence a composition is named by.

Lives in: `site/src/art/mondrian/titles.utils.ts`

Invariants: `site/src/art/mondrian/INVARIANTS.md`

## Token namespace

The prefix that says which piece a design token belongs to.

Lives in: `site/src/styles/tokens.css`

Invariants: `site/src/styles/INVARIANTS.md`

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
