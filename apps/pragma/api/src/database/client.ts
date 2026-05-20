/**
 * Drizzle client over Aurora DSQL via `postgres-js` + `@aws-sdk/dsql-signer`.
 * Mirrors the shape of `apps/last-loop-lepin/api/src/database/client.ts` —
 * one singleton per Lambda container, lazy DSQL token refresh via the
 * `password` callback.
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

export function getDatabase(): Database {
  if (cachedDatabase !== null) return cachedDatabase;
  const dsql = readDsqlConfig();
  const local = readLocalConfig();
  const client =
    dsql !== null ? createDsqlClient(dsql) : local !== null ? createLocalClient(local) : null;
  if (client === null) {
    throw new Error('Database not configured: set DSQL_ENDPOINT+DSQL_SCHEMA or DATABASE_URL.');
  }
  cachedDatabase = drizzle(client, { schema });
  return cachedDatabase;
}

