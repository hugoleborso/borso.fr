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

The structural step reconciles instead of only creating. After the
`CREATE TABLE IF NOT EXISTS … LIKE`, the runner reads both column lists and
issues `ALTER TABLE … ADD COLUMN IF NOT EXISTS <name> <type>` for every column
the source has and the target lacks.

`ADD COLUMN` in its bare form is the one alter Aurora DSQL accepts
([compat gaps §10](../knowledge/dsql-postgres-compat-gaps.md)), so a column that
is NOT NULL in production arrives nullable in the preview. That is the same
compromise every migration in this repository already makes for the same reason.

## Eradication

Structural, at the level below detection: the clone can no longer name a column
in an INSERT that the target does not have, because the step before it puts the
column there.

- `selectMissingColumns` and `buildAddColumnSql` in
  `infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts`, pure and
  covered at 100% like every `*.utils.ts` file.
- `listColumnDefinitions` in `migration-runner/index.ts` reads the type back out
  of `information_schema`, folding in the length or precision that `data_type`
  alone drops.
- The type string is validated against a pattern that admits a type name with a
  length or a precision and nothing else, so a catalogue read can never become
  an injected fragment.
- `infra/cdk/test/unit/migration-runner-clone.test.ts` now carries a case where
  the target is genuinely behind the source, which is the state no fixture could
  express before, and asserts the ALTER lands *before* the INSERT.
- The mock returns a type alongside each column name, so a fixture cannot again
  describe a schema the runner could not actually query.
