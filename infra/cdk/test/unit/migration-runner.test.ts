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
  /** Test hook: if set, the next `.unsafe()` call rejects with this error. */
  rejectNextUnsafe: Error | null;
} = {
  unsafeCalls: [],
  taggedCalls: [],
  ended: 0,
  appliedMigrations: new Set(),
  rejectNextUnsafe: null,
};

/**
 * Minimal subset of the postgres.js `Sql<{}>` shape that the migration
 * runner actually touches at runtime. Declared here so the mock type can
 * be inferred via Object.assign — no `as Sql<...>` casts at the test
 * boundary, no need to satisfy the full library interface.
 */
type SqlMock = ((strings: TemplateStringsArray, ...values: readonly unknown[]) => Promise<unknown[]>) & {
  unsafe(query: string, params?: readonly unknown[]): Promise<unknown[]>;
  end(opts: { readonly timeout: number }): Promise<void>;
};

function makeSql(): SqlMock {
  const callable = (strings: TemplateStringsArray, ..._values: readonly unknown[]) => {
    state.taggedCalls.push(strings.join('?'));
    return Promise.resolve([]);
  };
  return Object.assign(callable, {
    unsafe(query: string, params?: readonly unknown[]) {
      if (state.rejectNextUnsafe !== null) {
        const error = state.rejectNextUnsafe;
        state.rejectNextUnsafe = null;
        return Promise.reject(error);
      }
      state.unsafeCalls.push({ query, ...(params ? { params } : {}) });
      if (/SELECT name FROM/i.test(query)) {
        return Promise.resolve([...state.appliedMigrations].map((name) => ({ name })));
      }
      if (/INSERT INTO/.test(query) && params?.[0] !== undefined) {
        state.appliedMigrations.add(String(params[0]));
      }
      return Promise.resolve([]);
    },
    end(_opts: { readonly timeout: number }) {
      state.ended++;
      return Promise.resolve();
    },
  });
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
  schemaName: 'test_app',
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
  state.rejectNextUnsafe = null;
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
    expect(result.PhysicalResourceId).toBe('dsql-schema:test_app');
    expect(result.Data?.SchemaName).toBe('test_app');

    const queries = state.unsafeCalls.map((c) => c.query).join('\n');
    expect(queries).toMatch(/CREATE SCHEMA IF NOT EXISTS "test_app"/);
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS "test_app"\._migrations/);
    // Migration SQL is run through `makeIdempotent` before each round-trip
    // so DSQL can retry a half-applied migration (a relation may already
    // exist from a previous failed run).
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS a/);
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS b/);
    expect(state.appliedMigrations.has('0001_init.sql')).toBe(true);
    expect(state.appliedMigrations.has('0002_more.sql')).toBe(true);
    expect(state.ended).toBe(1);
    // Aurora DSQL doesn't support `pg_advisory_lock`; the runner now
    // relies on (a) CFN's single-invocation contract for serialisation
    // within one deploy, (b) `INSERT ... ON CONFLICT DO NOTHING` for
    // belt-and-suspenders. No tagged-template lock calls should fire.
    expect(state.taggedCalls.length).toBe(0);
  });

  it('Create: skips migrations already in _migrations', async () => {
    state.appliedMigrations.add('0001_init.sql');
    await handler({
      RequestType: 'Create',
      ResourceProperties: baseProps,
    });
    const sqlsRun = state.unsafeCalls
      .map((c) => c.query)
      .filter((q) => /CREATE TABLE (IF NOT EXISTS )?[ab] /.test(q));
    expect(sqlsRun.some((s) => /CREATE TABLE IF NOT EXISTS a/.test(s))).toBe(false);
    expect(sqlsRun.some((s) => /CREATE TABLE IF NOT EXISTS b/.test(s))).toBe(true);
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
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: baseProps,
    });
    const queries = state.unsafeCalls.map((c) => c.query);
    expect(queries.some((q) => /DROP SCHEMA IF EXISTS "test_app" CASCADE/.test(q))).toBe(true);
    expect(queries.some((q) => /CREATE SCHEMA/.test(q))).toBe(false);
    expect(state.ended).toBe(1);
  });

  it('Create: rewrites ALTER TABLE ADD COLUMN to ADD COLUMN IF NOT EXISTS so partial retries are safe', async () => {
    // DSQL §10 + §4: post-creation `ADD COLUMN` must survive a half-applied
    // migration retry (`column "x" of relation "y" already exists`). The
    // runner injects `IF NOT EXISTS` the same way it does for CREATE TABLE.
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        migrations: [
          { name: '0001_init.sql', sql: 'CREATE TABLE a (id INT);' },
          {
            name: '0002_columns.sql',
            sql: 'ALTER TABLE a ADD COLUMN b TEXT;\n--> statement-breakpoint\nALTER TABLE a ADD COLUMN c INT;',
          },
        ],
      },
    });
    const queries = state.unsafeCalls.map((c) => c.query);
    expect(queries.some((q) => /ALTER TABLE a ADD COLUMN IF NOT EXISTS b/.test(q))).toBe(true);
    expect(queries.some((q) => /ALTER TABLE a ADD COLUMN IF NOT EXISTS c/.test(q))).toBe(true);
    // A statement that already has IF NOT EXISTS shouldn't be doubled up.
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        migrations: [
          { name: '0003_again.sql', sql: 'ALTER TABLE a ADD COLUMN IF NOT EXISTS d BOOL;' },
        ],
      },
    });
    const requeried = state.unsafeCalls.map((c) => c.query).join('\n');
    expect(requeried).not.toMatch(/ADD COLUMN IF NOT EXISTS IF NOT EXISTS/);
  });

  it('releases the advisory lock even on inner failure', async () => {
    // Arm the shared mock to reject the very next `.unsafe()` call.
    // `.end()` still bumps `state.ended` so the test confirms the
    // `finally` block ran.
    state.rejectNextUnsafe = new Error('boom');

    await expect(
      handler({ RequestType: 'Create', ResourceProperties: baseProps }),
    ).rejects.toThrow('boom');
    expect(state.ended).toBe(1); // sql.end() must run via finally
  });
});
