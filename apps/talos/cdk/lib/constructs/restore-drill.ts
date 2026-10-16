import { ArnFormat, CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export const RESTORE_DRILL_FUNCTION_NAME = 'talos-restore-drill';
const DRILL_TIMEOUT_SECONDS = 30;
const DRILL_MEMORY_MIB = 256;
const BACKUP_SERVICE_PRINCIPAL = 'backup.amazonaws.com';
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

export interface TalosRestoreDrillProps {
  readonly handlerEntry: string;
  readonly clusterArn: string;
  readonly vaultName: string;
  readonly vaultArn: string;
  readonly serviceRoleArn: string;
}

export class TalosRestoreDrill extends Construct {
  public readonly handler: NodejsFunction;

  constructor(scope: Construct, id: string, props: TalosRestoreDrillProps) {
    super(scope, id);

    this.handler = new NodejsFunction(this, 'Fn', {
      functionName: RESTORE_DRILL_FUNCTION_NAME,
      entry: props.handlerEntry,
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: DRILL_MEMORY_MIB,
      timeout: Duration.seconds(DRILL_TIMEOUT_SECONDS),
      logGroup: new LogGroup(this, 'Logs', { retention: RetentionDays.ONE_MONTH }),
      environment: {
        BACKUP_VAULT_NAME: props.vaultName,
        BACKUP_ROLE_ARN: props.serviceRoleArn,
        CLUSTER_ARN: props.clusterArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: OutputFormat.ESM,
        mainFields: ['module', 'main'],
        banner: NODE_BUILTIN_REQUIRE_SHIM_BANNER,
      },
    });

    this.handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['backup:ListRecoveryPointsByBackupVault', 'backup:StartBackupJob'],
        resources: [props.vaultArn],
      }),
    );
    this.handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['backup:StartRestoreJob'],
        resources: [
          Stack.of(this).formatArn({
            service: 'backup',
            resource: 'recovery-point',
            resourceName: '*',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          }),
        ],
      }),
    );
    this.handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [props.serviceRoleArn],
        conditions: { StringEquals: { 'iam:PassedToService': BACKUP_SERVICE_PRINCIPAL } },
      }),
    );

    new CfnOutput(this, 'FunctionName', { value: this.handler.functionName });
  }
}
