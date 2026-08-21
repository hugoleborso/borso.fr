import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  baseProps,
  makeSql,
  resetMigrationRunnerMockState,
  state,
} from './helpers/migration-runner-mock.js';

vi.mock('postgres', () => ({
  default: vi.fn(() => makeSql()),
}));

vi.mock('@aws-sdk/dsql-signer', () => ({
  DsqlSigner: vi.fn().mockImplementation(function mockDsqlSigner(this: {
    getDbConnectAdminAuthToken: () => Promise<string>;
  }) {
    this.getDbConnectAdminAuthToken = () => Promise.resolve('TOKEN');
  }),
}));

const { handler } = await import('../../src/internal/migration-runner/index.js');

beforeEach(() => {
  resetMigrationRunnerMockState();
});

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * @Blueprint test-handler-mocked-sdk
 * @BlueprintName Handler Test Over A Mocked SDK
 * @BlueprintUsage Use for a Lambda handler whose only collaborators are a third party SDK and a database driver.
 * @BlueprintDescription Registers every `vi.mock` first and imports the handler afterwards with a top level `await import`, because a static import would bind the real module before the mocks exist. The SQL double and its mutable state live in `helpers/`, outside the test glob and outside `src/`, so the harness neither auto-runs nor faces the coverage gate, and each case resets that state in `beforeEach`. Assertions read the recorded query strings, which is how the suite proves a statement rewrite reached the driver and how it proves the connection closed through `finally` after a rejection.
 */
describe('migration-runner handler', () => {
  it('Create: ensures schema, applies all migrations, returns physicalId', async () => {
    const response = await handler({
      RequestType: 'Create',
      ResourceProperties: baseProps,
    });
    expect(response.PhysicalResourceId).toBe('dsql-schema:test_app');
    expect(response.Data?.SchemaName).toBe('test_app');

    const queries = state.unsafeCalls.map((call) => call.query).join('\n');
    expect(queries).toMatch(/CREATE SCHEMA IF NOT EXISTS "test_app"/);
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS "test_app"\._migrations/);
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS a/);
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS b/);
    expect(state.appliedMigrations.has('0001_init.sql')).toBe(true);
    expect(state.appliedMigrations.has('0002_more.sql')).toBe(true);
    expect(state.ended).toBe(1);
    expect(state.taggedCalls.length).toBe(0);
  });

  it('Create: skips migrations already in _migrations', async () => {
    state.appliedMigrations.add('0001_init.sql');
    await handler({
      RequestType: 'Create',
      ResourceProperties: baseProps,
    });
    const sqlsRun = state.unsafeCalls
      .map((call) => call.query)
      .filter((query) => /CREATE TABLE (IF NOT EXISTS )?[ab] /.test(query));
    expect(sqlsRun.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS a'))).toBe(false);
    expect(sqlsRun.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS b'))).toBe(true);
  });

  it('Update: passes through PhysicalResourceId', async () => {
    const response = await handler({
      RequestType: 'Update',
      PhysicalResourceId: 'existing-id',
      ResourceProperties: baseProps,
      OldResourceProperties: baseProps,
    });
    expect(response.PhysicalResourceId).toBe('existing-id');
  });

  it('Delete: drops the schema CASCADE and does not apply migrations', async () => {
    await handler({
      RequestType: 'Delete',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: baseProps,
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(
      queries.some((query) => query.includes('DROP SCHEMA IF EXISTS "test_app" CASCADE')),
    ).toBe(true);
    expect(queries.some((query) => query.includes('CREATE SCHEMA'))).toBe(false);
    expect(state.ended).toBe(1);
  });

  it('Create: rewrites ALTER TABLE ADD COLUMN to ADD COLUMN IF NOT EXISTS so partial retries are safe', async () => {
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
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(
      queries.some((query) => query.includes('ALTER TABLE a ADD COLUMN IF NOT EXISTS b')),
    ).toBe(true);
    expect(
      queries.some((query) => query.includes('ALTER TABLE a ADD COLUMN IF NOT EXISTS c')),
    ).toBe(true);
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        migrations: [
          { name: '0003_again.sql', sql: 'ALTER TABLE a ADD COLUMN IF NOT EXISTS d BOOL;' },
        ],
      },
    });
    const requeried = state.unsafeCalls.map((call) => call.query).join('\n');
    expect(requeried).not.toMatch(/ADD COLUMN IF NOT EXISTS IF NOT EXISTS/);
  });

  it('Create: rewrites CREATE INDEX to CREATE INDEX ASYNC so Aurora DSQL accepts non-primary indexes', async () => {
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        migrations: [
          {
            name: '0001_indexes.sql',
            sql: 'CREATE INDEX foo_idx ON foo (col);\n--> statement-breakpoint\nCREATE UNIQUE INDEX bar_idx ON bar (col_a, col_b);',
          },
        ],
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(
      queries.some((query) =>
        query.includes('CREATE INDEX ASYNC IF NOT EXISTS foo_idx ON foo (col)'),
      ),
    ).toBe(true);
    expect(
      queries.some((query) =>
        query.includes('CREATE UNIQUE INDEX ASYNC IF NOT EXISTS bar_idx ON bar (col_a, col_b)'),
      ),
    ).toBe(true);
  });

  it('Create: composes asyncifyIndex with stripUsingClause so USING btree + ASYNC ship together', async () => {
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        migrations: [
          {
            name: '0001_btree.sql',
            sql: 'CREATE INDEX foo_idx ON t USING btree (col);',
          },
        ],
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(
      queries.some((query) =>
        query.includes('CREATE INDEX ASYNC IF NOT EXISTS foo_idx ON t (col)'),
      ),
    ).toBe(true);
    expect(queries.some((query) => /USING\s+btree/i.test(query))).toBe(false);
  });

  it('Create: never doubles up ASYNC when the input already contains it', async () => {
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        migrations: [
          {
            name: '0001_already.sql',
            sql: 'CREATE INDEX ASYNC foo_idx ON foo (col);\n--> statement-breakpoint\nCREATE UNIQUE INDEX ASYNC bar_idx ON bar (col);',
          },
        ],
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query).join('\n');
    expect(queries).not.toMatch(/ASYNC\s+ASYNC/i);
    expect(queries).not.toMatch(/ASYNC\s+IF\s+NOT\s+EXISTS\s+ASYNC/i);
    expect(queries).toMatch(/CREATE INDEX ASYNC IF NOT EXISTS foo_idx ON foo \(col\)/);
    expect(queries).toMatch(/CREATE UNIQUE INDEX ASYNC IF NOT EXISTS bar_idx ON bar \(col\)/);
  });

  it('releases the advisory lock even on inner failure', async () => {
    state.rejectNextUnsafe = new Error('boom');

    await expect(handler({ RequestType: 'Create', ResourceProperties: baseProps })).rejects.toThrow(
      'boom',
    );
    expect(state.ended).toBe(1);
  });
});
