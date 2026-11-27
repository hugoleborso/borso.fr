---
date: 2026-11-14
introduced-at: conception
detected-at: local
severity: low
related-pr: '#55'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/subagent-no-staging.core.ts, scripts/hooks/hook-events.ts]
time-to-detect: minutes
tags: [agents, git, hooks, harness]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: [parallel-agents-share-one-index-and-every-generator]
---

# A rename that staged itself

## User impact

The operator saw nothing. A subagent told not to stage staged a rename, and
had to notice it and unstage it before the main session's next commit picked
it up.

| | Seen | Expected |
| --- | --- | --- |
| PR #327, `compositions` | `git mv` left a staged rename in the index every agent shares | the index holds only what the main session staged |

The subagent logged it as
`[compositions] git mv stages the rename, so a subagent told not to stage has to remember to unstage it`.

## Causal chain

- A staged rename sat in the shared index, outside the main session's control.
  - The subagent ran `git mv` in the main checkout.
    - `git mv` moves the file and stages the move in one step.
      - The subagent read its brief's "do not stage" as "do not run `git add`".
        Its context held that rule and CLAUDE.md's "Subagents never commit",
        and nothing that said which git commands stage.
        - The container has no man pages. `git help mv` prints "This system has
          been minimized" (measured in
          [`the-rule-against-staging-met-the-tools-that-assumed-it`](./the-rule-against-staging-met-the-tools-that-assumed-it.md)),
          and `git mv -h` prints options that never mention the index
          (measured this session).

## Root cause of occurrence

*Thought "do not stage" is kept by not running `git add`, actually several git
commands stage as a side effect.* **Material.** The fact that `git mv` stages was
in no document of the subagent's context, and the container held no git manual
to look it up.

[`git mv`](https://git-scm.com/docs/git-mv): "The index is updated after
successful completion, but the change must still be committed." The same holds
for `git rm`.

## Detection failure causes

- **Local:** the pre-commit hooks run on a commit, and a subagent does not
  commit. A staged path waits silently until the main session commits by
  explicit paths, or catches it with `git status`.
- **Review:** [`parallel-agents-share-one-index-and-every-generator`](./parallel-agents-share-one-index-and-every-generator.md)
  fixed the same class with prose in CLAUDE.md and `/route`, and no tool read
  that prose at the call.

## Countermeasure

A PreToolUse hook on Bash refuses `git add`, `git mv`, `git rm` and
`git commit` when the call comes from a subagent (`agent_id` is set) in the
main checkout. Its refusal names the working-tree equivalents: `mv`, `rm`, and
the paths in the report. That brings the missing fact to the moment of the
call. A linked worktree has its own index, so subagents that commit on their
worktree branches still can.

## Eradication

**Type:** DevX check (level 2). A subagent cannot write the shared index
through those four commands.

**Reference:** the commit adding this file shipped
`.claude/hooks/pretool-subagent-no-staging.sh`. Commit `458e886` (#411) ported
it to `scripts/hooks/checks/subagent-no-staging.core.ts`, registered under
`PreToolUse` in `scripts/hooks/hook-events.ts`.

```ts
const STAGING = /(^|[;&|(]|\bthen\b|\bdo\b)\s*git\s+(-C\s+\S+\s+)?(add|mv|rm|commit)(\s|$)/u;
```

**Proof it can fail:** the shell hook, fed JSON on stdin with
`KAIZEN_LOG_REFUSALS=0`:

```text
exit=2  agent=a1 cwd=/home/user/borso.fr  :: git mv a.ts b.ts
[subagent-no-staging] A subagent shares this checkout's index with every other agent, and the main session commits.
exit=2  agent=a1 cwd=/tmp  :: cd /home/user/borso.fr && git add -A
exit=2  agent=a1 cwd=/tmp  :: git -C /home/user/borso.fr commit -m x
exit=0  agent=main cwd=/home/user/borso.fr  :: git mv a.ts b.ts
exit=0  agent=a1 cwd=<scratchpad>/tooling/wt  :: git commit -m x
exit=0  agent=a1 cwd=/home/user/borso.fr  :: git commit-tree HEAD^{tree}
```

Live, it refused this sweep's own subagent on `git mv -h` minutes after it was
registered, which shows Claude Code sets `agent_id` in a real subagent call. It
now lets `-h` and `--help` through, because they are the only git manual a
subagent has here.

**Similar instances:** `grep -rn -E 'git (add|commit|mv|rm)\b' .claude/agents/`
prints nothing, so no agent definition tells a subagent to stage. Still open: a
staging command the pattern does not name, such as `git apply --index` or
`git stash`, and a script that runs git itself. CLAUDE.md now has every pair of
code-writing agents run with `isolation: "worktree"`, which gives each its own
index. That rule is prose.

**Proposed:** hold the property, not the verbs. A PreToolUse check records
`git write-tree` of the main checkout's index before a subagent's Bash call, and
a PostToolUse check compares it after and tells the subagent to restore it when
it moved. Both events already exist in `scripts/hooks/hook-events.ts`. Any
command that stages, named or not, would then be caught at the call.
