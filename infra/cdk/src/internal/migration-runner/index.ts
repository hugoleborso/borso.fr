import { DsqlSigner } from '@aws-sdk/dsql-signer';
import postgres from 'postgres';
import {
  buildAddColumnSql,
  buildCloneInsertSql,
  buildReplaceBeforeCloneSql,
  type ColumnDefinition,
  isReplacedBeforeClone,
  buildCreateTableLikeSql,
  type CatalogueColumnRow,
  formatColumnType,
  selectCloneableDataTables,
  selectMissingColumns,
} from './clone-from-schema.utils.js';
import { selectPendingMigrations } from './pending-migrations.utils.js';
import { splitStatements } from './statement-rewrites.utils.js';

interface Migration {
  readonly name: string;
  readonly sql: string;
}

interface CloneFromSchemaProps {
  readonly sourceSchemaName: string;
  readonly tableBlocklist?: readonly string[];
  readonly columnsToNullify?: Readonly<Record<string, readonly string[]>>;
  readonly tablesToReplace?: readonly string[];
}

interface ResourceProps {
  readonly clusterEndpoint: string;
  readonly region: string;
  readonly schemaName: string;
  readonly migrations: readonly Migration[];
  readonly cloneFromSchema?: CloneFromSchemaProps;
}

interface CfnEvent {
  readonly RequestType: 'Create' | 'Update' | 'Delete';
  readonly PhysicalResourceId?: string;
  readonly ResourceProperties: ResourceProps & { readonly ServiceToken: string };
  readonly OldResourceProperties?: ResourceProps;
}

interface CfnResponse {
  readonly PhysicalResourceId: string;
  readonly Data?: Readonly<Record<string, string>>;
}

const PG_USER = 'admin';
const PG_DATABASE = 'postgres';
const PG_PORT = 5432;
const CONNECTION_CLOSE_TIMEOUT_SECONDS = 5;
const APPLIED_MIGRATIONS_TABLE = '_migrations';

async function connect(props: ResourceProps): Promise<postgres.Sql> {
  const signer = new DsqlSigner({
    hostname: props.clusterEndpoint,
    region: props.region,
  });
  const token = await signer.getDbConnectAdminAuthToken();
  return postgres({
    host: props.clusterEndpoint,
    port: PG_PORT,
    user: PG_USER,
    password: token,
    database: PG_DATABASE,
    ssl: 'require',
    max: 1,
    prepare: false,
  });
}

async function ensureSchema(sql: postgres.Sql, schemaName: string): Promise<void> {
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"._migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function hasSchema(sql: postgres.Sql, schemaName: string): Promise<boolean> {
  const rows = await sql.unsafe<{ count: number }[]>(
    `SELECT 1 AS count FROM information_schema.schemata WHERE schema_name = '${schemaName.replace(/'/g, "''")}'`,
  );
  return rows.length > 0;
}

async function listTablesInSchema(
  sql: postgres.Sql,
  schemaName: string,
): Promise<readonly string[]> {
  const rows = await sql.unsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  return rows.map((row) => row.table_name);
}

async function listColumns(
  sql: postgres.Sql,
  schemaName: string,
  tableName: string,
): Promise<readonly string[]> {
  const rows = await sql.unsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}' ORDER BY ordinal_position`,
  );
  return rows.map((row) => row.column_name);
}

async function listColumnDefinitions(
  sql: postgres.Sql,
  schemaName: string,
  tableName: string,
): Promise<readonly ColumnDefinition[]> {
  const rows = await sql.unsafe<CatalogueColumnRow[]>(
    `SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = '${schemaName.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}' ORDER BY ordinal_position`,
  );
  return rows.map(formatColumnType);
}

