import { afterEach, describe, expect, it, vi } from 'vitest';
import { type CustomResourceEvent, handler } from './index.js';

const RESPONSE_URL = 'https://cloudformation-response.example/presigned';

function eventOf(requestType: CustomResourceEvent['RequestType']): CustomResourceEvent {
  return {
    RequestType: requestType,
    ResponseURL: RESPONSE_URL,
    StackId: 'arn:aws:cloudformation:eu-west-3:123456789012:stack/app-prod/id',
    RequestId: 'request-1',
    LogicalResourceId: 'OriginVerify',
  };
}

interface SentRequest {
  readonly url: string;
  readonly body: string;
}

async function sentBodyFor(requestType: CustomResourceEvent['RequestType']): Promise<unknown> {
  const sent: SentRequest[] = [];
  vi.stubGlobal('fetch', async (url: string, init: { readonly body: string }) => {
    sent.push({ url, body: init.body });
    return new Response(null, { status: 200 });
  });
  await handler(eventOf(requestType));
  expect(sent).toHaveLength(1);
  expect(sent[0]?.url).toBe(RESPONSE_URL);
  const body: unknown = JSON.parse(sent[0]?.body ?? '');
  return body;
}

// @FollowsBlueprint test-pure-unit
describe('origin-verify generator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('answers a create with a fresh 64-character value, hidden from the console', async () => {
    const body = await sentBodyFor('Create');
    expect(body).toMatchObject({
      Status: 'SUCCESS',
      PhysicalResourceId: 'origin-verify-value',
      RequestId: 'request-1',
      LogicalResourceId: 'OriginVerify',
      NoEcho: true,
      Data: { Value: expect.stringMatching(/^[0-9a-f]{64}$/) },
    });
  });

  it('never answers two creates with the same value', async () => {
    const first = await sentBodyFor('Create');
    const second = await sentBodyFor('Create');
    expect(first).not.toEqual(second);
  });

  it('answers a delete with success and no value', async () => {
    expect(await sentBodyFor('Delete')).toMatchObject({ Status: 'SUCCESS', Data: {} });
  });
});
