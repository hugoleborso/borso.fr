---
date: 2026-11-14
introduced-at: conception
detected-at: local
severity: low
related-pr: '#55'
fix-pr: none (lands with the kaizen pull request for PR #327)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-subagent-no-staging.sh, .claude/settings.json]
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
  - The subagent ran `git mv`.
    - `git mv` moves the file and stages the move in one step.
      - The brief said not to stage, and CLAUDE.md says "Subagents never
        commit". Both are prose, and no hook read them at the call.

## Root cause of occurrence

*Thought "do not stage" is followed by not running `git add`, actually several
git commands stage as a side effect.*

[`git mv`](https://git-scm.com/docs/git-mv): "The index is updated after
successful completion, but the change must still be committed." The same holds
for `git rm`.

## Detection failure causes

- **Local:** the pre-commit hooks run on a commit, and a subagent does not
  commit. A staged path waits silently until the main session commits by
  explicit paths, or catches it with `git status`.
- **Review:** [`parallel-agents-share-one-index-and-every-generator`](./parallel-agents-share-one-index-and-every-generator.md)
  fixed the same class with prose in CLAUDE.md and `/route`, and prose is what
  failed here.

## Countermeasure

A PreToolUse hook on Bash refuses `git add`, `git mv`, `git rm` and
`git commit` when the call comes from a subagent (`agent_id` is set) in the
main checkout. It points at the working-tree equivalents: `mv`, `rm`, and
naming the paths in the report. A linked worktree has its own index, so the
`/feature-pipeline` subagents that commit on their worktree branches still
can.

## Eradication

**Type:** DevX check (level 2). A subagent cannot write the shared index
through those four commands.

**Reference:** this commit, `.claude/hooks/pretool-subagent-no-staging.sh`,
registered in `.claude/settings.json` beside `pretool-no-shared-checkout-switch.sh`,
whose worktree test it reuses.

```bash
STAGING_PATTERN='(^|[;&|(]|\bthen\b|\bdo\b)[[:space:]]*git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(add|mv|rm|commit)([[:space:]]|$)'
```

**Proof it can fail:** fed JSON on stdin with `KAIZEN_LOG_REFUSALS=0`:

```text
exit=2  agent=a1 cwd=/home/user/borso.fr  :: git mv a.ts b.ts
[subagent-no-staging] A subagent shares this checkout's index with every other agent, and the main session commits.
[subagent-no-staging] Change the working tree only, and name the paths in your report:
[subagent-no-staging]   git mv a b  ->  mv a b       git rm a  ->  rm a       git add, git commit  ->  nothing
exit=2  agent=a1 cwd=/tmp  :: cd /home/user/borso.fr && git add -A
exit=2  agent=a1 cwd=/tmp  :: git -C /home/user/borso.fr commit -m x
exit=2  agent=a1 cwd=/home/user/borso.fr  :: git rm --cached x
exit=0  agent=main cwd=/home/user/borso.fr  :: git mv a.ts b.ts
exit=0  agent=a1 cwd=<scratchpad>/tooling/wt  :: git commit -m x
exit=0  agent=a1 cwd=/home/user/borso.fr  :: git status && git diff --stat
exit=0  agent=a1 cwd=/home/user/borso.fr  :: git restore --staged a.ts
exit=0  agent=a1 cwd=/home/user/borso.fr  :: echo "git add later" && git log -1
exit=0  agent=a1 cwd=/home/user/borso.fr  :: git commit-tree HEAD^{tree}
```

Live, the hook refused this sweep's own subagent on `git mv -h` minutes after
it was registered, which shows Claude Code sets `agent_id` in a real subagent
call. `-h` stages nothing, and the refusal costs one retry, so it stays.

The first draft matched the verb with `\b`, which refused `git commit-tree`.
The verb now ends at whitespace or the end of the line.

**What stays possible:** a staging command the pattern does not name, such as
`git apply --index` or `git stash`, and a script that runs git itself. The
four named commands are the ones a brief's "do not stage" is about.

**Similar instances:** `grep -rn -E 'git (add|commit|mv|rm)\b' .claude/agents/`
prints nothing, so no agent definition tells a subagent to stage.