async function cloneFromSchema(
  sql: postgres.Sql,
  targetSchemaName: string,
  config: CloneFromSchemaProps,
): Promise<void> {
  if (config.sourceSchemaName === targetSchemaName) return;
  if (!(await hasSchema(sql, config.sourceSchemaName))) return;

  const blocklist = config.tableBlocklist ?? [];
  const nullifyMap = config.columnsToNullify ?? {};
  const sourceTables = await listTablesInSchema(sql, config.sourceSchemaName);

  for (const table of sourceTables) {
    await sql.unsafe(buildCreateTableLikeSql(config.sourceSchemaName, targetSchemaName, table));
    const sourceColumns = await listColumnDefinitions(sql, config.sourceSchemaName, table);
    const targetColumns = await listColumns(sql, targetSchemaName, table);
    for (const column of selectMissingColumns(sourceColumns, targetColumns)) {
      await sql.unsafe(buildAddColumnSql(targetSchemaName, table, column));
    }
  }

  const tablesToReplace = config.tablesToReplace ?? [];
  for (const table of selectCloneableDataTables(sourceTables, blocklist)) {
    const columns = await listColumns(sql, config.sourceSchemaName, table);
    if (columns.length === 0) continue;
    const isReplaced = isReplacedBeforeClone(table, tablesToReplace);
    if (isReplaced) {
      await sql.unsafe(buildReplaceBeforeCloneSql(targetSchemaName, table));
    }
    const nullifyColumns = nullifyMap[table] ?? [];
    await sql.unsafe(
      buildCloneInsertSql(
        config.sourceSchemaName,
        targetSchemaName,
        table,
        columns,
        nullifyColumns,
      ),
    );
  }

  const migrationsColumns = await listColumns(
    sql,
    config.sourceSchemaName,
    APPLIED_MIGRATIONS_TABLE,
  );
  if (migrationsColumns.length > 0) {
    await sql.unsafe(
      buildCloneInsertSql(
        config.sourceSchemaName,
        targetSchemaName,
        APPLIED_MIGRATIONS_TABLE,
        migrationsColumns,
        [],
      ),
    );
  }
}

async function applyMigrations(
  sql: postgres.Sql,
  schemaName: string,
  migrations: readonly Migration[],
): Promise<void> {
  const applied = await sql.unsafe<{ name: string }[]>(
    `SELECT name FROM "${schemaName}"._migrations`,
  );
  const appliedNames = new Set(applied.map((row) => row.name));
  for (const migration of selectPendingMigrations(migrations, appliedNames)) {
    await sql.unsafe(`SET search_path TO "${schemaName}"`);
    for (const statement of splitStatements(migration.sql)) {
      await sql.unsafe(statement);
    }
    await sql.unsafe(
      `INSERT INTO "${schemaName}"._migrations(name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [migration.name],
    );
  }
}

async function dropSchema(sql: postgres.Sql, schemaName: string): Promise<void> {
  await sql.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}

async function provisionSchema(sql: postgres.Sql, props: ResourceProps): Promise<void> {
  await ensureSchema(sql, props.schemaName);
  if (props.cloneFromSchema !== undefined) {
    await cloneFromSchema(sql, props.schemaName, props.cloneFromSchema);
  }
  await applyMigrations(sql, props.schemaName, props.migrations);
}

/**
 * @Blueprint custom-resource-handler
 * @BlueprintName Custom Resource Handler
 * @BlueprintUsage Use for the Lambda behind a CloudFormation custom resource.
 * @BlueprintDescription Dispatches on `RequestType` through a frozen record of the three CloudFormation events rather than a switch, so a missing branch is a type error instead of a deploy that hangs waiting for a response. Create and Update deliberately map to the same idempotent provisioning function. The connection is opened once, the dispatched work runs inside `try`, and `sql.end()` runs in `finally` so a failed migration still closes its connection instead of holding the cluster's slot until the Lambda times out. The returned `PhysicalResourceId` falls back to a value derived from the schema name, and is otherwise passed straight through, because changing it tells CloudFormation to delete the old resource.
 */
export async function handler(event: CfnEvent): Promise<CfnResponse> {
  const props = event.ResourceProperties;
  const physicalId = event.PhysicalResourceId ?? `dsql-schema:${props.schemaName}`;

  const applyByRequestType = {
    Create: async (sql: postgres.Sql) => provisionSchema(sql, props),
    Update: async (sql: postgres.Sql) => provisionSchema(sql, props),
    Delete: async (sql: postgres.Sql) => dropSchema(sql, props.schemaName),
  } as const;

  const sql = await connect(props);
  try {
    await applyByRequestType[event.RequestType](sql);
  } finally {
    await sql.end({ timeout: CONNECTION_CLOSE_TIMEOUT_SECONDS });
  }

  return {
    PhysicalResourceId: physicalId,
    Data: { SchemaName: props.schemaName },
  };
}
