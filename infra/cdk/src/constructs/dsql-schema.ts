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
import { findUndecidedCredentialTables } from '../internal/migration-runner/clone-from-schema.utils.js';
import {
  assertDeployStage,
  dsqlSchemaName,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
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

export interface DsqlSchemaCloneFromConfig {
  /**
   * Source schema in the SAME cluster to clone structure + data from.
   * Typical value: `'prod'` for preview/integ stacks. Same name as
   * `schemaName` → the runner skips (no self-clone).
   */
  readonly sourceSchemaName: string;
  /**
   * Table names whose ROWS are skipped during the data step — typically
   * runtime state (`admin_sessions`, `auth_attempts`) that shouldn't
   * cross schema boundaries. Their structure is still copied so the
   * application can write to the empty table after deploy.
   */
  readonly tableBlocklist?: readonly string[];
  /**
   * Map of `table → columns` whose values are replaced by `NULL` in the
   * clone INSERT. Use this for any column carrying a reference to a
   * stage-specific S3 object key, ARN, or URL — the preview's app code
   * would otherwise dereference prod's bucket and get 403s or worse.
   */
  readonly columnsToNullify?: Readonly<Record<string, readonly string[]>>;
  /**
   * Tables emptied in the target immediately before their rows are copied, so
   * the source wins outright.
   *
   * The clone INSERT is `ON CONFLICT DO NOTHING`, which is right for domain
   * data — a re-deploy keeps what the preview accumulated and adds what is new
   * upstream. It is wrong for a singleton row that exists to mirror the
   * source: the conflict clause keeps the stale one forever. Use this for a
   * credential or config row with a fixed primary key.
   */
  readonly tablesToReplace?: readonly string[];
}

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
  /**
   * Optional Neon-branch-style clone: before applying migrations on
   * this schema, copy structure + data from `sourceSchemaName` (same
   * cluster). The runner skips when the source schema doesn't exist
   * yet (first-ever deploy of an app) or matches the target. See
   * `docs/knowledge/dsql-clone-from-prod.md` for the full contract.
   */
  readonly cloneFromSchema?: DsqlSchemaCloneFromConfig;
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
    .filter((fileName) => MIGRATION_FILE_PATTERN.test(fileName))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  return files.map((name) => ({
    name,
    sql: fs.readFileSync(path.join(absDir, name), 'utf8'),
  }));
}

// @FollowsBlueprint reusable-cdk-construct
/**
 * Fail the synth when a clone config says nothing about a credential-bearing
 * table. pragma shipped a preview that served production's band data behind a
 * password published in this repository, because `app_config` was in neither
 * list and the clone's `ON CONFLICT DO NOTHING` quietly kept the fixture's row.
 * The decision is cheap to state and expensive to forget, so the construct
 * refuses to synthesize without it.
 */
function assertCredentialTablesDecided(
  config: DsqlSchemaCloneFromConfig | undefined,
  migrations: readonly MigrationFile[],
): void {
  if (config === undefined) return;
  const undecided = findUndecidedCredentialTables(
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
 * Manages an Aurora DSQL schema's lifecycle: create on stack create, apply
 * migrations idempotently on update, DROP CASCADE on delete.
 *
 * Takes a {@link IDsqlCluster} reference. For prod stacks, pass the
 * `DsqlCluster` the same stack creates. For preview/integ stacks, pass
 * `lookupDsqlCluster(scope, app)` — the cluster is owned by the app's
 * prod stack and shared across stages.
 *
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
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
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

  /**
   * Grant `dsql:DbConnectAdmin` on the cluster to a Lambda. The grantee
   * MUST authenticate via `DsqlSigner.getDbConnectAdminAuthToken()` and
   * set its connection `search_path` to {@link schemaName} — the
   * schema-per-stage layout is what gives us isolation, because DSQL
   * doesn't (yet) narrow IAM to a specific schema OR support non-admin
   * application users we could provision from the migration runner.
   * That's the tradeoff we accept until DSQL ships a finer-grained
   * authn model.
   */
  public grantConnect(grantable: IGrantable): void {
    grantable.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dsql:DbConnectAdmin'],
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
