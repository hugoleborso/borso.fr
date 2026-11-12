---
date: 2026-11-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#314'
fix-pr: none (lands with the kaizen pull request for PR #314)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.claude/hooks/pretool-agent-work-folder.sh, .claude/settings.json]
time-to-detect: minutes
tags: [agents, hooks, harness, validation]
zone: CLAUDE.md
recurs: none (the three earlier lines were never swept into an entry)
---

# A work folder every brief named and nobody made

## User impact

The operator saw nothing directly. Validators paid for it in repeated runs,
and once in a lost log.

| | Seen | Expected |
| --- | --- | --- |
| PR #314, `technical-validator-2` | the first redirect into its work folder failed, and a test run was repeated | the run writes its log on the first try |
| An earlier task, `technical-validator-2` at 21:35 | a background command redirecting into the missing folder reported exit 0 and lost the whole gate log | the gate log exists |
| An earlier task, `technical-validator` at 21:02 | the first gate runs failed on the redirect, not on the code | the gates report on the code |

Three lines, all from validators, in three tasks (measured with
`grep -rhi "did not exist" docs/features/*/*/kaizen.md`).

## Causal chain

- A validator's first command failed or lost its output.
  - It redirected into `<scratchpad>/<label>/`, which did not exist.
    - CLAUDE.md tells each agent to work in that folder, and the brief
      names it. Neither the brief's author nor the agent creates it.

## Root cause of occurrence

*Thought naming a folder in a brief gives the agent a folder, actually it
gives the agent a path.*

## Detection failure causes

- **Local:** a redirect into a missing folder fails before the command runs.
  On a background command the failure lands in a status no one reads.

## Countermeasure

A PreToolUse hook on the Agent tool runs `mkdir -p` on every
`/tmp/claude-<n>/<project>/<session>/scratchpad/<label>` path in the brief
before the subagent starts. It never refuses. A label must start with a
letter, a digit or `_`, so `scratchpad/..` creates nothing.

## Eradication

**Type:** structural impossibility (level 1). The folder exists before the
first command that could write into it.

**Reference:** this commit.

```diff
+      {
+        "matcher": "Agent|Task",
+        "hooks": [ { "type": "command",
+          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pretool-agent-work-folder.sh" } ]
+      }
```

**Proof it can fail:** before the hook, `echo x > <scratchpad>/proof-validator/run.log`
printed `No such file or directory`. After feeding the hook a brief naming
that folder, the same write succeeded. `/tmp/claude-0/a/b/scratchpad/../etc`
in the same brief created nothing (measured).

**Similar instances:** a brief that writes the placeholder
`<scratchpad>/<label>/` instead of the absolute path gets no folder. Every
brief in PR #314's session used the absolute path (inferred from the
validator's failing redirect, which needs one).
