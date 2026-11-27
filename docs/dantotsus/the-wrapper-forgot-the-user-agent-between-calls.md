---
date: 2026-10-25
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#193'
fix-commits: [self]
eradication-level: 5
eradication-paths: [docs/knowledge/agent-browser-cli-quirks.md]
time-to-detect: hours
tags: [harness, agent-browser, tooling, visual-validation]
zone: .claude/agents/visual-validator.md
recurs: [the-browser-moved-and-the-wrapper-died-silently]
---

# The wrapper forgot the user agent between calls

## User impact

The takes branch's visual validations needed an Android and an iOS user agent
for the install banner, and Chromium's fake microphone for recording. Seven
`KAIZEN.md` lines from four validator agents record what followed (measured
by those agents on PR #193):

| | Seen | Expected |
| --- | --- | --- |
| `scripts/browser.sh --user-agent "<android>" open …` | The page loaded as `HeadlessChrome` | The page loaded as Android |
| A later call that forgot `AGENT_BROWSER_USER_AGENT` | Chromium relaunched on `about:blank`, page, sign-in and CDP port gone, no message | The same page, still signed in |
| Fake-microphone flags after a hand-made launch | The next wrapper call relaunched without them | Recording with the fake microphone |
| `scripts/browser.sh --restart --session banner` | The *default* session closed, which another agent was driving | Only `banner` closed |

## Causal chain

- The validators' sessions loaded as `HeadlessChrome`, or relaunched blank
  mid-run.
  - Branch 1: `--user-agent` was ignored. agent-browser 0.35.2 ignores its
    own flag (re-measured 2026-10-25 without the wrapper). The environment
    variable `AGENT_BROWSER_USER_AGENT` works.
  - Branch 2: a call without the variable relaunched Chromium. The daemon
    compares `AGENT_BROWSER_USER_AGENT` and `AGENT_BROWSER_ARGS` on every
    call and restarts the browser, silently, when either differs.
    - `scripts/browser.sh` sent the sandbox's flags on every call and nothing
      else. It overwrote the one variable that carries flags, and kept no
      state per session beyond a drive count:

      ```bash
      export AGENT_BROWSER_ARGS="$BROWSER_ARGS"
      ```

      - The wrapper was built on the belief that launch settings are read
        once, at launch. agent-browser re-reads them on every call. The tool
        itself sets that rule. **Machine.**
  - Branch 3: `--restart --session` ran `agent-browser close` without the
    session flag, so it closed the default session.

## Root cause of occurrence

*Thought the wrapper only had to set the sandbox's flags at launch, actually
agent-browser re-reads its launch environment on every call, so whatever a
session was launched with has to be sent again every time.* **Machine.**

The source is the measurement recorded in
[`agent-browser-cli-quirks.md`](../knowledge/agent-browser-cli-quirks.md):
"The daemon compares `AGENT_BROWSER_USER_AGENT` and `AGENT_BROWSER_ARGS` on
every call, so a later call that omits the user agent… restarts Chromium on
`about:blank`."

## Detection failure causes

- **Local validation:** a relaunch looks exactly like the application signing
  you out or losing its page, so each validator first suspected the app.
- **Tool output:** agent-browser prints no line when it relaunches, and exits
  0 on an ignored `--user-agent`.

## Countermeasure

`scripts/browser.sh` took `--user-agent <ua>` and `--args <flags>`, stored both
per `--session`, and exported them on every later call of that session. It
appended the extra flags to the sandbox's own, said so when a call changed
either, and cleared them on `--restart`, which closed only the named session.
Measured on 2026-10-25: a session opened with `--user-agent KaizenProbe/1.0`
read it on the next plain call.

## Eradication

**Type:** knowledge (level 5)

**Reference:** the commit adding this file (`a83f0a600`) wrote the vendor facts
into `docs/knowledge/agent-browser-cli-quirks.md`. Its `triggers:` match
`\bagent-browser\b` and `AGENT_BROWSER_(USER_AGENT|ARGS)`, so a hook prints it
when a command drives the browser.

The same commit first shipped a level-1 fix in the wrapper. #224
(`c54e32da7`, 2026-10-29) deleted `scripts/browser.sh` and, in its words,
"the per-session memory of --user-agent and --args". Agents now call
`agent-browser` directly. So the ignored flag and the silent relaunch are
held only by the triggered entry today.

**Proof it can fail:** the entry prints on a command naming `agent-browser`,
as the knowledge hook's `triggers:` match shows. It refuses nothing.

**Proposed:** a Bash PreToolUse check in `scripts/hooks/checks/`, next to
`no-broad-kill.core.ts`, which already parses `agent-browser` commands. It
would refuse `agent-browser … --user-agent` and name
`AGENT_BROWSER_USER_AGENT`. That makes relying on the ignored flag impossible
(level 2). A vendor patch is not reachable, because agent-browser ships a
native binary (`bin/agent-browser-linux-x64`). The silent relaunch stays at
level 5 until upstream changes.

**Similar instances:** the same commit recorded three more vendor facts in the
entry: `addinitscript` listed in `--help` and refused, `fill` leaving a
`datetime-local` input empty, and `display-mode` having no emulation.
`grep -rn "user-agent" .claude scripts` finds where an instruction might pass
the flag.
