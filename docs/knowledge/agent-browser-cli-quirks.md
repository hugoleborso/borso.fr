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

## Related

- [`agent-browser-cdp-click-no-op-on-react-onclick.md`](./agent-browser-cdp-click-no-op-on-react-onclick.md)
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
- [`visual-validator-image-size-limit.md`](./visual-validator-image-size-limit.md)
