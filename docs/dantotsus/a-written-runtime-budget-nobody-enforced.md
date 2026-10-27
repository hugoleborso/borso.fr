---
date: 2026-10-24
introduced-at: conception
detected-at: local
severity: medium
related-pr: none (the hook grew by one reasonable check per pull request over several months; no single pull request made it slow)
fix-pr: none (the branch claude/tool-runtime-budgets carries the eradication and had no pull request when this was written)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-commit, .husky/pre-push, scripts/check-pre-commit-budget.sh, scripts/check-ci-job-timeouts.sh, .github/workflows/ci.yml]
time-to-detect: months
tags: [hooks, husky, pre-commit, runtime-budget, gates]
zone: .husky/pre-commit
weak-point: prose-stands-in-for-a-check
recurs: none (a-stale-ref-priced-a-one-line-push-at-fifty-minutes and the-gates-that-timed-each-other-out were pre-push range and load bugs; here every check ran exactly as designed and the design had no budget anyone checked)
---

# A written runtime budget nobody enforced

## Symptom

On 2026-10-24 a commit with nothing staged took 61.5 s in `.husky/pre-commit`.
A commit touching anything under `apps/` paid that, plus ESLint on its files,
plus the architecture generator, which measured 196 s on its own. Every agent
and the operator paid it on every commit, because `--no-verify` is forbidden
here, which is the right rule and the reason a slow hook is never skipped,
only waited for.

The hook's own header said the opposite was the policy:

```sh
# Pre-commit holds only checks that are cheap and that should be true of every
# single commit, so committing stays fast enough that nobody reaches for
# --no-verify. Anything that needs the whole branch in view, or that takes more
# than a second or two, lives in .husky/pre-push instead.
```

Timestamps on every line of that hook, with nothing staged:

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

## Root-cause chain

1. **Why did a no-op commit take a minute?**
   Three checks read the whole tree at about twelve seconds each, and about
   thirty more at a fraction of a second to five seconds each, all of them
   on every commit whatever it touched.
2. **Why did they run on every commit?**
   Each was added after the one before it, in the same place, in the same
   shape: a line in the hook, no condition. Each author measured their own
   check, saw that it was "a git-index read plus a grep", and wrote a comment
   saying it costs nothing. `check-pure-modules-have-callers.sh` said that
   while it ran one `grep` over the whole tree for each of about four hundred
   modules.
3. **Why did nobody notice the sum?**
   Nothing measured it. The hook printed what each check concluded and never
   what it cost, so a slow commit read as a slow machine.
4. **Why did the header's rule not stop any of them?**
   It was a comment. The next author read the checks above the line they were
   adding, not the header, and copied what they saw.

**Root cause:** we thought writing the budget at the top of the hook made it
the hook's policy, but actually a budget is a policy only when something
measures each check against it and refuses the one that exceeds it.

## Detection failure causes

- **Linter / static analysis:** nothing reads a hook for cost, and no check
  could, since cost is only visible by running it.
- **Functional validation locally:** every commit was slow, so no commit was
  slower than usual. A cost paid uniformly is invisible.
- **CI (tests / build):** CI never ran the hook. It ran the same checks as
  separate steps in a job that takes eight minutes anyway, where twelve
  seconds more is noise.
- **Code review:** each pull request added one check, and each check alone was
  defensible. The review saw the line, not the total.

## Countermeasure

- **Code:** each check in `.husky/pre-commit` now declares the paths it reads
  and runs only when the commit touches one; per-file checks get the staged
  files as arguments; the link and path checks read the staged files plus every
  file naming a path the commit removes. The three twelve-second checks are a
  single pass (`check-pure-modules-have-callers.sh`, 0.1 s on the whole tree),
  a staged-files read (`check-no-null-bytes.sh`), and a move to pre-push
  (`check-every-test-is-collected.sh`). The hook-decision table moved to
  pre-push; the architecture generator runs in CI only. Every check that left
  the commit or narrowed on it has a whole-tree run in `ci.yml`.
- **Tools:** ESLint, the generators, the tooling type check and the enforcement
  ledger first moved to pre-push too. The operator refused that: a check stays
  where it is or moves earlier, and the tool gets faster instead. oxlint,
  oxfmt and TypeScript 7 replaced ESLint, Prettier and TypeScript 5.9 for the
  checks
  ([ADR-0045](../adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md),
  [ADR-0046](../adr/0046-typescript-7-type-checks-beside-typescript-5-9.md)),
  the generators run under plain node, and all of them are back on the commit
  except the type-aware lint rules.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the hook and CI refuse a check over its budget)

**Reference:** this commit, on the branch `claude/tool-runtime-budgets`

**The actual fix:**

```diff
-echo "[pre-commit] checking no file carries a NUL byte"
-scripts/check-no-null-bytes.sh
+run_check_on_files no-null-bytes '.' scripts/check-no-null-bytes.sh
```

```sh
# every check is timed in the subshell that ran it, and the hook refuses the
# commit naming any check over its CPU budget
  if [ "$cpu_ms" -gt "$budget" ]; then
    over_budget="${over_budget}  $name used ${cpu_ms} ms of CPU (${wall_ms} ms wall) against a budget of ${budget} ms
```

- `.husky/pre-commit` measures every check and refuses the commit when one
  uses more than its budget: 300 ms of CPU, with a stated allowance for
  Prettier and per staged file.
- `scripts/check-pre-commit-budget.sh` runs the hook on a fixture commit
  touching one file of each common kind, in the `pre-commit-budget` job of
  `ci.yml`, and fails over three seconds of wall clock.
- `scripts/check-ci-job-timeouts.sh` fails a `ci.yml` job without
  `timeout-minutes: 10` or less, so the CI budget is enforced by the runner.
- [`docs/standards/14-tool-runtime-budgets.md`](../standards/14-tool-runtime-budgets.md)
  states every budget, the scope rule, and where each check's whole-tree run
  lives, and says which budgets are not gated yet.

After the change, the same hook with nothing staged takes 0.14 s, and the
fixture commit takes 1.6 s.

**Sibling defects swept:** `check-instructions-name-installed-tools.sh` and
`check-named-paths-exist.sh` piped `xargs grep` into `set -o pipefail` with no
guard, so a narrowed run with no match exited 123; both are guarded.
`knowledge-triggers.py check` started one `jq` per trigger pattern and now
tests all of them in one. `check-coupled-lists.sh` compared the knowledge index
with one `grep` per entry and the test tables with one per table. The
`gate-canaries` job carried a ninety-minute timeout, and every other `ci.yml`
job none at all.

## See also

- [`the-gates-that-timed-each-other-out.md`](./the-gates-that-timed-each-other-out.md),
  on why the pre-push gates share the machine carefully.
- [`a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md`](./a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md),
  the same kind of cost in the other hook, from a different cause.
