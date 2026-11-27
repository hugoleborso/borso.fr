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

function runQueries(): readonly string[] {
  return state.unsafeCalls.map((call) => call.query);
}

function positionOf(queries: readonly string[], fragment: string): number {
  return queries.findIndex((query) => query.includes(fragment));
}

function lastPositionOf(queries: readonly string[], fragment: string): number {
  return queries.findLastIndex((query) => query.includes(fragment));
}

// @FollowsBlueprint test-handler-mocked-sdk
describe('migration-runner handler — cloneFromSchema (Neon-branch pattern)', () => {
  it('migrates to the source history, copies its rows, then runs the branch migrations on them', async () => {
    state.existingSchemas.add('prod');
    state.sourceAppliedMigrations.set('prod', ['0001_init.sql']);
    state.tablesPerSchema.set('prod', [
      '_migrations',
      'admin_credentials',
      'admin_sessions',
      'editions',
      'runners',
    ]);
    state.columnsPerTable.set('prod._migrations', ['name', 'applied_at']);
    state.columnsPerTable.set('pr_27._migrations', ['name', 'applied_at']);
    state.columnsPerTable.set('prod.admin_credentials', ['id', 'scrypt_hash', 'updated_at']);
    state.columnsPerTable.set('pr_27.admin_credentials', ['id', 'scrypt_hash', 'updated_at']);
    state.columnsPerTable.set('prod.admin_sessions', ['id']);
    state.columnsPerTable.set('pr_27.admin_sessions', ['id']);
    state.columnsPerTable.set('prod.editions', ['slug', 'display_name']);
    state.columnsPerTable.set('pr_27.editions', ['slug', 'display_name']);
    state.columnsPerTable.set('prod.runners', [
      'edition_slug',
      'slug',
      'display_name',
      'photo_key',
    ]);
    state.columnsPerTable.set('pr_27.runners', [
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
        migrations: [
          { name: '0001_init.sql', sql: 'CREATE TABLE editions (slug TEXT);' },
          { name: '0002_branch.sql', sql: 'UPDATE editions SET slug = lower(slug);' },
        ],
        cloneFromSchema: {
          sourceSchemaName: 'prod',
          tableBlocklist: ['admin_sessions'],
          columnsToNullify: { runners: ['photo_key'] },
          tablesToReplace: ['admin_credentials'],
        },
      },
    });
    const queries = runQueries();

    const sourceMigration = positionOf(queries, 'editions (slug TEXT)');
    const firstCopy = positionOf(queries, 'INSERT INTO "pr_27"."');
    const lastCopy = lastPositionOf(queries, 'INSERT INTO "pr_27"."');
    const branchMigration = positionOf(queries, 'UPDATE editions');
    expect(sourceMigration).toBeGreaterThan(-1);
    expect(firstCopy).toBeGreaterThan(sourceMigration);
    expect(branchMigration).toBeGreaterThan(lastCopy);
    expect(state.appliedMigrations).toStrictEqual(new Set(['0001_init.sql', '0002_branch.sql']));

    const joined = queries.join('\n');
    expect(positionOf(queries, 'INSERT INTO "pr_27"."admin_credentials"')).toBeGreaterThan(
      positionOf(queries, 'DELETE FROM "pr_27"."admin_credentials"'),
    );
    expect(joined).not.toMatch(/DELETE FROM "pr_27"\."(editions|runners)"/);
    expect(joined).not.toMatch(/DELETE FROM "prod"\./);
    expect(joined).toMatch(/INSERT INTO "pr_27"\."editions"/);
    expect(joined).not.toMatch(/INSERT INTO "pr_27"\."admin_sessions"/);
    expect(joined).toMatch(/SELECT "edition_slug", "slug", "display_name", NULL AS "photo_key"/);
    expect(joined).not.toMatch(/INSERT INTO "pr_27"\."_migrations" \(/);
    expect(joined).not.toMatch(/LIKE "prod"/);
  });

  it('gives a rebased preview the migration production ran since, before copying rows', async () => {
    state.existingSchemas.add('prod');
    state.existingSchemas.add('pr_49');
    state.sourceAppliedMigrations.set('prod', ['0001_init.sql', '0002_family.sql']);
    state.appliedMigrations.add('0001_init.sql');
    state.tablesPerSchema.set('prod', ['_migrations', 'instrument']);
    state.columnsPerTable.set('prod.instrument', ['id', 'is_harmonic', 'family']);
    state.columnsPerTable.set('pr_49.instrument', ['id', 'is_harmonic', 'family']);

    await handler({
      RequestType: 'Update',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'pr_49',
        migrations: [
          { name: '0001_init.sql', sql: 'CREATE TABLE instrument (id TEXT);' },
          {
            name: '0002_family.sql',
            sql: 'CREATE INDEX ASYNC instrument_family_idx ON instrument (family);',
          },
          { name: '0003_branch.sql', sql: 'ALTER TABLE instrument ADD COLUMN notes text;' },
        ],
        cloneFromSchema: { sourceSchemaName: 'prod' },
      },
    });
    const queries = runQueries();

    const productionIndex = positionOf(queries, 'instrument_family_idx');
    const copy = positionOf(queries, 'INSERT INTO "pr_49"."instrument"');
    const branchMigration = positionOf(queries, 'notes text');
    expect(productionIndex).toBeGreaterThan(-1);
    expect(copy).toBeGreaterThan(productionIndex);
    expect(branchMigration).toBeGreaterThan(copy);
    expect(positionOf(queries, 'instrument (id TEXT)')).toBe(-1);
    expect(queries[copy]).toContain('("id", "is_harmonic", "family")');
  });

  it('copies only the columns and tables the branch migrations created', async () => {
    state.existingSchemas.add('prod');
    state.sourceAppliedMigrations.set('prod', ['0001_init.sql', '0002_from_main.sql']);
    state.tablesPerSchema.set('prod', ['_migrations', 'instrument', 'setlist']);
    state.columnsPerTable.set('prod.instrument', ['id', 'is_harmonic', 'family']);
    state.columnsPerTable.set('prod.setlist', ['id']);
    state.columnsPerTable.set('pr_50.instrument', ['id', 'is_harmonic']);

    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        schemaName: 'pr_50',
        migrations: [{ name: '0001_init.sql', sql: 'CREATE TABLE instrument (id TEXT);' }],
        cloneFromSchema: { sourceSchemaName: 'prod' },
      },
    });
    const queries = runQueries();

    const copy = queries.find((query) => query.includes('INSERT INTO "pr_50"."instrument"'));
    expect(copy).toContain('("id", "is_harmonic") SELECT "id", "is_harmonic" FROM');
    expect(positionOf(queries, '"pr_50"."setlist"')).toBe(-1);
    expect(positionOf(queries, 'ADD COLUMN')).toBe(-1);
    expect(state.appliedMigrations).toStrictEqual(new Set(['0001_init.sql']));
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
    const queries = runQueries().join('\n');
    expect(queries).toMatch(/CREATE SCHEMA IF NOT EXISTS "pr_27"/);
    expect(queries).not.toMatch(/"prod"/);
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
    const queries = runQueries().join('\n');
    expect(queries).not.toMatch(/information_schema\.schemata/);
    expect(queries).not.toMatch(/SELECT .+ FROM "prod"\.".+"/);
  });
});
