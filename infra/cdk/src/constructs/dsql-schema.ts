import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CfnOutput, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { Effect, type IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { listUndecidedCredentialTables } from '../internal/migration-runner/clone-from-schema.utils.js';
import {
  assertDeployStage,
  dsqlSchemaName,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { applyStandardTags } from '../internal/tags.js';
import type { IDsqlCluster } from './dsql-cluster.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* v8 ignore start -- both candidates exist in their respective contexts */
function resolveRunnerEntry(): string {
  const runnerDirectory = path.join(HERE, '..', 'internal', 'migration-runner');
  const candidates = [
    path.join(runnerDirectory, 'index.js'),
    path.join(runnerDirectory, 'index.ts'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Could not find migration-runner entry. Looked at:\n  ${candidates.join('\n  ')}`,
  );
}
/* v8 ignore stop */

export interface DsqlSchemaCloneFromConfig {
  readonly sourceSchemaName: string;
  readonly tableBlocklist?: readonly string[];
  readonly columnsToNullify?: Readonly<Record<string, readonly string[]>>;
  readonly tablesToReplace?: readonly string[];
}

export interface DsqlSchemaProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly migrationsPath: string;
  readonly cluster: IDsqlCluster;
  readonly cloneFromSchema?: DsqlSchemaCloneFromConfig;
}

interface MigrationFile {
  readonly name: string;
  readonly sql: string;
}

const DSQL_ADMIN_CONNECT_ACTION = 'dsql:DbConnectAdmin';
const MIGRATION_FILE_PATTERN = /^(\d+)_[A-Za-z0-9_-]+\.sql$/;
const MIGRATION_RUNNER_TIMEOUT_MINUTES = 5;
const MIGRATION_RUNNER_MEMORY_MIB = 512;
const HEXADECIMAL_RADIX = 16;
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";
const LAMBDA_RUNTIME_PROVIDED_MODULES = '@aws-sdk/client-*';

function readMigrations(dir: string): readonly MigrationFile[] {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    throw new Error(`DsqlSchema: migrationsPath does not exist: ${absDir}`);
  }
  const fileNames = fs.readdirSync(absDir);
  const files = fileNames
    .filter((fileName) => MIGRATION_FILE_PATTERN.test(fileName))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  return files.map((name) => ({
    name,
    sql: fs.readFileSync(path.join(absDir, name), 'utf8'),
  }));
}

// @FollowsBlueprint reusable-cdk-construct
function assertCredentialTablesDecided(
  config: DsqlSchemaCloneFromConfig | undefined,
  migrations: readonly MigrationFile[],
): void {
  if (config === undefined) return;
  const undecided = listUndecidedCredentialTables(
    config,
    migrations.map((migration) => migration.sql),
  );
  if (undecided.length === 0) return;
  throw new Error(
    `DsqlSchema: cloneFromSchema does not say what to do with ${undecided.join(', ')}. ` +
      `Add each to tableBlocklist (the preview gets no credential) or to tablesToReplace ` +
      `(the preview shares the source's credential — see docs/adr/0009-pragma-previews-clone-production.md).`,
  );
}

/**
 * @Blueprint cdk-custom-resource
 * @BlueprintName CDK Custom Resource
 * @BlueprintUsage Use when a stack has to reach something CloudFormation has no resource type for, such as a database schema.
 * @BlueprintDescription Bundles the handler from source with `NodejsFunction`, gives the handler and the `Provider` each their own `LogGroup` with a retention set rather than the default of forever, grants the handler only the action it needs on the one cluster ARN, and passes the work as `CustomResource` properties. The payload carries a content digest of the migration files alongside the files themselves, which is the mechanism that makes CloudFormation fire an Update event when the content changed but no other property did.
 */
export class DsqlSchema extends Construct {
  public readonly schemaName: string;
  public readonly clusterArn: string;
  public readonly clusterEndpoint: string;

  private readonly runnerFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: DsqlSchemaProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    const migrations = readMigrations(props.migrationsPath);
    assertCredentialTablesDecided(props.cloneFromSchema, migrations);
    applyStandardTags(this, props);

    const stack = Stack.of(this);
    this.schemaName = dsqlSchemaName(props);
    this.clusterArn = props.cluster.clusterArn;
    this.clusterEndpoint = props.cluster.clusterEndpoint;

    const runnerLogGroup = new LogGroup(this, 'MigrationRunnerLogs', {
      retention: RetentionDays.ONE_WEEK,
    });
    this.runnerFn = new NodejsFunction(this, 'MigrationRunner', {
      entry: resolveRunnerEntry(),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(MIGRATION_RUNNER_TIMEOUT_MINUTES),
      memorySize: MIGRATION_RUNNER_MEMORY_MIB,
      logGroup: runnerLogGroup,
      bundling: {
        target: 'node22',
        format: OutputFormat.ESM,
        banner: NODE_BUILTIN_REQUIRE_SHIM_BANNER,
        externalModules: [LAMBDA_RUNTIME_PROVIDED_MODULES],
      },
    });
    this.runnerFn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [DSQL_ADMIN_CONNECT_ACTION],
        resources: [this.clusterArn],
      }),
    );

    const providerLogGroup = new LogGroup(this, 'ProviderLogs', {
      retention: RetentionDays.ONE_WEEK,
    });
    const provider = new Provider(this, 'Provider', {
      onEventHandler: this.runnerFn,
      logGroup: providerLogGroup,
    });

    new CustomResource(this, 'Schema', {
      serviceToken: provider.serviceToken,
      properties: {
        clusterEndpoint: this.clusterEndpoint,
        region: stack.region,
        schemaName: this.schemaName,
        migrations,
        migrationsDigest: digestMigrations(migrations),
        ...(props.cloneFromSchema === undefined ? {} : { cloneFromSchema: props.cloneFromSchema }),
      },
    });

    new CfnOutput(this, 'SchemaName', { value: this.schemaName });
  }

  public grantConnect(grantable: IGrantable): void {
    grantable.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [DSQL_ADMIN_CONNECT_ACTION],
        resources: [this.clusterArn],
      }),
    );
  }
}

function digestMigrations(migrations: readonly MigrationFile[]): string {
  const HASH_MULTIPLIER = 31;
  const FILE_SEPARATOR = '\n---\n';
  const NAME_CONTENT_SEPARATOR = '::';

  const serialized = migrations
    .map((file) => `${file.name}${NAME_CONTENT_SEPARATOR}${file.sql}`)
    .join(FILE_SEPARATOR);

  let accumulator = 0;
  for (const character of serialized) {
    accumulator = (accumulator * HASH_MULTIPLIER + character.charCodeAt(0)) | 0;
  }
  return accumulator.toString(HEXADECIMAL_RADIX);
}
