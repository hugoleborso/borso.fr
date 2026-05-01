import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface UnsafeCall {
  readonly query: string;
  readonly params?: readonly unknown[];
}

const state: {
  unsafeCalls: UnsafeCall[];
  taggedCalls: string[];
  ended: number;
  appliedMigrations: Set<string>;
} = {
  unsafeCalls: [],
  taggedCalls: [],
  ended: 0,
  appliedMigrations: new Set(),
};

function makeSql() {
  const sql = ((strings: TemplateStringsArray) => {
    state.taggedCalls.push(strings.join('?'));
    return Promise.resolve([]);
  }) as unknown as {
    (strings: TemplateStringsArray, ...values: readonly unknown[]): Promise<unknown[]>;
    unsafe<T>(query: string, params?: readonly unknown[]): Promise<T>;
    end(opts: { timeout: number }): Promise<void>;
  };
  sql.unsafe = <T>(query: string, params?: readonly unknown[]): Promise<T> => {
    state.unsafeCalls.push({ query, ...(params ? { params } : {}) });
    if (/SELECT name FROM/i.test(query)) {
      const rows = [...state.appliedMigrations].map((name) => ({ name }));
      return Promise.resolve(rows as unknown as T);
    }
    if (/INSERT INTO/.test(query) && params?.[0]) {
      state.appliedMigrations.add(String(params[0]));
    }
    return Promise.resolve([] as unknown as T);
  };
  sql.end = ({ timeout: _t }: { timeout: number }) => {
    state.ended++;
    return Promise.resolve();
  };
  return sql;
}

vi.mock('postgres', () => ({
  default: vi.fn(() => makeSql()),
}));

vi.mock('@aws-sdk/dsql-signer', () => ({
  DsqlSigner: vi.fn().mockImplementation(() => ({
    getDbConnectAdminAuthToken: () => Promise.resolve('TOKEN'),
  })),
}));

const { handler } = await import('../../src/internal/migration-runner/index.js');

const baseProps = {
  ServiceToken: 'arn:fake',
  clusterEndpoint: 'cluster.dsql.eu-west-3.on.aws',
  region: 'eu-west-3',
  schemaName: 'pragma',
  migrations: [
    { name: '0001_init.sql', sql: 'CREATE TABLE a (id INT);' },
    { name: '0002_more.sql', sql: 'CREATE TABLE b (id INT);' },
  ],
};

beforeEach(() => {
  state.unsafeCalls = [];
  state.taggedCalls = [];
  state.ended = 0;
  state.appliedMigrations = new Set();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('migration-runner handler', () => {
  it('Create: ensures schema, applies all migrations, returns physicalId', async () => {
    const result = await handler({
      RequestType: 'Create',
      ResourceProperties: baseProps,
    });
    expect(result.PhysicalResourceId).toBe('dsql-schema:pragma');
    expect(result.Data?.SchemaName).toBe('pragma');

    const queries = state.unsafeCalls.map((c) => c.query).join('\n');
    expect(queries).toMatch(/CREATE SCHEMA IF NOT EXISTS "pragma"/);
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS "pragma"\._migrations/);
    expect(queries).toMatch(/CREATE TABLE a/);
    expect(queries).toMatch(/CREATE TABLE b/);
    expect(state.appliedMigrations.has('0001_init.sql')).toBe(true);
    expect(state.appliedMigrations.has('0002_more.sql')).toBe(true);
    expect(state.ended).toBe(1);
    // advisory lock acquired + released via tagged-template calls
    expect(state.taggedCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('Create: skips migrations already in _migrations', async () => {
    state.appliedMigrations.add('0001_init.sql');
    await handler({
      RequestType: 'Create',
      ResourceProperties: baseProps,
    });
    const sqlsRun = state.unsafeCalls
      .map((c) => c.query)
      .filter((q) => /CREATE TABLE [ab] /.test(q));
    expect(sqlsRun.some((s) => s.includes('CREATE TABLE a'))).toBe(false);
    expect(sqlsRun.some((s) => s.includes('CREATE TABLE b'))).toBe(true);
  });

  it('Update: passes through PhysicalResourceId', async () => {
    const result = await handler({
      RequestType: 'Update',
      PhysicalResourceId: 'existing-id',
      ResourceProperties: baseProps,
      OldResourceProperties: baseProps,
    });
    expect(result.PhysicalResourceId).toBe('existing-id');
  });

  it('Delete: drops the schema CASCADE and does not apply migrations', async () => {
    await handler({
      RequestType: 'Delete',
      PhysicalResourceId: 'dsql-schema:pragma',
      ResourceProperties: baseProps,
    });
    const queries = state.unsafeCalls.map((c) => c.query);
    expect(queries.some((q) => /DROP SCHEMA IF EXISTS "pragma" CASCADE/.test(q))).toBe(true);
    expect(queries.some((q) => /CREATE SCHEMA/.test(q))).toBe(false);
    expect(state.ended).toBe(1);
  });

  it('releases the advisory lock even on inner failure', async () => {
    // make the first unsafe (CREATE SCHEMA) reject
    const real = makeSql();
    const failing = ((..._args: unknown[]) =>
      Promise.resolve([])) as unknown as ReturnType<typeof makeSql>;
    failing.unsafe = () => Promise.reject(new Error('boom'));
    failing.end = real.end;

    const postgresMod = await import('postgres');
    (postgresMod.default as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(failing);

    await expect(
      handler({ RequestType: 'Create', ResourceProperties: baseProps }),
    ).rejects.toThrow('boom');
    expect(state.ended).toBe(1); // sql.end() must run via finally
  });
});
