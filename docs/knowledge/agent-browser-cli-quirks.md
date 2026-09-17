# `agent-browser` CLI quirks worth remembering

CLI footguns hit during PR #8 and PR #60 that cost more time than they
should have.

## 1. `--executable-path` is ignored when the daemon is already running

`agent-browser` runs a background daemon. The `--executable-path` flag
(and other browser-options flags) are only read on **daemon start**.
If the daemon is already up — from an earlier `agent-browser open` in
the same session, or a leftover from a previous Claude Code session —
`--executable-path` silently no-ops:

```
$ agent-browser --executable-path /opt/pw-browsers/.../chrome open http://...
⚠ --executable-path ignored: daemon already running. Use 'agent-browser close' first to restart with new options.
✓ <page-title>
  <url>
```

The warning is helpful but easy to miss when piped through `tail`.

Recovery: `agent-browser close` first, **then** re-open with the flag:

```bash
agent-browser close
agent-browser --executable-path /opt/pw-browsers/.../chrome open <url>
```

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

## 3. Chromium provision can fail on session start

The `agent-browser install` command needs network access to fetch the
Chromium for-testing binary. Behind some corporate proxies (or when the
TLS root CA isn't trusted) it fails:

```
✗ Failed to fetch version info: error sending request for url (...): client error (Connect): invalid peer certificate: UnknownIssuer
```

This repo's SessionStart hook surfaces this as `agent-browser install
(Chromium provision) failed; /visual-validation will surface this`.

Workaround when a Playwright-installed Chromium is already on the
system (e.g. `/opt/pw-browsers/chromium-*/chrome-linux/chrome`),
pass it through:

```bash
agent-browser --executable-path /opt/pw-browsers/chromium-1194/chrome-linux/chrome open <url>
```

(See quirk #1 above — the flag is only read on daemon start.)

Since 2026-08-18 this is handled for you: SessionStart writes
`~/.agent-browser/config.json` with `executablePath` pointing at the Chromium
the container already ships, so the first `open` of a session needs no flag and
never starts a daemon with the wrong browser. The two failure shapes it
removes, both observed on PR #60: the CLI reporting *"Chrome not found … Run
`agent-browser install`"* while a Chromium sat at `$PLAYWRIGHT_BROWSERS_PATH`,
and `--executable-path` then appearing inert because quirk #1 had already
started a daemon. See
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

So [`scripts/browser.sh`](../../scripts/browser.sh) counts the drives per
`--session` and prints the count plus this symptom list from drive 30 onward,
with the restart command spelled out. **Before recording a FAIL on a page that
looks frozen, restart the daemon and check whether the symptom survives it.**

`--restart` may go anywhere in the argument list on the wrapper (agent-browser
itself rejects `--restart` after `--session` with `Unknown command: --restart`,
which is the kind of order-sensitivity its help does not state). A restart also
resets the count.

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

## Each wrapper call costs about 2.5 s of `pnpm exec` startup

A thirty-second agent round affords roughly eight browser commands, so a
multi-step flow has to be split across rounds. Budget for it when writing a
validation brief rather than discovering it halfway through a flow.

Measured 2026-09-16.

## Related

- [`agent-browser-cdp-click-no-op-on-react-onclick.md`](./agent-browser-cdp-click-no-op-on-react-onclick.md)
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
- [`visual-validator-image-size-limit.md`](./visual-validator-image-size-limit.md)
