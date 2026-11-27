---
date: 2026-08-21
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#81'
fix-commits: [caeb858e41]
eradication-level: 5
eradication-paths: [docs/knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md]
time-to-detect: one push, the first docs-only one after the defect shipped
tags: [shell, hooks, pre-commit, gates, ci, stryker, mutation]
zone: .husky/pre-push
weak-point: gate-measures-nothing
recurs: [a-sed-delimiter-disarmed-the-mutation-gate]
---

# `grep -c` prints its zero and then fails

## User impact

Every push whose diff touches no application died in the hook, before the
first gate finished:

```
[pre-push] gating 1 changed file(s) — range: this push
[pre-push] start: knip
.husky/pre-push: 207: arithmetic expression: expecting EOF: " 0
0 + 2 "
husky - pre-push script failed (code 2)
```

The kaizen pull request for PR #81 is the first docs-only push after the
defect shipped, so the loop's own follow-up is what found it.

## Causal chain

- Every push whose diff touched no application died in the hook with `arithmetic expression: expecting EOF: " 0\n0 + 2 "`.
  - The arithmetic received two lines, because `$(echo "$changed_app_slugs" | grep -c . || echo 0)` produced `0\n0`.
    - `grep -c` prints its count and then exits 1 when the count is zero. The `0` went to stdout, the exit status fired `|| echo 0`, and the fallback appended a second `0` to the same substitution.
      - The faulty line, from commit `7d63cb5aa` (2026-08-20, an agent sharing the machine between mutation runs, PR #81):

        ```sh
        BORSO_MUTATION_RUNS_IN_FLIGHT=$(( $(echo "$changed_app_slugs" | grep -c . || echo 0) + 2 ))
        ```

        - The agent added `|| echo 0` because the hook runs under `set -e`. The file's own comment six lines below says "a failing command substitution inside an assignment aborts the hook under `set -e`".
  - Branch for the merge. `changed_app_slugs` was non-empty on every push of PR #81, which changed all four applications. `grep -c .` matched and exited 0, so the fallback never ran on the branch.

## Root cause of occurrence

*Thought `cmd || fallback` supplies a value when `cmd` fails, actually `grep -c` fails while succeeding at printing, so the fallback does not replace the output, it appends to it.* (Material)

The agent knew the `set -e` trap, since it wrote around it. What its context lacked was `grep`'s exit status contract. `grep --help` (GNU grep, read this session): "Exit status is 0 if any line is selected, 1 otherwise". Under `-c` the count is printed either way. One more why lands on Machine. The gate was shell, where a count is text and a guard must print, and no test ran the hook on a push with no application.

## Detection failure causes

- **Typing / linter:** `.husky/pre-push` is shell. `actionlint` covers
  workflows, not hooks.
- **Functional validation locally:** every push during PR #81 carried
  application changes, which is the branch of the condition that works.
- **CI:** the hook runs before the push, so CI never sees the failure. It
  sees no push at all.
- **Code review:** `|| echo 0` on a counter reads as ordinary defensive shell.
  It is the correct idiom for almost every other command.

## Countermeasure

Take the status without touching the output, and give the arithmetic a
default of its own:

```sh
changed_app_count=$(printf '%s\n' "$changed_app_slugs" | grep -c . || true)
BORSO_MUTATION_RUNS_IN_FLIGHT=$(( ${changed_app_count:-0} + 2 ))
```

`|| true` swallows the exit status and prints nothing, so the substitution is
exactly what `grep` printed. Verified across the three shapes: no app changed
→ `2` runs in flight, one app → `3`, two apps → `4`.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `caeb858e4` replaced the fallback with `|| true` and a `${changed_app_count:-0}` default. Commit `e51cfdd5a` (PR #173) later removed the counter from `.husky/pre-push` entirely, when the mutation runs moved to after every other gate, one at a time.

The instance cannot recur, because the line is gone. The class can. Nothing refuses a printing fallback after a command that prints on failure, such as `grep -c`, `wc -l` on a failed pipeline or `find … | wc -l`. What holds is [`the-shell-gates-are-only-ever-run-where-they-pass.md`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md), a knowledge entry whose `triggers:` fire on `.husky/*` and `scripts/check-*.sh`. It tells the next editor to plant the defect and run the gate on the branch that fails.

**Proposed:** move gate logic out of shell into tested TypeScript, as `scripts/hooks/checks/*.core.ts` already does for the Claude Code hooks, each with a sibling `.core.test.ts` at 100% coverage. A count there is a number, so a fallback cannot append to it, and the coverage gate refuses a branch, such as the push with no application, that no test runs. `git ls-files '*.sh' | wc -l` counts 55 tracked shell files on 2026-11-27.

**Similar instances:** `git grep -n -E '\|\| *echo 0' -- '*.sh' .husky` finds one line on 2026-11-27, `scripts/check-branch-context.sh:63`, `git rev-list --count … || echo 0`. `git rev-list` prints nothing on stdout when it fails, so that fallback does not append. `.husky/pre-push` uses `grep -cE … || true` for its remaining count.

Related: [`a-timeout-under-parallel-gates-is-not-a-regression.md`](../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md), why `BORSO_MUTATION_RUNS_IN_FLIGHT` existed.
