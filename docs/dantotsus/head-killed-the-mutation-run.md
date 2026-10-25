---
date: 2026-10-25
introduced-at: self-validation
detected-at: local
severity: medium
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/hooks/pretool-no-swallowed-push.sh, plugins/borso-harness/scripts/check-hook-decisions.sh]
time-to-detect: minutes
tags: [hooks, harness, stryker, mutation, gates]
zone: plugins/borso-harness/hooks/pretool-no-swallowed-push.sh
recurs: [a-push-that-failed-and-reported-success]
---

# head killed the mutation run

## Symptom

On PR #193 a fix agent ran Stryker with its output piped into `head` to keep
the transcript short, and read the result as a finished mutation gate. It was
not finished: the run had been killed part way, with no error and no score.

## Root-cause chain

1. **Why did it stop?** `head` exits once it has printed its lines. Stryker's
   next write to the closed pipe ends it on a broken pipe.
2. **Why did nothing say so?** Without `pipefail` the pipeline reports
   `head`'s status, 0. With it, the status is the killed run's, which is still
   not a score.
3. **Why did the existing guard not stop it?** `pretool-no-swallowed-push.sh`
   refuses the same shape for `git push` and `git commit`, whose status is what
   matters; for a mutation run the output itself is lost, and the hook had no
   rule for it.

**Root cause:** thought `| head` shortens a long run's output, actually it ends
the run once it has its lines.

## Detection failure causes

- **Pre-commit / hooks:** the swallowed-status guard covered git only.

## Countermeasure

- **Code:** the hook refuses `stryker run …` or `… test:mutation …` piped into
  `head`, with or without `pipefail`, and prints the form that keeps the run:
  write the log to a file, then `tail` it.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2).

**Reference:** the commit that adds this file.

**The actual fix:**

```diff
+if grep -qE '(stryker[[:space:]]+run|test:mutation)([[:space:]][^|]*)?\|[[:space:]]*head([[:space:]]|$)' <<<"$PIPELINES"; then
+  echo "[no-swallowed-push] a mutation run piped into head is killed once head has its lines," >&2
+  …
+  exit 2
+fi
```

with two block rows and two allow rows in the decision table.

**Sibling defects swept:** the git half of the hook fired 15 times in the same
session. Those refusals were the guard working; their cause, commits that ran
past two minutes and so got piped into `tail`, is the subject of PR #197.

## See also

- [`a-push-that-failed-and-reported-success.md`](./a-push-that-failed-and-reported-success.md)
