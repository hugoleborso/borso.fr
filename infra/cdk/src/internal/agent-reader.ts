import { ArnFormat, Stack } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

export const AGENT_READER_IAM_USER = 'AI-Dev-ReadOnly';

export function agentReaderPrincipalArn(scope: Construct): string {
  return Stack.of(scope).formatArn({
    service: 'iam',
    region: '',
    resource: 'user',
    resourceName: AGENT_READER_IAM_USER,
    arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
  });
}
