/**
 * @DependsOnExternal aws-dsql
 */

import { DsqlSigner } from '@aws-sdk/dsql-signer';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import { retryingConflictAbortsOf } from '../helpers/persistence/conflict-abort.core';
import * as schema from './schema';

const DSQL_PORT = 5432;
const DSQL_DATABASE = 'postgres';

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
export type Database = DrizzleClient;

export type DatabaseExecutor = Parameters<Parameters<Database['transaction']>[0]>[0] | Database;

interface DatabaseConfig {
  readonly endpoint: string;
  readonly schemaName: string;
  readonly roleName: string;
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
  const roleName = readEnv('DSQL_ROLE');
  const region = readEnv('AWS_REGION') ?? 'eu-west-3';
  if (endpoint === undefined || schemaName === undefined || roleName === undefined) return null;
  return { endpoint, schemaName, roleName, region };
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
    user: config.roleName,
    ssl: 'require',
    password: () => signer.getDbConnectAuthToken(),
    types: { bigint: postgres.BigInt },
    connection: { search_path: config.schemaName },
    fetch_types: false,
  });
}

function createLocalClient(config: LocalConfig): Sql {
  return postgres(config.databaseUrl, { types: { bigint: postgres.BigInt }, fetch_types: false });
}

/**
 * @Blueprint database-client
 * @BlueprintName Database Client Singleton
 * @BlueprintUsage Use for the one module a repository imports to reach the database.
 * @BlueprintDescription Builds the Drizzle client once per process and caches it, choosing the DSQL connection when the endpoint and schema variables are set and the plain `DATABASE_URL` otherwise. The DSQL password is a callback rather than a value, so the signer mints a fresh token per connection instead of one that expires with the container. `DatabaseExecutor` above widens the client to include a transaction handle, which is how a repository runs the same query inside or outside a transaction. Every statement and every transaction is retried on a DSQL conflict, OC001 included when a deploy migrates the schema under live traffic, because a refused one committed nothing. A statement run alone is retried by itself; a transaction is retried whole, since one of its statements alone cannot be. Both clients turn `fetch_types` off, because postgres.js otherwise sends one `pg_catalog` query on every new connection to learn the array types, 313 ms of a 716 ms first connection on DSQL; the price is that an array comes back as its text form, so a schema that gains an array column turns it back on.
 */
export function getDatabase(): Database {
  if (cachedDatabase !== null) return cachedDatabase;
  const dsql = readDsqlConfig();
  const local = readLocalConfig();
  const client =
    dsql === null ? (local === null ? null : createLocalClient(local)) : createDsqlClient(dsql);
  if (client === null) {
    throw new Error(
      'Database not configured: set DSQL_ENDPOINT+DSQL_SCHEMA+DSQL_ROLE or DATABASE_URL.',
    );
  }
  cachedDatabase = drizzle(retryingConflictAbortsOf(client), { schema });
  return cachedDatabase;
}
