---
date: 2026-08-15
introduced-at: implementation
detected-at: operator-deploy
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-commits: [3f7264b]
eradication-level: 1
time-to-detect: days
tags: [css, custom-properties, architecture-map, generated-files]
---

# An undefined custom property paints black, and nothing about black says "undefined"

## Symptom

The operator, reading the architecture map in a light theme:

> The file number chip is black in white background, select a better color for
> light theme

The chip was not a bad colour choice. `--chip` was read in two places and
defined in none.

## Root-cause chain

1. The page's palette is a block of custom properties on `:root`, redefined
   under `prefers-color-scheme: dark` and under `[data-theme="dark"]`.
2. A chip was added to the block metadata and styled `fill: var(--chip)`, in two
   rules.
3. `--chip` was never added to the palette.
4. **An undefined custom property does not fall back to nothing, and does not
   inherit.** The declaration is *invalid at computed-value time*, so the
   property takes its **initial** value. For `fill`, the initial value is black.
5. Black is a colour. It renders, it has contrast against the panel, and on a
   dark theme it is nearly invisible against the background rather than
   obviously wrong.
6. The page shipped through a light-theme pass, a dark-theme pass and a review
   with the defect visible on every screen, because at no point did it look like
   an error.

## Detection failure causes

- **The failure mode of CSS is a rendered page.** There is no console warning,
  no build error, and no visual marker distinguishing "black because you asked
  for black" from "black because this declaration was thrown away".
- **A palette is a list, and a list has no arity.** Nothing relates the set of
  properties defined to the set used; both are just text in the same file.
- **The other direction is checked and this one is not.** An unused CSS variable
  is dead weight nobody notices; an *undefined* one is a wrong pixel, and it was
  the unchecked direction.
- **It was found by a human looking at a screen.** That is the detection layer
  this repository is trying to move work off.

## Countermeasure

The generator refuses to emit a page that reads a custom property it never
defines. `withDefinedCustomProperties()` in `architecture-page.ts` extracts
every `var(--x)` use and every `--x:` definition from the page's own `<style>`
blocks and throws when a use with no fallback has no definition.

Two scoping decisions, both load-bearing:

- **`var(--x, fallback)` is allowed to name an undefined property**, because a
  fallback is exactly the declaration that survives the property being missing.
- **Only the page's own stylesheets are read.** The code viewer embeds
  application source, which carries that application's own custom properties,
  defined in a stylesheet this page neither ships nor needs. The first run
  reported eleven of those — `--color-accent`, `--color-member-coral` and the
  rest — every one a false positive, which is why the scope is written into the
  code rather than assumed.

## Eradication

**Structural, level 1**, shipped in `3f7264b`. The page cannot be generated with
the defect: the generator throws before writing, so no committed model, no
published site and no artifact can carry it.

Verified by deleting the `--chip` definition again:

```
Error: The page reads --chip with no fallback and never defines it. An undefined
custom property is invalid at computed-value time, so the declaration falls back
to the property's initial value — black, for a fill.
```

The message carries the mechanism, because "undefined variable" would leave the
next reader to rediscover why the result was black rather than absent.

## The general shape

A missing value that produces a *plausible* result is worse than one that
produces a crash, and CSS is built almost entirely out of plausible results.
Whenever a stylesheet is generated rather than hand-written, the generator is
the place to assert the invariants the language will not: every property read is
defined, every colour used is in the palette, every token has a dark-theme
counterpart.

Same family as
[the map that recognised modules by their names](./the-map-recognised-modules-by-their-names.md)
and [two copies that had to agree](./two-copies-that-had-to-agree-and-nothing-made-them.md):
a value goes missing and the system answers confidently instead of stopping.
