const APPLIED_MIGRATIONS_TABLE = '_migrations';

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdentifier(name: string, kind: string): void {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Invalid ${kind} name: "${name}". Expected /^[A-Za-z_][A-Za-z0-9_]*$/.`);
  }
}

function quote(identifier: string): string {
  return `"${identifier}"`;
}

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

// @FollowsBlueprint utils-pure-module
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

export interface ColumnDefinition {
  readonly name: string;
  readonly type: string;
}

export interface CatalogueColumnRow {
  readonly column_name: string;
  readonly data_type: string;
  readonly character_maximum_length: number | null;
  readonly numeric_precision: number | null;
  readonly numeric_scale: number | null;
}

export function formatColumnType(row: CatalogueColumnRow): ColumnDefinition {
  if (row.character_maximum_length !== null) {
    return { name: row.column_name, type: `${row.data_type}(${row.character_maximum_length})` };
  }
  if (row.data_type === 'numeric' && row.numeric_precision !== null) {
    return {
      name: row.column_name,
      type: `numeric(${row.numeric_precision},${row.numeric_scale ?? 0})`,
    };
  }
  return { name: row.column_name, type: row.data_type };
}

const CATALOGUE_TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9 ]*(\(\d+(, ?\d+)?\))?( with(out)? time zone)?$/;

export function selectMissingColumns(
  sourceColumns: readonly ColumnDefinition[],
  targetColumnNames: readonly string[],
): ColumnDefinition[] {
  const present = new Set(targetColumnNames);
  return sourceColumns.filter((column) => !present.has(column.name));
}

export function buildAddColumnSql(
  targetSchema: string,
  table: string,
  column: ColumnDefinition,
): string {
  assertIdentifier(targetSchema, 'schema');
  assertIdentifier(table, 'table');
  assertIdentifier(column.name, 'column');
  if (!CATALOGUE_TYPE_PATTERN.test(column.type)) {
    throw new Error(`buildAddColumnSql: refusing to build with type "${column.type}".`);
  }
  return `ALTER TABLE ${quote(targetSchema)}.${quote(table)} ADD COLUMN IF NOT EXISTS ${quote(column.name)} ${column.type}`;
}

export function buildReplaceBeforeCloneSql(targetSchema: string, table: string): string {
  assertIdentifier(targetSchema, 'schema');
  assertIdentifier(table, 'table');
  return `DELETE FROM ${quote(targetSchema)}.${quote(table)}`;
}

export function isReplacedBeforeClone(table: string, tablesToReplace: readonly string[]): boolean {
  return tablesToReplace.includes(table);
}

const CREDENTIAL_TABLES = ['app_config', 'admin_credentials'] as const;

interface CloneDecisionLists {
  readonly tableBlocklist?: readonly string[];
  readonly tablesToReplace?: readonly string[];
}

function hasCreateTableStatement(migrationSql: string, table: string): boolean {
  return new RegExp(String.raw`CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?"?${table}"?\b`, 'i').test(
    migrationSql,
  );
}

export function listUndecidedCredentialTables(
  config: CloneDecisionLists,
  migrationSql: readonly string[],
): string[] {
  // Stryker disable next-line ArrayDeclaration: equivalent mutant. The default is only ever asked whether it includes a name from CREDENTIAL_TABLES, and Stryker's filler string is not one of those two names, so no input tells the two arrays apart.
  const blocklist = config.tableBlocklist ?? [];
  // Stryker disable next-line ArrayDeclaration: equivalent mutant. Same as above — the default is only read through `includes` of a CREDENTIAL_TABLES name.
  const tablesToReplace = config.tablesToReplace ?? [];
  return CREDENTIAL_TABLES.filter(
    (table) =>
      migrationSql.some((sql) => hasCreateTableStatement(sql, table)) &&
      !blocklist.includes(table) &&
      !tablesToReplace.includes(table),
  );
}

export function isCloneableDataTable(table: string, blocklist: readonly string[]): boolean {
  if (table === APPLIED_MIGRATIONS_TABLE) return false;
  return !blocklist.includes(table);
}

export function selectCloneableDataTables(
  tables: readonly string[],
  blocklist: readonly string[],
): string[] {
  return tables.filter((table) => isCloneableDataTable(table, blocklist));
}
