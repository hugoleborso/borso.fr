---
date: 2026-10-27
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#197'
fix-pr: none (the kaizen pull request for PR #197 that adds this file)
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-pre-commit-budget.sh, .husky/pre-push]
time-to-detect: hours
tags: [ci, gates, pre-commit, runtime-budget, agents]
zone: .husky/pre-commit
recurs: none (a-written-runtime-budget-nobody-enforced had no measurement at all; this one measured once and read the runner's noise as the hook's cost)
---

# One sample could not tell the hook from the runner

## Symptom

CI's `pre-commit-budget` job times `.husky/pre-commit` on a fixture commit. On
PR #197 it went red and green on the same commit:

- run 933, commit `53d00219`: `the hook took 3553 ms on the fixture commit,
  over the 3500 ms budget`;
- the same fixture read 2732 ms, then 2274 and 2427 ms on reruns of one
  commit, and 1.8 to 3.6 s across the runs standard 14 records;
- every check's CPU moved by the same factor between runs, shell checks the
  commit did not touch included.

The branch went through five rounds of cutting CPU and changing the hook's
scheduling to win back 200 ms of margin, and the operator finally raised the
budget to 4 s. Separately, a subagent pushed, listed every gate it had run
locally, reported "Nothing is failing", and the job was red on that push.

## Root-cause chain

1. **Why did the same commit pass and fail?** The script ran the hook once
   and judged that one wall-clock time.
2. **Why does one run vary by a factor of two?** GitHub's hosted runners
   share hardware. A slower host slows every check alike, which is what the
   uniform CPU factor shows.
3. **Why was one sample taken?** The script was written to replace a budget
   nobody measured, and a single measurement on a quiet machine was the step
   up from none. Nobody had seen the runner's spread yet.
4. **Why did the agent report nothing failing?** It had run every local
   gate, and they all passed. This job measures the runner's wall clock, and
   there is no local equivalent: the shared sandbox is noisier still, which is
   why standard 14 keeps the commit hook on CPU time locally.

**Root cause:** thought one timed run on CI's runner measures the hook;
actually it measures the hook times that host's speed at that minute, and a
single sample cannot separate the two.

## Detection failure causes

- **Functional validation locally:** a four-core sandbox ran the fixture in
  1.7 to 1.9 s, far from the runner's spread.
- **CI (tests / build):** the job itself was the detector, and it detected
  noise as often as regressions.
- **Code review:** the budget was set from local figures, 1.6 s for the same
  fixture on the sandbox, before anyone had a second runner figure to compare.

## Countermeasure

- **Code:** `scripts/check-pre-commit-budget.sh` runs the hook three times on
  the fixture and judges the median. One disturbed run no longer fails the
  job, and a hook that is slow twice in three still does. The hook writes
  nothing between runs, so each run does the same work. Measured here: 2175,
  2122 and 2080 ms, median 2122 ms. The job costs two more hook runs, about
  5 s of a ten-minute budget.
- **Code:** the pre-push reminder on `claude/*` branches now also says that
  CI has not run on the pushed sha, that some of its jobs measure what no
  local gate can, and to call the branch passing only once its checks are
  green.

Property that changes: the budget now holds for the median run, not for the
one run CI happened to take. A hook whose typical run fits 4 s but whose
worst run on a slow host does not now passes.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gate measures what it claims to)

**Reference:** commit `self` (this entry ships with it)

**The actual fix:**

```diff
-started_ms=$(wall_clock_ms)
-(cd "$workspace" && … sh -e .husky/pre-commit)
-elapsed_ms=$(($(wall_clock_ms) - started_ms))
-if [ "$elapsed_ms" -gt "$TOTAL_BUDGET_MS" ]; then
+SAMPLES=3
+for sample in $(seq 1 "$SAMPLES"); do
+  … sh -e .husky/pre-commit …
+  samples_ms+=("$elapsed_ms")
+done
+median_ms=$(printf '%s\n' "${samples_ms[@]}" | sort -n | sed -n "$(((SAMPLES + 1) / 2))p")
+if [ "$median_ms" -gt "$TOTAL_BUDGET_MS" ]; then
```

The canary that plants a check spending a second of CPU still fails the job:
the hook refuses that commit on the first run, before any timing is judged.

**Sibling defects swept:** standard 14 describes the median in its fixture
paragraph and its *Enforced by* bullet. The pre-push timings that swung from
55 s to 323 s on the shared sandbox are the same class of noise, and standard
14 already keeps every local budget on CPU time for that reason.

## See also

- [`a-written-runtime-budget-nobody-enforced.md`](./a-written-runtime-budget-nobody-enforced.md), which created the job.
- [`pushed-without-reading-pr-review-comments.md`](./pushed-without-reading-pr-review-comments.md), the reminder this one joins.
