# Agentic device testing with argent

`@swmansion/argent` is the agentic toolkit this repository uses to drive real
devices. It gives an agent direct control of iOS Simulators, Android emulators
and physical devices over adb, TVs, and Electron or Chromium apps over the
Chrome DevTools Protocol. It is a root devDependency, so `pnpm exec argent` works
from anywhere in the workspace.

`agent-browser` is also installed and is what
[`/visual-validation`](../../.claude/skills/visual-validation/SKILL.md) drives.
The two do different jobs. Use `agent-browser` for a desktop browser check
against a specification, and use `argent` when the question is about a phone, a
tablet, or a TV, because a viewport resize is not a device.

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

Real device pixel ratios change how a hairline border and a small font actually
render.

So a 375 pixel Chromium pass is a cheap first filter, and argent against a
simulator or an emulator is the real check.

## What argent needs on the host

| Target | Needs |
|--------|-------|
| iOS Simulator | macOS with Xcode installed |
| Android emulator | `adb` and the Android Emulator package on `PATH`, plus `/dev/kvm` |
| Android physical device | `adb`, and the device in developer mode |
| Chromium and Electron | Nothing beyond the browser, driven over the DevTools Protocol |

## What does not work in the Claude Code web sandbox

The sandbox this repository's agent sessions run in is Linux x86_64 with no
`/dev/kvm`, no Android SDK platform tools, and no macOS. So an agent session on
the web can drive argent's Chromium target and nothing else.

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

## Running argent

```bash
pnpm exec argent --help
```

Argent installs its own skills for the agent, which is the documented way in.
Ask it what it can do rather than guessing flags, the same habit
[`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md) records for the
other tool.

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

## The name

The npm package `argent` is an unrelated optional-parameter helper last
published in 2018. The tool is `@swmansion/argent`, from Software Mansion, and
its home page is https://argent.swmansion.com.
