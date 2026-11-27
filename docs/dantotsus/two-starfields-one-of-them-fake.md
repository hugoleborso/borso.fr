---
date: 2026-08-20
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#63'
fix-commits: [957846c4d2]
eradication-level: 5
eradication-paths: [docs/standards/08-styling.md]
time-to-detect: 40 minutes
tags: [frontend, animation, webgl, conception, tailwind]
zone: apps/borso-fr/site/src
---

# Two starfields, one of them fake

## User impact

The ask was a lightspeed jump when a link is clicked on borso.fr. The landing
page already renders a WebGL galaxy the viewer travels through.

| | Seen | Expected |
| --- | --- | --- |
| A click on an internal link | A dark veil, ninety-six streak elements flying outwards and a white bloom, drawn over the galaxy on CSS keyframes | The galaxy itself speeding up into the jump |

It passed lint, typecheck, 100% coverage, 100% mutation and a browser pass.
The operator rejected it on the first look at the preview:

> ce n'est pas la même galaxie qui fait un saut vitesse lumière, tu as rajouté
> un truc moche par dessus

("It is not the same galaxy making a lightspeed jump. You added something ugly
on top.") Every visitor clicking an internal link would have seen it (inferred). It
never reached production.

## Causal chain

- The page showed two starfields.
  - The jump was a DOM overlay drawn over the page, not a change to the galaxy
    already on it.
    - Commit `8d81acbc4` ("feat(borso-fr): a lightspeed jump plays before the
      browser leaves a page") built it: "an overlay draws a field of streaks
      flying out from the centre of the screen". `warp-streaks.core.ts` placed
      96 streaks, and `warp-drive.ts` appended "an overlay of plain DOM".
      - The design came from the words in the request (streaks, speed, a
        flash), not from the page it would play on.
        - While scoping, the agent read `index.html`, `home-page.ts` and
          `tokens.css`, the files the new code would touch. It never opened
          `apps/borso-fr/site/src/components/organisms/Galaxy.tsx`, which
          draws the starfield.
          - The work went from the operator's request straight to
            implementation. No spec and no plan were written:
            `docs/features/borso-fr/lightspeed-jump/` holds only the friction
            log and the validation screenshots.

## Root cause of occurrence

*Thought a lightspeed effect is something you add on top of a page. Actually
this page already renders a starfield the viewer travels through, and the jump
is that starfield's own travel rate going up.* (Material.)

The component that held the answer, `Galaxy.tsx`, was never loaded in the
agent's context. Had it been, the first version would have been the few lines
in the frame loop the second version became. `uStarSpeed`, the shader's own
distance-travelled uniform, was there the whole time.

Below it sits Method. Scoping read only the files the new code would import or
change, so a component the new code did not import never came into view. And
nothing showed the operator a cheap version before the full build. The favicon
in the same PR repeats exactly that: a `b` monogram built and shipped without a
preview, rejected in one line, reverted in `040542e`.

## Detection failure causes

- **Linter and typing:** every rule passed. They check code against rules,
  and the overlay was clean code for the wrong idea.
- **Local browser pass:** it checked that the overlay did what the overlay was
  designed to do. A validation written from the implementation cannot find
  that the implementation is the wrong idea.
- **Harness:** the agent cannot watch an animation, so a frame capture of the
  overlay looked acceptable. See
  [`judging-an-animation-you-cannot-watch.md`](../knowledge/judging-an-animation-you-cannot-watch.md).
- **Review:** caught here, by the operator, on the preview. The cost was the
  round trip.

## Countermeasure

Commit `efd65da` deletes the overlay: the veil, the ninety-six streaks, the
bloom, three `@keyframes` and three `@utility` blocks in `tokens.css`, and the
pure module of streak geometry. The jump becomes the galaxy's own travel rate
and glow climbing, read once per frame from a module outside React.
`tokens.css` returned byte-identical to `main`.

Two changes let the galaxy jump at all:

- `selectStarClock` accumulates distance frame by frame instead of deriving it
  from elapsed time. Under the old formula, multiplying `starSpeed` mid-flight
  moved the whole starfield by that factor in one frame, a tear and not an
  acceleration.
- The intensity is read from a module the frame loop imports, not from React
  state. The loop lives inside the effect that owns the WebGL context, and a
  state change would rebuild the context mid-jump.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `957846c4d`, the kaizen sweep of PR #63, added a
`reviewer` bullet to `docs/standards/08-styling.md` (line 165 today):

```diff
+- `reviewer` checks that a visual effect added to an existing screen is made
+  out of what that screen already renders, where it can be. An effect drawn
+  over a page that already draws something similar is two of that thing, one of
+  them fake; see docs/dantotsus/two-starfields-one-of-them-fake.md.
```

This entry first claimed level 4. It is level 5. The bullet is a written
instruction that `/technical-validation` reads at review. It catches the wrong
idea only after it has been built, and only if the reviewer opens the screen.
It does not bring `Galaxy.tsx` into the context of the agent that designs the
effect.

**Proposed:** make `/route` and `/specification` require, for any visual
change to an existing screen, a capture of that screen today
(`scripts/dev-server.sh start <app>` plus `agent-browser`) and the path of the
component that renders it, before any design. The capture and the path go in
the spec, and the cheap version is shown to the operator before the full
build. An effect could then no longer be designed without the thing it plays
on in view. That moves the catch from review to conception.

**Similar instances:** the favicon of the same PR, above.
[`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md)
is the same habit pointed at dependencies: "does a library already do this?"
against "does this screen already draw this?".
[`a-tailwind-variant-that-compiled-to-nothing.md`](./a-tailwind-variant-that-compiled-to-nothing.md)
is a second silent failure from the same PR.
