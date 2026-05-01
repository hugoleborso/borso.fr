import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CfnOutput, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { Effect, type IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import {
  type Stage,
  assertDeployStage,
  dsqlSchemaName,
  validateAppSlug,
} from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';
import { SHARED_SSM } from './static-site.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* v8 ignore start -- both candidates always exist in dev/dist; pure path-resolution helper */
/** Resolves the migration-runner entry whether running from src or dist. */
function resolveRunnerEntry(): string {
  const candidates = [
    path.join(HERE, '..', 'internal', 'migration-runner', 'index.js'),
    path.join(HERE, '..', 'internal', 'migration-runner', 'index.ts'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
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
 * The DSQL cluster itself is a singleton owned by `infra/shared/`. This
 * construct looks up its endpoint + ARN via SSM.
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
    this.clusterArn = StringParameter.valueForStringParameter(this, SHARED_SSM.dsqlClusterArn);
    this.clusterEndpoint = StringParameter.valueForStringParameter(
      this,
      SHARED_SSM.dsqlClusterEndpoint,
    );

    this.runnerFn = new NodejsFunction(this, 'MigrationRunner', {
      entry: resolveRunnerEntry(),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(5),
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      bundling: {
        target: 'node22',
        format: 'esm' as never,
        externalModules: ['@aws-sdk/*'],
        nodeModules: ['postgres', '@aws-sdk/dsql-signer'],
      },
    });
    this.runnerFn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dsql:DbConnectAdmin'],
        resources: [this.clusterArn],
      }),
    );

    const provider = new Provider(this, 'Provider', {
      onEventHandler: this.runnerFn,
      logRetention: RetentionDays.ONE_WEEK,
    });

    const migrations = readMigrations(props.migrationsPath);
    new CustomResource(this, 'Schema', {
      serviceToken: provider.serviceToken,
      properties: {
        clusterEndpoint: this.clusterEndpoint,
        region: stack.region,
        schemaName: this.schemaName,
        migrations,
        // include a hash so updates re-fire the resource when files change
        migrationsHash: hashMigrations(migrations),
      },
    });

    new CfnOutput(this, 'SchemaName', { value: this.schemaName });
  }

  /**
   * Grant `dsql:DbConnect` on the cluster. The grantee Lambda must connect
   * with the schema as its `search_path`; the construct does not narrow IAM
   * to a specific schema (DSQL doesn't support that today).
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

function hashMigrations(migrations: readonly MigrationFile[]): string {
  const concat = migrations.map((m) => `${m.name}::${m.sql}`).join('\n---\n');
  // tiny non-crypto hash — only needs to change when input changes
  let h = 0;
  for (let i = 0; i < concat.length; i++) {
    h = (h * 31 + concat.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}
