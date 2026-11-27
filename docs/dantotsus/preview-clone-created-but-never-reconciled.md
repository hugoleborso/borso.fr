---
date: 2026-08-15
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#49'
fix-commits: [450e82316d]
eradication-level: 5
eradication-paths: [infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts, infra/cdk/src/internal/migration-runner/index.ts]
time-to-detect: one preview deploy
tags: [dsql, cdk, preview, migrations, clone]
zone: infra/cdk/src/internal/migration-runner
---

# A preview schema that could be created but never updated

## User impact

Every preview deploy of PR #49 failed once PR #50 merged, though nothing in
PR #49 touched the database. The stack reached `UPDATE_ROLLBACK_FAILED` and
needed manual attention. Production had deployed the same migration minutes
earlier and succeeded.

| | Seen | Expected |
| --- | --- | --- |
| Preview deploy of PR #49 | `Message returned: column "family" of relation "instrument" does not exist`, then a failed rollback | the preview deploys with production's current data |

## Causal chain

- The preview deploy failed and could not roll back.
  - Aurora DSQL rejected the clone's
    `INSERT INTO pr_49.instrument (id, is_harmonic, family) SELECT … FROM pragma.instrument`.
    - The INSERT's column list came from the source, `pragma.instrument`, which
      now had `family`. PR #50's migration `0002` ran
      `ALTER TABLE instrument ADD COLUMN IF NOT EXISTS family text` in
      production.
    - The target, `pr_49.instrument`, had been created days earlier without
      `family`, and every later deploy left its shape as it was. The structural
      step was:

      ```sql
      -- a no-op on a table that already exists, so pr_49 keeps its first shape for good
      CREATE TABLE IF NOT EXISTS pr_49.instrument (LIKE pragma.instrument INCLUDING ALL)
      ```

      - Commit `44dd7ae693` built the clone "Neon-branch-style" and runs it on
        every deploy, Create and Update alike. A Neon branch is a snapshot taken
        once. Here the snapshot step reruns against a target that already
        exists.
        - The same commit copies the source's `_migrations` rows on every
          deploy "so `applyMigrations` short-circuits every migration prod has
          already run". The target's ledger then claims every migration
          production ran, whether or not it ran on the target.

## Root cause of occurrence

*Thought `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` made the clone safe to
rerun on every deploy, actually they make a step safe to repeat on an unchanged
target, and a preview target falls behind its source the moment production
migrates.* (Material)

The design's input was Neon's branch model, named in the commit: "same shape as
Neon's branch databases". That model creates a branch once and never reconciles
it. The construct's comment claimed idempotence, which was true of the
operation and false of the outcome.

## Detection failure causes

- **Unit tests:** the clone tests passed `columnsPerTable` for the source only,
  and the mock returned an empty list for any other table. The target always
  looked identical or absent, never behind.
- **Production:** the prod stack's source and target are the same schema, and
  the clone returns early on that, so only a preview can reach this path.
- **Order of events:** it needs a preview created, production gaining a column,
  then that preview deployed again. A branch opened and merged within one
  migration's lifetime never sees it.

## Countermeasure

After the `CREATE TABLE IF NOT EXISTS … LIKE`, the runner reads both column lists
and issues `ALTER TABLE … ADD COLUMN IF NOT EXISTS <name> <type>` for each column
the source has and the target lacks. Bare `ADD COLUMN` is the one alter Aurora
DSQL accepts, so a NOT NULL production column arrives nullable in the preview,
the same compromise every migration here makes.

## Eradication

**Type:** knowledge (level 5) for the class, a preview target that falls behind
its source. A structural impossibility (level 1) holds for one member of it, a
column the target lacks.

**Reference:** commit [`450e82316d`](https://github.com/hugoleborso/borso.fr/commit/450e82316d).
The clone cannot name a column the target lacks, because the step before the
INSERT adds it. `cloneFromSchema` in `migration-runner/index.ts` does it today:

```ts
for (const column of selectMissingColumns(sourceColumns, targetColumns)) {
  await sql.unsafe(buildAddColumnSql(targetSchemaName, table, column));
}
```

`selectMissingColumns` and `buildAddColumnSql` are pure, in
`clone-from-schema.utils.ts`, at 100% coverage. The type string read from
`information_schema` is validated against a pattern that admits a type name with
a length or precision and nothing else.

**Proof it can fail:** `infra/cdk/test/unit/migration-runner-clone.test.ts` has a
case where the target is behind the source and asserts the ALTER lands before
the INSERT. The mock now returns a type with each column, so a fixture cannot
describe a schema the runner could not query.

**Gap:** only `ADD COLUMN` is reconciled. The clone still copies the source's
`_migrations` rows on every deploy (`index.ts`, the `APPLIED_MIGRATIONS_TABLE`
insert after the data loop). On a branch rebased onto a production migration
that creates an index or a table, the copied ledger marks it applied and
`applyMigrations` skips it on the preview (inferred from the code, not
reproduced).

**Proposed:** stop copying `_migrations`, and apply the target's own pending
migrations before the data copy. In `provisionSchema` the order flips, from
clone then migrate to migrate then copy, and the `APPLIED_MIGRATIONS_TABLE`
insert after the data loop goes away. The INSERT then takes its column list
from the columns both schemas hold, not from the source alone. Each preview
runs every migration its own branch carries, so a rebased branch gets
production's indexes and tables from the real migration, not from a ledger
that claims them. `selectMissingColumns`, `buildAddColumnSql` and
`listColumnDefinitions` could then be deleted. All of this is inferred, not
tried. The migrations have been idempotent since `db7745820`, so rerunning
them on every deploy is safe.

This answers the reason the first review's version was dismissed. A branch
behind main, as PR #49 was, does not carry production's newest migration, so
migrating first alone would leave the target without `family`, and a source
column list would still fail. With the column list taken from both schemas,
the copy skips `family` on that branch, and the branch's code, which never
reads `family`, loses nothing. The column arrives with the migration once the
branch is rebased. Until this ships, the ADD COLUMN step stays, because it is
what holds today.

**Similar instances:** `grep -n 'IF NOT EXISTS' infra/cdk/src/internal/migration-runner/*.ts`
lists the other create-only steps. Each is safe to repeat and none reconciles.
