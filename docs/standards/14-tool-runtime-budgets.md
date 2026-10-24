# 14. Tool runtime budgets

## Rule

Every tool this repository runs on itself has a runtime budget, and a tool over
its budget reads less or runs later. It is never exempted.

| Stage | Budget | Measured as | Enforced by |
| --- | --- | --- | --- |
| One pre-commit check | 300 ms | CPU time of the check and everything it starts | the hook itself, on every commit |
| Prettier on the commit | 600 ms, plus 100 ms per staged file past the first | the same | the hook itself |
| A per-file check on the commit | 300 ms, plus 20 ms per staged file past the first | the same | the hook itself |
| The whole pre-commit hook | 3 s on a typical commit | wall clock, on a machine nothing else uses | CI's `pre-commit-budget` job, on a fixture commit |
| The pre-push hook | 60 s for a change confined to one application | wall clock | not gated yet; see the last section |
| CI on a pull request | 10 min | wall clock of the slowest job | `timeout-minutes: 10` on every job of `ci.yml` |
| One application's unit suite | 30 s | wall clock | not gated yet; see the last section |

"Reads less" means the check declares its scope, the paths it reads, and runs
only when the commit touches one of them. When it runs, it reads the staged
files rather than the whole tree, or the staged files plus whatever a staged
removal can break. "Runs later" means it moves to `.husky/pre-push`, scoped to
the files the push changes, or to `ci.yml`, where it reads everything.

Whatever moves keeps a whole-tree run somewhere. A check that runs on a slice
of the tree on the commit runs on all of it in CI, so a commit made with the
hook skipped, or a slice that turns out too narrow, still fails before merge.

## Reason

A slow gate gets skipped. In this repository the hooks cannot be skipped, since
`--no-verify` is forbidden, so a slow gate is paid instead, on every commit, by
every agent and by the operator. On 2026-10-24 a commit with nothing staged
took 61 s, and a commit touching a file under `apps/` also ran ESLint and the
architecture generator, which measured 196 s on its own.

The hook's own header said that anything over a second or two belongs in
pre-push. Nothing read that sentence, so every check that was added after it
went where the checks before it were, and the cost grew one reasonable check at
a time. A budget written in a comment is a wish. A budget the hook measures and
refuses is a gate. See
[the dantotsu](../dantotsus/a-written-runtime-budget-nobody-enforced.md).

The budgets are ambitious on purpose. Three seconds is short enough that a
commit never interrupts a train of thought, and sixty seconds of pre-push is
short enough to wait for rather than to walk away from.

## Example

Each check in `.husky/pre-commit` names itself, its scope, and its command:

```sh
# a whole-tree check, run when a staged path matches the scope
run_check adr-numbers-resolve '^. docs/adr/' scripts/check-adr-numbers-resolve.sh

# a per-file check, handed the staged paths that match
run_check_on_files no-null-bytes '.' scripts/check-no-null-bytes.sh

# a check that also reads what a removal breaks: `^D ` is a deleted path,
# or the old side of a rename
run_check doc-links '\.md$|^D ' \
  node --import ./scripts/typescript-resolve.mjs scripts/docs/check-doc-links.ts --staged
```

The scope is matched against one `<status> <path>` line per staged path, with a
rename split into a removal and an addition. A change to the check's own script
runs it too, without the scope saying so.

A check that cannot meet its budget even on one file moves. ESLint is the
largest case: it is type-aware, so it builds a TypeScript program for the whole
workspace before it reads the one staged file, and that took 2.8 s on a cache
hit and 21 s for one changed file in pragma. No narrowing reaches 300 ms from
there, so it runs on push.

## Why CPU time on the commit, and wall time in CI

The commit hook runs on a machine shared with other agents, whose type checks,
browsers and mutation runs come and go. On that machine the same pre-push
fixture measured 55 s once and 323 s a few minutes later. A wall-clock budget
there would refuse commits for what the neighbours are doing.

So the hook reads each check's CPU with `times`, inside the subshell that ran
it, which counts that check and everything it started and nothing else. The
checks run side by side, at most one per core, and their output is printed in
order once they have all finished.

What a person waits for is the wall-clock total, and that is only meaningful
where nothing else runs. `scripts/check-pre-commit-budget.sh` copies the tree,
makes a commit touching one file of each common kind (a component, an API
source, a test, a manifest, a knowledge entry, a skill, a shell script and a
workflow), runs the hook on it, and fails when the hook refuses the commit or
takes longer than three seconds.

TypeScript checks on the commit run under plain `node` with
`scripts/typescript-resolve.mjs`, which resolves `./x` and `./x.js` to the
`.ts` file. Node 22 strips the types itself. `pnpm exec tsx` costs about a
second before the script starts, and `tsx` alone about half of one, so neither
fits in 300 ms.

