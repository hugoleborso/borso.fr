/**
 * Shared mock state + SQL-mock factory for the migration-runner test
 * suites. Lives outside `src/` so vitest doesn't try to enforce 100 %
 * coverage on the harness itself, and outside the `*.test.ts` glob so
 * it doesn't auto-run.
 *
 * Two test files consume it:
 *   - `migration-runner.test.ts` — the legacy path (ensureSchema +
 *     applyMigrations).
 *   - `migration-runner-clone.test.ts` — the cloneFromSchema branch.
 *
 * The state is a module-level singleton — each test calls
 * `resetMigrationRunnerMockState()` in its `beforeEach` to wipe between
 * tests. The mock matches `information_schema` queries to fixture data
 * the test sets in `state.existingSchemas`, `state.tablesPerSchema`,
 * `state.columnsPerTable`; everything else falls through to the
 * pre-existing INSERT/SELECT bookkeeping used by the legacy tests.
 */

interface UnsafeCall {
  readonly query: string;
  readonly params?: readonly unknown[];
}

export const state: {
  unsafeCalls: UnsafeCall[];
  taggedCalls: string[];
  ended: number;
  appliedMigrations: Set<string>;
  /** Test hook: if set, the next `.unsafe()` call rejects with this error. */
  rejectNextUnsafe: Error | null;
  /** Schemas the mock pretends exist when the runner queries `information_schema.schemata`. */
  existingSchemas: Set<string>;
  /** `schemaName → tables` the mock returns when the runner lists tables. */
  tablesPerSchema: Map<string, readonly string[]>;
  /** `"schema.table" → columns` the mock returns when the runner lists columns. */
  columnsPerTable: Map<string, readonly string[]>;
} = {
  unsafeCalls: [],
  taggedCalls: [],
  ended: 0,
  appliedMigrations: new Set(),
  rejectNextUnsafe: null,
  existingSchemas: new Set(),
  tablesPerSchema: new Map(),
  columnsPerTable: new Map(),
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
}

/**
 * Minimal subset of the postgres.js `Sql<{}>` shape that the migration
 * runner actually touches at runtime. Declared here so the mock type can
 * be inferred via Object.assign — no `as Sql<...>` casts at the test
 * boundary, no need to satisfy the full library interface.
 */
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
      const schemaExistsMatch = /information_schema\.schemata WHERE schema_name = '([^']+)'/i.exec(
        query,
      );
      if (schemaExistsMatch !== null) {
        const probedSchema = schemaExistsMatch[1] ?? '';
        return Promise.resolve(state.existingSchemas.has(probedSchema) ? [{ count: 1 }] : []);
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
        return Promise.resolve(columns.map((column_name) => ({ column_name })));
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
