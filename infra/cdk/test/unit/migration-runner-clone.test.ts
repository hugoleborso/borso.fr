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

// `function`, not an arrow. `DsqlSigner` is called with `new`, and Vitest 4
// invokes a mock's implementation as a constructor rather than calling it and
// taking the return value. An arrow has no [[Construct]], so it fails with
// "is not a constructor".
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

// @FollowsBlueprint test-handler-mocked-sdk
describe('migration-runner handler — cloneFromSchema (Neon-branch pattern)', () => {
  it('clones structure + data + _migrations, skips blocklisted tables, nullifies S3 columns', async () => {
    state.existingSchemas.add('prod');
    state.tablesPerSchema.set('prod', [
      '_migrations',
      'admin_credentials',
      'admin_sessions',
      'editions',
      'runners',
    ]);
    state.columnsPerTable.set('prod._migrations', ['name', 'applied_at']);
    state.columnsPerTable.set('prod.admin_credentials', ['id', 'scrypt_hash', 'updated_at']);
    state.columnsPerTable.set('prod.editions', ['slug', 'display_name']);
    state.columnsPerTable.set('prod.runners', [
      'edition_slug',
      'slug',
      'display_name',
      'photo_key',
    ]);

    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'pr_27',
        migrations: [{ name: '0001_init.sql', sql: 'CREATE TABLE a (id INT);' }],
        cloneFromSchema: {
          sourceSchemaName: 'prod',
          tableBlocklist: ['admin_sessions'],
          columnsToNullify: { runners: ['photo_key'] },
          tablesToReplace: ['admin_credentials'],
        },
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query).join('\n');

    // A replaced table is emptied before its rows are copied, because the
    // INSERT is ON CONFLICT DO NOTHING and would otherwise keep a stale row
    // whose primary key already exists in the target. Order matters: a DELETE
    // after the INSERT would leave the table empty.
    const deleteIndex = queries.indexOf('DELETE FROM "pr_27"."admin_credentials"');
    const insertIndex = queries.indexOf('INSERT INTO "pr_27"."admin_credentials"');
    expect(deleteIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(deleteIndex);

    // Only the named table is emptied — a clone must never delete domain data.
    expect(queries).not.toMatch(/DELETE FROM "pr_27"\."editions"/);
    expect(queries).not.toMatch(/DELETE FROM "pr_27"\."runners"/);
    expect(queries).not.toMatch(/DELETE FROM "prod"\./);

    // Structure for every prod table (including the blocklisted one) so
    // the app can write to the empty admin_sessions table post-deploy.
    expect(queries).toMatch(
      /CREATE TABLE IF NOT EXISTS "pr_27"\."admin_sessions" \(LIKE "prod"\."admin_sessions" INCLUDING ALL\)/,
    );
    expect(queries).toMatch(
      /CREATE TABLE IF NOT EXISTS "pr_27"\."editions" \(LIKE "prod"\."editions" INCLUDING ALL\)/,
    );

    // Data step: admin_credentials + editions + runners cloned, admin_sessions skipped.
    expect(queries).toMatch(/INSERT INTO "pr_27"\."admin_credentials"/);
    expect(queries).toMatch(/INSERT INTO "pr_27"\."editions"/);
    expect(queries).toMatch(/INSERT INTO "pr_27"\."runners"/);
    expect(queries).not.toMatch(/INSERT INTO "pr_27"\."admin_sessions"/);

    // photo_key is replaced by NULL in the SELECT list.
    expect(queries).toMatch(/SELECT "edition_slug", "slug", "display_name", NULL AS "photo_key"/);

    // _migrations rows are copied so applyMigrations short-circuits prod's history.
    expect(queries).toMatch(/INSERT INTO "pr_27"\."_migrations" \("name", "applied_at"\)/);
  });

  it('adds a column production gained to a preview schema that already exists', async () => {
    // The failure this covers: `pragma-pr-49` was first deployed before
    // production gained `instrument.family`. The structural step is
    // `CREATE TABLE IF NOT EXISTS`, which is a no-op on a table that is
    // already there, so the preview kept the old shape while the data step
    // named the new column — and Aurora DSQL answered `column "family" of
    // relation "instrument" does not exist`.
    state.existingSchemas.add('prod');
    state.existingSchemas.add('pr_49');
    state.tablesPerSchema.set('prod', ['_migrations', 'instrument']);
    state.tablesPerSchema.set('pr_49', ['_migrations', 'instrument']);
    state.columnsPerTable.set('prod._migrations', ['name', 'applied_at']);
    state.columnsPerTable.set('pr_49._migrations', ['name', 'applied_at']);
    state.columnsPerTable.set('prod.instrument', ['id', 'is_harmonic', 'family']);
    state.columnsPerTable.set('pr_49.instrument', ['id', 'is_harmonic']);

    await handler({
      RequestType: 'Update',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'pr_49',
        migrations: [],
        cloneFromSchema: { sourceSchemaName: 'prod' },
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query);

    const alterIndex = queries.findIndex((query) =>
      query.includes('ALTER TABLE "pr_49"."instrument" ADD COLUMN IF NOT EXISTS "family" text'),
    );
    const insertIndex = queries.findIndex((query) =>
      query.includes('INSERT INTO "pr_49"."instrument"'),
    );
    expect(alterIndex).toBeGreaterThan(-1);
    // The reconciliation has to land before the INSERT that names the column.
    expect(insertIndex).toBeGreaterThan(alterIndex);
    // Only the missing column is added; the two the target already has are
    // left alone, because DSQL would reject a second ADD of the same name.
    expect(queries.filter((query) => query.includes('ADD COLUMN'))).toHaveLength(1);
  });

  it('skips the clone step when the source schema does not exist (first-ever deploy of an app)', async () => {
    // existingSchemas stays empty — prod has never been deployed yet.
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'pr_27',
        cloneFromSchema: { sourceSchemaName: 'prod' },
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query).join('\n');
    // Falls back to the normal applyMigrations flow.
    expect(queries).toMatch(/CREATE SCHEMA IF NOT EXISTS "pr_27"/);
    expect(queries).not.toMatch(/LIKE "prod"/);
    expect(queries).not.toMatch(/INSERT INTO "pr_27"\.".+" SELECT/);
    // The PR's migrations still run because _migrations is empty on pr_27.
    expect(state.appliedMigrations.has('0001_init.sql')).toBe(true);
    expect(state.appliedMigrations.has('0002_more.sql')).toBe(true);
  });

  it('skips the clone when source equals target (the prod stack itself would otherwise self-clone)', async () => {
    state.existingSchemas.add('prod');
    state.tablesPerSchema.set('prod', ['editions']);
    state.columnsPerTable.set('prod.editions', ['slug']);
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'prod',
        cloneFromSchema: { sourceSchemaName: 'prod' },
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query).join('\n');
    expect(queries).not.toMatch(/LIKE "prod"/);
    expect(queries).not.toMatch(/SELECT .+ FROM "prod"\.".+"/);
  });

  it('omits the data step for a table with zero columns in information_schema (defensive guard)', async () => {
    // Edge case: a table exists per `information_schema.tables` but
    // `information_schema.columns` returns no rows for it (e.g. DSQL
    // races during a concurrent migration). The runner skips it rather
    // than emitting `INSERT INTO t () SELECT FROM t`, which would throw.
    state.existingSchemas.add('prod');
    state.tablesPerSchema.set('prod', ['editions']);
    // No columns mapping → listColumns returns []
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'pr_27',
        cloneFromSchema: { sourceSchemaName: 'prod' },
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query).join('\n');
    expect(queries).toMatch(/CREATE TABLE IF NOT EXISTS "pr_27"\."editions"/);
    expect(queries).not.toMatch(/INSERT INTO "pr_27"\."editions"/);
  });
});
