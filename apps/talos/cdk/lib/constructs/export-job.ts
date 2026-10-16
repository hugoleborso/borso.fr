import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

const AGENT_TOKEN_PARAMETER = '/talos/agent-token-build';
const EXPORT_PATH = '/api/agent/export';
const EXPORT_OBJECT_PATTERN = 'exports/*';
const NONCURRENT_VERSION_RETENTION_DAYS = 90;
const EXPORT_TIMEOUT_SECONDS = 60;
const EXPORT_MEMORY_MIB = 256;
const WEEKLY_RUN = { weekDay: 'SUN', hour: '2', minute: '0' } as const;
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

export interface TalosExportJobProps {
  readonly domainName: string;
  readonly handlerEntry: string;
}

export class TalosExportJob extends Construct {
  public readonly bucket: Bucket;
  public readonly handler: NodejsFunction;

  constructor(scope: Construct, id: string, props: TalosExportJobProps) {
    super(scope, id);

    this.bucket = new Bucket(this, 'Bucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        { noncurrentVersionExpiration: Duration.days(NONCURRENT_VERSION_RETENTION_DAYS) },
      ],
    });

    this.handler = new NodejsFunction(this, 'Fn', {
      entry: props.handlerEntry,
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: EXPORT_MEMORY_MIB,
      timeout: Duration.seconds(EXPORT_TIMEOUT_SECONDS),
      logGroup: new LogGroup(this, 'Logs', { retention: RetentionDays.ONE_MONTH }),
      environment: {
        EXPORT_BUCKET: this.bucket.bucketName,
        EXPORT_URL: `https://${props.domainName}${EXPORT_PATH}`,
        AGENT_TOKEN_PARAMETER,
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
        actions: ['ssm:GetParameter'],
        resources: [
          Stack.of(this).formatArn({
            service: 'ssm',
            resource: 'parameter',
            resourceName: AGENT_TOKEN_PARAMETER.slice(1),
          }),
        ],
      }),
    );
    this.handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:PutObject'],
        resources: [this.bucket.arnForObjects(EXPORT_OBJECT_PATTERN)],
      }),
    );

    new Rule(this, 'Weekly', {
      schedule: Schedule.cron(WEEKLY_RUN),
      targets: [new LambdaFunction(this.handler)],
    });

    new CfnOutput(this, 'BucketName', { value: this.bucket.bucketName });
  }
}
