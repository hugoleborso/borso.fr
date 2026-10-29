---
summary: 'A 375 px Chromium resize is not a phone test; a real tap here is `scripts/phone.sh touch <selector>`, and the sandbox has no `/dev/kvm` and no Xcode for simulators or emulators.'
triggers:
  commands:
    - 'scripts/phone\.sh'
    - '\bset viewport 3[0-9][0-9]\b'
    - '\b(adb|xcrun simctl)\b'
---

# Testing on a phone from an agent session

[`/visual-validation`](../../plugins/borso-harness/skills/visual-validation/SKILL.md)
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
