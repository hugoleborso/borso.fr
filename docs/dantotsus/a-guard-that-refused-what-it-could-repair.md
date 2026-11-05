---
date: 2026-11-03
introduced-at: conception
detected-at: local
severity: low
related-pr: '#250'
fix-pr: none (the kaizen pull request of PR #250, number unknown when this was written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.claude/hooks/pretool-no-swallowed-push.sh]
time-to-detect: days
tags: [bash, git, hooks, meta]
zone: .claude/hooks
weak-point: none
recurs: [a-push-that-failed-and-reported-success]
---

# A guard refused the same harmless command 113 times

## User impact

The operator pays for every refusal. A refused call is a wasted turn, a re-read
of the hook's message and a second call that does what the first one meant.

| | Seen | Expected |
| --- | --- | --- |
| `git commit … \| tail` or `git push … \| tail` | refused, then retyped bare | runs, and reports git's status |
| Every archived friction log | 113 `hook:no-swallowed-push` lines in 32 tasks (measured with `grep -r` over `docs/features/**/kaizen*.md`) | none |

PR #250 hit it twice, at 16:00 and 18:37.

## Causal chain

- The session pipes a push or a commit into `tail` to keep the output short.
  - `pretool-no-swallowed-push.sh` refuses it with exit 2, correctly, because
    `pipefail` is off and the pipeline would report `tail`'s status.
    - The hook refuses because its author believed nothing in the harness could
      turn `pipefail` on for a command the model composes.
      - That belief was never tested, and each later sweep read the refusal as
        the guard working, so it filed a no-op.

## Root cause of occurrence

*Thought "level 1 is not reachable from here", actually a PreToolUse hook can
hand the harness a changed command.*

`docs/dantotsus/a-push-that-failed-and-reported-success.md` says: "Level 1 is
not reachable from here. Nothing in the harness can turn on `pipefail` for a
command the model composes". Claude Code 2.1.317's hook output schema carries
`hookSpecificOutput.updatedInput` for PreToolUse, with `permissionDecision`
optional (read from the installed binary this session). The hook already holds
the exact repair, `set -o pipefail;` in front, because it printed it as advice.

## Detection failure causes

- **Kaizen sweeps:** a refusal reads as a success of the guard. PR #228's and
  PR #230's sweeps filed it as a no-op because "the hook refused both before
  anything ran". Nobody counted the refusals across tasks.
- **Working-conditions board:** the wall `guard-hooks-refuse-a-command` counted
  them, but a count with no owner changes nothing.

## Countermeasure

The hook now answers a piped `git push` or `git commit` with exit 0 and
`updatedInput`, the same tool input with `set -o pipefail; ` in front of the
command. The `--no-verify` and `stryker | head` refusals stay, because no
rewrite saves a skipped hook or a killed run.

## Eradication

**Type:** structural impossibility (level 1). A piped push or commit cannot
lose its status, and there is no refusal left to hit.

**Reference:** commit `[self]` on the kaizen branch of PR #250.

```diff
-block() {
-  echo "[no-swallowed-push] $1" >&2
-  …
-  exit 2
-}
+if grep -qE '(^|[|[:space:]])git[[:space:]]+(push|commit)([[:space:]][^|]*)?\|' <<<"$PIPELINES"; then
+  jq -c '{ hookSpecificOutput: { hookEventName: "PreToolUse",
+    updatedInput: (.tool_input + {command: ("set -o pipefail; " + .tool_input.command)}),
+    additionalContext: "…" } }' <<<"$INPUT"
+  exit 0
+fi
```

**Proof it works, offline:** fed the tool-input JSON directly,
`git push -u origin x | tail -3` comes back as
`set -o pipefail; git push -u origin x | tail -3` with exit 0. A bare push, a
quoted mention and `git status | head` pass untouched. `--no-verify` and
`stryker run | head` still exit 2.

**Proof it works, live:** with nothing staged, `git commit -m probe | tail -1`
printed git's "no changes added to commit" and `echo $?` printed `status=1`.
Without the rewrite, the same pipeline reports `tail`'s 0. The auto-mode
classifier refused the probe once as self-modification, because the same
session had just edited the hook. It ran after the operator approved it.

**Similar instances:** `pretool-no-broad-kill.sh` refused 40 times in 18 tasks
(measured). It cannot be repaired the same way, because the hook cannot know
which process the caller started.
