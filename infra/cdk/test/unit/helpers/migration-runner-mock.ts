interface UnsafeCall {
  readonly query: string;
  readonly params?: readonly unknown[];
}

export const state: {
  unsafeCalls: UnsafeCall[];
  taggedCalls: string[];
  ended: number;
  appliedMigrations: Set<string>;
  rejectNextUnsafe: Error | null;
  existingSchemas: Set<string>;
  tablesPerSchema: Map<string, readonly string[]>;
  columnsPerTable: Map<string, readonly string[]>;
  existingRoles: Set<string>;
  roleMappings: { readonly arn: string; readonly pg_role_name: string }[];
  indexBuildJobIds: Map<string, string | null>;
  indexBuildStatuses: Map<string, { readonly status: string; readonly details: string | null }[]>;
  indexValidity: Map<string, boolean>;
} = {
  unsafeCalls: [],
  taggedCalls: [],
  ended: 0,
  appliedMigrations: new Set(),
  rejectNextUnsafe: null,
  existingSchemas: new Set(),
  tablesPerSchema: new Map(),
  columnsPerTable: new Map(),
  existingRoles: new Set(),
  roleMappings: [],
  indexBuildJobIds: new Map(),
  indexBuildStatuses: new Map(),
  indexValidity: new Map(),
};

export function resetMigrationRunnerMockState(): void {
  state.unsafeCalls = [];
  state.taggedCalls = [];
  state.ended = 0;
  state.appliedMigrations = new Set();
  state.rejectNextUnsafe = null;
  state.existingSchemas = new Set();
  state.tablesPerSchema = new Map();
  state.columnsPerTable = new Map();
  state.existingRoles = new Set();
  state.roleMappings = [];
  state.indexBuildJobIds = new Map();
  state.indexBuildStatuses = new Map();
  state.indexValidity = new Map();
}

const CREATED_INDEX =
  /CREATE\s+(?:UNIQUE\s+)?INDEX\s+ASYNC\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/i;

function answerIndexBuild(query: string, params?: readonly unknown[]): unknown[] | null {
  const created = CREATED_INDEX.exec(query);
  if (created !== null) {
    const indexName = created[1] ?? '';
    const jobId = state.indexBuildJobIds.has(indexName)
      ? state.indexBuildJobIds.get(indexName)
      : `job-${indexName}`;
    return jobId === null || jobId === undefined ? [] : [{ job_id: jobId }];
  }
  if (/FROM sys\.jobs WHERE job_id/i.test(query)) {
    const jobId = String(params?.[0]);
    const statuses = state.indexBuildStatuses.get(jobId);
    if (statuses === undefined) return [{ status: 'completed', details: null }];
    const next = statuses.length > 1 ? statuses.shift() : statuses[0];
    return next === undefined ? [] : [next];
  }
  if (/FROM pg_index/i.test(query)) {
    const indexName = String(params?.[1]);
    const isValid = state.indexValidity.get(indexName);
    return isValid === undefined ? [] : [{ is_valid: isValid }];
  }
  return null;
}

export type SqlMock = ((
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
) => Promise<unknown[]>) & {
  unsafe(query: string, params?: readonly unknown[]): Promise<unknown[]>;
  end(opts: { readonly timeout: number }): Promise<void>;
};

function recordTaggedCall(strings: TemplateStringsArray): Promise<unknown[]> {
  state.taggedCalls.push(strings.join('?'));
  return Promise.resolve([]);
}

export function makeSql(): SqlMock {
  return Object.assign(recordTaggedCall, {
    unsafe(query: string, params?: readonly unknown[]) {
      if (state.rejectNextUnsafe !== null) {
        const error = state.rejectNextUnsafe;
        state.rejectNextUnsafe = null;
        return Promise.reject(error);
      }
      state.unsafeCalls.push({ query, ...(params === undefined ? {} : { params }) });
      const indexBuildAnswer = answerIndexBuild(query, params);
      if (indexBuildAnswer !== null) return Promise.resolve(indexBuildAnswer);
      const schemaExistsMatch = /information_schema\.schemata WHERE schema_name = '([^']+)'/i.exec(
        query,
      );
      if (schemaExistsMatch !== null) {
        const probedSchema = schemaExistsMatch[1] ?? '';
        return Promise.resolve(state.existingSchemas.has(probedSchema) ? [{ count: 1 }] : []);
      }
      const roleExistsMatch = /FROM pg_roles WHERE rolname = '([^']+)'/i.exec(query);
      if (roleExistsMatch !== null) {
        const probedRole = roleExistsMatch[1] ?? '';
        return Promise.resolve(state.existingRoles.has(probedRole) ? [{ present: 1 }] : []);
      }
      if (/FROM sys\.iam_pg_role_mappings/i.test(query)) {
        return Promise.resolve(state.roleMappings);
      }
      const listTablesMatch = /information_schema\.tables WHERE table_schema = '([^']+)'/i.exec(
        query,
      );
      if (listTablesMatch !== null) {
        const queriedSchema = listTablesMatch[1] ?? '';
        const tables = state.tablesPerSchema.get(queriedSchema) ?? [];
        return Promise.resolve(tables.map((table_name) => ({ table_name })));
      }
      const listColumnsMatch =
        /information_schema\.columns WHERE table_schema = '([^']+)' AND table_name = '([^']+)'/i.exec(
          query,
        );
      if (listColumnsMatch !== null) {
        const queriedSchema = listColumnsMatch[1] ?? '';
        const queriedTable = listColumnsMatch[2] ?? '';
        const columns = state.columnsPerTable.get(`${queriedSchema}.${queriedTable}`) ?? [];
        return Promise.resolve(
          columns.map((column_name) => ({
            column_name,
            data_type: 'text',
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
          })),
        );
      }
      if (/SELECT name FROM/i.test(query)) {
        return Promise.resolve([...state.appliedMigrations].map((name) => ({ name })));
      }
      const insertedMigrationName = params?.[0];
      if (query.includes('INSERT INTO') && typeof insertedMigrationName === 'string') {
        state.appliedMigrations.add(insertedMigrationName);
      }
      return Promise.resolve([]);
    },
    end() {
      state.ended++;
      return Promise.resolve();
    },
  });
}

export const baseProps = {
  ServiceToken: 'arn:fake',
  clusterEndpoint: 'cluster.dsql.eu-west-3.on.aws',
  region: 'eu-west-3',
  schemaName: 'test_app',
  migrations: [
    { name: '0001_init.sql', sql: 'CREATE TABLE a (id INT);' },
    { name: '0002_more.sql', sql: 'CREATE TABLE b (id INT);' },
  ],
};
