# Tailwind v4 fails quietly in two places

Both observed on borso.fr in PR #63, a day apart, and both cost a debugging
round because the failure mode is identical: the build succeeds, no warning
appears anywhere, and the rule you wrote simply does not exist.

## 1. A `var()` inside an `@theme` entry resolves against `:root`

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

## 2. A variant bracket opening on a bare word is an attribute selector

`[body.jumping_&]:opacity-0` generates nothing. Tailwind reads a bracket opening
on a bare word as the *attribute* variant form, `body.jumping &` is not a valid
attribute name, and the utility is discarded without a word.

`[.jumping_&]:opacity-0` works. The leading dot is the whole difference.

This one **is** mechanically checkable, and now is:
`scripts/check-tailwind-arbitrary-variants.sh` runs on every commit. The full
write-up, including why `pointer-events` under the same broken variant appeared
to work and sent the diagnosis to the wrong layer, is in
[`../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md`](../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md).

## The habit both of these argue for

Grep the built stylesheet for the rule you think you wrote, before believing any
measurement of its effect. Both failures are invisible from the markup, from the
build output and from the browser's computed styles; both are obvious the moment
you look for the selector and it is not there.

```bash
curl -s "$PREVIEW/assets/<chunk>.css" | grep -o "jumping[^{,]*" | sort -u
```

## See also

- [`../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md`](../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md)
- [`judging-an-animation-you-cannot-watch.md`](./judging-an-animation-you-cannot-watch.md)
  — the measurement artefacts that made the second failure hard to read.
