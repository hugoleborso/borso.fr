import { DsqlSigner } from '@aws-sdk/dsql-signer';
import postgres from 'postgres';
import {
  buildReadOnlySessionCommands,
  decideReadOnlyQuery,
  decideTableAccess,
  ROW_CAP,
} from './read-only-query.utils.js';

const PG_DATABASE = 'postgres';
const PG_PORT = 5432;
const CONNECTION_CLOSE_TIMEOUT_SECONDS = 5;
const BLOCKLIST_SEPARATOR = ',';

export const ENDPOINT_VARIABLE = 'DSQL_ENDPOINT';
export const SCHEMA_VARIABLE = 'DSQL_SCHEMA';
export const ROLE_VARIABLE = 'DSQL_ROLE';
export const BLOCKLIST_VARIABLE = 'READER_TABLE_BLOCKLIST';
export const REGION_VARIABLE = 'AWS_REGION';

const MISSING_QUERY_REFUSAL = 'the request carries no "query" string.';

export interface AgentReadEvent {
  readonly query?: unknown;
}

export type AgentReadResult =
  | {
      readonly rows: readonly unknown[];
      readonly rowCount: number;
      readonly capped: boolean;
      readonly schema: string;
      readonly role: string;
    }
  | { readonly refused: string };

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`agent-reader: ${name} is not set on the function.`);
  }
  return value;
}

function readBlocklist(): string[] {
  const raw = process.env[BLOCKLIST_VARIABLE] ?? '';
  return raw
    .split(BLOCKLIST_SEPARATOR)
    .map((table) => table.trim())
    .filter((table) => table !== '');
}

async function connectAsReader(schema: string, role: string): Promise<postgres.Sql> {
  const hostname = requireEnvironment(ENDPOINT_VARIABLE);
  const signer = new DsqlSigner({ hostname, region: requireEnvironment(REGION_VARIABLE) });
  const token = await signer.getDbConnectAuthToken();
  return postgres({
    host: hostname,
    port: PG_PORT,
    user: role,
    password: token,
    database: PG_DATABASE,
    ssl: 'require',
    max: 1,
    prepare: false,
    connection: { search_path: schema, default_transaction_read_only: true },
  });
}

async function runInReadOnlyTransaction(
  sql: postgres.Sql,
  statement: string,
): Promise<readonly unknown[]> {
  const [begin, cappedSelect, rollback] = buildReadOnlySessionCommands(statement, ROW_CAP);
  await sql.unsafe(begin);
  try {
    return [...(await sql.unsafe(cappedSelect))];
  } finally {
    await sql.unsafe(rollback);
  }
}

export async function handler(event: AgentReadEvent): Promise<AgentReadResult> {
  if (typeof event.query !== 'string') return { refused: MISSING_QUERY_REFUSAL };

  const queryDecision = decideReadOnlyQuery(event.query);
  if (!queryDecision.accepted) return { refused: queryDecision.reason };

  const tableAccess = decideTableAccess(queryDecision.statement, readBlocklist());
  if (!tableAccess.accepted) return { refused: tableAccess.reason };

  const schema = requireEnvironment(SCHEMA_VARIABLE);
  const role = requireEnvironment(ROLE_VARIABLE);
  const sql = await connectAsReader(schema, role);
  try {
    const rows = await runInReadOnlyTransaction(sql, tableAccess.statement);
    return { rows, rowCount: rows.length, capped: rows.length === ROW_CAP, schema, role };
  } finally {
    await sql.end({ timeout: CONNECTION_CLOSE_TIMEOUT_SECONDS });
  }
}
