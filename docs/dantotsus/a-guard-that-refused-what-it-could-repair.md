---
date: 2026-11-03
introduced-at: conception
detected-at: local
severity: low
related-pr: '#250'
fix-commits: [self, 458e886c4]
eradication-level: 1
eradication-paths: [scripts/hooks/checks/no-swallowed-push.core.ts, scripts/hooks/check.core.ts]
time-to-detect: days
tags: [bash, git, hooks, meta]
zone: scripts/hooks/checks/no-swallowed-push.core.ts
weak-point: none
recurs: [a-push-that-failed-and-reported-success]
---

# A guard refused the same harmless command 113 times

## User impact

The operator pays for every refusal. A refused call is a wasted turn, a re-read of the hook's message and a second call that does what the first one meant.

| | Seen | Expected |
| --- | --- | --- |
| `git commit … \| tail` or `git push … \| tail` | refused, then retyped bare | runs, and reports git's status |
| Every archived friction log | 113 `hook:no-swallowed-push` lines in 32 tasks (measured with `grep -r` over `docs/features/**/kaizen*.md`) | none |

PR #250 hit it twice, at 16:00 and 18:37.

## Causal chain

- A session piped a push or a commit into `tail` to keep the output short, and was refused.
  - `pretool-no-swallowed-push.sh` exited 2 on any `git push` or `git commit` in a pipeline without `pipefail`. It printed the repair, `set -o pipefail;` in front, as advice.
    - An agent wrote the refusal in 50545c5bc, "feat(meta): refuse a git push whose exit status goes into a pipe". Its message says "Modelled on `pretool-no-broad-kill.sh`, including its exit-2 contract". The dantotsu it shipped in the same commit says "Level 1 is not reachable from here. Nothing in the harness can turn on `pipefail` for a command the model composes".
      - The example it copied refuses because no repair exists there: the hook cannot know which process the caller started. The example that rewrites a command, `.claude/hooks/rtk-rewrite.sh`, sat in the same folder and already returned `updatedInput` (measured with `git show 50545c5bc^:.claude/hooks/rtk-rewrite.sh`). It was not the one the agent loaded (Material, inferred from the commit naming only `pretool-no-broad-kill.sh`).

## Root cause of occurrence

*Thought a PreToolUse hook can only allow or refuse a command. Actually it can hand the harness a changed command through `hookSpecificOutput.updatedInput`.* (Material)

Claude Code 2.1.317's hook output schema carries `updatedInput` for PreToolUse, with `permissionDecision` optional (read from the installed binary on PR #250). The repository already used it in `rtk-rewrite.sh`. The agent's context held a refusing hook as its model and no rewriting one, so the claim "not reachable" went unchecked into the dantotsu that justified the refusal.

## Detection failure causes

- **Kaizen sweeps:** a refusal reads as the guard working. PR #228's and PR #230's sweeps filed it as a no-op because "the hook refused both before anything ran". Nobody counted the refusals across tasks.
- **Working-conditions board:** the wall `guard-hooks-refuse-a-command` counted them, but a count with no owner changed nothing.
- **The dantotsu itself:** its "Level 1 is not reachable" read as a checked fact, so each later reader inherited it.

## Countermeasure

The hook answered a piped `git push` or `git commit` with exit 0 and `updatedInput`, the same tool input with `set -o pipefail; ` in front of the command. The `--no-verify` and `stryker | head` refusals stayed, because no rewrite saves a skipped hook or a killed run.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file (PR #250's kaizen). The shell hook was then deleted in 458e886c4 (PR #411), which ported every hook to TypeScript checks. The rewrite lives today in `scripts/hooks/checks/no-swallowed-push.core.ts`, through the `rewrite` verdict of `scripts/hooks/check.core.ts`:

```ts
if (hasLineMatching(pipelines, GIT_INTO_PIPE)) {
  const updatedInput = { ...input.tool_input, command: `set -o pipefail; ${command}` };
  return { kind: 'rewrite', updatedInput, text: PIPEFAIL_CONTEXT };
}
```

A piped push or commit cannot lose its status, and there is no refusal left to hit.

**Proof it can fail:** on PR #250, with nothing staged, `git commit -m probe | tail -1` printed git's "no changes added to commit" and `echo $?` printed `status=1`. Without the rewrite the same pipeline reports `tail`'s 0. `no-swallowed-push.core.test.ts` now holds the rewrite case.

**Proposed:** turn every refusal that prints its own repair into a rewrite. `scripts/hooks/checks/no-test-double-dash.core.ts` refuses `pnpm … run test -- <files>` and prints the exact repair, drop the `--`. The `rewrite` verdict already exists, so that check could return the command without the `--`. A sweep of every `refuse(` in `scripts/hooks/checks/` for a printed repair would find the others. A refusal would then remain only where no repair can be computed, and no session would be refused for a command the hook could have fixed.

**Zone:** the defect lived in `.claude/hooks/pretool-no-swallowed-push.sh`. 458e886c4 deleted that file and moved its rules into `scripts/hooks/checks/no-swallowed-push.core.ts`, which the front matter names because a zone must exist.

**Similar instances:** `grep -l "refuse(" scripts/hooks/checks/*.core.ts` lists the refusing checks. `no-broad-kill` refused 40 times in 18 tasks (measured on PR #250) and cannot be repaired, because the hook cannot know which process the caller started.
