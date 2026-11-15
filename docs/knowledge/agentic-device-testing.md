---
summary: 'A 375 px Chromium resize is not a phone test; a real tap here is `scripts/phone.sh touch <selector>`, and the sandbox has no `/dev/kvm` and no Xcode for simulators or emulators.'
triggers:
  paths:
    - 'apps/*/site/index.html'
    - 'apps/*/site/src/lib/*viewport*'
    - 'apps/*/site/src/lib/*keyboard*'
    - 'apps/*/site/src/components/molecules/Sheet.tsx'
  commands:
    - 'scripts/phone\.sh'
    - '\bset viewport 3[0-9][0-9]\b'
    - '\b(adb|xcrun simctl)\b'
---

# Testing on a phone from an agent session

[`/visual-validation`](../../.claude/skills/visual-validation/SKILL.md)
drives `agent-browser`, a desktop Chromium. Use it for the layout at 375 px, and
use `scripts/phone.sh touch` when the question is about touch, because a
viewport resize is not a device.

## The difference between a viewport and a device

Resizing a desktop Chromium window to 375 pixels tests the layout at 375
pixels. It does not test the device, and four things stay wrong.

The pointer stays fine rather than coarse unless you emulate it explicitly, so a
hover-only affordance still appears to work. See
[`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md).

The software keyboard never appears, so a form that the keyboard would cover
looks fine.

Safari on iOS and Chrome on Android differ from desktop Chromium on scroll
chaining, on `100vh` against the dynamic toolbar, and on touch event ordering.

They also differ on **layout**, which this list did not say until a dialog
reached a phone as a bare title bar. WebKit follows the flexbox specification
where Blink is lenient, so markup that is wrong on paper can draw correctly in
every check that runs here and collapse to zero height on the device — with no
gesture involved, and nothing for a touch pass to find. See
[`../dantotsus/a-dialog-that-only-collapsed-on-a-phone.md`](../dantotsus/a-dialog-that-only-collapsed-on-a-phone.md).

Real device pixel ratios change how a hairline border and a small font actually
render.

So a 375 pixel Chromium pass is a cheap first filter, and a simulator, an
emulator or a real phone is the real check.

## What does not work in the Claude Code web sandbox

The sandbox this repository's agent sessions run in is Linux x86_64 with no
`/dev/kvm`, no Android SDK platform tools, and no macOS. So an agent session on
the web can drive Chromium and nothing else.

Last verified: 2026-08-15 — `uname -sm` answered `Linux x86_64`, `ls /dev/kvm`
found nothing, and neither `adb` nor `emulator` is on `PATH`.

Checking for the constraint before starting:

```bash
uname -sm                      # expect Darwin for iOS work
ls /dev/kvm                    # expect the device to exist for Android emulators
command -v adb emulator        # expect both on PATH for Android
```

When any of the three is missing, say so and return a partial verdict. Do not
resize a desktop Chromium window and report it as a phone result, because the
four differences above are exactly what the phone pass exists to catch.

Real device runs therefore happen on the operator's own machine, and CI keeps
the Chromium viewport pass.

## A change to the visible screen on iOS

By default the keyboard shrinks only the visual viewport. `position: fixed`,
`%` and `dvh` measure the layout viewport, which keeps its full height, so a
bar or a field lands under the keyboard or slides off the visible screen.
Every app page now declares `interactive-widget=resizes-content`, and
`scripts/check-viewport-follows-keyboard.sh` refuses a page without it. See
[`../dantotsus/the-keyboard-shrank-a-screen-css-could-not-see.md`](../dantotsus/the-keyboard-shrank-a-screen-css-could-not-see.md).

Safari honours it from iOS 27.3 (MDN browser-compat-data 8.1.9, read
2026-11-15). Below that, only pragma copes, in JavaScript:
`visual-viewport.adapter.ts` and `keyboard-reveal.adapter.ts`. Do not copy
them into another app. Move an element in-flow, or hide it while typing, before
reaching for `visualViewport`.

Chromium here opens no keyboard and has no rubber-band bounce, so these states
never occur in the sandbox:

| State on an iPhone | What moves | What broke when it was forgotten |
| --- | --- | --- |
| Keyboard open on a page | `visualViewport.height` shrinks, `offsetTop` grows as the page scrolls over the keyboard | Bars drifted up the screen (#331) |
| Keyboard open on a field inside a sheet | The sheet shrinks, the field stays where it was | The setlist note was hidden under the keyboard (#332) |
| Bounce past the top or the bottom of the page | `offsetTop` leaves the range 0 to keyboard height, with no keyboard open | The tab bar rose at the top (#333) |
| Bounce while a sticky header holds a horizontal strip | The compositor can drop the strip's layer | The filter chips vanished after a bounce (#337) |

pragma's document no longer bounces (`overscroll-behavior-y: none` on the
root, #337). pragma also reports to Sentry, as `ScreenPlacementBreach`, a tab
bar off the bottom of the visible screen or a focused field the keyboard
hides (`screen-placement.adapter.ts`). Search Sentry for it before closing an
iOS screen fix.

## A real tap in the sandbox

```bash
scripts/phone.sh start http://localhost:5174/
scripts/phone.sh touch '[aria-label="Stop"]'
scripts/phone.sh stop
```

`touch` sends `Input.dispatchTouchEvent` at a 375 × 812 mobile viewport with
touch emulation, so the page sees `pointer: coarse` and a click with
`pointerType: "touch"`, and it exits 1 unless the touch reached the element.
See [`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md).

## Device profiles we check

| Profile | Width | Height | Pixel ratio | Pointer |
|---------|-------|--------|-------------|---------|
| iPhone SE | 375 | 667 | 2 | coarse |
| iPhone 15 Pro | 393 | 852 | 3 | coarse |
| Pixel 8 | 412 | 915 | 2.6 | coarse |
| Desktop reference | 1280 | 800 | 1 | fine |

375 pixels is the floor every screen has to render at, per
[`docs/standards/05-frontend-architecture.md`](../standards/05-frontend-architecture.md).

## What counts as a failure

The page body scrolls horizontally, which you measure with
`document.documentElement.scrollWidth > document.documentElement.clientWidth`.
Wide content is allowed to scroll inside its own container, and the body is not.

Text or a control is clipped, or two elements overlap. A tap target is smaller
than about 44 by 44 CSS pixels. Content sits behind a fixed header or a bottom
bar. Something is reachable only by hovering. The console reports an error, or a
request fails.
