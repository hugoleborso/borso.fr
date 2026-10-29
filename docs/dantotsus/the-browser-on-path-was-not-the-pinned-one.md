---
date: 2026-10-29
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#234'
fix-pr: none (opened by this kaizen sweep, number not known when written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/install-repo-deps.sh]
time-to-detect: one task
tags: [agent-browser, harness, tooling, visual-validation]
zone: scripts/install-repo-deps.sh
weak-point: prose-stands-in-for-a-check
recurs: [the-browser-was-on-disk-and-unreachable]
---

# The browser on PATH was not the pinned one

## Symptom

Two visual validators on PR #234 aborted `/api/streaks` to check the flame's
error state. Both logged the same wall:

> agent-browser network route with a '**/api/streaks*' glob printed Done and
> blocked nothing, while the exact URL worked, so an abort test can silently
> run against a live endpoint.

The first one also logged that `agent-browser --version` printed 0.27.0 while
the knowledge entries say they were verified on 0.35.2. An implementer logged
that `find role link --name Home` matched nothing at 375 px and that `back`
left the tab on `about:blank`.

## Root-cause chain

1. **Why did the glob block nothing?**
   The binary that ran was 0.27.0. Measured on 2026-10-29 against a local page
   that fetches `/api/streaks?member=1`: 0.27.0 answered `status 200` after
   `network route '**/api/streaks*' --abort`, and 0.35.2 answered `aborted`.
2. **Why was 0.27.0 running when `package.json` pins 0.35.2?**
   Agents call `agent-browser` from PATH. PATH resolves to
   `/opt/node22/bin/agent-browser`, which the hosted image ships. The pinned
   copy sits in `node_modules/.bin` and nothing calls it.
3. **Why did the session start not replace it?**
   `scripts/install-repo-deps.sh` installed agent-browser only when
   `command -v agent-browser` found nothing. Any binary, at any version,
   satisfied it.
4. **Why did nobody see the drift?**
   The start banner printed `agent-browser: agent-browser 0.27.0`, and the
   knowledge entries said "verified on 0.35.2". Nothing compared the two.

**Root cause:** thought *"the session uses the agent-browser the repository
pins"*, actually *"it uses whatever the image put on PATH, and the install
step accepted any version"*.

## Detection failure causes

- **Functional validation locally:** a route that fails silently looks like a
  route that matched nothing worth blocking. The validator noticed only because
  the page kept its happy state.
- **Code review:** the install step reads as correct, because "install when
  missing" is the usual idempotent shape.
- **Knowledge:** the entries carried the version they were verified on, and
  that sentence was the only place the pin and the binary met.

## Countermeasure

- **Code:** `scripts/install-repo-deps.sh` reads the pin from `package.json`
  and installs it globally when the binary on PATH reports another version.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commits [self]

**The actual fix:**

```diff
-if ! command -v agent-browser >/dev/null 2>&1; then
-  if command -v npm >/dev/null 2>&1; then
-    log "agent-browser not found; installing globally via npm"
-    npm install -g agent-browser >/dev/null || true
+pinned_agent_browser=$(node -p "require('./package.json').devDependencies['agent-browser'] ?? ''" 2>/dev/null || true)
+global_agent_browser=$(agent-browser --version 2>/dev/null | sed -n 's/^agent-browser //p' || true)
+if command -v npm >/dev/null 2>&1; then
+  if [ -z "$global_agent_browser" ]; then
+    npm install -g "agent-browser@${pinned_agent_browser:-latest}" >/dev/null || true
 …
+  elif [ -n "$pinned_agent_browser" ] && [ "$global_agent_browser" != "$pinned_agent_browser" ]; then
+    log "agent-browser $global_agent_browser on PATH, $pinned_agent_browser pinned; installing the pin globally"
+    npm install -g "agent-browser@$pinned_agent_browser" >/dev/null ||
+      note_missing agent-browser "…"
```

**Proof it acts:** run on this container, which had 0.27.0 on PATH:

```
[t] agent-browser 0.27.0 on PATH, 0.35.2 pinned; installing the pin globally
agent-browser 0.35.2
/opt/node22/bin/agent-browser
```

The same glob abort through the PATH binary then printed `"aborted"`.

**Sibling defects swept:** the implementer's `find role link --name Home` and
`back` lines. On 0.35.2 against a synthetic page with a hidden "Home" link and
a visible one, `find role link click --name Home` clicked the visible one and
`back` returned to the previous page. So both are inferred to be 0.27.0
behaviour, not reproduced on pragma itself.

## See also

- [`the-browser-was-on-disk-and-unreachable.md`](./the-browser-was-on-disk-and-unreachable.md),
  the same image shipping its own copy of a tool the repository expects to
  control.
- [`../knowledge/agent-browser-cli-quirks.md`](../knowledge/agent-browser-cli-quirks.md),
  whose "verified on" line is true again.
