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
let probedQueries = 0;
const PROBED_QUERY_LIMIT = 6;
const PROBED_QUERY_PREVIEW_LENGTH = 40;

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
    password: async () => {
      const startedAt = performance.now();
      const token = await signer.getDbConnectAuthToken();
      process.stdout.write(
        `${JSON.stringify({ probe: 'dsql.token', at_ms: Math.round(performance.now()), duration_ms: Math.round(performance.now() - startedAt) })}\n`,
      );
      return token;
    },
    types: { bigint: postgres.BigInt },
    connection: { search_path: config.schemaName },
    debug: (_connection, query) => {
      if (probedQueries >= PROBED_QUERY_LIMIT) return;
      probedQueries += 1;
      process.stdout.write(
        `${JSON.stringify({ probe: 'dsql.query_sent', at_ms: Math.round(performance.now()), query: query.trim().slice(0, PROBED_QUERY_PREVIEW_LENGTH) })}\n`,
      );
    },
  });
}

function createLocalClient(config: LocalConfig): Sql {
  return postgres(config.databaseUrl, { types: { bigint: postgres.BigInt } });
}

/**
 * @Blueprint database-client
 * @BlueprintName Database Client Singleton
 * @BlueprintUsage Use for the one module a repository imports to reach the database.
 * @BlueprintDescription Builds the Drizzle client once per process and caches it, choosing the DSQL connection when the endpoint and schema variables are set and the plain `DATABASE_URL` otherwise. The DSQL password is a callback rather than a value, so the signer mints a fresh token per connection instead of one that expires with the container. `DatabaseExecutor` above widens the client to include a transaction handle, which is how a repository runs the same query inside or outside a transaction. Every statement and every transaction is retried on a DSQL conflict, OC001 included when a deploy migrates the schema under live traffic, because a refused one committed nothing. A statement run alone is retried by itself; a transaction is retried whole, since one of its statements alone cannot be.
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
