---
date: 2026-08-08
introduced-at: conception
detected-at: measurement
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 2
time-to-detect: months
tags: [gates, ci, testing, coverage, mutation, process]
---

# Four gates reported success while measuring nothing

## Symptom

Four independent checks in this repository were green, or silent, while
enforcing nothing. They were found within a few hours of each other, by
measuring rather than by reading.

| Gate | What it looked like | What it did |
|------|---------------------|-------------|
| Per-file 100% coverage on pure files | A coverage table printed on every run | Thresholds sat inside a `vitest.workspace.ts` project entry, which Vitest 4 ignores. Nothing was asserted. |
| The same gate, in CI | `test:core` passing | The script never passed `--coverage`. |
| Mutation testing at zero survivors | A task reporting `exit code 0` | The command was piped through `tail`, so the shell reported the pager's status. Stryker had exited 1. |
| Preview auto-seed | A green deploy | `last-loop-lepin` requires a `fixture` query parameter. The step posted without one, took a 400, and emitted a `::warning::`. |

A fifth belongs with them: `apps/pragma` appeared in no CI workflow at all. Its
609 tests had never gated a pull request.

## Root-cause chain

Each has its own mechanism, and they are worth reading together because the
mechanisms differ and the shape does not.

1. **Configuration in a place the tool does not read.** Vitest 4 takes
   `coverage` from the root config only. A block inside a project entry is
   accepted, ignored, and warned about nowhere.
2. **A flag on the wrong script.** `--coverage` was on `test:coverage`, which
   needs a live Postgres; CI ran `test:core`, which did not have it.
3. **An exit code destroyed in transit.** `stryker run | tail -60` reports
   `tail`'s status. The last line of the output said "setting exit code to 1",
   and the harness said the task succeeded.
4. **A failure severity that nobody acts on.** `::warning::` in a green run is
   invisible. The seed had been failing since the endpoint was written.
5. **A job that was never added.** Nothing enforces that every workspace appears
   in a workflow, so one never did.

The common factor is not carelessness about the mechanism. It is that in every
case **the gate was verified by reading it rather than by breaking something.**
The config said `thresholds: { perFile: true, statements: 100 }`, which is what
a working gate looks like. The run printed per-file percentages, which is what a
working gate produces. The task said exit 0. None of that is evidence.

## Detection failure causes

- **Documentation asserted the gates as fact.** CLAUDE.md and two standards
  state that pure files ship at 100% and that the runner enforces it. Once a
  document says a thing is enforced, the next reader inherits the claim instead
  of testing it. Three of these gates were described in prose more carefully
  than they were wired.
- **Output was mistaken for enforcement.** A coverage table, a mutation score
  table, and a seed response were all printed and read. Printing a number is not
  asserting it.
- **The one honest signal was a warning.** The seed step said exactly what was
  wrong, in the log, on every deploy, for months. Severity below "error" in a
  green run is severity zero.

## Countermeasure

Each gate was fixed in its own way — coverage moved to the root config,
`--coverage` added to `test:core`, `pragma` added to `app-tests` with its own
Postgres, the seed given its query parameter and promoted from `::warning::` to
`::error::` with a non-zero exit.

The countermeasure that generalises is the verification method, and it was
applied to each fix before it was committed:

- **Coverage**: an unreachable branch was injected into one pure file per app
  and the exact CI command run. Every test passed and the command exited 1.
  Both injections reverted.
- **Seed**: both endpoints were called against the live previews and returned
  200 with their fixture payloads, then the workflow was run and its jobs
  checked.
- **Mutation**: the run is no longer piped.

## Eradication

**Level 2 — DevX checks that catch the misconception.** The coverage gate now
fails on a real regression, proven by causing one. The seed fails the job rather
than warning. `pragma` runs.

Level 1 is not reached, and it is worth saying why rather than claiming it. A
structural fix would be a meta-check asserting that every declared gate actually
fails on a planted defect — a mutation test for the gates themselves. That is
buildable and it is not built here.

## What to check next time

**Break it and watch it fail.** Before trusting any gate, cause the failure it
claims to catch and confirm a non-zero exit. This is the whole lesson and it
would have caught all four.

Three specific traps, all live in this repository:

- In Vitest 4, `coverage` is root-config-only. A `coverage` key inside a project
  entry is silently inert.
- Piping a command through `tail`, `head` or `grep` replaces its exit code. Use
  `set -o pipefail`, or redirect to a file and read the file.
- `::warning::` in GitHub Actions is a line nobody reads in a green run. If the
  condition means the artefact is broken, it is `::error::` and a non-zero exit.

And a habit: when a gate has never failed, that is not evidence it works.
