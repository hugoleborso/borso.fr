---
date: 2026-10-27
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#197'
fix-commits: [79be245e0, c54e32da7]
eradication-level: 5
eradication-paths: [docs/standards/14-tool-runtime-budgets.md]
time-to-detect: hours
tags: [ci, gates, pre-commit, runtime-budget, agents]
zone: .github/workflows
recurs: none (a-written-runtime-budget-nobody-enforced had no measurement at all; this one measured once and read the runner's noise as the hook's cost)
---

# One sample could not tell the hook from the runner

## User impact

The operator saw a CI job go red and green on the same commit of PR #197. The
branch spent five rounds cutting CPU to win back 200 ms, and he finally raised
the commit budget to 4 s.

| | Seen | Expected |
| --- | --- | --- |
| `pre-commit-budget`, run 933, commit `53d00219` | "the hook took 3553 ms on the fixture commit, over the 3500 ms budget" | the same verdict on every run of one commit |
| Reruns of one commit | 2732, 2274 and 2427 ms | one figure, within noise of the others |

Measured from the CI runs by the first version of this entry. Standard 14
records 1.8 to 3.6 s for the same fixture across runs.

## Causal chain

- The job failed and passed on the same commit.
  - `scripts/check-pre-commit-budget.sh` timed the hook once and judged that
    one wall-clock figure:

    ```bash
    started_ms=$(wall_clock_ms)
    (cd "$workspace" && … sh -e .husky/pre-commit)
    elapsed_ms=$(($(wall_clock_ms) - started_ms))
    if [ "$elapsed_ms" -gt "$TOTAL_BUDGET_MS" ]; then   ← ❌ one run's host speed judged as the hook's cost
    ```

    - One run varied by a factor of two. Every check's CPU moved by the same
      factor between runs, shell checks the commit did not touch included. A
      slower host slows every check alike.
      - The script was written in PR #197 (squashed into `9dcf74547`). The same
        PR wrote standard 14, which measures each local check in CPU time
        because the shared sandbox is noisy. For the CI job it chose wall time
        on a hosted runner (Man).
  - A subagent pushed, listed every local gate it had run, reported "Nothing
    is failing", and the job was red on that push. This job measured the
    runner's wall clock, which no local gate measures.

## Root cause of occurrence

*Thought a hosted runner is a quiet machine, so its wall time measures the
hook, actually GitHub's hosted runners share hardware, so the figure is the
hook times that host's speed at that minute.* (Man)

The uniform factor across every check's CPU is the evidence: a slower hook
would slow the checks it changed, not all of them. The same PR wrote the CPU
rule for the noisy sandbox, so the principle was in the agent's own work. The
prior that CI is a dedicated machine won for the CI job (inferred). A median of
three, the first countermeasure, still judged the same host's speed.

## Detection failure causes

- **Local validation:** a four-core sandbox ran the fixture in 1.7 to 1.9 s,
  far from the runner's spread, so local runs never showed it.
- **CI:** the job was itself the detector. It reported noise as often as
  regressions, and nothing told the two apart.
- **Review:** the budget was set from local figures, 1.6 s on the sandbox,
  before anyone had a second runner figure to compare.

## Countermeasure

Commit `79be245e0` made the script run the hook three times and judge the
median: 2175, 2122 and 2080 ms here, median 2122 ms. The pre-push reminder on
`claude/*` branches also began saying that CI has not run on the pushed sha
and that some jobs measure what no local gate can.

## Eradication

**Type:** knowledge (level 5). The gate was subtracted.

**Reference:** commit [`c54e32da7`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7)
(2026-10-29) deleted `scripts/check-pre-commit-budget.sh` and its CI job, with
the other gates whose only subject was another gate. `ls
scripts/check-pre-commit-budget.sh` finds nothing. Standard 14 now records it:
"From 2026-10-24 the hook timed every check and refused a commit over budget,
and a CI job timed the whole hook on a fixture commit. On 2026-10-29 the
operator removed both". Its budget table measures every check as "CPU time of
the check and everything it starts", enforced by "the reviewer".

No gate times anything on a shared host now, so none can read the host's speed
as the hook's. The first version of this entry cited the deleted script at
level 2. A budget a reviewer measures by hand is level 5.

**Proof it can fail:** not applicable. The mechanism is a deletion.

**Similar instances:** `grep -rn 'date +%s\|wall_clock\|performance.now' .github/workflows scripts | grep -v test`
finds one, a date in `scripts/check-negative-claims-are-dated.sh`, which
times nothing. Standard 14 also keeps the pre-push budget out of any
gate, because the same fixture measured 55 s once and 323 s a few minutes later
on the shared sandbox.
