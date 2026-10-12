import { randomBytes } from 'node:crypto';
import { selectResponseData } from './origin-verify-response.utils.js';

const ORIGIN_VERIFY_BYTES = 32;
const PHYSICAL_RESOURCE_ID = 'origin-verify-value';
const SUCCESS_STATUS = 'SUCCESS';

export interface CustomResourceEvent {
  readonly RequestType: 'Create' | 'Update' | 'Delete';
  readonly ResponseURL: string;
  readonly StackId: string;
  readonly RequestId: string;
  readonly LogicalResourceId: string;
}

function generateOriginVerifyValue(): string {
  return randomBytes(ORIGIN_VERIFY_BYTES).toString('hex');
}

export async function handler(event: CustomResourceEvent): Promise<void> {
  const response = {
    Status: SUCCESS_STATUS,
    PhysicalResourceId: PHYSICAL_RESOURCE_ID,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: true,
    Data: selectResponseData(event.RequestType, generateOriginVerifyValue),
  };
  await fetch(event.ResponseURL, {
    method: 'PUT',
    headers: { 'content-type': '' },
    body: JSON.stringify(response),
  });
}