## Where each check runs

| Check | On the commit | Whole tree |
| --- | --- | --- |
| Prettier | staged files | `ci.yml`, `pnpm run format:check` |
| ESLint | not run | pre-push over the changed files; `ci.yml` |
| Tooling type check | not run | pre-push when `scripts/`, `.claude/skills/`, `eslint-rules/` or `tsconfig.json` change; `ci.yml` |
| Blueprint index and context, convention drift | not run | pre-push when source changes; `ci.yml` |
| Blueprint defects | not run | pre-push; `ci.yml` |
| Dantotsu front matter, weak points, working conditions | not run | pre-push when the record changes or a path is removed; `ci.yml` |
| Enforcement ledger | not run | pre-push when a standard or a mechanism changes; `ci.yml` |
| Architecture maps | not run | `ci.yml` and `architecture.yml` only: 196 s is past the push budget too |
| Every test is collected | not run | pre-push for the workspaces whose tests or config change; `ci.yml` |
| Hook decisions | not run | pre-push when a hook changes; `ci.yml` |
| Doc links | staged documents, and every document naming a removed path | `ci.yml`, after the generators run |
| Named paths exist | staged files, and every file naming a removed path | `ci.yml` |
| NUL bytes, package scripts, negative claims, racy pipelines, migration SQL, manifests, instruction tools | staged files only | `ci.yml` |
| Every other check in the hook | whole tree, when the commit touches its scope | `ci.yml` |

A link the commit makes to a generated, gitignored report is judged in CI and
not on the commit. Those reports are outputs that a fresh checkout does not
have, and building them on the commit is what made the hook regenerate every
report after a clone. CI builds them first and then checks every link.

## Measured on 2026-10-24

| Run | Before | After |
| --- | --- | --- |
| `.husky/pre-commit`, nothing staged | 61.5 s | 0.14 s |
| `.husky/pre-commit`, one file of each of eight kinds | not measured; at least 61.5 s plus ESLint, which alone took 21 s for one pragma file | 1.6 s |
| `.husky/pre-push`, one pragma component changed, warm caches | 59 s | 55 s |

The before column comes from timestamps on every line of the old hook. The
slowest checks were `check-every-test-is-collected.sh` at 13.1 s,
`check-pure-modules-have-callers.sh` at 12.6 s and `check-no-null-bytes.sh` at
12.4 s. The second now asks its question in one pass over the source and takes
0.1 s on the whole tree; the third reads only the staged files; the first
moved to pre-push.

## What is not gated yet

- **The pre-push budget.** It is measured by hand on a fixture, a one-line
  change to a pragma component. The type check of pragma alone is 38 to 47 s
  on a quiet machine, so the hook starts it first, and the app type checks are
  incremental, which brings a repeat run of pragma's down to 12 to 23 s. A
  gate would need a CI job that installs, builds the infrastructure package and
  runs knip, the type checker, ESLint and the affected tests, which is a few
  minutes of CI per pull request to measure one minute.
- **The unit suite budget.** No application meets it. Measured on 2026-10-24
  on the shared machine, at a load average between 10 and 18 on four cores,
  `vitest run` over the unit project took from 44 s (borso-fr) to over five
  minutes (pragma and talos). Those numbers are inflated by the load, but CI's
  `app-tests` job for pragma, install and coverage included, took 339 to 471 s
  on recent pull requests, and most of each run is spent
  building the jsdom environment, not in the tests. Pre-push already runs only
  the tests a push affects, which is what keeps it inside its own budget.
  Bringing the suites under 30 s is its own change.
- **The CI budget beyond `ci.yml`.** `full-suite.yml` runs on `main` after the
  merge and is not on a pull request's path, so it carries no ten-minute
  limit.

## Enforced by

- `script:scripts/check-pre-commit-budget.sh` runs the pre-commit hook on a
  fixture commit touching one file of every common kind, and fails when the
  hook refuses it, which includes any check over its CPU budget, or when the
  hook takes longer than three seconds. It runs in the `pre-commit-budget` job
  of `ci.yml`.
- `script:scripts/check-ci-job-timeouts.sh` fails a job in `ci.yml` that
  declares no `timeout-minutes`, which GitHub reads as six hours, or one over
  ten. A job that cannot outlive the budget is the budget, enforced by the
  runner.
- `reviewer` checks that a new check in `.husky/pre-commit` declares a scope
  naming everything it reads, including `^D ` when a removal can break what it
  checks, and that a check leaving the commit gets a whole-tree run in `ci.yml`.
