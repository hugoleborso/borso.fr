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

const API_ROLE_ARN = 'arn:aws:iam::123456789012:role/test-app-ApiFnServiceRole-ABC';
const AGENT_USER_ARN = 'arn:aws:iam::123456789012:user/AI-Dev-ReadOnly';
const READER_PROPS = {
  readerRoleName: 'ai_reader_test_app',
  readerPrincipalArns: [AGENT_USER_ARN],
} as const;

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

  it('Create: creates the API role after the migrations, maps it and grants the schema', async () => {
    await handler({
      RequestType: 'Create',
      ResourceProperties: {
        ...baseProps,
        apiRoleName: 'api_test_app',
        apiPrincipalArns: [API_ROLE_ARN],
      },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    const lastMigration = queries.findIndex((query) =>
      query.includes('CREATE TABLE IF NOT EXISTS b'),
    );
    const createRole = queries.indexOf('CREATE ROLE "api_test_app" WITH LOGIN');
    expect(createRole).toBeGreaterThan(lastMigration);
    expect(queries).toContain(`AWS IAM GRANT "api_test_app" TO '${API_ROLE_ARN}'`);
    expect(queries).toContain('GRANT USAGE ON SCHEMA "test_app" TO "api_test_app"');
    expect(queries.some((query) => query.includes('sys.iam_pg_role_mappings'))).toBe(false);
  });

  it('Update: re-grants an existing role and unmaps a principal the stack no longer lists', async () => {
    state.existingRoles.add('api_test_app');
    state.roleMappings = [{ arn: API_ROLE_ARN, pg_role_name: 'api_test_app' }];
    await handler({
      RequestType: 'Update',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: { ...baseProps, apiRoleName: 'api_test_app' },
      OldResourceProperties: baseProps,
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(queries.some((query) => query.startsWith('CREATE ROLE'))).toBe(false);
    expect(queries).toContain(`AWS IAM REVOKE "api_test_app" FROM '${API_ROLE_ARN}'`);
    expect(queries).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "test_app" TO "api_test_app"',
    );
  });

  it('Delete: drops the schema, then unmaps and drops the API role', async () => {
    state.existingRoles.add('api_test_app');
    state.roleMappings = [{ arn: API_ROLE_ARN, pg_role_name: 'api_test_app' }];
    await handler({
      RequestType: 'Delete',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: { ...baseProps, apiRoleName: 'api_test_app' },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    const dropSchema = queries.findIndex((query) => query.includes('DROP SCHEMA'));
    const dropRole = queries.indexOf('DROP ROLE IF EXISTS "api_test_app"');
    expect(dropRole).toBeGreaterThan(dropSchema);
    expect(queries).toContain(`AWS IAM REVOKE "api_test_app" FROM '${API_ROLE_ARN}'`);
  });

  it('Delete: leaves roles alone for a schema provisioned before roles existed', async () => {
    await handler({
      RequestType: 'Delete',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: { ...baseProps, apiRoleName: 'api_test_app' },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(queries.some((query) => query.includes('ROLE'))).toBe(false);
  });

  it('Create: creates the reader after the migrations with SELECT only', async () => {
    await handler({
      RequestType: 'Create',
      ResourceProperties: { ...baseProps, ...READER_PROPS },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    const lastMigration = queries.findIndex((query) =>
      query.includes('CREATE TABLE IF NOT EXISTS b'),
    );
    const createReader = queries.indexOf('CREATE ROLE "ai_reader_test_app" WITH LOGIN');
    expect(createReader).toBeGreaterThan(lastMigration);
    expect(queries).toContain(`AWS IAM GRANT "ai_reader_test_app" TO '${AGENT_USER_ARN}'`);
    expect(queries).toContain('GRANT USAGE ON SCHEMA "test_app" TO "ai_reader_test_app"');
    expect(queries).toContain(
      'GRANT SELECT ON ALL TABLES IN SCHEMA "test_app" TO "ai_reader_test_app"',
    );
    expect(
      queries.some((query) => query.includes('INSERT, UPDATE') && query.includes('ai_reader')),
    ).toBe(false);
  });

  it('Create: grants the reader every table but its blocklist, which it revokes', async () => {
    state.tablesPerSchema.set('test_app', ['_migrations', 'a', 'b']);
    await handler({
      RequestType: 'Create',
      ResourceProperties: { ...baseProps, ...READER_PROPS, readerTableBlocklist: ['b'] },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(queries).toContain('REVOKE ALL ON "test_app"."b" FROM "ai_reader_test_app"');
    expect(queries).toContain('GRANT SELECT ON "test_app"."a" TO "ai_reader_test_app"');
    expect(queries).toContain('GRANT SELECT ON "test_app"."_migrations" TO "ai_reader_test_app"');
    expect(queries).not.toContain('GRANT SELECT ON "test_app"."b" TO "ai_reader_test_app"');
    expect(queries).not.toContain(
      'GRANT SELECT ON ALL TABLES IN SCHEMA "test_app" TO "ai_reader_test_app"',
    );
  });

  it('Update: revokes a table newly added to the blocklist from an existing reader', async () => {
    state.existingRoles.add('ai_reader_test_app');
    state.roleMappings = [{ arn: AGENT_USER_ARN, pg_role_name: 'ai_reader_test_app' }];
    state.tablesPerSchema.set('test_app', ['a', 'b']);
    await handler({
      RequestType: 'Update',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: { ...baseProps, ...READER_PROPS, readerTableBlocklist: ['a', 'b'] },
      OldResourceProperties: { ...baseProps, ...READER_PROPS },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(queries).toContain('REVOKE ALL ON "test_app"."a" FROM "ai_reader_test_app"');
    expect(queries).toContain('REVOKE ALL ON "test_app"."b" FROM "ai_reader_test_app"');
    expect(queries.some((query) => query.startsWith('GRANT SELECT ON "test_app"'))).toBe(false);
  });

  it('Update: unmaps the reader when the stack stops listing it, and keeps the role', async () => {
    state.existingRoles.add('ai_reader_test_app');
    state.roleMappings = [{ arn: AGENT_USER_ARN, pg_role_name: 'ai_reader_test_app' }];
    await handler({
      RequestType: 'Update',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: baseProps,
      OldResourceProperties: { ...baseProps, ...READER_PROPS },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(queries).toContain(`AWS IAM REVOKE "ai_reader_test_app" FROM '${AGENT_USER_ARN}'`);
    expect(queries.some((query) => query.startsWith('DROP ROLE'))).toBe(false);
    expect(queries.some((query) => query.startsWith('GRANT') && query.includes('ai_reader'))).toBe(
      false,
    );
  });

  it('Update: leaves the reader mapped while the stack still lists it', async () => {
    state.existingRoles.add('ai_reader_test_app');
    state.roleMappings = [{ arn: AGENT_USER_ARN, pg_role_name: 'ai_reader_test_app' }];
    await handler({
      RequestType: 'Update',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: { ...baseProps, ...READER_PROPS },
      OldResourceProperties: { ...baseProps, ...READER_PROPS },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    expect(queries.some((query) => query.startsWith('AWS IAM REVOKE'))).toBe(false);
    expect(queries).toContain(
      'GRANT SELECT ON ALL TABLES IN SCHEMA "test_app" TO "ai_reader_test_app"',
    );
  });

  it('Delete: drops the schema, then unmaps and drops the reader', async () => {
    state.existingRoles.add('ai_reader_test_app');
    state.roleMappings = [{ arn: AGENT_USER_ARN, pg_role_name: 'ai_reader_test_app' }];
    await handler({
      RequestType: 'Delete',
      PhysicalResourceId: 'dsql-schema:test_app',
      ResourceProperties: { ...baseProps, ...READER_PROPS },
    });
    const queries = state.unsafeCalls.map((call) => call.query);
    const dropSchema = queries.findIndex((query) => query.includes('DROP SCHEMA'));
    const dropReader = queries.indexOf('DROP ROLE IF EXISTS "ai_reader_test_app"');
    expect(dropReader).toBeGreaterThan(dropSchema);
    expect(queries).toContain(`AWS IAM REVOKE "ai_reader_test_app" FROM '${AGENT_USER_ARN}'`);
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

  const uniqueIndexMigration = {
    ...baseProps,
    migrations: [
      {
        name: '0005_unique_track.sql',
        sql: 'CREATE UNIQUE INDEX "song_deezer_track_id_idx" ON "song" ("deezer_track_id");',
      },
    ],
  };

  it('Create: waits on the DSQL job an index build returns before recording the migration', async () => {
    state.indexBuildStatuses.set('job-song_deezer_track_id_idx', [
      { status: 'submitted', details: null },
      { status: 'processing', details: null },
      { status: 'completed', details: null },
    ]);
    vi.useFakeTimers();
    try {
      const provisioning = handler({
        RequestType: 'Create',
        ResourceProperties: uniqueIndexMigration,
      });
      await vi.runAllTimersAsync();
      await provisioning;
    } finally {
      vi.useRealTimers();
    }
    const jobPolls = state.unsafeCalls.filter((call) => call.query.includes('FROM sys.jobs'));
    expect(jobPolls).toHaveLength(3);
    expect(jobPolls[0]?.params).toStrictEqual(['job-song_deezer_track_id_idx']);
    expect(state.appliedMigrations.has('0005_unique_track.sql')).toBe(true);
  });

  it('Create: fails the deploy and leaves the migration unrecorded when the index build fails', async () => {
    state.indexBuildStatuses.set('job-song_deezer_track_id_idx', [
      { status: 'failed', details: 'Found duplicate key while validating index for UCVs' },
    ]);
    await expect(
      handler({ RequestType: 'Create', ResourceProperties: uniqueIndexMigration }),
    ).rejects.toThrow(/song_deezer_track_id_idx.*Found duplicate key/);
    expect(state.appliedMigrations.has('0005_unique_track.sql')).toBe(false);
    expect(state.ended).toBe(1);
  });

  it('Create: names the job when a build fails without details', async () => {
    state.indexBuildStatuses.set('job-song_deezer_track_id_idx', [
      { status: 'failed', details: null },
    ]);
    await expect(
      handler({ RequestType: 'Create', ResourceProperties: uniqueIndexMigration }),
    ).rejects.toThrow(/job-song_deezer_track_id_idx\): sys\.jobs gave no details/);
  });

  it('Create: fails the deploy when the build is still running at the wait limit', async () => {
    state.indexBuildStatuses.set('job-song_deezer_track_id_idx', [
      { status: 'processing', details: null },
    ]);
    vi.useFakeTimers();
    try {
      const provisioning = handler({
        RequestType: 'Create',
        ResourceProperties: uniqueIndexMigration,
      });
      const failure = provisioning.then(
        () => null,
        (error: unknown) => error,
      );
      await vi.runAllTimersAsync();
      expect(String(await failure)).toMatch(
        /last status "processing"\) had not finished within the 240 s/,
      );
    } finally {
      vi.useRealTimers();
    }
    expect(state.appliedMigrations.has('0005_unique_track.sql')).toBe(false);
    expect(state.ended).toBe(1);
  });

  async function failAfterAllTimers(props: typeof baseProps): Promise<{
    readonly failure: unknown;
    readonly waitedMilliseconds: number;
  }> {
    vi.useFakeTimers();
    try {
      const startedAt = Date.now();
      const outcome = handler({ RequestType: 'Create', ResourceProperties: props }).then(
        () => ({ failure: null, waitedMilliseconds: Date.now() - startedAt }),
        (error: unknown) => ({ failure: error, waitedMilliseconds: Date.now() - startedAt }),
      );
      await vi.runAllTimersAsync();
      return await outcome;
    } finally {
      vi.useRealTimers();
    }
  }

  it('Create: waits for all index builds against one deadline, not one each', async () => {
    const twoSlowBuilds = {
      ...baseProps,
      migrations: [
        { name: '0005_first.sql', sql: 'CREATE INDEX "first_idx" ON "song" ("a");' },
        { name: '0006_second.sql', sql: 'CREATE INDEX "second_idx" ON "song" ("b");' },
      ],
    };
    const firstBuildPolls = 100;
    state.indexBuildStatuses.set('job-first_idx', [
      ...Array.from({ length: firstBuildPolls }, () => ({ status: 'processing', details: null })),
      { status: 'completed', details: null },
    ]);
    state.indexBuildStatuses.set('job-second_idx', [{ status: 'processing', details: null }]);
    const { failure, waitedMilliseconds } = await failAfterAllTimers(twoSlowBuilds);
    expect(String(failure)).toMatch(/"second_idx".*had not finished within the 240 s/);
    expect(waitedMilliseconds).toBeLessThanOrEqual(240_000);
    expect(state.appliedMigrations.has('0005_first.sql')).toBe(true);
    expect(state.appliedMigrations.has('0006_second.sql')).toBe(false);
    expect(state.ended).toBe(1);
  });

  it('Create: keeps waiting on a sys.jobs status it does not recognise, and names it at the limit', async () => {
    state.indexBuildStatuses.set('job-song_deezer_track_id_idx', [
      { status: 'cancelling', details: null },
    ]);
    const { failure } = await failAfterAllTimers(uniqueIndexMigration);
    expect(String(failure)).toMatch(/last status "cancelling"\) had not finished/);
    expect(state.unsafeCalls.some((call) => call.query.includes('FROM pg_index'))).toBe(false);
  });

  it('Create: reads the index itself when sys.jobs no longer holds the job', async () => {
    state.indexBuildStatuses.set('job-song_deezer_track_id_idx', []);
    state.indexValidity.set('song_deezer_track_id_idx', true);
    await handler({ RequestType: 'Create', ResourceProperties: uniqueIndexMigration });
    const validityRead = state.unsafeCalls.find((call) => call.query.includes('FROM pg_index'));
    expect(validityRead?.params).toStrictEqual(['test_app', 'song_deezer_track_id_idx']);
    expect(state.appliedMigrations.has('0005_unique_track.sql')).toBe(true);
  });

  it('Create: refuses an index left INVALID by an earlier failed build that IF NOT EXISTS skips', async () => {
    state.indexBuildJobIds.set('song_deezer_track_id_idx', null);
    state.indexValidity.set('song_deezer_track_id_idx', false);
    await expect(
      handler({ RequestType: 'Create', ResourceProperties: uniqueIndexMigration }),
    ).rejects.toThrow(/"song_deezer_track_id_idx" exists but is INVALID/);
    expect(state.appliedMigrations.has('0005_unique_track.sql')).toBe(false);
  });

  it('Create: accepts a valid index that IF NOT EXISTS skips without a job', async () => {
    state.indexBuildJobIds.set('song_deezer_track_id_idx', null);
    state.indexValidity.set('song_deezer_track_id_idx', true);
    await handler({ RequestType: 'Create', ResourceProperties: uniqueIndexMigration });
    expect(state.unsafeCalls.some((call) => call.query.includes('FROM sys.jobs'))).toBe(false);
    expect(state.appliedMigrations.has('0005_unique_track.sql')).toBe(true);
  });

  it('Create: refuses an index statement that returned no job and left no index', async () => {
    state.indexBuildJobIds.set('song_deezer_track_id_idx', null);
    await expect(
      handler({ RequestType: 'Create', ResourceProperties: uniqueIndexMigration }),
    ).rejects.toThrow(/returned no build job for it, and no index of that name exists/);
  });

  it('releases the advisory lock even on inner failure', async () => {
    state.rejectNextUnsafe = new Error('boom');

    await expect(handler({ RequestType: 'Create', ResourceProperties: baseProps })).rejects.toThrow(
      'boom',
    );
    expect(state.ended).toBe(1);
  });
});
