---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#60'
fix-pr: '#62'
fix-commits: [f6463f6]
eradication-level: 1
time-to-detect: minutes
tags: [harness, agent-browser, tooling, meta, visual-validation]
---

# The browser was on disk and unreachable

## Symptom

First browser command of the session, in the managed container:

```
✗ Chrome not found. Checked:
  - agent-browser cache: /root/.agent-browser/browsers
  - System Chrome installations
  - Puppeteer browser cache
  - Playwright browser cache
Run `agent-browser install` to download Chrome, or use --executable-path.
```

A Chromium was sitting at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
and the environment's own instructions forbid downloading another one.
Passing `--executable-path` then appeared to do nothing:

```
⚠ --executable-path ignored: daemon already running. Use 'agent-browser close' first to restart with new options.
```

## Root-cause chain

1. **Why was the browser not found?** agent-browser searches its own
   cache, the system Chrome locations, and the Puppeteer and Playwright
   caches. The container keeps its browser at
   `$PLAYWRIGHT_BROWSERS_PATH`, which is none of those.
2. **Why not follow the error's advice?** `agent-browser install`
   downloads a second browser, and the container asks explicitly that
   nothing does — it ships one and sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.
   The tool's remedy and the environment's rule point opposite ways.
3. **Why did the flag look broken?** The first failing call had already
   started a daemon. A daemon holds its launch options for its lifetime,
   so the flag is accepted, ignored, and reported in a line that scrolls
   past under the successful-looking output of the command that follows.
4. **Why did SessionStart not handle it?** It runs `agent-browser
   install` when the binary is missing, swallowing failure with
   `|| true` — provisioning a browser rather than pointing at the one
   already there.
5. **Why does this cost more than the minutes it took?** Every visual
   check in every session starts here, and the first thing the agent
   reads is an error naming four places the browser is not.

**Root cause:** thought *"a browser automation CLI finds whatever
browser is installed"*, actually *"it looks in the four places it knows,
and a container that ships its own puts it in a fifth"*.

## Detection failure causes

- **Typing:** not a typed surface.
- **Linter / static analysis:** none applicable.
- **Functional validation locally:** on a laptop the system Chrome is in
  one of the four searched locations, so the whole class is invisible
  where the setup script is usually exercised.
- **CI:** no CI job drives a browser.
- **Code review:** the SessionStart block reads correctly — install if
  absent — and its assumption about where a browser lives is not written
  down anywhere to disagree with.
- **Knowledge:** `docs/knowledge/agent-browser-cli-quirks.md` existed and
  covered other quirks, which reads as coverage of the tool.

## Countermeasure

- **Code:** commit `f6463f6` — SessionStart writes agent-browser's
  user-level config pointing at the Chromium already on disk.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — the tool cannot fail to find the browser, so the misconception has nothing to express)

**Reference:** [PR #62](https://github.com/hugoleborso/borso.fr/pull/62) · commit [`f6463f6`](https://github.com/hugoleborso/borso.fr/commit/f6463f6)

**The actual fix:**

```diff
+browsers_root="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
+agent_browser_config="$HOME/.agent-browser/config.json"
+if command -v agent-browser >/dev/null 2>&1 && [ ! -f "$agent_browser_config" ]; then
+  chromium_binary=""
+  if [ -x "$browsers_root/chromium" ]; then
+    chromium_binary="$browsers_root/chromium"
+  else
+    chromium_binary=$(find "$browsers_root" -maxdepth 3 -type f -name chrome -path '*chrome-linux*' 2>/dev/null | sort | tail -n1)
+  fi
+  if [ -n "$chromium_binary" ]; then
+    mkdir -p "$(dirname "$agent_browser_config")"
+    printf '{"executablePath":"%s"}\n' "$chromium_binary" > "$agent_browser_config"
+    log "agent-browser: pointed at $chromium_binary"
+  fi
+fi
```

Written only when absent, so an operator's own config is never
overwritten, and a no-op on a machine with no Playwright browsers
directory. Verified end to end: config removed, block run, page opened
with no flag.

**Sibling defects swept:** the daemon's option-pinning is now moot for
this case, and is recorded in the knowledge entry for the cases where a
flag is still the right tool.

## See also

- [`docs/knowledge/agent-browser-cli-quirks.md`](../knowledge/agent-browser-cli-quirks.md) — the daemon trap and the nested-scroller click.
- [`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md) — the full recipe for driving a preview.
- [`one-failed-optional-install-silently-dropped-four-tools`](./one-failed-optional-install-silently-dropped-four-tools.md) — the same SessionStart script, the same class of silent gap.
