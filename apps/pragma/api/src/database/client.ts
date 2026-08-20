/**
 * @DependsOnExternal aws-dsql
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

export type DatabaseExecutor = Parameters<Parameters<Database['transaction']>[0]>[0] | Database;

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

/**
 * @Blueprint database-client
 * @BlueprintName Database Client Singleton
 * @BlueprintUsage Use for the one module a repository imports to reach the database.
 * @BlueprintDescription Builds the Drizzle client once per process and caches it, choosing the DSQL connection when the endpoint and schema variables are set and the plain `DATABASE_URL` otherwise. The DSQL password is a callback rather than a value, so the signer mints a fresh token per connection instead of one that expires with the container. `DatabaseExecutor` above widens the client to include a transaction handle, which is how a repository runs the same query inside or outside a transaction.
 */
export function getDatabase(): Database {
  if (cachedDatabase !== null) return cachedDatabase;
  const dsql = readDsqlConfig();
  const local = readLocalConfig();
  const client =
    dsql === null ? (local === null ? null : createLocalClient(local)) : createDsqlClient(dsql);
  if (client === null) {
    throw new Error('Database not configured: set DSQL_ENDPOINT+DSQL_SCHEMA or DATABASE_URL.');
  }
  cachedDatabase = drizzle(client, { schema });
  return cachedDatabase;
}
