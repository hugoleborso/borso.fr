/**
 * Pure SQL builders for the "clone from source schema" step of the
 * migration runner. Tests live in `clone-from-schema.utils.test.ts` at
 * 100 % coverage (`*.utils.ts` gate). All identifiers are quoted with
 * double-quotes; the helpers reject any name that isn't a Postgres
 * unquoted identifier (alphanumeric + underscore, starting with a
 * letter or underscore) so callers can't smuggle a `"; DROP …` payload
 * via a misconfigured CDK prop.
 *
 * Why these are SQL strings rather than `postgres.js` tagged-template
 * calls: cross-schema DDL/DML must be schema-qualified (`"a"."t"`)
 * which postgres.js doesn't naturally parameterise (it expects values,
 * not identifiers). Hand-built strings with strict identifier
 * validation are simpler and equally safe.
 */

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdentifier(name: string, kind: string): void {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Invalid ${kind} name: "${name}". Expected /^[A-Za-z_][A-Za-z0-9_]*$/.`);
  }
}

function quote(identifier: string): string {
  return `"${identifier}"`;
}

/**
 * `CREATE TABLE IF NOT EXISTS target.table (LIKE source.table INCLUDING ALL)`.
 *
 * Cross-schema `LIKE` is in DSQL's documented CREATE TABLE grammar
 * (cf. docs/knowledge/dsql-postgres-compat-gaps.md — the LIKE clause
 * with INCLUDING ALL copies constraints, defaults, indexes, and
 * identity. `IF NOT EXISTS` makes the call idempotent so a retried
 * CFN custom-resource invocation doesn't trip on the second pass.
 */
export function buildCreateTableLikeSql(
  sourceSchema: string,
  targetSchema: string,
  table: string,
): string {
  assertIdentifier(sourceSchema, 'schema');
  assertIdentifier(targetSchema, 'schema');
  assertIdentifier(table, 'table');
  return `CREATE TABLE IF NOT EXISTS ${quote(targetSchema)}.${quote(table)} (LIKE ${quote(sourceSchema)}.${quote(table)} INCLUDING ALL)`;
}

/**
 * `INSERT INTO target.table (cols) SELECT cols FROM source.table
 *  ON CONFLICT DO NOTHING`. Columns in `nullifyColumns` are replaced by
 * a literal `NULL` in the SELECT list — used to strip S3-bearing keys
 * so previews don't inherit pointers to prod's bucket objects.
 *
 * `ON CONFLICT DO NOTHING` makes the call idempotent on re-deploy of
 * the same target schema: pre-existing rows survive; new prod rows
 * land. Deletions in prod don't propagate (acceptable for preview).
 */
export function buildCloneInsertSql(
  sourceSchema: string,
  targetSchema: string,
  table: string,
  columns: readonly string[],
  nullifyColumns: readonly string[],
): string {
  assertIdentifier(sourceSchema, 'schema');
  assertIdentifier(targetSchema, 'schema');
  assertIdentifier(table, 'table');
  if (columns.length === 0) {
    throw new Error(`buildCloneInsertSql: empty column list for table "${table}".`);
  }
  for (const column of columns) assertIdentifier(column, 'column');
  for (const column of nullifyColumns) assertIdentifier(column, 'column');
  const nullifySet = new Set(nullifyColumns);
  const columnList = columns.map(quote).join(', ');
  const selectList = columns
    .map((column) => (nullifySet.has(column) ? `NULL AS ${quote(column)}` : quote(column)))
    .join(', ');
  return (
    `INSERT INTO ${quote(targetSchema)}.${quote(table)} (${columnList})` +
    ` SELECT ${selectList} FROM ${quote(sourceSchema)}.${quote(table)}` +
    ` ON CONFLICT DO NOTHING`
  );
}

/**
 * `DELETE FROM target.table` — run immediately before the clone INSERT for a
 * table the source must own outright.
 *
 * The INSERT is `ON CONFLICT DO NOTHING`, which is right for domain data: a
 * re-deploy keeps whatever the preview accumulated and adds what is new in
 * prod. It is wrong for a singleton row whose whole purpose is to match the
 * source. `app_config` is one: it holds pragma's shared password hash, it has
 * a fixed primary key, and a schema that was bootstrapped before cloning was
 * switched on already has row id 1 — so the conflict clause silently kept the
 * old credential and the preview stayed on a password that had since been
 * published in a public repository, guarding cloned production data.
 *
 * Emptying the table first makes the source authoritative, at the cost of a
 * sub-second window mid-deploy where the app answers 503 `auth-not-bootstrapped`.
 */
export function buildReplaceBeforeCloneSql(targetSchema: string, table: string): string {
  assertIdentifier(targetSchema, 'schema');
  assertIdentifier(table, 'table');
  return `DELETE FROM ${quote(targetSchema)}.${quote(table)}`;
}

/** Whether the clone must empty this table first so the source row wins. */
export function isReplacedBeforeClone(table: string, tablesToReplace: readonly string[]): boolean {
  return tablesToReplace.includes(table);
}

/**
 * Decide whether a table name should have its rows cloned. Returns
 * `false` for `_migrations` (handled out-of-band by the runner so the
 * applied-migrations marker survives even when the blocklist would
 * otherwise hide it) — caller's job is to clone `_migrations` rows
 * explicitly. Returns `false` for any entry in the blocklist
 * (`admin_sessions`, `auth_attempts` by default — runtime state, not
 * data).
 */
export function isCloneableDataTable(table: string, blocklist: readonly string[]): boolean {
  if (table === '_migrations') return false;
  return !blocklist.includes(table);
}

/** The tables whose rows the clone copies, so the caller loops rather than skips. */
export function selectCloneableDataTables(
  tables: readonly string[],
  blocklist: readonly string[],
): string[] {
  return tables.filter((table) => isCloneableDataTable(table, blocklist));
}
