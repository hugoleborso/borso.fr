# 14. Tool runtime budgets

## Rule

Every tool this repository runs on itself has a runtime budget, and a tool over
its budget reads less, is replaced by a faster tool that checks the same thing,
or, as a last resort, runs later. It is never exempted.

| Stage | Budget | Measured as | Enforced by |
| --- | --- | --- | --- |
| One pre-commit check | 300 ms, plus 20 ms per touched path in its scope past the first | CPU time of the check and everything it starts | the reviewer |
| A per-file check on the commit, oxfmt included | 300 ms, plus 20 ms per staged file past the first | the same | the reviewer |
| `named-paths-exist`, which reads every staged file and every file naming a deleted one | 300 ms, plus 20 ms per staged file past the first | the same | the reviewer |
| oxlint on the commit, type-aware | 5 s, plus 1.5 s per staged file past the first | the same | the reviewer |
| The tooling type check on the commit | 2.5 s | the same | the reviewer |
| The node checks on the commit, in one process | 1 s, plus 250 ms per check past the first | the same | the reviewer |
| The whole pre-commit hook | 4 s on a typical commit | wall clock, on a machine nothing else uses | the reviewer |
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
a time. See
[the dantotsu](../dantotsus/a-written-runtime-budget-nobody-enforced.md).

From 2026-10-24 the hook timed every check and refused a commit over budget,
and a CI job timed the whole hook on a fixture commit. On 2026-10-29 the
operator removed both, with the other gates whose only subject was another
gate: the budgets stay as the target a reviewer holds a new check to, measured
by hand.

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

A check that cannot meet its budget even on one file moves, or its tool is
replaced by a faster one that checks the same thing. ESLint was the largest
case: it built a TypeScript program for the whole workspace before it read the
one staged file, 21 s for one changed file in pragma. oxlint replaced it and
oxfmt replaced Prettier
([ADR-0045](../adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md)), and
TypeScript 7 runs the type checks
([ADR-0046](../adr/0046-typescript-7-replaces-typescript-5-9.md)), so
the checks that had left the commit came back.

Three tools have a named budget rather than the 300 ms of a check, each set
from a measurement on 2026-10-27:

- **oxlint** loads its JavaScript plugins on every run and builds a
  TypeScript program of the staged files for the type-aware rules: 1.8 s of
  CPU for one script, 3.9 to 4.8 s for one pragma component or service, and
  1.1 to 1.5 s more for each further file, most of it the React Compiler that
  `eslint-plugin-react-hooks` runs on each component. Measured on a four-core
  machine other agents were also using.
- **The tooling type check** is a whole program. On four threads it took
  2.1 to 2.8 s of CPU and 0.9 s of wall time; with `--singleThreaded` it takes
  1.3 s of CPU and 1.1 s of wall time, so the hook runs it on one thread.
- **The node checks**, the whole-tree generators and the checks written in
  TypeScript (doc links, the dependency catalog, the PR template), run in one
  node process, `scripts/standards/run-node-checks.ts`, which imports each
  queued check in turn with its own arguments and keeps its own exit status.
  Eight of them took 1.4 s of CPU together, against 2.2 s as eight processes,
  because node, the TypeScript resolver and the modules they share load once.

The type-aware lint rules run on the commit too, over a TypeScript program of
the staged files only. With the program of the whole workspace, one pragma
component took 5.2 s of wall time and 12.5 s of CPU;
`scripts/lint-staged-files.sh` lints from a temporary tree in which each
touched workspace's `tsconfig.json` lists only the staged files it includes,
and runs the JavaScript plugins and tsgolint side by side, so the same file
takes about 2 s. The commit budget went from 3 s to 4 s to make room for
them, the operator's decision of 2026-10-27, recorded in
[ADR-0045](../adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md). It
was 3.5 s first; the same fixture commit on CI's runner then took 1.8 to 3.4 s
over seven runs, and 3.6 s once before the cuts described below, so a 3.5 s
budget failed on the runner's spread rather than on a slower hook.

A commit touching several components or several workspaces can still take
longer than 4 s: five pragma components took 4.2 to 4.6 s of wall time, one file in
each of four workspaces 4.6 s. The budget is for a typical commit.

## How the commit hook runs its checks

