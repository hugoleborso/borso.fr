/**
 * @DependsOnExternal aws-ssm
 */

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { addWideEventFields } from '../observability/wide-event.adapter';
import { describeThrownValue } from '../observability/wide-event.core';

const DEFAULT_REGION = 'eu-west-3';

let cachedClient: SSMClient | null = null;

function getClient(): SSMClient {
  if (cachedClient !== null) return cachedClient;
  cachedClient = new SSMClient({ region: process.env.AWS_REGION ?? DEFAULT_REGION });
  return cachedClient;
}

export async function readSecureParameter(parameterName: string): Promise<string | undefined> {
  try {
    const answer = await getClient().send(
      new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
    );
    return answer.Parameter?.Value;
  } catch (error) {
    addWideEventFields({
      'parameter_store.failed_parameters': [parameterName],
      'parameter_store.failure_types': [describeThrownValue(error).type],
    });
    return undefined;
  }
}
