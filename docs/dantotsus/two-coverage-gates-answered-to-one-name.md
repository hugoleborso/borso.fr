---
date: 2026-10-12
introduced-at: conception
detected-at: ci
severity: low
related-pr: '#161'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/package.json, apps/talos/package.json, apps/last-loop-lepin/package.json, apps/banana-rush/package.json]
time-to-detect: one push
tags: [vitest, coverage, gates, ci, testing, drizzle]
zone: apps/pragma/package.json
weak-point: gate-measures-nothing
recurs: none (per-file-coverage-gate-was-never-armed is a gate that measured nothing; here both gates measured, and they measured different suites)
---

# Two coverage gates answered to one name

## Symptom

On PR #161 an agent added a Drizzle table with a primary-key callback, ran
`pnpm --filter pragma run test:coverage`, saw every file at 100 %, and
pushed. CI's coverage job failed on that schema file.

## Root-cause chain

1. **Why did CI see less than 100 %?** CI's coverage step runs `test:core`,
   which collects coverage from the `core` project only.
2. **Why did the local run see 100 %?** In the full-stack apps,
   `test:coverage` ran `vitest run --coverage` over both projects, and the
   `back-e2e` suite executes the table callbacks when it migrates.
3. **Why did they differ?** Both scripts carried the same per-file
   thresholds, but over different test sets, so a file covered only by the
   database suite passed one and failed the other.

**Root cause:** the contributor thought `test:coverage` was the coverage
gate, as its name says and as it is in every other workspace, but in the
full-stack apps the gate CI enforces was `test:core`, and `test:coverage` was
a more lenient variant of it.

## Detection failure causes

- **Functional validation locally:** the local command was green; it was a
  different gate.
- **Code review:** the two scripts sit one line apart in `package.json`, and
  nothing says which one CI runs.

## Countermeasure

In the four full-stack apps, `test:coverage` now runs exactly what CI runs:
the `core` project with coverage, then the back-e2e suite without it.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

```diff
-    "test:coverage": "pnpm --filter @borso/infra run build && DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) vitest run --coverage",
+    "test:coverage": "pnpm run test:core && pnpm run test",
```

There is now one coverage verdict per full-stack app, and both names reach
it. Run on pragma: 194 core files passed the thresholds, then 182 back-e2e
tests passed.

**Sibling defects swept:** the front-end-only apps have no `test:core`, and
their `test:coverage` is already what CI runs. `infra/cdk`, `infra/shared`
and the root tooling suite run the same script locally and in CI.

## See also

- [`per-file-coverage-gate-was-never-armed.md`](./per-file-coverage-gate-was-never-armed.md)
- [`four-worktrees-one-test-database.md`](./four-worktrees-one-test-database.md), the database the back-e2e half uses.
