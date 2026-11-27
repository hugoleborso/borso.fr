---
date: 2026-10-29
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#234'
fix-commits: [d1be9c429]
eradication-level: 2
eradication-paths: [scripts/install-repo-deps.sh]
time-to-detect: one task
tags: [agent-browser, harness, tooling, visual-validation]
zone: scripts/install-repo-deps.sh
weak-point: prose-stands-in-for-a-check
recurs: [the-browser-was-on-disk-and-unreachable]
---

# The browser on PATH was not the pinned one

## User impact

Two visual validators on PR #234 aborted `/api/streaks` to check the flame's
error state. Both logged the same wall:

> agent-browser network route with a '**/api/streaks*' glob printed Done and
> blocked nothing, while the exact URL worked, so an abort test can silently
> run against a live endpoint.

| | Seen | Expected |
| --- | --- | --- |
| `network route '**/api/streaks*' --abort`, then a fetch | `status 200`, the page keeps its happy state | `aborted`, the page shows its error state |

Measured on 2026-10-29 against a local page that fetches
`/api/streaks?member=1`: 0.27.0 answered `status 200`, 0.35.2 answered
`aborted`. An implementer also logged that `find role link --name Home` matched
nothing at 375 px and that `back` left the tab on `about:blank`.

## Causal chain

- The glob route blocked nothing.
  - The binary that ran was agent-browser 0.27.0, which lets that glob through.
    - Agents call `agent-browser` from PATH, and PATH resolved to
      `/opt/node22/bin/agent-browser`, the copy the hosted image ships.
      - SessionStart left that copy in place, because it installed
        agent-browser only when no binary was found:
        ```bash
        if ! command -v agent-browser >/dev/null 2>&1; then  # ← any version satisfies it
          npm install -g agent-browser >/dev/null
        ```
        - `5105c2407` (2026-05-03) wrote that guard when the repository pinned
          no version, so "any binary" was then the right test.
          - `14fc404a6` (2026-08-08) added `"agent-browser": "0.33.2"` to the
            root `devDependencies` and left the SessionStart step unchanged.
            From then on the repository held two copies of the tool: the pinned
            one in `node_modules/.bin`, which nothing calls, and the global one
            on PATH, which the pin does not govern. (Machine)

## Root cause of occurrence

*Thought adding agent-browser to `devDependencies` pinned the browser agents
drive, actually agents call the binary on PATH, which the image ships and the
pin never reaches.* (Machine)

The codebase kept two ways to obtain the tool and nothing tied them. A pin
added to `package.json` changed the lockfile copy, and the copy that ran was
the other one. Measured this session: `which -a agent-browser` finds only
`~/.local/bin/agent-browser`, and the locked copy sits at
`node_modules/.bin/agent-browser`, which no script calls.

## Detection failure causes

- **Local validation:** a route that fails silently looks like a route that
  matched nothing worth blocking. The validator noticed only because the page
  kept its happy state.
- **Review of `14fc404a6`:** the pin is a one-line `package.json` change. The
  SessionStart step that decides which binary runs was outside the diff.
- **Session start:** the banner printed `agent-browser: agent-browser 0.27.0`
  while the knowledge entries said "verified on 0.35.2". The banner prints the
  version and compares it with nothing, so the two numbers met only in a
  reader's head.

## Countermeasure

`d1be9c429` makes `scripts/install-repo-deps.sh` read the pin from
`package.json` and install it globally when the binary on PATH reports another
version. Run on the container that had 0.27.0 on PATH:

```
[t] agent-browser 0.27.0 on PATH, 0.35.2 pinned; installing the pin globally
agent-browser 0.35.2
```

The same glob abort through the PATH binary then printed `"aborted"`.

## Eradication

**Type:** DevX check (level 2). The SessionStart hook reconciles the global
binary with the pin at each session start.

**Reference:** commit [`d1be9c429`](https://github.com/hugoleborso/borso.fr/commit/d1be9c429)

```diff
-if ! command -v agent-browser >/dev/null 2>&1; then
+pinned_agent_browser=$(node -p "require('./package.json').devDependencies['agent-browser'] ?? ''" 2>/dev/null || true)
+global_agent_browser=$(agent-browser --version 2>/dev/null | sed -n 's/^agent-browser //p' || true)
 …
+  elif [ -n "$pinned_agent_browser" ] && [ "$global_agent_browser" != "$pinned_agent_browser" ]; then
+    npm install -g "agent-browser@$pinned_agent_browser" >/dev/null ||
+      note_missing agent-browser "…"
```

The gap, stated: the two copies still exist. A failed `npm install -g` leaves
the old binary running behind a `note_missing` line, and the hook corrects
drift rather than making it impossible.

**Proposed:** delete the global install and the version comparison. Have
`scripts/install-repo-deps.sh` link `~/.local/bin/agent-browser` to
`$repo/node_modules/.bin/agent-browser`. `~/.local/bin` already comes before
`/opt/node22/bin` on PATH (`echo $PATH`, this session). The lockfile then
becomes the only source of the version, so a drift between the pin and the
binary agents run cannot exist.

**Similar instances:** the implementer's `find role link --name Home` and
`back` lines. On 0.35.2 against a synthetic page with a hidden "Home" link and
a visible one, `find role link click --name Home` clicked the visible one and
`back` returned to the previous page. Both are inferred to be 0.27.0
behaviour, not reproduced on pragma itself.
