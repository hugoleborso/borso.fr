/**
 * Pragma CDK stack — v1 scaffold.
 *
 * Full composition (LambdaApi + StaticSite + DsqlCluster + DsqlSchema
 * + S3 uploads bucket) is deferred to the next PR. Auth secret wiring
 * is intentionally absent: per ADR-0004 the password hash + HMAC key
 * live in the application DB row `pragma.app_config`, not in CDK.
 */

import { CfnOutput } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

export interface BuildPragmaAppStackProps {
  readonly scope: Construct;
}

export function buildPragmaAppStack(props: BuildPragmaAppStackProps): void {
  new CfnOutput(props.scope, 'PragmaScaffold', {
    value: 'pragma-scaffold-only',
    description:
      'Placeholder output. Full LambdaApi + StaticSite + DsqlCluster wiring lands in a follow-up PR.',
  });
}