The commit hook runs on a machine shared with other agents, whose type checks,
browsers and mutation runs come and go. On that machine the same pre-push
fixture measured 55 s once and 323 s a few minutes later, so a check's budget
is measured as CPU time, which the neighbours do not move. The
checks run side by side, two per core, and their output is printed in order
once they have all finished. oxlint, the tooling type check and the node-check
process are the longest, so every other check runs at `nice` 10 and yields
most of the CPU to them. At `nice` 19 the short checks starved and finished
last, and capping the checks at one per core left the cores idle while they
waited on the disk; both measured slower. On two cores, the closest this machine gets to CI's
runner, the fixture commit took 2.4 to 2.6 s before the type-aware rules came
back to the commit.

A check triggers only on the files it reads. The tooling type check used to
run for any path under `scripts/`, so a shell script cost a second of CPU for a
compiler that never reads it; on CI's runner that pushed the fixture commit to
3.8 s.

The same rule, applied once the type-aware rules came back, measured on the
fixture commit on two cores, three runs each. The vocabulary check ran for any
edited test, though it reads only the tests a `Held by` line names; it now runs
for those. The coupled-lists check still ran for `scripts/`, `.husky/` and
`.github/`, which it stopped reading when its first section was removed. The
app-registration check started a node process per application to read one
manifest line, 200 ms of CPU, where one grep takes 50. The ledger compiled each
override's globs once per probe, 1,800 compilations, where a path that cannot
end the way a pattern does now skips it, and the blueprint index read every
source file twice. The checks beside oxlint went from 2.6 to 2.8 s of CPU to
2.0 to 2.3 s.

TypeScript checks on the commit run under plain `node` with
`scripts/typescript-resolve.mjs`, which resolves `./x` and `./x.js` to the
`.ts` file. Node 22 strips the types itself. `pnpm exec tsx` costs about a
second before the script starts, and `tsx` alone about half of one, so neither
fits in 300 ms.

## Earning the run

A budget prices one run. It cannot see that a check runs on every commit to
guard something that changes once a year, which is a cost with no matching
benefit however fast each run is. **A new check on the commit answers two
questions in writing before it lands**, with the commands that produce the
numbers rather than an impression:

```sh
# how many of the last hundred commits it would run on
git log --oneline -100 --name-only --pretty=format:%h -- '<its scope>' \
  | grep -c '^[0-9a-f]\{7,\}$'

# how many commits ever touched what it guards
git log --oneline -- '<the files it guards>' | wc -l
```

When the first number dwarfs the second by two orders of magnitude, the check
is in the wrong place. It belongs at pre-push, in CI, or at the moment its
subject is actually exercised — a deploy, a migration, a release — and the
budget it was passing was never the constraint that mattered.

The case this rule comes from: a pre-commit check guarding five identical
lines, which would have run on 100 of the last 100 commits while the four files
holding those lines changed in 15 commits across the repository's whole
history. It passed the per-check budget at 39 ms and was still the wrong
artefact. See
[`docs/dantotsus/the-check-that-cost-more-than-the-defect.md`](../dantotsus/the-check-that-cost-more-than-the-defect.md).

The rule cuts the other way too, and that is the useful half: a check that is
far too slow for the commit is fine at pre-push **if its scope is narrow enough
that it almost never runs there**. A mutation run costs minutes and runs only
for a push that changes a pure file. Cost is the product, not either factor.

## Where each check runs

| Check | On the commit | Whole tree |
| --- | --- | --- |
| oxfmt | staged files | `ci.yml`, `pnpm run format:check` |
| oxlint, every rule, type-aware ones and unused directives included | staged files, in a program of the staged files | pre-push over the changed files; `ci.yml` |
| Tooling type check | when `scripts/`, `.claude/skills/`, `eslint-rules/` or `tsconfig.json` change | `ci.yml` |
| Blueprint index, convention drift | when source changes | `ci.yml` |
| Dantotsu front matter | when the record changes or a path is removed; the staged entries only | `ci.yml` |
| Architecture maps and the other reports | not run | not run: on demand only, through `scripts/reports.sh` or by dispatching `architecture.yml` or `pages.yml` |
| Doc links | staged documents, and every document naming a removed path | `ci.yml` |
| Named paths exist | staged files, and every file naming a removed path | `ci.yml` |
| NUL bytes, package scripts, negative claims, racy pipelines, migration SQL, manifests, instruction tools | staged files only | `ci.yml` |
| Vocabulary paths | when a vocabulary changes, a path under `apps/` is removed, or a test a `Held by` line names is edited | `ci.yml` |
| Application test suites | not run | pre-push runs the tests a push affects; `ci.yml` runs every suite of each changed app in `app-tests (<app>)`, except pragma's database suites, which run in `app-tests (pragma-e2e)` and `app-tests (pragma-assistants)`, each with a Postgres of its own; `full-suite.yml` runs them all on `main` |
| Every other check in the hook | whole tree, when the commit touches its scope | `ci.yml` |

