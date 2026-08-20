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
