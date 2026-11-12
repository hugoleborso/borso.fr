import postgres from 'postgres';

const DSQL_PORT = 5432;
const DSQL_DATABASE = 'postgres';

export interface DsqlConnection {
  readonly endpoint: string;
  readonly schemaName: string;
  readonly roleName: string;
}

export type ReadPassword = () => Promise<string>;

const SHARED_CLIENT_OPTIONS = {
  types: { bigint: postgres.BigInt },
  fetch_types: false,
} as const;

// @FollowsBlueprint core-decision
export function buildLocalClientOptions() {
  return { ...SHARED_CLIENT_OPTIONS };
}

export function buildDsqlClientOptions(connection: DsqlConnection, readPassword: ReadPassword) {
  return {
    ...SHARED_CLIENT_OPTIONS,
    host: connection.endpoint,
    port: DSQL_PORT,
    database: DSQL_DATABASE,
    user: connection.roleName,
    ssl: 'require' as const,
    password: readPassword,
    connection: { search_path: connection.schemaName },
  };
}
