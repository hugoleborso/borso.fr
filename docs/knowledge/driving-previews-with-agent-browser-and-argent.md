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
`pointerType: "touch"` reached the element.

A drag as touch is `scripts/phone.sh drag '<from>' '<to>'`, through
[`scripts/browser/touch-drag.ts`](../../scripts/browser/touch-drag.ts). It moves
a react-chessboard piece, which `agent-browser click` cannot:
`scripts/phone.sh drag '#bors-board-piece-bP-e7' '[data-square="e5"]'`. It
exits 1 when the browser took the gesture to pan (`pointercancel`), so read the
page back for the outcome; see
[`real-touch-gestures-over-cdp.md`](./real-touch-gestures-over-cdp.md).

The `phone` session is its own browser with its own cookies. Sign in there,
with `agent-browser --session phone`, because a sign-in on the default session
does not carry over; PR #234 met that as `no element matches` on a signed-out
page. `touch` taps the first visible match of the selector, so pragma's hidden
desktop sidebar no longer catches a tap meant for the tab bar. A selector that
matches only hidden elements fails with `no visible element matches`.

## Back-button checks need a tab with no earlier history

A check that the browser's back button does not reopen a page reads the tab's
whole history. On PR #354 entries pushed by earlier steps in the same tab made
an old child page come back, which read as a back-link defect. Open a fresh
session and sign in again before such a check, so every entry in the history
is one the check made.

`scripts/phone.sh touch` lays the page out at 1280 px for a moment while it
re-applies the phone viewport. A minimal `sm:overflow-visible` strip kept its
`scrollLeft` through that (measured 2026-11-15), but on PR #354 a pragma pill
strip came back at 0, so a component that re-renders on width can lose its
scroll. Read the state you assert on after the tap, not before it.

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

**`screenshot --full` repeats sticky bars.** On a page with a sticky header or
a fixed bottom bar, such as every Pragma screen, the full-page image draws them
again in the middle of the content, so the evidence looks broken. Scroll and
take viewport screenshots instead. A validator on PR #367 hit it.
