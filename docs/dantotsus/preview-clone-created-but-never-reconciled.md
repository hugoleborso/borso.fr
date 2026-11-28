---
date: 2026-08-15
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#49'
fix-commits: [450e82316d, self]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/migration-runner/index.ts, infra/cdk/src/internal/migration-runner/pending-migrations.utils.ts]
time-to-detect: one preview deploy
tags: [dsql, cdk, preview, migrations, clone]
zone: infra/cdk/src/internal/migration-runner
---

# A preview schema that could be created but never updated

## Symptom

Every preview deploy of PR #49 failed, after PR #50 merged, with:

```
Received response status [FAILED] from custom resource.
Message returned: column "family" of relation "instrument" does not exist
```

The stack reached `UPDATE_ROLLBACK_FAILED`, so the rollback failed too and the
preview needed manual attention.

Nothing in PR #49 touched the database. Production had deployed the same
migration minutes earlier and succeeded.

## Root-cause chain

1. PR #50 added migration `0002`, which does
   `ALTER TABLE instrument ADD COLUMN IF NOT EXISTS family text`, and merged.
2. Production ran it. `pragma.instrument` gained the column.
3. PR #49's preview schema, `pr_49`, had been created days earlier, when
   production did not have that column, so `pr_49.instrument` does not have it.
4. On every deploy, the runner re-clones production into the preview. The
   structural half is
   `CREATE TABLE IF NOT EXISTS pr_49.instrument (LIKE pragma.instrument INCLUDING ALL)`.
   **`IF NOT EXISTS` makes that a no-op on a table that already exists**, so the
   preview keeps whatever shape it was created with, for good.
5. The data half reads its column list from the **source**, which now includes
   `family`, and builds
   `INSERT INTO pr_49.instrument (id, is_harmonic, family) SELECT … FROM pragma.instrument`.
6. The target does not have that column. Aurora DSQL rejects the INSERT, the
   custom resource fails, and CloudFormation cannot roll the schema back either.

The structural step could **create** and could never **reconcile**, and the two
halves of the clone disagreed about which schema was authoritative: the
structure came from the target's history, the column list came from the source's
present.

## Why nothing caught it

- **The failure needs three deploys in a specific order** — a preview created,
  production gaining a column, then that preview deployed again. A branch opened
  and merged inside one migration's lifetime never sees it, which is most of
  them.
- **The unit test fixture set the same columns on both schemas.** The clone
  tests pass `columnsPerTable` for the source only, and the mock returned an
  empty list for any table it was not given, so the target always looked either
  identical or absent — never *behind*.
- **Production cannot reproduce it.** The prod stack's source and target schema
  are the same name, and the clone returns early on that, so the only code path
  that can hit this is the preview one.
- **`ON CONFLICT DO NOTHING` and `IF NOT EXISTS` read as "idempotent".** They
  make a step safe to *repeat*; neither makes it safe to run against a target
  that has drifted. The construct's own comment claimed idempotence, and it was
  true of the operation and false of the outcome.

## Countermeasure

The first fix reconciled the structure: after the
`CREATE TABLE IF NOT EXISTS … LIKE`, the runner added every column the source
had and the target lacked. It closed this symptom and left the premise in
place, which was that a preview's structure comes from production while its
`_migrations` record is copied from production too. The record then claimed
migrations the preview never ran. A preview created before production gained
an index or a backfill was told it had them, and its own rows never got them.
A real Postgres run of the old runner, done for the replacement, showed both:
a branch that did not ship `0002` and `0003` had them in its record, and a
rebased preview kept `position = NULL` on its existing rows although `0003`
was recorded as applied (measured).

## Eradication

Structural, level 1. The preview's structure comes only from the branch's
migrations, and its record lists only what it ran, so the record and the
structure cannot disagree.

- `migrateFromSource` in `infra/cdk/src/internal/migration-runner/index.ts`
  applies the branch migrations production has already applied
  (`selectAppliedMigrations` in `pending-migrations.utils.ts`), copies rows on
  the columns both schemas share (`selectCommonColumns`), and only then lets
  `applyMigrations` run the branch's own migrations on those rows.
- `_migrations` is never copied. `CREATE TABLE … LIKE`, `selectMissingColumns`,
  `buildAddColumnSql`, `formatColumnType`, the catalogue type pattern and
  `listColumnDefinitions` are deleted. The clone can no longer name a column
  the target lacks, because it copies only columns the target has.
- Running every migration before copying, the simpler order, was tried and
  refused. It runs a branch's backfill on empty tables, then copies production
  rows in with the new column empty. A real Postgres run left `family = NULL`
  on every copied instrument (measured).
- `infra/cdk/test/unit/migration-runner-clone.test.ts` asserts the order: the
  migration production applied runs before the first copied row, and the
  branch migration after the last one. It fails if `_migrations` is copied or
  if every migration runs before the copy.
