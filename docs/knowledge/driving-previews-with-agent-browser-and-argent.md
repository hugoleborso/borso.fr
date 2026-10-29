---
summary: 'Call `agent-browser` directly: it needs no flag or config here. A click is a mouse press, so a real tap is `scripts/phone.sh touch <selector>`. Plus the traps of a signed-in pragma run.'
triggers:
  commands:
    - '\.preview\.borso\.fr'
    - 'scripts/phone\.sh'
    - 'agent-browser install'
  output:
    - 'ERR_CONNECTION_RESET'
---

# Driving the previews with agent-browser

## No setup

Call `agent-browser` directly, from any folder. It needs no wrapper, flag or
config file in this sandbox, and `agent-browser install` must not be run: it
downloads a second Chromium the image already has.

Last verified: 2026-10-29 — agent-browser 0.35.2, with no
`~/.agent-browser/config.json` and no `AGENT_BROWSER_*` variable, found the
image's Chromium under `/opt/pw-browsers` on its own, launched it with
`--no-sandbox` and `--enable-unsafe-swiftshader`, and opened `https://borso.fr`,
`https://pragma.borso.fr`, `https://github.com`, `https://www.wikipedia.org`
and `http://localhost:8765/` with no error. WebGL ran on SwiftShader and the
`borso-fr` galaxy logged no console error.

Until that date this repository needed three settings, and a wrapper script
applied them: the Chromium path, because the CLI did not
look under `/opt/pw-browsers`; `--ssl-version-max=tls1.2`, because the proxy
reset every TLS 1.3 handshake with `ERR_CONNECTION_RESET`; and three
SwiftShader flags. If `ERR_CONNECTION_RESET` comes back on every https page
while `curl` reaches the same host, the proxy has regressed: retry with
`AGENT_BROWSER_ARGS=--ssl-version-max=tls1.2` after `agent-browser close`,
because the daemon reads its launch settings only when it starts.

Use `--session <name>` to give each agent its own browser. Without it, agents
share one and fight over the active page. The CLI's other traps are in
[`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md).

## A click is not a tap

`agent-browser click` sends a mouse press, and `set device` gives neither touch
events nor `pointer: coarse`. When the task is about touch, tap with:

```bash
scripts/phone.sh start https://pragma-pr-95.preview.borso.fr/
scripts/phone.sh touch '[aria-label="Stop"]'
agent-browser --session phone screenshot /abs/path.png
scripts/phone.sh stop
```

`touch` drives the `phone` session of `agent-browser` through
[`scripts/browser/touch-tap.ts`](../../scripts/browser/touch-tap.ts): it sets a
375 × 812 mobile viewport with touch emulation, sends
`Input.dispatchTouchEvent`, and exits 1 unless `touchstart` and a `click` with
`pointerType: "touch"` reached the element. Swipes and drags as touch are not
covered; see [`real-touch-gestures-over-cdp.md`](./real-touch-gestures-over-cdp.md).

## WebGL is slow

SwiftShader renders the `borso-fr` galaxy at 1 to 2 frames per second. When a
check fails only on a WebGL-heavy page, suspect the renderer before the code.

## Preview URLs

`https://<app>-pr-<number>.preview.borso.fr`, one per application per open pull
request. The pull request's sticky comment carries the live links and the commit
each was built from.

## Traps when the application holds a session

Both cost a visual validator a run on `pragma`.

**A full-page navigation drops the session.** `agent-browser open <url>` lands
on `/login`. Once signed in, move through the application's own links and keep
`open` for the first navigation of a run.

**Re-running the seed invalidates the session.** `POST
/api/__test/seed?fixture=basic-band` recreates the members, so the cookie's
member no longer exists and the login screen reports wrong credentials. Seed
once, before signing in. Five failed sign-ins trip a fifteen-minute rate limit;
`POST /api/__test/rate-limits/reset` clears it on a preview.

**`screenshot --full` captures the window, not a scrolled container.** Where a
page scrolls an inner element, scroll it into view or screenshot the element,
and check the image shows what the row claims.
