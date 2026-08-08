/**
 * DSQL migration runner. Invoked as a CloudFormation custom resource by the
 * `DsqlSchema` construct. Creates the schema, optionally clones data from a
 * source schema (the "Neon-branch" pattern), applies migrations idempotently,
 * and DROPs the schema CASCADE on stack delete.
 *
 * Untested against real DSQL — see docs/architecture.md for known caveats
 * (no FKs, optimistic concurrency, retryable transactions). Treat all SQL
 * here as forward-only.
 *
 * Custom resource event properties (set by the construct):
 *   - clusterEndpoint:  DSQL cluster Postgres endpoint
 *   - region:           AWS region of the cluster
 *   - schemaName:       schema to manage
 *   - migrations:       [{ name: string, sql: string }] in apply order
 *   - cloneFromSchema:  optional — clone data + applied-migrations state
 *                       from another schema before applying the PR's
 *                       remaining migrations. Skipped when undefined or
 *                       when the source schema doesn't exist (first-ever
 *                       deploy of an app).
 *
 * @internal
 */

import { DsqlSigner } from '@aws-sdk/dsql-signer';
import postgres from 'postgres';
import {
  buildCloneInsertSql,
  buildCreateTableLikeSql,
  selectCloneableDataTables,
} from './clone-from-schema.utils.js';
import { selectPendingMigrations } from './pending-migrations.utils.js';
import { splitStatements } from './statement-rewrites.utils.js';

interface Migration {
  readonly name: string;
  readonly sql: string;
}

interface CloneFromSchemaProps {
  readonly sourceSchemaName: string;
  readonly tableBlocklist?: readonly string[];
  readonly columnsToNullify?: Readonly<Record<string, readonly string[]>>;
}

interface ResourceProps {
  readonly clusterEndpoint: string;
  readonly region: string;
  readonly schemaName: string;
  readonly migrations: readonly Migration[];
  readonly cloneFromSchema?: CloneFromSchemaProps;
}

interface CfnEvent {
  readonly RequestType: 'Create' | 'Update' | 'Delete';
  readonly PhysicalResourceId?: string;
  readonly ResourceProperties: ResourceProps & { readonly ServiceToken: string };
  readonly OldResourceProperties?: ResourceProps;
}

interface CfnResponse {
  readonly PhysicalResourceId: string;
  readonly Data?: Readonly<Record<string, string>>;
}

const PG_USER = 'admin';
const PG_DATABASE = 'postgres';

async function connect(props: ResourceProps): Promise<postgres.Sql> {
  const signer = new DsqlSigner({
    hostname: props.clusterEndpoint,
    region: props.region,
  });
  const token = await signer.getDbConnectAdminAuthToken();
  return postgres({
    host: props.clusterEndpoint,
    port: 5432,
    user: PG_USER,
    password: token,
    database: PG_DATABASE,
    ssl: 'require',
    max: 1,
    prepare: false,
  });
}

async function ensureSchema(sql: postgres.Sql, schemaName: string): Promise<void> {
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"._migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function hasSchema(sql: postgres.Sql, schemaName: string): Promise<boolean> {
  const rows = await sql.unsafe<{ count: number }[]>(
    `SELECT 1 AS count FROM information_schema.schemata WHERE schema_name = '${schemaName.replace(/'/g, "''")}'`,
  );
  return rows.length > 0;
}

async function listTablesInSchema(
  sql: postgres.Sql,
  schemaName: string,
): Promise<readonly string[]> {
  const rows = await sql.unsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  return rows.map((row) => row.table_name);
}

async function listColumns(
  sql: postgres.Sql,
  schemaName: string,
  tableName: string,
): Promise<readonly string[]> {
  const rows = await sql.unsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}' ORDER BY ordinal_position`,
  );
  return rows.map((row) => row.column_name);
}

/**
 * Clone the structure + data of every table in `sourceSchemaName` into
 * `targetSchemaName`, in the spirit of Neon's branch databases. Implements
 * the "clone then apply migrations" pattern: structure via
 * `CREATE TABLE … LIKE … INCLUDING ALL`, data via `INSERT INTO …
 * SELECT … ON CONFLICT DO NOTHING`, with caller-declared columns
 * (e.g. S3 object keys) NULLed in the SELECT list to keep references
 * to the prod bucket from leaking into preview app code.
 *
 * Idempotent: re-running after the first deploy hits `IF NOT EXISTS`
 * on the structural step and `ON CONFLICT DO NOTHING` on the data step,
 * so previously-cloned rows survive and any newly-added prod rows
 * propagate.
 *
 * Constraints in mind:
 * - DSQL caps a single DML transaction at 3,000 rows. Tables larger
 *   than that need chunking, which v1 doesn't ship — the runner will
 *   throw cleanly via DSQL's "row limit exceeded" error rather than
 *   silently lose rows, and the comment here flags the gap.
 * - DSQL forbids multi-DDL transactions; every CREATE/INSERT below
 *   ships in its own `sql.unsafe()` round-trip.
 */
