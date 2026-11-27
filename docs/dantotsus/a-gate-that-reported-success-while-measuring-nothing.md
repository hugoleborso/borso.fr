---
date: 2026-08-08
introduced-at: conception
detected-at: local
severity: high
related-pr: '#40'
fix-commits: [0bf0ad517b]
eradication-level: 2
eradication-paths: [.github/workflows/ci.yml, apps/last-loop-lepin/vitest.config.ts, .github/workflows/preview.yml]
time-to-detect: months
tags: [gates, ci, testing, coverage, mutation, process]
zone: .github/workflows/ci.yml
weak-point: gate-measures-nothing
recurs: [per-file-coverage-gate-was-never-armed]
---

# Four gates reported success while measuring nothing

## User impact

Every pull request was merged behind four checks that were green, or silent, while enforcing nothing. They were found within a few hours of each other on PR #40, by measuring.

| Gate | Seen | Expected |
| --- | --- | --- |
| Per-file 100% coverage on pure files | A coverage table on every run, and a pass | A failure when a pure file is under 100% |
| The same gate in CI | `test:core` passing | The same failure in CI |
| Mutation testing at zero survivors | A task reporting `exit code 0` | Exit 1, which Stryker had returned |
| Preview auto-seed of `last-loop-lepin` | A green deploy with a `::warning::` | A failed job, because every seed took a 400 |

`apps/pragma` also appeared in no CI workflow. Its 609 tests had never gated a pull request (measured on PR #40).

## Causal chain

- A pure file under 100% coverage passed locally.
  - Vitest asserted no threshold, and warned about nothing.
    - The thresholds sat inside a project entry of `apps/last-loop-lepin/vitest.workspace.ts`. Vitest reads `coverage` from the root config only:

      ```ts
      coverage: {
        thresholds: { perFile: true, ...COVERAGE_THRESHOLDS },   // ← inside a project entry, never read
      ```

      - An agent wrote this in 5b2643aaa, "scaffold workspace + pure helpers at 100% coverage". It read the printed per-file table as the proof (inferred from the commit title, which claims the 100% the gate never checked).
        - The gate shipped after its config and its output were read, and was never run against a planted defect (Method).
- The same gate passed in CI.
  - `--coverage` was on `test:coverage`, which needs a live Postgres. CI ran `test:core`, which had no `--coverage`.
    - The change shipped after a green CI run was read, with no uncovered file planted to see it fail (Method).
- A mutation run with survivors reported exit 0.
  - The command was `stryker run | tail -60`, so the shell reported `tail`'s status. Stryker's last line said "setting exit code to 1".
    - The task's exit 0 was read as the result, and no run with a known survivor was checked (Method).
- The preview seed of `last-loop-lepin` failed on every deploy, and the deploy stayed green.
  - The step posted without the `fixture` query parameter the endpoint requires, took a 400, and emitted `::warning::`.
    - The step shipped after a green deploy was read, and its seed response was never checked against a failing call (Method).

## Root cause of occurrence

*Thought a gate whose config reads right and whose run prints the right numbers is enforcing. Actually a gate is proven only by a defect it refuses, and each of these accepted its config, printed its output and asserted nothing.* (Method)

The process for adding a gate had no step that breaks something. For the coverage gate, the precise belief was *thought Vitest reads `coverage` from each project entry, actually it reads it only from the root config and ignores the block without a warning*. The same Method let the three other mechanisms through.

## Detection failure causes

- **Documentation:** CLAUDE.md and two standards stated that pure files ship at 100% and that the runner enforces it. Each later reader inherited the claim instead of testing it.
- **Output read as enforcement:** a coverage table, a mutation score and a seed response were all printed and read. A printed number is not an asserted one.
- **Severity:** the seed's `::warning::` named the exact fault on every deploy for months. A warning in a green run reaches nobody.
- **Workspace coverage of CI:** nothing checked that every workspace appeared in a workflow, so `pragma` was never added and no job reported it.

## Countermeasure

Each gate was fixed in commit `0bf0ad517`, "fix(ci): arm the per-file coverage gate, and run pragma at all":

- coverage moved to the root `vitest.config.ts` of each app, and CI runs `vitest run --project core --coverage`
- `pragma` joined `app-tests` with its own Postgres
- the seed got its query parameter, and a non-2xx answer prints `::error::` and exits 1
- the mutation run is no longer piped

Each was verified by breaking it. An unreachable branch injected into one pure file per app made the exact CI command exit 1 while every test passed. Both injections were reverted.

## Eradication

**Type:** DevX check (level 2), one gate at a time

**Reference:** commit `0bf0ad517` (PR #40).

What holds today:

- The per-file thresholds sit in the root config, for example `apps/last-loop-lepin/vitest.config.ts`, and `ci.yml` runs each app's core project with `--coverage`.
- `ci.yml` derives the app list from `find apps -mindepth 1 -maxdepth 1 -type d`, so an app can no longer be missing from `app-tests`.
- `preview.yml` fails the job on a seed that does not answer 2xx.
- `scripts/hooks/checks/no-swallowed-push.core.ts` refuses a mutation run piped into `head`. A pipe into `tail`, the shape of this entry, is not refused.

This is not eradicated. Each fix arms one gate. `docs/quality/weak-points.md` lists `gate-measures-nothing` with 47 entries (measured with `grep -l "^weak-point: gate-measures-nothing" docs/dantotsus/*.md | wc -l`), and its countermeasure is still marked Proposed.

**Proof it can fail:** the injected unreachable branch above, one per app, made the CI command exit 1.

**Proposed:** a CI job that proves each gate fails. For every gate, a planted-defect patch is applied to a scratch tree, the gate runs, and the job fails if the gate exits 0. A new gate then ships with its planted defect, or the job refuses it. That replaces the Method that let all four through, reading a gate instead of breaking it, with a check that holds for every gate. It also closes the weak point, where each entry so far has fixed one gate.

**Proposed:** close this entry's own pipe branch with the rewrite that already exists. `no-swallowed-push.core.ts` refuses only `stryker run | head` (`MUTATION_INTO_HEAD`), and already rewrites a piped `git push` or `git commit` with `set -o pipefail; ` in front. The same `rewrite` verdict on `stryker run` or `test:mutation` piped into any command, `tail` included, would make a mutation run's status impossible to swallow from an agent's Bash call.

**Similar instances:** `grep -l "^weak-point: gate-measures-nothing" docs/dantotsus/*.md` lists the other gates found measuring nothing. `per-file-coverage-gate-was-never-armed` is the earlier occurrence of the coverage branch.
