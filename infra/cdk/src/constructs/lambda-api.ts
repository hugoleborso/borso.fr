import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  CorsHttpMethod,
  type CorsPreflightOptions,
  DomainName,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ARecord, AaaaRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import {
  type Stage,
  assertDeployStage,
  lambdaFunctionName,
  validateAppSlug,
} from '../internal/naming.js';
import { applyStandardTags } from '../internal/tags.js';
import type { DsqlSchema } from './dsql-schema.js';

/** @beta */
export interface LambdaApiProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  /**
   * Single Hono-style Lambda entry. Exports an APIGW v2 handler that does
   * its own internal routing across methods + paths. The HTTP API forwards
   * every request to it via the `$default` route + `ANY /{proxy+}` catchall.
   */
  readonly entry: string;
  /** Memory in MiB. Default: 512. */
  readonly memoryMb?: number;
  /** Timeout in seconds. Default: 10. */
  readonly timeoutSeconds?: number;
  /**
   * Reserved concurrent executions. Default: 10 — guards against runaway
   * billing.
   */
  readonly reservedConcurrency?: number;
  readonly environment?: Readonly<Record<string, string>>;
  /** If provided, the Lambda is granted IAM auth to this DSQL schema. */
  readonly dsqlSchema?: DsqlSchema;
  /**
   * Optional custom domain for the HTTP API. When set, the construct
   * provisions:
   *   - an APIGW v2 `DomainName` (regional) backed by `certificateArn`
   *   - an `ApiMapping` from the HttpApi to that DomainName
   *   - A + AAAA Route 53 alias records in `hostedZoneName` pointing the
   *     hostname at the DomainName.
   *
   * The cert MUST be in the same region as the API (eu-west-3) — API
   * Gateway regional custom domains reject cross-region certs.
   */
  readonly customDomain?: {
    readonly hostname: string;
    readonly certificateArn: string;
    readonly hostedZoneId: string;
    readonly hostedZoneName: string;
  };
  /**
   * Origins allowed to call this API. When set, CORS uses these specific
   * origins and enables `Access-Control-Allow-Credentials: true` (browsers
   * reject `*` for credentialed fetches, and the Hono back-end relies on
   * cookies for admin auth). When unset, falls back to wildcard origin
   * without credentials.
   */
  readonly allowedOrigins?: readonly string[];
  readonly cors?: CorsPreflightOptions;
}

/**
 * One HTTP API + one Lambda handling every method + path.
 *
 * @beta
 */
export class LambdaApi extends Construct {
  public readonly httpApi: HttpApi;
  public readonly handler: NodejsFunction;
  public readonly url: string;

  constructor(scope: Construct, id: string, props: LambdaApiProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    applyStandardTags(this, props);

    const stack = Stack.of(this);
    const apiName = `${props.app}-${props.stage}-api`;
    const handlerSlug = 'api';

    const logGroup = new LogGroup(this, 'Logs', {
      logGroupName: `/aws/lambda/${lambdaFunctionName(props, handlerSlug)}`,
      retention: RetentionDays.ONE_WEEK,
    });

    this.handler = new NodejsFunction(this, 'Fn', {
      functionName: lambdaFunctionName(props, handlerSlug),
      entry: props.entry,
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: props.memoryMb ?? 512,
      timeout: Duration.seconds(props.timeoutSeconds ?? 10),
      reservedConcurrentExecutions: props.reservedConcurrency ?? 10,
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: {
        STAGE: props.stage,
        APP: props.app,
        ...(props.dsqlSchema
          ? {
              DSQL_ENDPOINT: props.dsqlSchema.clusterEndpoint,
              DSQL_SCHEMA: props.dsqlSchema.schemaName,
            }
          : {}),
        ...props.environment,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: OutputFormat.ESM,
        mainFields: ['module', 'main'],
        // Re-expose CommonJS `require` for transitive deps that need it.
        // Some AWS SDK + smithy packages (notably `@aws-sdk/dsql-signer`
        // → `@smithy/util-buffer-from`) do `require('buffer')` at module
        // load, which esbuild's ESM `__require` shim can't resolve at
        // runtime — the Lambda cold-starts with `Dynamic require of
        // "buffer" is not supported`. The banner patches the shim with a
        // real `createRequire` so every Node built-in + any other CJS
        // transitive dep just works.
        banner: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);',
      },
    });

    const apiDomainName = props.customDomain
      ? new DomainName(this, 'DomainName', {
          domainName: props.customDomain.hostname,
          certificate: Certificate.fromCertificateArn(
            this,
            'DomainCert',
            props.customDomain.certificateArn,
          ),
        })
      : undefined;

    const corsMethods = [
      CorsHttpMethod.GET,
      CorsHttpMethod.POST,
      CorsHttpMethod.PUT,
      CorsHttpMethod.PATCH,
      CorsHttpMethod.DELETE,
      CorsHttpMethod.OPTIONS,
    ];
    const defaultCors: CorsPreflightOptions =
      props.allowedOrigins && props.allowedOrigins.length > 0
        ? {
            allowOrigins: [...props.allowedOrigins],
            allowCredentials: true,
            allowHeaders: ['content-type', 'authorization'],
            allowMethods: corsMethods,
            maxAge: Duration.minutes(10),
          }
        : {
            allowOrigins: ['*'],
            allowMethods: corsMethods,
            maxAge: Duration.minutes(10),
          };

    this.httpApi = new HttpApi(this, 'HttpApi', {
      apiName,
      corsPreflight: props.cors ?? defaultCors,
      ...(apiDomainName ? { defaultDomainMapping: { domainName: apiDomainName } } : {}),
    });

    if (props.customDomain && apiDomainName) {
      const zone = HostedZone.fromHostedZoneAttributes(this, 'DomainZone', {
        hostedZoneId: props.customDomain.hostedZoneId,
        zoneName: props.customDomain.hostedZoneName,
      });
      const aliasTarget = RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(
          apiDomainName.regionalDomainName,
          apiDomainName.regionalHostedZoneId,
        ),
      );
      // Trailing dot tags the recordName as an FQDN so CDK's
      // `determineFullyQualifiedDomainName` short-circuits and does NOT
      // append the zone name. Without it, when `zoneName` is a CFN token
      // (from SSM, as it is here), CDK's suffix check fails and the
      // record ends up as `<hostname>.${zoneName}` → `last-loop-lepin-
      // pr-12-api.preview.borso.fr.borso.fr` in Route 53, which loses the
      // ALIAS race against the wildcard `*.preview.borso.fr` record on
      // the shared previews distribution.
      const fqdn = `${props.customDomain.hostname}.`;
      new ARecord(this, 'DomainAliasA', { zone, recordName: fqdn, target: aliasTarget });
      new AaaaRecord(this, 'DomainAliasAAAA', { zone, recordName: fqdn, target: aliasTarget });
    }

    const integration = new HttpLambdaIntegration('Int', this.handler);
    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    });
    this.httpApi.addRoutes({
      path: '/',
      methods: [HttpMethod.ANY],
      integration,
    });

    new Alarm(this, 'Errors', {
      metric: this.handler.metricErrors({ period: Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    props.dsqlSchema?.grantConnect(this.handler);

    this.url = props.customDomain
      ? `https://${props.customDomain.hostname}`
      : `https://${this.httpApi.apiId}.execute-api.${stack.region}.amazonaws.com`;

    new CfnOutput(this, 'Url', { value: this.url });
  }
}