async function cloneFromSchema(
  sql: postgres.Sql,
  targetSchemaName: string,
  config: CloneFromSchemaProps,
): Promise<void> {
  if (config.sourceSchemaName === targetSchemaName) return;
  if (!(await hasSchema(sql, config.sourceSchemaName))) return;

  const blocklist = config.tableBlocklist ?? [];
  const nullifyMap = config.columnsToNullify ?? {};
  const sourceTables = await listTablesInSchema(sql, config.sourceSchemaName);

  // Structure first — for every prod table including session blocklisted
  // ones, the target needs the empty shape so the application can write
  // to it post-deploy. `_migrations` is already created by ensureSchema,
  // so `CREATE TABLE IF NOT EXISTS` makes it a no-op there.
  for (const table of sourceTables) {
    await sql.unsafe(buildCreateTableLikeSql(config.sourceSchemaName, targetSchemaName, table));
  }

  // Data step — blocklisted (runtime state) tables keep their shape and lose
  // their rows.
  for (const table of selectCloneableDataTables(sourceTables, blocklist)) {
    const columns = await listColumns(sql, config.sourceSchemaName, table);
    if (columns.length === 0) continue;
    const nullifyColumns = nullifyMap[table] ?? [];
    await sql.unsafe(
      buildCloneInsertSql(
        config.sourceSchemaName,
        targetSchemaName,
        table,
        columns,
        nullifyColumns,
      ),
    );
  }

  // `_migrations` is special: its rows ARE the applied-migrations
  // marker that `applyMigrations` checks below. Copy them so the
  // runner short-circuits every migration prod already ran on the
  // cloned data, and only the PR's net-new migrations execute.
  const migrationsColumns = await listColumns(sql, config.sourceSchemaName, '_migrations');
  if (migrationsColumns.length > 0) {
    await sql.unsafe(
      buildCloneInsertSql(
        config.sourceSchemaName,
        targetSchemaName,
        '_migrations',
        migrationsColumns,
        [],
      ),
    );
  }
}

async function applyMigrations(
  sql: postgres.Sql,
  schemaName: string,
  migrations: readonly Migration[],
): Promise<void> {
  const applied = await sql.unsafe<{ name: string }[]>(
    `SELECT name FROM "${schemaName}"._migrations`,
  );
  const appliedNames = new Set(applied.map((row) => row.name));
  for (const migration of selectPendingMigrations(migrations, appliedNames)) {
    await sql.unsafe(`SET search_path TO "${schemaName}"`);
    // Aurora DSQL rejects multiple DDL statements in one transaction
    // ("multiple ddl statements not supported in a transaction"), and
    // `sql.unsafe(<multi-statement>)` would wrap the file's CREATE TABLE
    // / CREATE INDEX / ALTER TABLE block in a single tx. Drizzle-kit
    // separates statements with `--> statement-breakpoint`; we run each
    // fragment in its own round-trip so DSQL sees one DDL per tx.
    for (const statement of splitStatements(migration.sql)) {
      await sql.unsafe(statement);
    }
    // `ON CONFLICT DO NOTHING` is the only concurrency guard we get on
    // Aurora DSQL — `pg_advisory_lock` is not in the supported subset,
    // so two simultaneous custom-resource retries can race here. The
    // duplicate INSERT would otherwise throw and fail the deploy.
    await sql.unsafe(
      `INSERT INTO "${schemaName}"._migrations(name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [migration.name],
    );
  }
}

async function dropSchema(sql: postgres.Sql, schemaName: string): Promise<void> {
  await sql.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}

async function provisionSchema(sql: postgres.Sql, props: ResourceProps): Promise<void> {
  await ensureSchema(sql, props.schemaName);
  if (props.cloneFromSchema !== undefined) {
    await cloneFromSchema(sql, props.schemaName, props.cloneFromSchema);
  }
  await applyMigrations(sql, props.schemaName, props.migrations);
}

export async function handler(event: CfnEvent): Promise<CfnResponse> {
  const props = event.ResourceProperties;
  const physicalId = event.PhysicalResourceId ?? `dsql-schema:${props.schemaName}`;

  const applyByRequestType = {
    Create: async (sql: postgres.Sql) => provisionSchema(sql, props),
    Update: async (sql: postgres.Sql) => provisionSchema(sql, props),
    Delete: async (sql: postgres.Sql) => dropSchema(sql, props.schemaName),
  } as const;

  const sql = await connect(props);
  try {
    await applyByRequestType[event.RequestType](sql);
  } finally {
    await sql.end({ timeout: 5 });
  }

  return {
    PhysicalResourceId: physicalId,
    Data: { SchemaName: props.schemaName },
  };
}
