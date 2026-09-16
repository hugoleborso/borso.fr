/**
 * @DependsOnExternal aws-ssm
 */

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const DEFAULT_REGION = 'eu-west-3';

let cachedClient: SSMClient | null = null;

function getClient(): SSMClient {
  if (cachedClient !== null) return cachedClient;
  cachedClient = new SSMClient({ region: process.env.AWS_REGION ?? DEFAULT_REGION });
  return cachedClient;
}

export async function readSecureParameter(parameterName: string): Promise<string | undefined> {
  const answer = await getClient().send(
    new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
  );
  return answer.Parameter?.Value;
}
