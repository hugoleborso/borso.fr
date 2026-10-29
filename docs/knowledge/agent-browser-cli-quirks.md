---
summary: 'agent-browser traps: `--user-agent` ignored, a silent relaunch when the user agent or flags change, no `resize`, a shared `eval` scope, a session that wedges after about forty drives, a click below a nested scroller that does nothing, a fill that fills nothing (labels, `datetime-local`), no `display-mode` emulation, and `chrome-error://` on a dead loopback redirect.'
triggers:
  commands:
    - '\bagent-browser\b'
    - 'AGENT_BROWSER_(USER_AGENT|ARGS)'
    - '\baddinitscript\b'
    - 'datetime-local'
  output:
    - 'chrome-error://chromewebdata'
    - 'daemon already running'
    - 'Identifier ''\w+'' has already been declared'
---

# `agent-browser` CLI quirks worth remembering

CLI footguns hit during PR #8 and PR #60 that cost more time than they
should have.

## 1. Launch settings are read only when the daemon starts

`--executable-path`, `--args`, `--user-agent` and their `AGENT_BROWSER_*`
variables are read when a session's daemon starts. Against a running daemon
the flag prints one easy-to-miss line and does nothing:

```
⚠ --executable-path ignored: daemon already running. Use 'agent-browser close' first to restart with new options.
```

Run `agent-browser --session <name> close` first, then open with the setting.

## 2. `agent-browser screenshot` takes a **positional** output path, not a `--output` flag

```bash
# WRONG — creates a literal file named '--output' in the cwd:
agent-browser screenshot @VIEWPORT --output /tmp/shot.png

# RIGHT:
agent-browser screenshot @VIEWPORT /tmp/shot.png
```

