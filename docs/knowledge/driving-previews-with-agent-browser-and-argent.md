# Driving the previews with agent-browser and argent

Both tools are installed and both work in this sandbox, argent's touch gestures
included. Neither works with its default invocation, and they cannot share a
browser. This is the recipe that does work, verified end to end against the PR
40 previews, and re-verified against a local `pragma` when the claim that
`gesture-tap` was broken turned out to be wrong.

**If the task says to check touch behaviour, drive it with argent.** Synthetic
clicks through `agent-browser` are not taps: they will not tell you whether a
target is reachable with a thumb, whether a gesture is swallowed by an overlay,
or what the on-screen keyboard covers. Two phone audits skipped argent on the
strength of a stale note in this file and reported no touch findings at all.

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

**The failure reads as a network or a certificate problem and is neither**, which
is what makes it expensive: `curl` reaches the same host through the same proxy,
Chromium is launched with the right `--proxy-server` and does reach it, the
proxy's own log shows no rejected `CONNECT`, and a `localhost` dev server loads
perfectly. Every one of those observations points away from TLS. Re-confirmed
2026-08-15 against `https://example.com` and a PR 55 preview, both of which went
from `ERR_CONNECTION_RESET` to loading on this flag alone.

```
--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader
```

Without it the `borso-fr` home page logs a WebGL error and the galaxy background
does not render, which is a sandbox artefact rather than a defect in the page.
Do not substitute `--disable-gpu`; that produces the error this avoids.

## agent-browser

### It has no browser of its own on a hosted session

On claude.ai/code the first call fails before any flag matters:

```
✗ Chrome not found. Checked:
  - agent-browser cache: /root/.agent-browser/browsers
```

Do not run `agent-browser install`. The container already ships Chromium for
Playwright, and the environment brief says not to download a second copy. Point
the tool at the one that is there:

```bash
export AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
```

The directory carries the Playwright build number, so read it from
`ls /opt/pw-browsers` rather than pasting the number above. `--executable-path`
works too, but it is **ignored while the daemon is already running** and says so
in one line that is easy to miss above the navigation error — `agent-browser
close` first, or export the variable and let every session inherit it.

### Use the wrapper

`scripts/browser.sh` carries everything below and passes every argument
through, so it is a drop-in: `scripts/browser.sh snapshot` is `agent-browser
snapshot`. `--restart` closes a daemon started without the settings, which is
the one state no later call can fix.

```bash
scripts/browser.sh --restart open https://borsouvertures-pr-55.preview.borso.fr/
scripts/browser.sh snapshot -i --json
scripts/browser.sh errors
```

The rest of this section is what the wrapper does, kept because the reasoning is
what stops somebody undoing it.

### The flags

Pass them on every invocation, or export them once:

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

**Use [`scripts/argent.sh`](../../scripts/argent.sh) rather than the steps below.**
It encodes every one of them:

```bash
scripts/argent.sh start http://localhost:5174/   # browser + server + open, ~5s
scripts/argent.sh describe                       # frames as normalised [0,1] boxes
scripts/argent.sh tap 0.5 0.95                   # a real tap at a frame's centre
scripts/argent.sh run keyboard --text "hello"    # --udid is filled in for you
scripts/argent.sh stop
```

The rest of this section is what the script does and why, for the day it breaks.

Argent does not launch a browser for you. It probes CDP ports, so a Chromium has
to be running first, and the tool-server has to be told which port to probe.

Start the browser as a long-lived background process. A Chromium started inside
a normal shell call is reaped when the call returns.

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
  /opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  --remote-debugging-port=9222 --remote-allow-origins=* \
  --headless=new --no-sandbox --disable-dev-shm-usage --no-proxy-server \
  --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader \
  --window-size=375,812 \
  --user-data-dir=<a fresh directory> about:blank
```

The proxy has to be stripped from the browser too, not only from the probe
below. A Chromium that inherits `HTTPS_PROXY` sends `http://localhost:5174` out
through the proxy and renders `ERR_CONNECTION_REFUSED`, which `describe` then
reports as a page whose only content is Chromium's own error screen — easy to
misread as the app being down. Keep `--ssl-version-max=tls1.2` if the browser
must reach the internet; with `--no-proxy-server` and a localhost target it is
not needed.

Then restart the tool-server with the port and with the loopback proxy bypass,
also as a long-lived background process, because `argent server start` blocks:

```bash
ARGENT_CHROMIUM_PORTS=9222 NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 \
  pnpm exec argent server start --port 4310
```

**Pass `--port`.** The tool-server binds `127.0.0.1:3001` by default, which is
the port `pragma`'s dev API listens on. Start argent while that API is down and
it takes the port; the site's `/api` proxy then reaches argent instead, every
call answers 401 with `Tool-server requires Authorization: Bearer …`, and the
app tells you *"Wrong password."* — a login bug that is really a port collision.
Any app whose dev API uses 3001 has the same trap.

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

## `gesture-tap` works — the note that said otherwise cost two audits

This section used to read *"`gesture-tap` does not work on this Chromium"*, on
the strength of two runs that both saw `CDP request Input.dispatchMouseEvent
timed out`. Two later phone audits read that line, drove everything through
`agent-browser` clicks instead, and reported no touch findings at all, because
no touch event was ever sent. The claim is wrong, or was fixed under us.

Re-tested end to end against `pragma` on a fresh browser started as below:
`gesture-tap` answered `{"tapped": true}`, and tap → `keyboard` → tap logged in,
opened the More drawer, closed it again, switched tab, and left scene mode. Not
one timeout.

The likely cause of the original failures is the hazard above: both reproductions
ran while `agent-browser` held its own session, and Playwright owning the target
wedges input dispatch the same way it wedges `Page.navigate`. Give argent its
own browser and its input works.

`Input.dispatchTouchEvent` over raw CDP also works, and is still the fallback if
`gesture-tap` ever wedges again:

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

`https://<app>-pr-<number>.preview.borso.fr`, one per application per open pull
request: `borso-fr`, `borsouvertures`, `pragma`, `last-loop-lepin`. The pull
request's own sticky comment carries the four live links and the commit each was
built from, which is the copy to trust — a table of URLs written here would name
whichever pull request happened to be open when somebody wrote it.
