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
import {
  type Stage,
  assertDeployStage,
  dsqlSchemaName,
  validateAppSlug,
} from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';
import type { IDsqlCluster } from './dsql-cluster.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the migration-runner entry path that's handed to NodejsFunction
 * for esbuild bundling at synth time.
 *
 * Two candidates because this code runs in two contexts:
 *   - When this package is consumed by an app (apps/<x>/bin/app.ts) it runs
 *     from `dist/`, where the runner is the compiled `index.js`.
 *   - When this package's own vitest suite runs against the TypeScript
 *     sources, this code runs from `src/`, where the runner is `index.ts`
 *     (esbuild compiles the TS at synth time).
 *
 * Same path resolution either way; the file extension just differs by
 * context.
 */
/* v8 ignore start -- both candidates exist in their respective contexts */
function resolveRunnerEntry(): string {
  const candidates = [
    path.join(HERE, '..', 'internal', 'migration-runner', 'index.js'),
    path.join(HERE, '..', 'internal', 'migration-runner', 'index.ts'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Could not find migration-runner entry. Looked at:\n  ${candidates.join('\n  ')}`,
  );
}
/* v8 ignore stop */

/** @beta */
export interface DsqlSchemaProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  /**
   * Directory containing forward-only migrations. Files matching
   * `^\d+_.*\.sql$` are read in lexical order and applied idempotently.
   */
  readonly migrationsPath: string;
  /**
   * The cluster the schema lives in. For prod stacks, pass the
   * {@link DsqlCluster} the same stack creates. For preview/integ
   * stacks, pass `lookupDsqlCluster(scope, app)` — the cluster is
   * owned by the app's prod stack and shared across stages.
   */
  readonly cluster: IDsqlCluster;
}

interface MigrationFile {
  readonly name: string;
  readonly sql: string;
}

const MIGRATION_FILE_PATTERN = /^(\d+)_[A-Za-z0-9_-]+\.sql$/;

function readMigrations(dir: string): readonly MigrationFile[] {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    throw new Error(`DsqlSchema: migrationsPath does not exist: ${absDir}`);
  }
  const entries = fs.readdirSync(absDir);
  const files = entries
    .filter((f) => MIGRATION_FILE_PATTERN.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return files.map((name) => ({
    name,
    sql: fs.readFileSync(path.join(absDir, name), 'utf8'),
  }));
}

/**
 * Manages an Aurora DSQL schema's lifecycle: create on stack create, apply
 * migrations idempotently on update, DROP CASCADE on delete.
 *
 * Takes a {@link IDsqlCluster} reference. For prod stacks, pass the
 * `DsqlCluster` the same stack creates. For preview/integ stacks, pass
 * `lookupDsqlCluster(scope, app)` — the cluster is owned by the app's
 * prod stack and shared across stages.
 *
 * @beta
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
      timeout: Duration.minutes(5),
      memorySize: 512,
      logGroup: runnerLogGroup,
      bundling: {
        target: 'node22',
        format: OutputFormat.ESM,
        // Banner needed because `@aws-sdk/dsql-signer` (bundled inline) pulls
        // in `@smithy/util-buffer-from` which `require('buffer')`. esbuild's
        // ESM output replaces CJS `require` with a `__require` shim that
        // can't resolve Node built-ins → the Lambda fails at cold start with
        // `Dynamic require of "buffer" is not supported`. Re-exposing
        // `createRequire(import.meta.url)` as `require` patches both Node
        // built-ins and any other transitive CJS dep without re-bundling
        // them as external (which would just push the problem to runtime).
        banner: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);',
        // Keep ONLY the Lambda-runtime-provided clients external. We do NOT
        // include @aws-sdk/dsql-signer here — the runtime doesn't ship it,
        // so esbuild bundles it inline from the workspace's node_modules
        // (same with `postgres`). Avoiding `nodeModules` here means CDK
        // does not run a transient `pnpm install` on every synth, which
        // shaved ~70 % off the unit-test wall-clock and cleared a vitest
        // worker-RPC timeout that the cold-cache install was triggering.
        externalModules: ['@aws-sdk/client-*'],
      },
    });
    this.runnerFn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dsql:DbConnectAdmin'],
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

    const migrations = readMigrations(props.migrationsPath);
    new CustomResource(this, 'Schema', {
      serviceToken: provider.serviceToken,
      properties: {
        clusterEndpoint: this.clusterEndpoint,
        region: stack.region,
        schemaName: this.schemaName,
        migrations,
        migrationsDigest: digestMigrations(migrations),
      },
    });

    new CfnOutput(this, 'SchemaName', { value: this.schemaName });
  }

  /**
   * Grant `dsql:DbConnect` on the cluster to a Lambda. The grantee must
   * connect with the schema as its `search_path`; the construct does not
   * narrow IAM to a specific schema (DSQL doesn't support that today).
   */
  public grantConnect(grantable: IGrantable): void {
    grantable.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dsql:DbConnect'],
        resources: [this.clusterArn],
      }),
    );
  }
}

/**
 * Stable digest of the migration files' contents, used as a CloudFormation
 * resource property so an `Update` event re-fires the migration runner
 * whenever any file changes. Not a cryptographic hash — content stability
 * is the only requirement.
 */
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
  return accumulator.toString(16);
}