The CLI parser doesn't reject the `--output` flag — it interprets it as
the positional `path` argument, then writes the PNG to a file literally
named `--output` in the current working directory. Combined with `git
add -A`, a stray `--output` PNG ends up committed (this happened in
PR #8 — recovery commit `a8dadb4`).

The `--screenshot-dir` flag DOES exist and sets the default output
directory, but the per-call path is always positional.

## 3. No browser setup is needed, and `agent-browser install` is wrong here

Last verified: 2026-10-29 — agent-browser 0.35.2 found the image's Chromium
under `/opt/pw-browsers` with no config file and no flag. `agent-browser
install` would download a second Chromium, and behind the proxy it can fail
with `invalid peer certificate: UnknownIssuer`. Before 0.35.2 the CLI reported
*"Chrome not found"* while a Chromium sat at `$PLAYWRIGHT_BROWSERS_PATH`; see
[`docs/dantotsus/the-browser-was-on-disk-and-unreachable.md`](../dantotsus/the-browser-was-on-disk-and-unreachable.md).

## 4. `click` on a ref below the fold of a nested scroller does nothing, and says it did

Observed 2026-08-18. `agent-browser click <ref>` printed `✓ Done` and no
request left the page. The element was real, enabled and 830 px down a 812 px
viewport — inside a `<main>` that owns the scrolling, with `document.body`
itself unscrollable:

```bash
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Build setlist')); const r = b.getBoundingClientRect(); return { top: r.top, innerHeight: window.innerHeight, hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) }; })()"
# { top: 830.8, innerHeight: 812, hit: null }
```

`window.scrollTo` is a no-op on such a page — `document.documentElement.scrollHeight`
equals the viewport height — so the fix is to scroll the container that owns
the overflow, then re-check the hit point before believing the click:

```bash
agent-browser eval "(() => { const m = document.querySelector('main'); m.scrollTop = m.scrollHeight; return m.scrollTop; })()"
```

Read this before concluding that a button is dead. During PR #60 this exact
sequence read as *"the create button does nothing"*, which was wrong, and the
real defect was elsewhere.

## There is no `resize`; the command is `set viewport`

_Observed 2026-08-21 on agent-browser 0.27.0._ Widths are changed with
`agent-browser set viewport <w> <h>`, listed under *Browser Settings* in
`--help`. There is no `resize` command, and `--width` / `--height` passed to
`open` are accepted and ignored, so a pass that thinks it measured 390 px
measured whatever the default is. Check `agent-browser get box body` after
setting it if the numbers matter.

The same section carries `set device <name>`, which does **not** give a coarse
pointer — see [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md).

## The `eval` scope is shared between calls, so `const` collides

_Observed 2026-08-21._ Two `eval` calls in a row, each declaring the same
name, fail on the second:

```bash
agent-browser open "data:text/html,<p id=x>hi</p>"
agent-browser eval "const el = document.getElementById('x'); el.textContent"
# "hi"
agent-browser eval "const el = document.getElementById('x'); el.tagName"
# ✗ Evaluation error: SyntaxError: Identifier 'el' has already been declared
```

The declarations persist in one scope for the life of the session, so an
iteration loop that reuses an obvious name dies on its second turn with an
error that names a JavaScript problem rather than a CLI one. Wrap every
snippet in an IIFE — `(() => { … })()` — which is the form the examples above
already use, and the collision cannot happen.

## A session wedges after roughly forty drives, and the symptom reads as an application defect

This is the expensive one, because it does not announce itself as a tooling
problem. Three times in one task (2026-09-16), two different agents, a session
stopped completing its fetches after roughly forty to fifty page drives:

- a reload never returned and the panel rendered with every query empty;
- a React mutation stayed pending, so a button read as permanently disabled;
- a panel froze mid-round showing `TIME LEFT 0s`, with the request log holding
  two polls where thirty were due.

Each of those is exactly what a real defect looks like from a browser. A
validator that records a FAIL here records a false one, and the only evidence
that tells the two apart — how many times this session has been driven — is
not visible from inside the session.

**Before recording a FAIL on a page that looks frozen, run `agent-browser
--session <name> close`, reopen the page and check whether the symptom survives
a fresh browser.**

## `find label … fill` can print `Done` and leave the field empty

On PR #118's account page, `find label "SECRET ICAL ADDRESS" fill <url>`
printed `Done`, and the input stayed empty. The `Save` that followed sent an
empty address, and the server's refusal read as a validation defect in the
application. Read the field back with `get value <ref>` after every fill, or
fill by the ref from a fresh `snapshot`, before treating what the server says
as a finding.

## A long idle wedges the session the same way forty drives do

After an eighty-minute wait on PR #118, every `fetch` the page made answered
`TypeError: Failed to fetch` until the daemon was restarted. The application
was fine, and a fresh session loaded it at once. If a validator has to wait
for a time window, close the session and open a new one afterwards rather than
reuse the one that sat idle.

## `--session` silently discards the page when a later call omits a launch flag

Calling the same `--session` again without a launch flag it was created with —
`--init-script`, for instance — drops the page and its globals. The next `eval`
then fails with a `ReferenceError` and a `SecurityError` on `about:blank`,
naming neither the session nor the missing flag. Pass every launch flag on
every call to that session, or accept that the session is new.

Observed 2026-09-16.

## `batch` re-parses each quoted command and strips the inner quotes

`eval __vote.vote('Wonderwall')` inside a `batch` reaches the page as
`vote(Wonderwall)` and dies with a `ReferenceError`, while the identical `eval`
outside `batch` works. Anything carrying quoted arguments goes as its own call.

Observed 2026-09-16.

## `find` rejects `--name` placed before the action

The working order is action first, then `--name`. The CLI's own help prints the
option list under a `Usage` line that puts `[action]` last, so the order that
works is not the order the help suggests.

Observed 2026-09-16.

## A ref goes stale within a second when the accessible name carries live text

A pool row whose accessible name includes a live vote count and a countdown
gets a new ref on every one-second poll, so click-by-ref loses the race. Find
and click in the same beat, or drive the element by a stable attribute instead
of by ref.

Observed 2026-09-16.

## 0.35.2: settings that do nothing, and settings that restart the browser

_Measured on PR #193 (2026-10-24) and re-checked on 2026-10-25._

- **`--user-agent` is ignored.** `agent-browser --session x --user-agent Foo open …`
  leaves `navigator.userAgent` at `HeadlessChrome/…`; the environment variable
  `AGENT_BROWSER_USER_AGENT` works.
- **A changed user agent or flag list relaunches the browser, silently.** The
  daemon compares `AGENT_BROWSER_USER_AGENT` and `AGENT_BROWSER_ARGS` on every
  call, so a later call that omits the user agent, or a fake-microphone flag
  the session was launched with, restarts Chromium on `about:blank`: the page,
  the session cookie and the CDP port are gone, and the next step fails as if
  the application had logged you out. Export both variables once in the shell
  that drives the session, rather than setting them on one call.
- **`addinitscript` is listed in `--help` and refused** as `Unknown command`.
  Inject an init script over CDP (`Page.addScriptToEvaluateOnNewDocument`) or
  with `eval` after load.
- **`fill` on an `input[type=datetime-local]` leaves it empty**, with no error.
  Click each spin-button segment and type its digits, or set the value through
  `eval` and dispatch `input` and `change`.
- **`display-mode` cannot be emulated.** Chromium ignores it in
  `Emulation.setEmulatedMedia`, and agent-browser has no setting for it, so a
  `display-mode: standalone` assertion needs a `matchMedia` shim and says so in
  the report.

## A redirect to a closed loopback port lands on `chrome-error://chromewebdata/`

An OAuth consent page ends by redirecting to the client's `redirect_uri`,
which for a command-line client is `http://127.0.0.1:<port>/callback`. When
nothing listens on that port, Chromium shows its own error page, and
`get url` answers `chrome-error://chromewebdata/` instead of the address the
page redirected to, so the `code` and `state` a validator wants to read are
gone. PR #206's consent rows hit this (`implementation-07-7` in
`docs/features/pragma/assistants-act-on-pragma/kaizen.md`).

Start a listener on the port before pressing Allow or Deny, so the redirect
lands on a real page; its log then holds the request line with `code` and
`state`. The agent that hit this did not record its exact commands, so this is
the shape rather than a measured recipe:

```bash
python3 -m http.server 8976 --bind 127.0.0.1 > callback.log 2>&1 &
scripts/browser.sh click @e7          # the ref snapshot gave the Allow button
grep 'GET /callback' callback.log     # GET /callback?code=…&state=… HTTP/1.1
```

## Related

- [`agent-browser-cdp-click-no-op-on-react-onclick.md`](./agent-browser-cdp-click-no-op-on-react-onclick.md)
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
- [`visual-validator-image-size-limit.md`](./visual-validator-image-size-limit.md)
