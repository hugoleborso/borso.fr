---
date: 2026-08-19
introduced-at: implementation
detected-at: local
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [bash, git, hooks, gates, meta]
---

# A push rejected by the pre-push gate read as a successful one for two hours

## Symptom

The command was

```bash
git push -u origin claude/… 2>&1 | tail -3
```

written that way because a successful push prints a dozen lines nobody needs.
It returned exit 0 and three lines of ordinary-looking output. Work continued on
the assumption that the branch was on the remote.

It was not. The pre-push hook had rejected it, and kept rejecting it, for two
hours.

## Root-cause chain

1. `pipefail` is off in this shell. Verified rather than assumed:
   `set -o | grep pipefail` prints `off`, and `(false | tail -1); echo $?`
   prints `0`.
2. A pipeline's exit status is therefore the **last** stage's. `tail` succeeds
   at reading whatever it was given, so the pipeline exits 0 whether the push
   succeeded or the hook refused it.
3. The refusal itself is not silent — the pre-push hook prints which gate failed.
   It prints to **stderr**. `2>&1` was present here, which should have folded it
   in, but the gate's output is long and `tail -3` is short, so the three lines
   that survived were the harmless end of it.
4. Nothing else in the loop re-checks. `git status` says the working tree is
   clean, because it is; the commits exist locally. Only `git log origin/<branch>`
   would have disagreed, and there is no reason to run it after a push that
   reported success.

The general form: **a pipeline is a status filter as well as an output filter.**
Piping a command whose exit code is the point — a push, a commit, a gate — into
anything at all discards the only thing you were checking.

## Detection failure causes

- **Success and failure look identical.** Not similar: identical. Same exit
  code, same shape of output, and the distinguishing lines are the ones `tail`
  cut.
- **The habit is a good one everywhere else.** Trimming output is right for a
  test run or a build; the reflex does not carry a warning that this command is
  different.
- **The feedback is delayed by design.** A push is fire-and-forget. Nothing
  downstream fails until CI does not run, and CI not running looks like CI being
  slow.
- **`2>&1` reads as the fix.** Folding stderr in feels like it addresses the
  problem, and it makes it worse: the refusal is now in the same stream that
  `tail` is truncating.

## Countermeasure

`.claude/hooks/pretool-no-swallowed-push.sh`, a `PreToolUse` hook on `Bash`
that refuses `git push` or `git commit` appearing anywhere in a pipeline, and
says what to write instead:

```
git push -u origin <branch>                            # bare, read the tail after
set -o pipefail; git push … 2>&1 | tail -20            # or keep the status
```

A command that already sets `pipefail` is allowed through, because there the
pipeline reports the real status and the trimming is safe.

It tells an invocation from a mention in two passes: heredoc bodies are dropped
by the existing `strip-heredocs.py`, and quoted arguments by a new sibling,
`strip-quoted-strings.py`. Only the second one makes
`echo "never write git push | tail"` legal — a commit message written as a
heredoc was already covered, a quoted one was not, and this entry's own commit
would have been refused by its own hook without it.

## Eradication

**DevX check, level 2.** The shape cannot be run; the agent is told the two
correct spellings at the moment it would have written the wrong one.

Level 1 is not reachable from here. Nothing in the harness can turn on
`pipefail` for a command the model composes, and the pipeline is legitimate
whenever the status is genuinely not the point.

Verified, all seven cases, by feeding the hook the tool-input JSON directly:

| Command | Expected | Result |
| --- | --- | --- |
| `git push -u origin main \| tail -3` | blocked | exit 2 |
| `git push --force-with-lease 2>&1 \| tail -4` | blocked | exit 2 |
| `git commit -q -m "x" \| tail -5` | blocked | exit 2 |
| `git push -u origin main` | allowed | exit 0 |
| `set -o pipefail; git push origin main \| tail -3` | allowed | exit 0 |
| `echo "do not write git push \| tail"` | allowed | exit 0 |
| `git status --short \| head` | allowed | exit 0 |

**What this deliberately does not cover.** Only `git push` and `git commit`. A
test run piped into `grep` swallows its status the same way, and blocking that
would fire on the reading habit that makes long output usable at all — a failing
suite still prints its failures into the pipe, where a rejected push prints its
refusal past it. The two are not the same risk, and a hook that cried wolf on
every `| tail` would be turned off within a day.

## See also

- [`cdk-destroy-failure-swallowed-by-trailing-or-echo`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md) — the same defect with `|| echo` instead of a pipe.
- [`the-gate-that-failed-on-a-broken-pipe`](./the-gate-that-failed-on-a-broken-pipe.md) — `pipefail` on, and the pipe failing the script that wanted it.
- [`two-guard-hooks-that-never-guarded`](./two-guard-hooks-that-never-guarded.md) — why a blocking hook has to exit 2 and not 1.
- [`broad-pkill-killed-another-agents-measurement`](./broad-pkill-killed-another-agents-measurement.md) — the sibling hook this one is modelled on.
