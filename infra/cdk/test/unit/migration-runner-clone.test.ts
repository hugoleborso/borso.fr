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

    const deleteIndex = queries.indexOf('DELETE FROM "pr_27"."admin_credentials"');
    const insertIndex = queries.indexOf('INSERT INTO "pr_27"."admin_credentials"');
    expect(deleteIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(deleteIndex);

    expect(queries).not.toMatch(/DELETE FROM "pr_27"\."editions"/);
    expect(queries).not.toMatch(/DELETE FROM "pr_27"\."runners"/);
    expect(queries).not.toMatch(/DELETE FROM "prod"\./);

    expect(queries).toMatch(
      /CREATE TABLE IF NOT EXISTS "pr_27"\."admin_sessions" \(LIKE "prod"\."admin_sessions" INCLUDING ALL\)/,
    );
    expect(queries).toMatch(
      /CREATE TABLE IF NOT EXISTS "pr_27"\."editions" \(LIKE "prod"\."editions" INCLUDING ALL\)/,
    );

    expect(queries).toMatch(/INSERT INTO "pr_27"\."admin_credentials"/);
    expect(queries).toMatch(/INSERT INTO "pr_27"\."editions"/);
    expect(queries).toMatch(/INSERT INTO "pr_27"\."runners"/);
    expect(queries).not.toMatch(/INSERT INTO "pr_27"\."admin_sessions"/);

    expect(queries).toMatch(/SELECT "edition_slug", "slug", "display_name", NULL AS "photo_key"/);

    expect(queries).toMatch(/INSERT INTO "pr_27"\."_migrations" \("name", "applied_at"\)/);
  });

  it('adds a column production gained to a preview schema that already exists', async () => {
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
    expect(insertIndex).toBeGreaterThan(alterIndex);
    expect(queries.filter((query) => query.includes('ADD COLUMN'))).toHaveLength(1);
  });

  it('skips the clone step when the source schema does not exist (first-ever deploy of an app)', async () => {
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'pr_27',
        cloneFromSchema: { sourceSchemaName: 'prod' },
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query).join('\n');
    expect(queries).toMatch(/CREATE SCHEMA IF NOT EXISTS "pr_27"/);
    expect(queries).not.toMatch(/LIKE "prod"/);
    expect(queries).not.toMatch(/INSERT INTO "pr_27"\.".+" SELECT/);
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
    state.existingSchemas.add('prod');
    state.tablesPerSchema.set('prod', ['editions']);
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
