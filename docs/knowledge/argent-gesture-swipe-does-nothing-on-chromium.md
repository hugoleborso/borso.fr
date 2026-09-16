# argent's `gesture-swipe` does nothing on Chromium

_Last verified: 2026-09-14 — `argent 0.22.1`, `pnpm exec argent tools describe
gesture-swipe`, plus four live calls against a Chromium CDP device that
returned `"issues": []` and moved nothing._

`gesture-swipe` is listed among argent's verbs and reads like the one a phone
has. On a Chromium target it is not implemented. Its own help says so:

> Execute a smooth swipe / drag touch gesture between two points on the device
> (iOS simulator or Android emulator). … **Not supported on Chromium — use
> `gesture-scroll` there instead.**

What makes this expensive is the failure mode. The call does not error. It
returns a JSON object, exits 0, and the page is unchanged — which is
indistinguishable from a page that received the gesture and ignored it. Read as
a finding, that is "the list does not scroll on touch" or "the drag target
rejects the drop", neither of which is true.

## What to use instead

| Intent | Chromium verb | Units |
| --- | --- | --- |
| Tap something | `gesture-tap` | normalised `[0,1]`, real touch event |
| Scroll a page or a list | `gesture-scroll` | `--deltaY 0.9` is nine tenths of a **window**, not pixels |
| Drag an element, drop it | `gesture-drag` | `--fromX/--fromY/--toX/--toY`, a mouse drag |

`gesture-scroll` rejects a call with no delta (*"Pass a non-zero deltaX and/or
deltaY"*), which is the one place in this area that fails loudly.

## What survives

`gesture-tap` **is** a real touch event on Chromium and is the reason to reach
for argent at all — a synthetic click through `agent-browser` is not a tap.
That half of the tool works, and
[`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md)
is right about it.

The consequence for a phone pass: taps are testable with real touch input,
scrolling and dragging are testable only through wheel and mouse events. A
finding that depends on the difference between a touch-drag and a mouse-drag —
a `dnd-kit` `PointerSensor` losing the gesture to page scroll, for instance —
cannot be reproduced with these tools. Drive that on a real device, or reason
about it from the sensor configuration.

## A long press is `gesture-drag`, not `gesture-custom`

`gesture-custom` is the verb argent's own help documents a long press with. It
refuses on Chromium:

```
no chromium support declared
```

The long press that works is a drag that does not move, with a duration:

```sh
scripts/argent.sh run gesture-drag --from 180,320 --to 180,320 --durationMs 900
```

Measured 2026-09-15 on a `pragma` catalog card: 900 ms opened the listen dialog,
and a short tap afterwards still navigated, which is what proves the
capture-phase handler swallows only the press. A synthetic click proves neither.

## See also

- [`dnd-kit-pointersensor-loses-touch-to-page-scroll.md`](./dnd-kit-pointersensor-loses-touch-to-page-scroll.md)
  — the class of bug this gap cannot reach.
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
  — the same limitation from the other tool's side.
- [`../dantotsus/the-wrapper-for-driving-previews-could-not-reach-one.md`](../dantotsus/the-wrapper-for-driving-previews-could-not-reach-one.md)
  — found in the same session, and why the wrapper's banner stopped advertising
  this verb.
