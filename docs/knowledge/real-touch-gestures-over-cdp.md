---
summary: 'A real tap is `scripts/phone.sh touch <selector>`; a real swipe or drag is `Input.dispatchTouchEvent` sent yourself over CDP, to the port of `agent-browser get cdp-url`. Overrides end with the CDP session that set them. Headless Chromium scrolls nothing from a touch-source scroll, ignores DPR in a screencast and draws no keyboard.'
triggers:
  commands:
    - 'Input\.dispatchTouchEvent'
    - 'Browser\.grantPermissions'
    - 'setTouchEmulationEnabled'
    - 'get cdp-url'
    - 'synthesizeScrollGesture'
    - 'startScreencast'
    - 'setSafeAreaInsetsOverride'
---

# Driving a real touch gesture over CDP

`agent-browser click`, `scroll` and `drag` are mouse and wheel events. A control
whose behaviour depends on `touch-action`, on `pointerType`, or on the browser
deciding mid-gesture whether the page or the element gets it behaves
differently under them, and that difference is where the bugs are; see
[`../dantotsus/a-control-that-wrote-before-the-gesture-was-decided.md`](../dantotsus/a-control-that-wrote-before-the-gesture-was-decided.md).

## Which tool for which question

| Question | Tool |
| --- | --- |
| Layout, sizes, overflow, screenshots | `agent-browser` |
| Does a real tap land, as touch, at phone width | `scripts/phone.sh touch '<css selector>'` |
| Does a swipe or a drag do the right thing on touch | CDP `Input.dispatchTouchEvent`, below |
| Mouse-only behaviour (text selection, hover) | `agent-browser` |

## The recipe for a swipe or a drag

Every `agent-browser` session exposes CDP. `agent-browser --session phone get
cdp-url` prints `ws://127.0.0.1:<port>/…`; list the page targets at
`http://127.0.0.1:<port>/json/list` and open the page's
`webSocketDebuggerUrl`. Measured 2026-10-29: a raw CDP client and
`agent-browser` drive the same page in turn without either one timing out.
[`scripts/browser/touch-tap.ts`](../../scripts/browser/touch-tap.ts) is the
working client to copy.

```js
async function touch(type, x, y) {
  const points = type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }];
  await send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await new Promise((resolve) => setTimeout(resolve, 60));
}
```

- **`touchEnd` takes an empty `touchPoints` array.** Passing the last point is
  rejected.
- **Pace the events**, around 60 ms apart. A burst in one tick gives the
  compositor no chance to decide the gesture, which is the behaviour under test.
- **Turn on touch emulation first**: `Emulation.setDeviceMetricsOverride` with
  `mobile: true`, then `Emulation.setTouchEmulationEnabled`. That gives
  `pointer: coarse`, `hover: none` and `maxTouchPoints: 5`. Do not use
  `Emulation.setEmitTouchEventsForMouse`, which wedges the input pipeline until
  the page navigates away and back.

Read the result back through `Runtime.evaluate` in the same session. For a
control inside a scroller, assert both that the page scrolled and that the
control did not change; either one alone passes for the wrong reason.

## Overrides end with the CDP session that set them

Measured 2026-10-25: after the client disconnected, `navigator.maxTouchPoints`
was back to 0 and `(pointer: coarse)` false, while the 375 px viewport stayed.
On 2026-10-29 `(pointer: coarse)` was again false after `scripts/phone.sh touch`
returned. `Browser.grantPermissions` behaves the same: the
grant is revoked when the granting client closes. So set, act and read back in
one session, as `touch-tap.ts` does.

A finding that depends on the difference between a touch drag and a mouse drag,
such as a `dnd-kit` `PointerSensor` losing the gesture to page scroll, needs
this recipe or a real device; see
[`dnd-kit-pointersensor-loses-touch-to-page-scroll.md`](./dnd-kit-pointersensor-loses-touch-to-page-scroll.md).

## What the headless Chromium does not do

Four gaps the agents of PR #216 and #231 measured in agent-browser's headless
Chromium (friction log `docs/features/pragma/ux-redesign/kaizen.md`):

- **A touch-source scroll scrolls nothing.** `Input.synthesizeScrollGesture`
  with `gestureSourceType: 'touch'` returns success and moves the page 0 px for
  a 300 px request. The mouse source moved it 299 px. Scroll with the mouse
  source, and send the touch events of a gesture yourself as above.
- **A screencast ignores the device scale factor.** `Page.startScreencast`
  returned 390 px frames under a DPR 3 override. Sharp frames came only from a
  headful Chromium under Xvfb started with `--force-device-scale-factor`.
- **No safe-area insets without CDP.** agent-browser has no command for
  `Emulation.setSafeAreaInsetsOverride`, so checking `env(safe-area-inset-*)`
  needs a raw client. Clear the override before closing it: one left in place
  hung the next agent-browser navigation.
- **No virtual keyboard.** "Stays visible above the keyboard" can only be
  approximated by shrinking the viewport, which models Android's resize and
  not the iOS overlay.

## See also

- [`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md)
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
- [`agentic-device-testing.md`](./agentic-device-testing.md)
