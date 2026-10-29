import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  BLOCKLIST_VARIABLE,
  ENDPOINT_VARIABLE,
  ROLE_VARIABLE,
  SCHEMA_VARIABLE,
} from '../internal/agent-reader/index.js';
import {
  assertDeployStage,
  lambdaFunctionName,
  type Stage,
  validateAppSlug,
} from '../internal/naming.utils.js';
import { applyStandardTags } from '../internal/tags.js';
import type { DsqlSchema } from './dsql-schema.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const AGENT_READER_HANDLER_SLUG = 'agent-reader';
export const AGENT_READER_FUNCTION_NAME_OUTPUT = 'AgentReaderFunctionName';

const READER_MEMORY_MIB = 256;
const READER_TIMEOUT_SECONDS = 30;
const READER_RESERVED_CONCURRENCY = 2;
const BLOCKLIST_SEPARATOR = ',';
const NODE_BUILTIN_REQUIRE_SHIM_BANNER =
  "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";
const LAMBDA_RUNTIME_PROVIDED_MODULES = '@aws-sdk/client-*';

/* v8 ignore start -- both candidates exist in their respective contexts */
function resolveReaderEntry(): string {
  const readerDirectory = path.join(HERE, '..', 'internal', 'agent-reader');
  const candidates = [
    path.join(readerDirectory, 'index.js'),
    path.join(readerDirectory, 'index.ts'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not find agent-reader entry. Looked at:\n  ${candidates.join('\n  ')}`);
}
/* v8 ignore stop */

export interface DsqlAgentReaderProps {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
  readonly schema: DsqlSchema;
  readonly tableBlocklist?: readonly string[];
}

/**
 * @Blueprint invoked-reader-lambda
 * @BlueprintName Invoked Reader Lambda
 * @BlueprintUsage Use when a caller outside the account's own services needs to read one resource and the rule saying what it may read has to run somewhere the caller cannot skip.
 * @BlueprintDescription Publishes no URL and mounts no route: the function is reachable only through `lambda:InvokeFunction`, so the caller is authenticated by SigV4 as the IAM principal it already is and there is no secret whose theft alone grants access. The guard the caller used to run client-side moves into the handler and its inputs arrive as environment variables set at synth time, which is what makes a caller that skips the wrapper gain nothing. `grantInvoke` is scoped to the account root so the entitlement is stated once in the invoker's own policy rather than split across a resource policy as well.
 */
export class DsqlAgentReader extends Construct {
  public readonly functionName: string;

  constructor(scope: Construct, id: string, props: DsqlAgentReaderProps) {
    super(scope, id);
    validateAppSlug(props.app);
    assertDeployStage(props.stage);
    const readerRole = requireReaderRole(props);
    applyStandardTags(this, props);

    this.functionName = lambdaFunctionName(props, AGENT_READER_HANDLER_SLUG);

    const logGroup = new LogGroup(this, 'Logs', {
      logGroupName: `/aws/lambda/${this.functionName}`,
      retention: RetentionDays.ONE_MONTH,
    });

    const handler = new NodejsFunction(this, 'Fn', {
      functionName: this.functionName,
      entry: resolveReaderEntry(),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: READER_MEMORY_MIB,
      timeout: Duration.seconds(READER_TIMEOUT_SECONDS),
      reservedConcurrentExecutions: READER_RESERVED_CONCURRENCY,
      logGroup,
      environment: {
        [ENDPOINT_VARIABLE]: props.schema.clusterEndpoint,
        [SCHEMA_VARIABLE]: props.schema.schemaName,
        [ROLE_VARIABLE]: readerRole,
        [BLOCKLIST_VARIABLE]: (props.tableBlocklist ?? []).join(BLOCKLIST_SEPARATOR),
      },
      bundling: {
        target: 'node22',
        format: OutputFormat.ESM,
        banner: NODE_BUILTIN_REQUIRE_SHIM_BANNER,
        externalModules: [LAMBDA_RUNTIME_PROVIDED_MODULES],
      },
    });

    props.schema.grantReaderConnect(handler);

    const functionNameOutput = new CfnOutput(this, 'FunctionName', { value: this.functionName });
    functionNameOutput.overrideLogicalId(AGENT_READER_FUNCTION_NAME_OUTPUT);
  }
}

function requireReaderRole(props: DsqlAgentReaderProps): string {
  const roleName = props.schema.readerRoleName;
  if (roleName === undefined) {
    throw new Error(
      `DsqlAgentReader: ${props.app} ${props.stage} has no read-only database role, so the ` +
        `function would connect as nothing. Pass readerPrincipalArns to the DsqlSchema first.`,
    );
  }
  return roleName;
}
