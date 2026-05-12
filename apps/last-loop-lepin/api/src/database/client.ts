/**
 * Drizzle client over Aurora DSQL via `postgres-js` + `@aws-sdk/dsql-signer`.
 *
 * Cold-start contract:
 * - `getDatabase()` is a process-level singleton — the Lambda creates one
 *   client on first invocation and reuses the same socket on warm starts.
 * - The DSQL token is regenerated lazily via the `password` callback when
 *   `postgres-js` needs a new connection. AWS issues tokens that expire
 *   after one hour; if a connection survives that long, the next reconnect
 *   uses a fresh token.
 *
 * Local dev: set `STAGE=dev` and provide `DATABASE_URL` (a plain Postgres
 * connection string for a local docker-postgres) — `DsqlSigner` is skipped.
 */

import { DsqlSigner } from '@aws-sdk/dsql-signer';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

const DSQL_PORT = 5432;
const DSQL_USER = 'admin';
const DSQL_DATABASE = 'postgres';

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
export type Database = DrizzleClient;

interface DatabaseConfig {
  readonly endpoint: string;
  readonly schemaName: string;
  readonly region: string;
}

interface LocalConfig {
  readonly databaseUrl: string;
}

let cachedDatabase: Database | null = null;
let cachedClient: Sql | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
}

function readDsqlConfig(): DatabaseConfig | null {
  const endpoint = readEnv('DSQL_ENDPOINT');
  const schemaName = readEnv('DSQL_SCHEMA');
  const region = readEnv('AWS_REGION') ?? 'eu-west-3';
  if (endpoint === undefined || schemaName === undefined) return null;
  return { endpoint, schemaName, region };
}

function readLocalConfig(): LocalConfig | null {
  const databaseUrl = readEnv('DATABASE_URL');
  if (databaseUrl === undefined) return null;
  return { databaseUrl };
}

function createDsqlClient(config: DatabaseConfig): Sql {
  const signer = new DsqlSigner({ hostname: config.endpoint, region: config.region });
  return postgres({
    host: config.endpoint,
    port: DSQL_PORT,
    database: DSQL_DATABASE,
    user: DSQL_USER,
    ssl: 'require',
    password: () => signer.getDbConnectAdminAuthToken(),
    types: { bigint: postgres.BigInt },
    connection: { search_path: config.schemaName },
  });
}

function createLocalClient(config: LocalConfig): Sql {
  return postgres(config.databaseUrl, { types: { bigint: postgres.BigInt } });
}

/**
 * Returns the process-wide singleton Drizzle client. Constructs it on first
 * call using `DSQL_ENDPOINT` / `DSQL_SCHEMA` (Lambda) or `DATABASE_URL`
 * (local dev / testcontainers).
 */
export function getDatabase(): Database {
  if (cachedDatabase !== null) return cachedDatabase;
  const dsql = readDsqlConfig();
  const local = readLocalConfig();
  const client = dsql !== null ? createDsqlClient(dsql) : local !== null ? createLocalClient(local) : null;
  if (client === null) {
    throw new Error(
      'Database not configured: set DSQL_ENDPOINT+DSQL_SCHEMA or DATABASE_URL.',
    );
  }
  cachedClient = client;
  cachedDatabase = drizzle(client, { schema });
  return cachedDatabase;
}

/** Test-only: forget the cached client so the next `getDatabase()` rebuilds. */
export function resetDatabaseForTests(): void {
  cachedDatabase = null;
  void cachedClient?.end({ timeout: 1 });
  cachedClient = null;
}
