---
date: 2026-10-25
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/browser.sh]
time-to-detect: hours
tags: [harness, agent-browser, tooling, visual-validation]
zone: scripts/browser.sh
recurs: [the-browser-moved-and-the-wrapper-died-silently]
---

# The wrapper forgot the user agent between calls

## Symptom

The takes branch's visual validations needed an Android and an iOS user agent
for the install banner, and Chromium's fake microphone for recording. Seven
`KAIZEN.md` lines from four validator agents record what followed:

- `scripts/browser.sh --user-agent "<android>" open …` loaded the page as
  `HeadlessChrome`.
- With `AGENT_BROWSER_USER_AGENT` exported instead, the next call that forgot
  it relaunched the browser on `about:blank`, dropping the page, the signed-in
  session and the CDP port, with no message.
- The fake-microphone flags could not be passed at all: the wrapper set
  `AGENT_BROWSER_ARGS` unconditionally, and one wrapper call after a hand-made
  launch relaunched without them.
- `scripts/browser.sh --restart --session banner` closed the *default* session,
  which another agent was driving.

## Root-cause chain

1. **Why was `--user-agent` ignored?** agent-browser 0.35.2 ignores its own
   flag (re-measured 2026-10-25 without the wrapper); the environment variable
   works.
2. **Why did a call without it relaunch?** The daemon compares the launch
   environment on every call and restarts Chromium when it differs, silently.
3. **Why did the wrapper not keep it?** It held no state per session beyond a
   drive count, and it overwrote the one variable that carries flags.
4. **Why did `--restart --session` close the wrong session?** It ran
   `agent-browser close` without passing the session on.

**Root cause:** thought the wrapper only had to set the sandbox's two flags at
launch, actually agent-browser re-reads its launch environment on every call,
so whatever a session was launched with has to be sent again every time.

## Detection failure causes

- **Functional validation locally:** a relaunch looks exactly like the
  application signing you out or losing its page.

## Countermeasure

- **Code:** `scripts/browser.sh` takes `--user-agent <ua>` and `--args <flags>`,
  stores both per `--session`, exports them on every later call of that
  session, appends the extra flags to the sandbox's own, says so when a call
  changes either, and clears them on `--restart`, which now closes only the
  named session. The drive-count warning prints at every thirtieth drive rather
  than on every call past thirty, which a validator reported had stopped
  meaning anything.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility): a session can no
longer be relaunched by a call that forgot its user agent or flags, because the
wrapper sends them.

**Reference:** the commit that adds this file.

**The actual fix:**

```diff
-export AGENT_BROWSER_ARGS="$BROWSER_ARGS"
+export AGENT_BROWSER_ARGS="${BROWSER_ARGS}${session_extra_args:+,${session_extra_args}}"
+if [ -n "$session_user_agent" ]; then
+  export AGENT_BROWSER_USER_AGENT="$session_user_agent"
+fi
```

```diff
-  pnpm exec agent-browser close > /dev/null 2>&1 || true
+  pnpm exec agent-browser "${session_flag[@]}" close > /dev/null 2>&1 || true
```

Measured on 2026-10-25: a session opened with `--user-agent KaizenProbe/1.0`
reads it on the next plain call; a call with another user agent prints the
relaunch note; `--restart --session` closes that session only, and the next
call is back to the default user agent.

**Sibling defects swept:** the vendor facts went into
`agent-browser-cli-quirks.md`, with `addinitscript` listed in `--help` and
refused, `fill` leaving a `datetime-local` input empty, and `display-mode`
having no emulation.

## See also

- [`../knowledge/agent-browser-cli-quirks.md`](../knowledge/agent-browser-cli-quirks.md)
