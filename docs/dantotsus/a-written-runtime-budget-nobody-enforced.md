---
date: 2026-10-24
introduced-at: conception
detected-at: local
severity: medium
related-pr: none (the hook grew by one reasonable check per pull request over several months; no single pull request made it slow)
fix-commits: [self]
eradication-level: 5
eradication-paths: [.husky/pre-commit, docs/standards/14-tool-runtime-budgets.md]
time-to-detect: months
tags: [hooks, husky, pre-commit, runtime-budget, gates]
zone: .husky/pre-commit
weak-point: prose-stands-in-for-a-check
recurs: none (a-stale-ref-priced-a-one-line-push-at-fifty-minutes and the-gates-that-timed-each-other-out were pre-push range and load bugs; here every check ran exactly as designed and the design had no budget anyone checked)
---

# A written runtime budget nobody enforced

## User impact

Every agent and the operator wait on `.husky/pre-commit` at every commit,
because `--no-verify` is forbidden here.

| | Seen | Expected |
| --- | --- | --- |
| A commit with nothing staged, 2026-10-24 | 61.5 s in the hook | "a second or two", the hook header's own rule |
| A commit touching `apps/` | 61.5 s, plus ESLint on its files, plus the architecture generator at 196 s alone | the same few seconds |

The hook's header stated the expected column:

```sh
# Pre-commit holds only checks that are cheap and that should be true of every
# single commit, so committing stays fast enough that nobody reaches for
# --no-verify. Anything that needs the whole branch in view, or that takes more
# than a second or two, lives in .husky/pre-push instead.
```

<details>
<summary>Timestamps on every line of the hook, nothing staged (measured 2026-10-24)</summary>

| Check | Time |
| --- | --- |
| `check-every-test-is-collected.sh` | 13.1 s |
| `check-pure-modules-have-callers.sh` | 12.6 s |
| `check-no-null-bytes.sh` | 12.4 s |
| `check-hook-decisions.sh` | 4.9 s |
| `check-doc-links.ts` | 3.3 s |
| `check-dependency-catalog.ts` | 2.7 s |
| `check-named-paths-exist.sh` | 2.1 s |
| 28 others | 10.2 s |

</details>

## Causal chain

- A commit with nothing staged took 61.5 s.
  - Three checks read the whole tree at about twelve seconds each, and about
    thirty more ran at up to five seconds each, all on every commit.
    - Each was added as one unconditional line in the hook, the same shape as
      the line above it:

      ```sh
      echo "[pre-commit] checking no file carries a NUL byte"
      scripts/check-no-null-bytes.sh   # ❌ whole tree, every commit, no scope
      ```

      - Each author measured their own check, saw "a git-index read plus a
        grep", and wrote a comment saying it costs nothing.
        `check-pure-modules-have-callers.sh` said that while it ran one `grep`
        over the whole tree for each of about four hundred modules.
        - The only statement of a budget was the header comment. The hook
          printed what each check concluded and never what it cost, and the
          next author copied the lines above the one they added (Method).

## Root cause of occurrence

*Whoever wrote the header thought writing the budget at the top of the hook
made it the hook's policy, actually a budget is a policy only when something
measures each check against it and refuses the one that exceeds it.* (Method)

The process for adding a check was "add a line where the others are". The
budget lived in prose beside that process and no step of it read the budget.
So each author followed the process correctly and the sum grew.

## Detection failure causes

- **Linter:** nothing reads a hook for cost, and cost is only visible by
  running it.
- **Local:** every commit was slow, so none was slower than usual. A cost paid
  uniformly is invisible.
- **CI:** CI never ran the hook. It ran the same checks as separate steps in a
  job that took eight minutes anyway, where twelve seconds more is noise.
- **Review:** each pull request added one defensible check. The review saw the
  line, not the total.

## Countermeasure

Each check in `.husky/pre-commit` declares the paths it reads and runs only
when the commit touches one. Per-file checks get the staged files as
arguments. The three twelve-second checks became a single pass
(`check-pure-modules-have-callers.sh`, 0.1 s on the whole tree), a staged-files
read (`check-no-null-bytes.sh`), and a move to pre-push. Every check that
narrowed on the commit kept a whole-tree run in `ci.yml`.

```diff
-echo "[pre-commit] checking no file carries a NUL byte"
-scripts/check-no-null-bytes.sh
+run_check_on_files no-null-bytes '.' scripts/check-no-null-bytes.sh
```

The operator refused moving ESLint, the generators and the tooling type check
to pre-push: a check stays or moves earlier, and the tool gets faster. oxlint,
oxfmt and TypeScript 7 replaced ESLint, Prettier and TypeScript 5.9
([ADR-2026-10-27T2320](../adr/2026-10-27T2320-oxlint-and-oxfmt-replace-eslint-and-prettier.md),
[ADR-2026-10-27T2321](../adr/2026-10-27T2321-typescript-7-replaces-typescript-5-9.md)).
After the change, the same hook with nothing staged took 0.14 s (measured).

## Eradication

**Type:** knowledge (level 5)

**Reference:** the commit adding this file shipped three gates: a CPU budget
per check inside `.husky/pre-commit`, `scripts/check-pre-commit-budget.sh` in a
`pre-commit-budget` CI job, and `scripts/check-ci-job-timeouts.sh`. Commit
`c54e32da7` (#224, 2026-10-29) removed all three by operator decision. Its
message lists *"ci-job-timeouts, the pre-commit CPU budgets and their CI job"*
among the harness checks cut to lower the cost of a feature.

What holds today:

- The path scoping in `.husky/pre-commit`. A check written with `run_check` or
  `run_check_on_files` must name its scope, and the lines a new author copies
  are now those. A plain unscoped line is still accepted.
- [`docs/standards/14-tool-runtime-budgets.md`](../standards/14-tool-runtime-budgets.md)
  states every budget. Its table names *"the reviewer"* as the enforcer of each
  pre-commit budget. That is the written policy this entry is about, so the
  level is 5.
- `timeout-minutes` on the `ci.yml` jobs is now kept by hand. The `mutation`
  job carries `timeout-minutes: 60` against the standard's 10.

**Proposed:** if the operator wants the budget held again, add one step to an
existing `ci.yml` job, with no new job, that times `.husky/pre-commit` on a
fixture commit touching one file of each common kind and fails over the
standard's 4 s. A check added without a scope, or one that reads the whole
tree, would then fail the pull request that adds it. This reverses part of an
operator decision, so it is his call.

**Proposed, a shape gate:** this leaves the operator's decision on budgets
untouched. A check refuses any top-level line of `.husky/pre-commit` that calls
`scripts/` outside the wrappers `run_check`, `run_check_on_files`,
`run_with_files` and `queue_node_check`. Every check call in the hook today
sits on a continuation line of one of those (`grep -n "scripts/" .husky/pre-commit`).
The only other calls are `scripts/ensure-installed.sh pre-commit` at line 22,
which installs rather than checks, and the bodies of the helper functions
`run_oxfmt`, `run_oxlint` and `run_node_checks`, so the gate exempts function
bodies and that one setup line. An unscoped whole-tree check, the exact shape
of this defect, could then not be committed (level 2), with no timing fixture.

**Proof it can fail:** none today, since no gate remains.

**Similar instances:** `git grep -n "timeout-minutes" .github/workflows/ci.yml`
shows the CI budget kept by hand. The pre-push hook and each application's unit
suite are marked *"not gated yet"* in the standard itself.
