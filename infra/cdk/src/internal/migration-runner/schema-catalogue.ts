import type postgres from 'postgres';
import {
  type CatalogueColumnRow,
  type ColumnDefinition,
  formatColumnType,
} from './clone-from-schema.utils.js';

export async function hasSchema(sql: postgres.Sql, schemaName: string): Promise<boolean> {
  const rows = await sql.unsafe<{ count: number }[]>(
    `SELECT 1 AS count FROM information_schema.schemata WHERE schema_name = '${schemaName.replace(/'/g, "''")}'`,
  );
  return rows.length > 0;
}

export async function listTablesInSchema(
  sql: postgres.Sql,
  schemaName: string,
): Promise<readonly string[]> {
  const rows = await sql.unsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  return rows.map((row) => row.table_name);
}

export async function listColumns(
  sql: postgres.Sql,
  schemaName: string,
  tableName: string,
): Promise<readonly string[]> {
  const rows = await sql.unsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}' ORDER BY ordinal_position`,
  );
  return rows.map((row) => row.column_name);
}

export async function listColumnDefinitions(
  sql: postgres.Sql,
  schemaName: string,
  tableName: string,
): Promise<readonly ColumnDefinition[]> {
  const rows = await sql.unsafe<CatalogueColumnRow[]>(
    `SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}' ORDER BY ordinal_position`,
  );
  return rows.map(formatColumnType);
}
