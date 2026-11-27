---
summary: 'A preview''s DSQL schema is cloned from prod at deploy time; what the clone carries and what it does not.'
triggers:
  paths:
    - 'infra/cdk/src/constructs/dsql-schema*.ts'
    - 'infra/cdk/src/constructs/previewable-app*.ts'
---

# DSQL "clone from prod" — Neon-branch-style preview databases

Preview / integ DSQL schemas can be seeded as a snapshot of `prod` at
deploy time, so the operator only seeds shared rows (admin PIN, demo
editions, …) once in prod and every preview inherits. Configured per app
via `PreviewableApp.database.cloneFromSchema` from `@borso/infra`.

## What gets cloned

The runner builds the preview from the branch's own migrations and borrows only
rows from the source (typically `prod`), in three steps:

1. **Catch up to the source.** It reads `prod._migrations` and applies, in
   shipping order, the branch migrations that production has applied and the
   preview has not. On a fresh preview that is every migration production ran,
   on empty tables.
2. **Copy rows.** For every source table the preview also has,
   `INSERT INTO pr_N.<t> (cols) SELECT … FROM prod.<t> ON CONFLICT DO
   NOTHING`, on the columns both tables share. Cross-schema DML is
   unrestricted in DSQL.
3. **Run the branch's own migrations** on those rows, so a backfill or a data
   move in the pull request is exercised on production data.

`_migrations` is never copied. The preview records only the migrations it ran,
so its record can never claim an index, a table or a backfill it does not have.
A table or column production has and the branch does not ship stays out of the
preview. The preview reflects its branch.

## What gets skipped

Configurable via `DsqlSchemaCloneFromConfig`:

- **`tableBlocklist`** — table names whose ROWS aren't cloned. Default
  for `last-loop-lepin`: `['admin_sessions', 'auth_attempts']`. Their
  structure still comes from the migrations, so the application can write rows post-
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
- **A singleton row that exists to mirror the source** (a credential or
  config row with a fixed primary key): `ON CONFLICT DO NOTHING` is
  wrong for it, because the conflict clause keeps the stale copy
  forever. Name the table in `cloneFromSchema.tablesToReplace`, which
  empties it in the target immediately before the rows are copied, so
  the source wins outright. The default is right for domain data and
  only ever wrong for this shape.
- **A preview created before production gained a migration**: the next
  deploy of a branch that ships it applies it in step 1, before the rows are
  copied. A branch that does not ship it copies only the shared columns. See
  [`preview-clone-created-but-never-reconciled`](../dantotsus/preview-clone-created-but-never-reconciled.md).
- **A migration production applied that sorts after a branch-only one** runs
  first, in step 1. Rebase and renumber the branch migration to keep the order
  production saw.

## Constraints inherited from DSQL

- **3,000-row cap per DML transaction**. The runner ships a single
  `INSERT … SELECT` per table without chunking. Tables under 3,000
  rows work; larger tables will fail with DSQL's
  "row limit exceeded" error. Last-loop-lepin's tables are safely
  under (≤ 270 rows per edition × N editions). Future apps with
  larger tables need a chunked variant — keyset-paginated INSERT in
  a loop using the table's PK. Not shipped in v1.
- **DDL and DML in separate transactions, 1 DDL per tx**. Each migration
  statement and each `INSERT` ship in their own `sql.unsafe()` call.
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

## last-loop-lepin blocks `admin_credentials`, and a fresh preview is admin-locked

`last-loop-lepin` makes the opposite call to `pragma` (see
[ADR-2026-08-09T1654](../adr/2026-08-09T1654-pragma-previews-clone-production.md)): it **blocks**
`admin_credentials` from the clone. A preview is a public URL and must not hold
production's PIN hash. ADR-2026-05-19T1955 moved that PIN out of a stage-shared Secrets
Manager entry into a per-schema row precisely so each stage would carry its own,
and cloning the row from prod would put the sharing back by another route.

**The consequence, which is the part that confuses an operator:** a freshly
deployed preview has **no admin PIN at all**, so its admin area is unreachable
until someone seeds the row. That is by design, not a broken deploy.

`pragma` can afford the opposite because there the *data* is the secret and the
password is what guards it; here the cloned data is race results that production
publishes anyway, so the PIN was the only secret worth protecting.
