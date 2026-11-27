---
date: 2026-10-12
introduced-at: conception
detected-at: ci
severity: low
related-pr: '#161'
fix-commits: [self, c54e32da7]
eradication-level: 2
eradication-paths: [.husky/pre-push, .github/workflows/ci.yml, apps/pragma/package.json]
time-to-detect: one push
tags: [vitest, coverage, gates, ci, testing, drizzle]
zone: apps/pragma/package.json
weak-point: gate-measures-nothing
recurs: none (per-file-coverage-gate-was-never-armed is a gate that measured nothing; here both gates measured, and they measured different suites)
---

# Two coverage gates answered to one name

## User impact

The contributor of PR #161 got a green local coverage run and a red CI.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm --filter pragma run test:coverage` | every file at 100 % | the verdict CI gives |
| CI's coverage job | failed on the new Drizzle schema file | the same verdict as the local run |

## Causal chain

- CI failed a schema file that the local coverage run passed.
  - CI's coverage step ran `test:core`, which measures the `core` project only.
  - The local `test:coverage` ran `vitest run --coverage` over every project, and the `back-e2e` suite executes the table's primary-key callback when it migrates.
    - Both scripts carried the same per-file thresholds over different test sets, so a file covered only by the database suite passed one and failed the other.
      - Commit `0fafc5782` (2026-05-19, written by an agent) scaffolded pragma with both scripts and the per-file thresholds:

        ```json
        "test:core": "vitest run --project core",
        "test:coverage": "DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) vitest run --coverage",   ← the faulty line
        ```

        and the same commit's `ci.yml` ran `test:coverage` for the static apps (lines 102-103) and `test:core` for the full-stack ones (line 108).
        - The repository's convention named the coverage gate `test:coverage` in every workspace, and this app gave the name to a different suite than CI's (Machine).

## Root cause of occurrence

*Thought `test:coverage` was the coverage gate, as its name says and as it was
in every other workspace, actually in the full-stack apps CI enforced
`test:core`, and `test:coverage` was a more lenient run of the same
thresholds.* **Machine:** two script names led to two verdicts, and the name
that reads as the gate was the lenient one.

`git show 0fafc5782:.github/workflows/ci.yml`, read this session, lines 102
to 108: `run test:coverage` for `borso-fr` and `borsouvertures`, `run
test:core` for `last-loop-lepin`.

## Detection failure causes

- **Local validation:** the local command was green. It was a different gate, and no local hook ran CI's.
- **Review:** the two scripts sit one line apart in `package.json`, and nothing in it says which one CI runs.

## Countermeasure

In the four full-stack apps, `test:coverage` was made to run what CI ran: the
`core` project with coverage, then the back-e2e suite without it
(PR #173). Run on pragma at the time: 194 core files passed the thresholds,
then 182 back-e2e tests passed.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the alias shipped with this entry in
[PR #173](https://github.com/hugoleborso/borso.fr/pull/173). Commit
[`c54e32da7`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7)
(#224, 2026-10-29) superseded it by deleting the name.

```diff
-    "test:coverage": "pnpm run test:core && pnpm run test",
+    "test:full-suite": "pnpm run test:core && pnpm run test:e2e",
```

What holds today, read this session:

- No `package.json` under `apps/` or `infra/` defines `test:coverage`
  (`grep -l '"test:coverage"' apps/*/package.json infra/*/package.json`
  finds none).
- `.husky/pre-push` (lines 286-293) runs `vitest run --project core
  --changed <base> --coverage` for each changed app that has `test:core`, and
  `ci.yml` (lines 318-323) runs `vitest run --project core --coverage`. The
  local verdict before a push is now CI's verdict on the changed files.

Level 1 is not claimed. `vitest run --coverage` over every project still
gives the lenient verdict when typed by hand, and the gate's command is held
in two copies, one in each hook file.

**Proposed:** subtract the second copy. Move the branch duplicated in
`.husky/pre-push:286-293` and `.github/workflows/ci.yml:318-323` (both read
on the current main this session) into one script, such as
`scripts/coverage-gate.sh <app> [base]`, which picks `--project core` when the
app has `test:core` and adds `--changed <base>` when a base is given. Both
hooks call it. The local and CI coverage commands then cannot drift apart,
because only one exists, and a developer gets a name to run that gives CI's
verdict.

**Proof it can fail:** not replanted this session. The pre-push gate refuses a
push whose changed gated file is under 100 % in the `core` project, which is
the same per-file threshold CI applies.

**Similar instances:** the front-end-only apps have no `test:core` and both
hooks run their whole suite with coverage, so one verdict exists there too.
`infra/cdk`, `infra/shared` and the root tooling suite run one command locally
and in CI. The neighbouring defects are
[per-file-coverage-gate-was-never-armed.md](./per-file-coverage-gate-was-never-armed.md)
and [four-worktrees-one-test-database.md](./four-worktrees-one-test-database.md).
