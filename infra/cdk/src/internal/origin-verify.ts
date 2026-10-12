import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR_TIMEOUT_SECONDS = 30;
const ORIGIN_VERIFY_RESOURCE_TYPE = 'Custom::OriginVerifyValue';
const ORIGIN_VERIFY_ATTRIBUTE = 'Value';

/* v8 ignore start -- both candidates exist in their respective contexts */
function resolveGeneratorEntry(): string {
  const generatorDirectory = path.join(HERE, 'origin-verify-generator');
  const candidates = [
    path.join(generatorDirectory, 'index.js'),
    path.join(generatorDirectory, 'index.ts'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Could not find origin-verify-generator entry. Looked at:\n  ${candidates.join('\n  ')}`,
  );
}
/* v8 ignore stop */

// @FollowsBlueprint cdk-custom-resource
export function createOriginVerifyValue(scope: Construct): string {
  const generator = new NodejsFunction(scope, 'OriginVerifyGenerator', {
    entry: resolveGeneratorEntry(),
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    timeout: Duration.seconds(GENERATOR_TIMEOUT_SECONDS),
    logGroup: new LogGroup(scope, 'OriginVerifyGeneratorLogs', {
      retention: RetentionDays.ONE_WEEK,
    }),
    bundling: { target: 'node22', format: OutputFormat.ESM },
  });
  const originVerify = new CustomResource(scope, 'OriginVerify', {
    serviceToken: generator.functionArn,
    resourceType: ORIGIN_VERIFY_RESOURCE_TYPE,
  });
  return originVerify.getAttString(ORIGIN_VERIFY_ATTRIBUTE);
}