A link to a generated, gitignored report is not judged, on the commit or in
CI. Those reports are outputs built on demand, which a fresh checkout does not
have.

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
moved to pre-push and was removed on 2026-10-29.

## Measured on 2026-10-27, after the tool switch

| Run | ESLint, Prettier, TypeScript 5.9 | oxlint, oxfmt, TypeScript 7 |
| --- | --- | --- |
| `.husky/pre-commit`, nothing staged | 0.14 s | 0.12 s |
| `.husky/pre-commit`, one file of each of eight kinds, every moved check back | 1.6 s without ESLint, the tooling type check and the generators | 1.7 to 1.8 s on four cores, 2.3 to 2.6 s on two, 1.96 s on CI's runner (babc5443) |
| The same, with the type-aware rules on the commit | not run on the commit | 1.9 to 3.6 s on CI's runner over four runs of 25799631 and 53d00219; 1.9 to 3.4 s over six runs of 68cc7783, after the cuts below, three of them in a row at or under 3.0 s |
| Lint over the repository, type-aware | 256 to 454 s cold, one process per workspace | 28 to 38 s, one process |
| Format check over the repository | 43.7 s without a cache | 1.5 s |
| pragma type check | 32 s, 12 to 23 s incremental | 9.7 s cold, 4 s incremental |
| Tooling type check | 6.6 s | 1.2 s |

## What is not gated yet

- **The pre-commit budgets.** Nothing times the hook or its checks since
  2026-10-29; a reviewer measures a new check by hand.
- **The pre-push budget.** It is measured by hand on a fixture, a one-line
  change to a pragma component. With TypeScript 7 the type check of pragma is
  9.7 s cold and 4 s incremental, and the type-aware lint of the changed file
  5.6 s. A
  gate would need a CI job that installs, builds the infrastructure package and
  runs knip, the type checker, oxlint and the affected tests, which is a few
  minutes of CI per pull request to measure one minute.
- **The unit suite budget.** No application meets it. Measured on 2026-10-24
  on the shared machine, at a load average between 10 and 18 on four cores,
  `vitest run` over the unit project took from 44 s (borso-fr) to over five
  minutes (pragma and talos). Those numbers are inflated by the load, but CI's
  `app-tests` job for pragma, install and coverage included, took 339 to 471 s
  on recent pull requests, and most of each run is spent
  building the jsdom environment, not in the tests. When the assistant
  feature's OAuth and MCP suites pushed that job past ten minutes, they moved
  to a job of their own, `app-tests (pragma-assistants)`, rather than the
  limit moving. The back-e2e suite followed on pull request #222, into
  `app-tests (pragma-e2e)`, when the job ended at 9 min 58 s and the runner
  cancelled it. Pre-push already runs only
  the tests a push affects, which is what keeps it inside its own budget.
  Bringing the suites under 30 s is its own change.
- **The CI budget beyond `ci.yml`.** `full-suite.yml` runs on `main` after the
  merge and is not on a pull request's path, so it carries no ten-minute
  limit.

## Enforced by

- `reviewer` checks that a new check in `.husky/pre-commit` declares a scope
  naming everything it reads, including `^D ` when a removal can break what it
  checks, that it fits the budget in the table above, measured by hand, and
  that a check leaving the commit gets a whole-tree run in `ci.yml`.
- `reviewer` checks that a new check on the commit answers *Earning the run*
  above: how many of the last hundred commits it would fire on, against how
  many ever touched what it guards. There is no mechanical form of this — the
  numerator is computable and the denominator is a judgement about what a
  surface is for — so it is residue by construction, and
  [`docs/dantotsus/the-check-that-cost-more-than-the-defect.md`](../dantotsus/the-check-that-cost-more-than-the-defect.md)
  is the case it comes from.
