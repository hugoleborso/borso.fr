/**
 * DSQL migration runner. Invoked as a CloudFormation custom resource by the
 * `DsqlSchema` construct. Creates the schema, applies migrations idempotently,
 * and DROPs the schema CASCADE on stack delete.
 *
 * Untested against real DSQL — see docs/architecture.md for known caveats
 * (no FKs, optimistic concurrency, retryable transactions). Treat all SQL
 * here as forward-only.
 *
 * Custom resource event properties (set by the construct):
 *   - clusterEndpoint: DSQL cluster Postgres endpoint
 *   - region:          AWS region of the cluster
 *   - schemaName:      schema to manage
 *   - migrations:      [{ name: string, sql: string }] in apply order
 *
 * @internal
 */

import { DsqlSigner } from '@aws-sdk/dsql-signer';
import postgres from 'postgres';

interface Migration {
  readonly name: string;
  readonly sql: string;
}

interface ResourceProps {
  readonly clusterEndpoint: string;
  readonly region: string;
  readonly schemaName: string;
  readonly migrations: readonly Migration[];
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

const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

function splitStatements(sql: string): readonly string[] {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

async function applyMigrations(
  sql: postgres.Sql,
  schemaName: string,
  migrations: readonly Migration[],
): Promise<void> {
  const applied = await sql.unsafe<{ name: string }[]>(
    `SELECT name FROM "${schemaName}"._migrations`,
  );
  const appliedSet = new Set(applied.map((row) => row.name));
  for (const m of migrations) {
    if (appliedSet.has(m.name)) continue;
    await sql.unsafe(`SET search_path TO "${schemaName}"`);
    // Aurora DSQL rejects multiple DDL statements in one transaction
    // ("multiple ddl statements not supported in a transaction"), and
    // `sql.unsafe(<multi-statement>)` would wrap the file's CREATE TABLE
    // / CREATE INDEX / ALTER TABLE block in a single tx. Drizzle-kit
    // separates statements with `--> statement-breakpoint`; we run each
    // fragment in its own round-trip so DSQL sees one DDL per tx.
    for (const statement of splitStatements(m.sql)) {
      await sql.unsafe(statement);
    }
    // `ON CONFLICT DO NOTHING` is the only concurrency guard we get on
    // Aurora DSQL — `pg_advisory_lock` is not in the supported subset,
    // so two simultaneous custom-resource retries can race here. The
    // duplicate INSERT would otherwise throw and fail the deploy.
    await sql.unsafe(
      `INSERT INTO "${schemaName}"._migrations(name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [m.name],
    );
  }
}

async function dropSchema(sql: postgres.Sql, schemaName: string): Promise<void> {
  await sql.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}

export async function handler(event: CfnEvent): Promise<CfnResponse> {
  const props = event.ResourceProperties;
  const physicalId = event.PhysicalResourceId ?? `dsql-schema:${props.schemaName}`;

  const sql = await connect(props);
  try {
    if (event.RequestType === 'Delete') {
      await dropSchema(sql, props.schemaName);
    } else {
      await ensureSchema(sql, props.schemaName);
      await applyMigrations(sql, props.schemaName, props.migrations);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  return {
    PhysicalResourceId: physicalId,
    Data: { SchemaName: props.schemaName },
  };
}
