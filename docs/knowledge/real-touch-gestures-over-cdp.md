---
summary: 'On Chromium argent''s swipe moves nothing and its scroll and drag send mouse events; drive `Input.dispatchTouchEvent` over CDP for anything that depends on `touch-action`.'
triggers:
  commands:
    - 'gesture-(swipe|custom|scroll|drag)'
  output:
    - 'Not supported on Chromium'
---

# Driving a real touch gesture when argent declines it

`scripts/argent.sh` is the repository's answer for touch, and it is right for
taps. It is not enough for the gesture a phone audit most often needs — a swipe
or a drag — because on Chromium argent refuses both of its gesture verbs:

```
$ scripts/argent.sh run gesture-swipe --udid chromium-cdp-9222 …
Not supported on Chromium — use gesture-scroll there instead.

$ scripts/argent.sh run gesture-custom --udid chromium-cdp-9222 …
Tool 'gesture-custom' is not supported on chromium app (no chromium support declared).
```

`gesture-scroll` dispatches **mouse-wheel** events, and `gesture-drag`
dispatches a **mouse** drag. Neither is a finger. A control whose behaviour
depends on `touch-action`, on `pointerType`, or on the browser deciding
mid-gesture whether the page or the element gets it will behave differently
under all three, and that difference is exactly where the bugs are — see
[`../dantotsus/a-control-that-wrote-before-the-gesture-was-decided.md`](../dantotsus/a-control-that-wrote-before-the-gesture-was-decided.md).

## The recipe

argent's Chromium already exposes CDP on 9222, so send the touch events
yourself. `Input.dispatchTouchEvent` is the real thing: it produces
`touchstart` / `touchmove` / `touchend`, the `pointerdown` / `pointermove` /
`pointercancel` pairs that go with them, and it makes the browser apply
`touch-action` for real.

```js
import WebSocket from '/home/user/borso.fr/node_modules/.pnpm/ws@8.20.0/node_modules/ws/index.js';

const listing = await fetch('http://127.0.0.1:9222/json/list').then((r) => r.json());
const page = listing.find((t) => t.type === 'page' && t.url.includes('localhost:5174'));
const socket = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
// … resolve responses by message id …

async function touch(type, x, y) {
  const points = type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }];
  await send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await new Promise((r) => setTimeout(r, 60));
}
```

Three details that matter:

- **`touchEnd` takes an empty `touchPoints` array.** Passing the last point is
  rejected.
- **Pace the events.** Around 60 ms between them; a burst dispatched in one tick
  does not give the compositor the chance to decide the gesture, which is the
  behaviour under test.
- **`ws` is already in the store** (`node_modules/.pnpm/ws@8.20.0/…`), pulled in
  by Playwright. Import it by path; there is no need to add a dependency.

Read the result back through `Runtime.evaluate` in the same session, so the
assertion sees the same page the gesture hit:

```js
const value = await evaluate(`document.querySelector('[role="slider"]').getAttribute('aria-valuenow')`);
const scrolled = await evaluate(`document.querySelector('main').scrollTop`);
```

Asserting *both* is the point for a control inside a scroller: the page must
scroll **and** the control must not change. Either one alone passes for the
wrong reason.

## Which tool for which question

| Question | Tool |
| --- | --- |
| Layout, sizes, overflow, screenshots | `scripts/browser.sh` / `agent-browser` |
| Is this reachable with a thumb, does the tap land | `scripts/argent.sh tap` |
| Does a swipe or a drag do the right thing on touch | CDP `Input.dispatchTouchEvent`, as above |
| Mouse-only behaviour (text selection, hover) | CDP `Input.dispatchMouseEvent` |

## See also

- [`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md)
  — the launch flags and the traps for both tools; this entry is the gap it
  leaves.
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
  — why `set device` is not a coarse pointer.
- [`agentic-device-testing.md`](./agentic-device-testing.md)

## argent's `gesture-swipe` does nothing on Chromium

_Merged from `real-touch-gestures-over-cdp.md` on 2026-10-10, when every entry gained a trigger._

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

### What to use instead

| Intent | Chromium verb | Units |
| --- | --- | --- |
| Tap something | `gesture-tap` | normalised `[0,1]`, real touch event |
| Scroll a page or a list | `gesture-scroll` | `--deltaY 0.9` is nine tenths of a **window**, not pixels |
| Drag an element, drop it | `gesture-drag` | `--fromX/--fromY/--toX/--toY`, a mouse drag |

`gesture-scroll` rejects a call with no delta (*"Pass a non-zero deltaX and/or
deltaY"*), which is the one place in this area that fails loudly.

### What survives

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

### A long press is `gesture-drag`, not `gesture-custom`

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

### See also

- [`dnd-kit-pointersensor-loses-touch-to-page-scroll.md`](./dnd-kit-pointersensor-loses-touch-to-page-scroll.md)
  — the class of bug this gap cannot reach.
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
  — the same limitation from the other tool's side.
- [`../dantotsus/the-wrapper-for-driving-previews-could-not-reach-one.md`](../dantotsus/the-wrapper-for-driving-previews-could-not-reach-one.md)
  — found in the same session, and why the wrapper's banner stopped advertising
  this verb.
