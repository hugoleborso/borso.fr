---
summary: 'A real tap is `scripts/phone.sh touch <selector>`, a real drag between two elements is `scripts/phone.sh drag <from> <to>`; any other swipe is `Input.dispatchTouchEvent` sent yourself over CDP, to the port of `agent-browser get cdp-url`. Overrides end with the CDP session that set them. Headless Chromium scrolls nothing from a touch-source scroll, ignores DPR in a screencast and draws no keyboard.'
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
| Does a touch drag from one element to another land | `scripts/phone.sh drag '<from>' '<to>'` |
| Any other swipe on touch | CDP `Input.dispatchTouchEvent`, below |
| Mouse-only behaviour (text selection, hover) | `agent-browser` |

## What `drag` proves and what it does not

`drag` exits 0 when a `touchstart` reached the from element, a `touchmove` and
a `touchend` fired, no `pointercancel` came, and the touch lifted over the to
element. It does not say the page acted on the drop, so read that back with
`agent-browser --session phone eval`. Measured 2026-11-14 on a static page:

- An element with no touch listener and no `touch-action: none` gets a
  `pointercancel` after the first move, because the browser takes the gesture
  to pan. Headless Chromium then scrolls nothing, so without that gate the
  drag would read as passing while a phone would scroll the page.
- react-chessboard replaces the dragged piece's node on drop, so `touchend`
  goes to a detached node and never reaches `document`. The driver listens on
  the from element too.

## The recipe for any other swipe

Every `agent-browser` session exposes CDP. `agent-browser --session phone get
cdp-url` prints `ws://127.0.0.1:<port>/…`; list the page targets at
`http://127.0.0.1:<port>/json/list` and open the page's
`webSocketDebuggerUrl`. Measured 2026-10-29: a raw CDP client and
`agent-browser` drive the same page in turn without either one timing out.
[`scripts/browser/cdp-session.ts`](../../scripts/browser/cdp-session.ts) holds
the client both drivers share.

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
was back to 0 and `(pointer: coarse)` false. That run used argent's own
Chromium. In the shared agent-browser session the 375 px viewport does not
stay either. Measured 2026-11-14: `innerWidth` read 1280 after
`touch-tap.ts` closed its connection, because the page keeps one set of device
metrics. `scripts/phone.sh` re-applies the phone viewport on exit and fails if
the page is not 375 px wide, see
[`the-tap-that-left-the-phone-at-desktop-width`](../dantotsus/the-tap-that-left-the-phone-at-desktop-width.md).
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
