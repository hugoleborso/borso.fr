---
date: 2026-08-20
introduced-at: apps/*/site/src/styles/tokens.css
detected-at: styling
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (each stylesheet is already written around these)
tags: [tailwind, css, design-tokens, preflight, vendor-quirk]
---

# Tailwind v4: what `@theme` does to a stylesheet, and what preflight does to a page

Every application here bridges its design tokens to Tailwind through a single
`@theme` block in `src/styles/tokens.css`. Five properties of v4 shape how those
files are written, and none is visible from the file itself.

## `@theme` blocks collapse into `:root`, so a second one overrides the first

Tailwind v4 unwraps every `@theme` block into the top of `:root`. Two of them
therefore **collapse**, and the second simply wins — unconditionally, even when
it is nested inside a `@media` query, because the nesting does not survive the
unwrapping.

So a dark-mode override must **not** be written as a second `@theme` inside a
media query. It goes on a bare `:root` inside that query instead. Written the
other way, `pragma`'s cream paper would never have reached a single user.

## A variable outside a Tailwind namespace gets no utility

`--color-x` becomes `bg-x` / `text-x` / `border-x` automatically because
`--color-` is a namespace Tailwind knows. A variable that is not in one —
a tiled SVG filter, say — gets **no utility at all**, and has to be read back
explicitly:

    bg-[image:var(--grain-apex)]

That is why `borso-fr`'s grain and glow tokens look different from its colours.

## The class scanner decides which variables ship

`@theme static` exists because the scanner does not treat
`bg-[image:var(--x)]` as a utility that pulls `--x` in. Without `static`, the
variable is scanned away and the arbitrary value resolves to nothing.

The same scanner rule applies to keyframes: an animation started from an
**inline `animation` shorthand** — because each element carries its own delay,
for instance — is never seen as a utility, so Tailwind pulls in no keyframes
for it. `borso-fr`'s `inkbloom` is declared outside `@theme` for exactly this.

## Preflight zeroes things the browser was relying on

- **Every element's margin.** A modal `<dialog>` is centred by the user agent's
  own `margin: auto`, so preflight decentres it. `m-auto` on the dialog is what
  puts it back.
- **A button's cursor.** Preflight leaves the default arrow, which is why every
  application's stylesheet carries a `button { cursor: pointer }` base rule.
- **The file input's button chrome.** Without it, `Choose file` renders as bare
  text.

## Two utilities writing the same property resolve by stylesheet order

Not by their order in the `class` attribute. So a base class that a variant is
meant to override is a coin toss, and no variant table in this repository ever
repeats a declaration another one sets. See
[`08-styling.md`](../standards/08-styling.md).
