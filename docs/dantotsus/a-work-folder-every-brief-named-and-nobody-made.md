---
date: 2026-11-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#314'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/hooks/checks/agent-work-folder.core.ts, scripts/hooks/hook-events.ts, .claude/settings.json]
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
  - It redirected into `<scratchpad>/<label>/`, which did not exist on disk.
    - The brief named that folder, as CLAUDE.md asks of every brief:

      ```markdown
      - Each agent works in `<scratchpad>/<its-label>/` and logs friction with …
        Put that line in every brief.   <!-- ❌ a path, with no step that makes it -->
      ```

      - Commit `03e16d4d6` (2026-08-21, in the sweep on PR #81) wrote the
        convention, after three of PR #81's eight agents overwrote each other's
        files in one shared scratchpad. It fixed the collision by naming a
        folder per label, and gave no step or tool the job of creating it
        (Method).

## Root cause of occurrence

*The agent that wrote the convention thought naming a folder in a brief gives
the subagent a folder, actually it gives it a path, and a shell redirect into a
missing folder fails before the command runs.* (Method)

The convention is a process every brief follows, and it assigns the folder to
nobody. The brief's author writes the path. The subagent writes into it. Bash
answers `No such file or directory` on the first redirect (measured below).

## Detection failure causes

- **Local:** a redirect into a missing folder fails before the command runs.
  On a background command the failure lands in an exit status no one reads,
  which is how one gate log was lost with exit 0.
- **Kaizen:** the three lines sat in three tasks' `kaizen.md`, each swept
  alone, so the repetition showed only when this sweep grepped them together.

## Countermeasure

A PreToolUse check on the Agent tool runs `mkdir -p` on every
`/tmp/claude-<n>/<project>/<session>/scratchpad/<label>` path in the brief
before the subagent starts. It never refuses. A label must start with a
letter, a digit or `_`, so `scratchpad/..` creates nothing.

## Eradication

**Type:** structural impossibility (level 1), for a brief that names its
folder by absolute path. The folder exists before the first command that could
write into it.

**Reference:** the commit adding this file shipped
`.claude/hooks/pretool-agent-work-folder.sh`. Commit `458e886c4` (#411) deleted
it and ported it to `scripts/hooks/checks/agent-work-folder.core.ts`, run by
`scripts/hooks/hook.ts` for the `Agent|Task` matcher in `.claude/settings.json`:

```ts
const SCRATCHPAD_WORK_FOLDER =
  /\/tmp\/claude-[0-9]+\/[^/\s]+\/[^/\s]+\/scratchpad\/[A-Za-z0-9_][A-Za-z0-9._-]*/gu;
// …
    if (folders.length > 0) world.run('mkdir', ['-p', ...folders]);
```

**Proof it can fail:** before the hook, `echo x > <scratchpad>/proof-validator/run.log`
printed `No such file or directory`. After feeding the hook a brief naming
that folder, the same write succeeded. `/tmp/claude-0/a/b/scratchpad/../etc`
in the same brief created nothing (measured). Today
`scripts/hooks/checks/agent-work-folder.core.test.ts` holds both cases.

**The gap that holds:** a brief that copies CLAUDE.md's literal placeholder
`<scratchpad>/<its-label>/` matches no absolute path, so it gets no folder.
Whether briefs in PR #314's session used the absolute path is inferred from the
validator's failing redirect, which needs one.

**Proposed:** make the same check refuse a brief whose prompt carries the
literal `<scratchpad>/`, with a message naming the session's absolute
scratchpad path to write instead. The placeholder form, the very form CLAUDE.md
writes, then cannot reach a subagent, and every brief that does reach one gets
its folder made.

**Similar instances:** `grep -rhi "did not exist" docs/features/*/*/kaizen.md`
found the three lines above, all from validators.
