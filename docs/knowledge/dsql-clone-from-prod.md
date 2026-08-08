# DSQL "clone from prod" — Neon-branch-style preview databases

Preview / integ DSQL schemas can be seeded as a snapshot of `prod` at
deploy time, so the operator only seeds shared rows (admin PIN, demo
editions, …) once in prod and every preview inherits. Configured per app
via `PreviewableApp.database.cloneFromSchema` from `@borso/infra`.

## What gets cloned

For every table in the source schema (typically `prod`):

1. **Structure** — `CREATE TABLE IF NOT EXISTS pr_N.<t> (LIKE prod.<t>
INCLUDING ALL)`. Copies columns, defaults, constraints, indexes, and
   identity sequences. Cross-schema `LIKE` is in DSQL's documented
   `CREATE TABLE` grammar.
2. **Data** — `INSERT INTO pr_N.<t> (cols) SELECT … FROM prod.<t> ON
CONFLICT DO NOTHING`. Cross-schema DML is unrestricted in DSQL.

Then the runner reads `pr_N._migrations` (just populated from the
clone), short-circuits every migration that prod has already applied
on the cloned data, and runs only the PR's net-new migrations on top.
Same flow as Neon branches.

## What gets skipped

Configurable via `DsqlSchemaCloneFromConfig`:

- **`tableBlocklist`** — table names whose ROWS aren't cloned. Default
  for `last-loop-lepin`: `['admin_sessions', 'auth_attempts']`. Their
  structure is still created so the application can write rows post-
  deploy. Use this for any table holding session, rate-limit, or other
  per-stage runtime state.
- **`columnsToNullify`** — map of `tableName → columns` whose values are
  replaced by `NULL` in the clone INSERT. Use this for any column
  carrying a reference to a stage-specific S3 object key, ARN, or URL —
  the preview's app code would otherwise dereference prod's bucket and
  get 403s. Today only `runners.photo_key` qualifies; add others as the
  schema grows.

## Edge cases the runner handles

- **Source schema doesn't exist yet** (first-ever deploy of an app):
  clone is skipped. Migrations run on the empty target schema as before.
- **Source equals target** (the prod stack itself): clone is skipped to
  prevent self-clone loops.
- **Re-deploy of the same PR**: `ON CONFLICT DO NOTHING` keeps existing
  rows; new prod rows propagate. Deletions in prod don't propagate
  (acceptable for preview — re-create the PR if you need a fresh start).
- **Schema drift** (PR adds a column not yet in prod): `LIKE INCLUDING
ALL` copies prod's columns, the PR migration's `ALTER TABLE ADD
COLUMN` adds the new one (nullable per the DSQL §10 constraint, see
  `dsql-postgres-compat-gaps.md`), existing rows get `NULL`.

## Constraints inherited from DSQL

- **3,000-row cap per DML transaction**. The runner ships a single
  `INSERT … SELECT` per table without chunking. Tables under 3,000
  rows work; larger tables will fail with DSQL's
  "row limit exceeded" error. Last-loop-lepin's tables are safely
  under (≤ 270 rows per edition × N editions). Future apps with
  larger tables need a chunked variant — keyset-paginated INSERT in
  a loop using the table's PK. Not shipped in v1.
- **DDL and DML in separate transactions, 1 DDL per tx**. Each `CREATE
TABLE LIKE` and each `INSERT` ship in their own `sql.unsafe()` call.
- **Optimistic concurrency**. Reads on `prod` don't block prod writes
  during the clone; the snapshot is per-table consistent but not
  cluster-globally consistent. Acceptable for preview.

## Privacy surface

Preview hosts are public (`*.preview.borso.fr`). Cloning prod data
into them means whatever prod exposes on its public surface (runner
names on the spectator page, for instance) is also visible on every
open preview. Zero new exposure for last-loop-lepin where the
spectator is already public, but every app must audit its own
data + decide what to clone vs blocklist.

## See also

- `infra/cdk/src/internal/migration-runner/clone-from-schema.utils.ts` — the SQL builders.
- `infra/cdk/src/internal/migration-runner/index.ts` — the runner integration (function `cloneFromSchema`).
- `infra/cdk/src/constructs/dsql-schema.ts` — the `DsqlSchemaCloneFromConfig` prop.
- `docs/knowledge/dsql-postgres-compat-gaps.md` — the DSQL-vs-Postgres divergences this design accommodates.
