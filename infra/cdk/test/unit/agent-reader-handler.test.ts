import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSql, resetAgentReaderMockState, state } from './helpers/agent-reader-mock.js';

vi.mock('postgres', () => ({
  default: vi.fn((options: Record<string, unknown>) => makeSql(options)),
}));

vi.mock('@aws-sdk/dsql-signer', () => ({
  DsqlSigner: vi.fn().mockImplementation(function mockDsqlSigner(this: {
    getDbConnectAuthToken: () => Promise<string>;
  }) {
    this.getDbConnectAuthToken = () => Promise.resolve('TOKEN');
  }),
}));

const { handler } = await import('../../src/internal/agent-reader/index.js');

const ENVIRONMENT = {
  DSQL_ENDPOINT: 'cluster.dsql.eu-west-3.on.aws',
  DSQL_SCHEMA: 'prod',
  DSQL_ROLE: 'ai_reader_prod',
  READER_TABLE_BLOCKLIST: 'member_credential,auth_attempt',
  AWS_REGION: 'eu-west-3',
} as const;

function refusalFor(answer: Awaited<ReturnType<typeof handler>>): string {
  if (!('refused' in answer)) throw new Error('expected a refusal');
  return answer.refused;
}

beforeEach(() => {
  resetAgentReaderMockState();
  for (const [name, value] of Object.entries(ENVIRONMENT)) vi.stubEnv(name, value);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// @FollowsBlueprint test-handler-mocked-sdk
describe('agent-reader handler', () => {
  it('runs the statement inside a read-only transaction it rolls back', async () => {
    state.rows = [{ count: 3 }];
    const answer = await handler({ query: 'SELECT count(*) FROM member' });
    expect(answer).toStrictEqual({
      rows: [{ count: 3 }],
      rowCount: 1,
      capped: false,
      schema: 'prod',
      role: 'ai_reader_prod',
    });
    expect(state.queries[0]).toBe('BEGIN READ ONLY');
    expect(state.queries[1]).toContain('LIMIT 200');
    expect(state.queries[2]).toBe('ROLLBACK');
    expect(state.ended).toBe(1);
  });

  it('connects as the reader role, on the schema, with the session read only', async () => {
    await handler({ query: 'SELECT 1' });
    expect(state.options).toMatchObject({
      host: ENVIRONMENT.DSQL_ENDPOINT,
      user: 'ai_reader_prod',
      password: 'TOKEN',
      max: 1,
      connection: { search_path: 'prod', default_transaction_read_only: true },
    });
  });

  it('reports the result as capped when the row cap was reached', async () => {
    state.rows = Array.from({ length: 200 }, (_unused, index) => ({ index }));
    const answer = await handler({ query: 'SELECT * FROM member' });
    expect(answer).toMatchObject({ rowCount: 200, capped: true });
  });

  it('refuses a request with no query string', async () => {
    expect(refusalFor(await handler({}))).toContain('no "query" string');
    expect(refusalFor(await handler({ query: 17 }))).toContain('no "query" string');
    expect(state.queries).toStrictEqual([]);
  });

  it('refuses a write before opening any connection', async () => {
    expect(refusalFor(await handler({ query: 'DELETE FROM member' }))).toContain(
      'must start with SELECT or WITH',
    );
    expect(state.queries).toStrictEqual([]);
  });

  it('refuses a blocklisted table named in the environment', async () => {
    const refusal = refusalFor(await handler({ query: 'SELECT 1 FROM member_credential' }));
    expect(refusal).toContain('member_credential');
    expect(state.queries).toStrictEqual([]);
  });

  it('reads an empty blocklist as blocking nothing', async () => {
    vi.stubEnv('READER_TABLE_BLOCKLIST', '');
    const answer = await handler({ query: 'SELECT 1 FROM member_credential' });
    expect(answer).toMatchObject({ rowCount: 0 });
  });

  it('reads an unset blocklist variable as blocking nothing', async () => {
    vi.stubEnv('READER_TABLE_BLOCKLIST', undefined);
    const answer = await handler({ query: 'SELECT 1 FROM member_credential' });
    expect(answer).toMatchObject({ rowCount: 0 });
  });

  it('ignores blank entries and surrounding spaces in the blocklist', async () => {
    vi.stubEnv('READER_TABLE_BLOCKLIST', ' member_credential , ,auth_attempt ');
    expect(refusalFor(await handler({ query: 'SELECT 1 FROM auth_attempt' }))).toContain(
      'auth_attempt',
    );
  });

  it('closes the connection and rolls back when the statement itself fails', async () => {
    state.failOn = 'capped_result';
    await expect(handler({ query: 'SELECT oops FROM member' })).rejects.toThrow('boom');
    expect(state.queries.at(-1)).toBe('ROLLBACK');
    expect(state.ended).toBe(1);
  });

  it('names the variable that is missing rather than connecting as nothing', async () => {
    vi.stubEnv('DSQL_ROLE', '');
    await expect(handler({ query: 'SELECT 1' })).rejects.toThrow('DSQL_ROLE is not set');
  });

  it('names a variable that is absent entirely', async () => {
    vi.stubEnv('DSQL_ENDPOINT', undefined);
    await expect(handler({ query: 'SELECT 1' })).rejects.toThrow('DSQL_ENDPOINT is not set');
  });
});
