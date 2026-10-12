---
date: 2026-08-20
introduced-at: apps/*/site/src/styles/tokens.css
detected-at: styling
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (each stylesheet is already written around these)
tags: [tailwind, css, design-tokens, preflight, vendor-quirk]
summary: 'Tailwind v4 fails quietly: `@theme` blocks collapse into `:root`, a `var()` in `@theme` resolves there, a bare-word variant compiles to nothing, and preflight resets dialogs and buttons.'
triggers:
  paths:
    - 'apps/*/site/src/styles/tokens.css'
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

## Tailwind v4 fails quietly in two places

_Merged from `tailwind-v4-theme-and-preflight-traps.md` on 2026-10-10, when every entry gained a trigger._

Both observed on borso.fr in PR #63, a day apart, and both cost a debugging
round because the failure mode is identical: the build succeeds, no warning
appears anywhere, and the rule you wrote simply does not exist.

### 1. A `var()` inside an `@theme` entry resolves against `:root`

The intent was one animation whose duration differs per element — ninety-six
streaks each flying at their own speed:

```css
@theme {
  --animate-warp-streak: warp-streak var(--warp-streak-duration, 400ms) ease-in both;
}
```

with `--warp-streak-duration` written onto each element from JavaScript. Every
streak ran at exactly 400 ms.

**A custom property's value is substituted where the property is declared, not
where it is used.** `--animate-warp-streak` is declared on `:root`, so its
`var()` is resolved there, where `--warp-streak-duration` does not exist — and
the fallback is baked into the value that then inherits down. Setting the
property on the element afterwards changes nothing, because the substitution
already happened.

The fix is to keep the varying part out of the theme entry. Declare everything
except the duration with `@utility`, and write the duration onto the element as
a longhand, where an inline style beats the class's shorthand:

```css
@utility animate-warp-streak {
  animation-name: warp-streak;
  animation-timing-function: cubic-bezier(0.45, 0, 0.9, 0.35);
  animation-fill-mode: both;
}
```

```ts
element.style.setProperty('animation-duration', `${streak.durationMilliseconds}ms`);
```

There is a legitimate use of the same syntax — a `var()` in an `@theme` entry is
correct when the referenced property really is global — so this is not
mechanically checkable and stays knowledge. The tell is intent: if the value is
meant to differ per element, it cannot come through the theme.

A related pattern that *is* worth copying: when a CSS duration and a JavaScript
timer have to agree, publish the number once from the module that owns it and
let the stylesheet read it back, rather than writing it in both places.

```ts
document.documentElement.style.setProperty('--transition-hold', `${holdMilliseconds}ms`);
```

```html
<div class="transition-opacity duration-[var(--transition-hold)] [.jumping_&]:opacity-0">
```

That `var()` is on the element, not in `@theme`, so it resolves normally.

### 2. A variant bracket opening on a bare word is an attribute selector

`[body.jumping_&]:opacity-0` generates nothing. Tailwind reads a bracket opening
on a bare word as the *attribute* variant form, `body.jumping &` is not a valid
attribute name, and the utility is discarded without a word.

`[.jumping_&]:opacity-0` works. The leading dot is the whole difference.

This one **is** mechanically checkable, and now is:
`scripts/check-tailwind-arbitrary-variants.sh` runs on every commit. The full
write-up, including why `pointer-events` under the same broken variant appeared
to work and sent the diagnosis to the wrong layer, is in
[`../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md`](../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md).

### The habit both of these argue for

Grep the built stylesheet for the rule you think you wrote, before believing any
measurement of its effect. Both failures are invisible from the markup, from the
build output and from the browser's computed styles; both are obvious the moment
you look for the selector and it is not there.

```bash
curl -s "$PREVIEW/assets/<chunk>.css" | grep -o "jumping[^{,]*" | sort -u
```

### See also

- [`../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md`](../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md)
- [`judging-an-animation-you-cannot-watch.md`](./judging-an-animation-you-cannot-watch.md)
  — the measurement artefacts that made the second failure hard to read.
