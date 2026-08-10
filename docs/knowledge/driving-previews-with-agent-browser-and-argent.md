# Driving the previews with agent-browser and argent

Both tools are installed and both work in this sandbox. Neither works with its
default invocation, and they cannot share a browser. This is the recipe that
does work, verified end to end against the PR 40 previews.

## What each tool is for

`agent-browser` is a Playwright-backed CLI. It owns its browser through a
daemon, keeps sessions alive between calls, and has the higher-level verbs:
`snapshot`, `a11y`, `vitals`, `find role`, `diff screenshot`, `network requests`.
Reach for it for functional walkthroughs.

`@swmansion/argent` drives an already-running Chromium over the Chrome DevTools
Protocol. It thinks in devices and normalised coordinates, and its verbs are the
ones a phone has: `gesture-tap`, `gesture-swipe`, `keyboard`, `rotate`,
`await-screen-idle`. Reach for it for touch behaviour and phone-shaped
interaction.

## The two launch flags that are not optional

```
--ssl-version-max=tls1.2
```

Without it every navigation fails with `ERR_CONNECTION_RESET`. The session's
outbound proxy cannot complete a TLS 1.3 handshake with Chromium.

```
--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader
```

Without it the `borso-fr` home page logs a WebGL error and the galaxy background
does not render, which is a sandbox artefact rather than a defect in the page.
Do not substitute `--disable-gpu`; that produces the error this avoids.

## agent-browser

Pass the flags on every invocation, or export them once:

```bash
export AGENT_BROWSER_ARGS="--ssl-version-max=tls1.2,--enable-unsafe-swiftshader,--use-gl=angle,--use-angle=swiftshader,--no-sandbox"
pnpm exec agent-browser --session borso-fr open https://borso-fr-pr-40.preview.borso.fr/
pnpm exec agent-browser --session borso-fr snapshot --interactive
pnpm exec agent-browser --session borso-fr screenshot ./shot.png
pnpm exec agent-browser --session borso-fr errors
```

`--session <name>` gives each caller its own browser, which is what makes
several agents runnable at once. Without it they share one and fight over the
active page.

## argent

Argent does not launch a browser for you. It probes CDP ports, so a Chromium has
to be running first, and the tool-server has to be told which port to probe.

Start the browser as a long-lived background process. A Chromium started inside
a normal shell call is reaped when the call returns.

```bash
/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  --remote-debugging-port=9222 --remote-allow-origins=* \
  --headless=new --no-sandbox --disable-dev-shm-usage \
  --ssl-version-max=tls1.2 \
  --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader \
  --user-data-dir=<a fresh directory> about:blank
```

Then restart the tool-server with the port and with the loopback proxy bypass,
also as a long-lived background process, because `argent server start` blocks:

```bash
ARGENT_CHROMIUM_PORTS=9222 NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 \
  pnpm exec argent server start
```

`ARGENT_CHROMIUM_PORTS` is read by the server, not by the CLI, so setting it on
an `argent run …` call does nothing once a server is already up. `NO_PROXY`
matters because the probe otherwise goes out through `HTTPS_PROXY` and finds
nothing.

The tool-server is a singleton. Several ports run several browsers under one
server:

```bash
ARGENT_CHROMIUM_PORTS=9223,9224,9225,9226 …
```

Each caller then targets its own `--udid chromium-cdp-<port>`.

Check and drive:

```bash
pnpm exec argent run list-devices --json
pnpm exec argent run open-url --udid chromium-cdp-9222 --url <url> --json
pnpm exec argent run describe --udid chromium-cdp-9222 --json
pnpm exec argent run screenshot --udid chromium-cdp-9222 --out ./shot.png --json
```

## The two tools must not share one browser

Pointing `ARGENT_CHROMIUM_PORTS` at the port from `agent-browser get cdp-url`
looks like it works: `list-devices` finds the browser and `chromium-tabs` lists
its tabs. It then fails in a way that wastes time — `Page.navigate`,
`Runtime.evaluate` and `Page.captureScreenshot` all return
`CDP request … timed out`, because Playwright already owns those targets.

Give each tool its own browser.

## `gesture-tap` does not work on this Chromium

Two validation runs hit it independently. Every `argent run gesture-tap` returns

```
CDP request Input.dispatchMouseEvent timed out
```

One run reproduced it with no emulation session attached at all, so it is not
the shared-browser hazard above. Scrolling and `describe` keep working; only the
input dispatch wedges.

Drive touch through CDP directly instead. `Input.dispatchTouchEvent` worked
first time and every time:

```js
await send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ x, y, radiusX: 1, radiusY: 1, force: 1 }],
});
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
```

One related trap: `Emulation.setEmitTouchEventsForMouse` wedges the input
pipeline the same way, and stays wedged after the client disconnects until the
page navigates away and back. It is not needed —
`Emulation.setDeviceMetricsOverride` plus `setTouchEmulationEnabled` already
gives `pointer: coarse`, `hover: none` and `maxTouchPoints: 5`, which is the
whole phone profile.

## WebGL is slow enough to change what you can measure

SwiftShader renders the `borso-fr` galaxy at 1 to 2 frames per second. That is a
sandbox artefact, not a defect in the page, but it makes interaction on that
route unreliable: one run saw five of six taps time out there while the same
taps through Playwright were fine. When a check fails only on a WebGL-heavy
page, suspect the renderer before the code, and say which tool confirmed the
behaviour.

## What argent cannot do here

There is no tool for viewport size, device pixel ratio, or pointer type on a
Chromium target. Phone emulation needs a second CDP session alongside argent,
sending `Emulation.setDeviceMetricsOverride` and
`Emulation.setTouchEmulationEnabled` directly. See
[`docs/features/meta/mobile-viewport-audit/report.md`](../features/meta/mobile-viewport-audit/report.md),
which did exactly that and recorded `pointer: coarse`, `hover: none` and
`maxTouchPoints: 5` on every phone measurement.

Real devices are out of reach: no `/dev/kvm`, so no Android emulator; no Android
SDK; not macOS, so no iOS simulator. `list-devices` returns an empty list for
everything except Chromium.

## Preview URLs

| App | URL |
|-----|-----|
| `borso-fr` | https://borso-fr-pr-40.preview.borso.fr |
| `borsouvertures` | https://borsouvertures-pr-40.preview.borso.fr |
| `pragma` | https://pragma-pr-40.preview.borso.fr |
| `last-loop-lepin` | https://last-loop-lepin-pr-40.preview.borso.fr |
