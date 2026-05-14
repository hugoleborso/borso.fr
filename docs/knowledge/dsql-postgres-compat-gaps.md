# Aurora DSQL is not a drop-in for Postgres

DSQL ships a Postgres wire protocol, accepts most DML, and reads like
the real thing under `psql`. But its DDL and connection layers diverge
in ways drizzle-kit's default emission walks into face-first. This page
catalogues every divergence we hit while bringing `last-loop-lepin`
online so future apps don't re-discover them one CFN rollback at a
time.

## 1. No `jsonb` column type

Hitting:

```
datatype jsonb not supported
```

at migration time. DSQL only supports `text`/`json` (no `jsonb`); the
serverless storage layer doesn't have the same binary backing as RDS
Postgres.

**Adaptation:** store JSON as `text`, JSON.stringify at insert,
JSON.parse + zod-validate at read. See `editions.gpx` in
`apps/last-loop-lepin/api/src/edition/edition.schema.ts` + the
`rowToEdition` parser in `edition.repository.ts`.

## 2. `ALTER TABLE ADD CONSTRAINT` (foreign keys) is rejected

```
unsupported ALTER TABLE ADD CONSTRAINT
```

DSQL doesn't enforce FK semantics at write time anyway. Drizzle-kit
emits FKs as a final `ALTER TABLE ADD CONSTRAINT` block at the bottom
of each migration; DSQL refuses the statement and rolls back.

**Adaptation:** drop `.references()` from drizzle schemas entirely.
Domain invariants (don't insert a punch without a runner first) live
in the service layer. Regenerate migrations after dropping the FKs
(`drizzle-kit generate` then verify the migration has `0 fks`).

## 3. Multi-DDL transactions are rejected

```
multiple ddl statements not supported in a transaction
```

`postgres-js`'s `sql.unsafe(<multi-statement>)` wraps a migration's
CREATE TABLE / CREATE INDEX / ALTER TABLE block in a single tx.
DSQL refuses.

**Adaptation:** the migration runner
(`infra/cdk/src/internal/migration-runner/index.ts`) splits on
drizzle-kit's `--> statement-breakpoint` marker and runs each
statement in its own round-trip.

## 4. Partial reruns must use `IF NOT EXISTS`

If migration N succeeds halfway, the `_migrations` row isn't written,
and the retry restarts from statement 1 → `relation X already
exists`.

**Adaptation:** the migration runner rewrites `CREATE TABLE/INDEX/
SCHEMA` to inject `IF NOT EXISTS` so retries are idempotent. See
`makeIdempotent` in the runner.

## 5. `CREATE INDEX … USING <method>` is rejected

```
USING not supported for CREATE INDEX
```

DSQL only ships one storage backend; naming `btree` explicitly is
meaningless to its planner. drizzle-kit always emits `USING btree`.

**Adaptation:** the migration runner's `stripUsingClause` rewrite
removes the access-method clause.

## 6. Partial indexes (`CREATE INDEX … WHERE …`) are rejected

```
WHERE not supported for CREATE INDEX
```

We used a partial unique on
`(edition_slug, runner_slug, loop_index) WHERE voided_at IS NULL` to
support the void-then-re-punch flow. DSQL refuses the WHERE; a
non-partial unique on the same columns would block re-punch.

**Adaptation:** drop the partial unique entirely; rely on app-side
`validatePunchTiming` for re-punch checks.

## 7. `pg_advisory_lock` is not in the supported subset

```
function pg_advisory_lock not supported
```

We wanted advisory locks around schema migrations to serialise concurrent
custom-resource retries.

**Adaptation:** rely on CFN's single-invocation contract for serialisation
within one deploy, plus `INSERT ... ON CONFLICT (name) DO NOTHING` on
the `_migrations` table for belt-and-suspenders.

## 8. Only the `admin` user exists; only `dsql:DbConnectAdmin` works at runtime

There is no path today to provision a non-admin Postgres user from the
migration runner. The `DsqlSigner` exposes
`getDbConnectAdminAuthToken()` (admin) and `getDbConnectAuthToken()`
(regular), but the regular one needs a non-admin user that simply
doesn't exist out of the box.

**Adaptation:** `DsqlSchema.grantConnect()` attaches
`dsql:DbConnectAdmin`. The Lambda authenticates as `admin` and isolates
per-stage data via `search_path = pr_<n>`. See
[`docs/dantotsus/dsql-grant-mismatched-runtime-auth.md`](../dantotsus/dsql-grant-mismatched-runtime-auth.md).

## 9. IAM is per-cluster, not per-schema

`dsql:DbConnectAdmin` grants access to the entire cluster; we can't
narrow IAM to a single Postgres schema. Logical isolation between
stages depends entirely on the connection's `search_path` matching the
right schema name.

**Adaptation:** the per-stage schema (`pr_<n>` / `prod`) is set on the
connection via `connection: { search_path: schemaName }` in
`client.ts`. Application code never qualifies tables with a schema
prefix, so the search_path is the only thing that decides which data
the Lambda sees.

## Symptoms quick-table

If you see this error… | …it's this divergence

- `datatype jsonb not supported` → §1
- `unsupported ALTER TABLE ADD CONSTRAINT` → §2
- `multiple ddl statements not supported in a transaction` → §3
- `relation X already exists` on the second deploy → §4
- `USING not supported for CREATE INDEX` → §5
- `WHERE not supported for CREATE INDEX` → §6
- `function pg_advisory_lock not supported` → §7
- `not authorized to perform: dsql:DbConnectAdmin` → §8

## See also

- [`dsql-serverless-pricing-vs-aurora.md`](./dsql-serverless-pricing-vs-aurora.md)
  — pay-per-DPU model; idle clusters cost ~nothing on compute.
- [`docs/dantotsus/dsql-first-deploy-must-be-prod.md`](../dantotsus/dsql-first-deploy-must-be-prod.md)
  — historic ordering footgun; eradicated by `DsqlClusterStack`.
- [`docs/dantotsus/dsql-grant-mismatched-runtime-auth.md`](../dantotsus/dsql-grant-mismatched-runtime-auth.md)
  — §8 in detail.
