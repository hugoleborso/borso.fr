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
  DsqlSigner: vi.fn().mockImplementation(() => ({
    getDbConnectAdminAuthToken: () => Promise.resolve('TOKEN'),
  })),
}));

const { handler } = await import('../../src/internal/migration-runner/index.js');

beforeEach(() => {
  resetMigrationRunnerMockState();
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

    await expect(handler({ RequestType: 'Create', ResourceProperties: baseProps })).rejects.toThrow(
      'boom',
    );
    expect(state.ended).toBe(1); // sql.end() must run via finally
  });
});
