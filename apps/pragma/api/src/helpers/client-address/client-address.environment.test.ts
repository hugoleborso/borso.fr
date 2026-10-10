import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';
import { ORIGIN_VERIFY_HEADER, VIEWER_ADDRESS_HEADER } from './client-address.core';
import { readClientAddress } from './client-address.environment';

const ORIGIN_SECRET = 'origin-secret';
const SOURCE_IP = '198.51.100.7';
const VIEWER_ADDRESS = '203.0.113.20';
const PRESERVED_SECRET = process.env.ORIGIN_VERIFY_SECRET;

function buildEchoApp(): Hono {
  return new Hono().get('/whoami', (context) => context.text(readClientAddress(context)));
}

async function addressSeenFor(headers: Record<string, string>): Promise<string> {
  const response = await buildEchoApp().request(
    '/whoami',
    { headers },
    {
      event: { requestContext: { http: { sourceIp: SOURCE_IP } } },
    },
  );
  return await response.text();
}

// @FollowsBlueprint test-middleware-integration
describe('readClientAddress', () => {
  afterEach(() => {
    if (PRESERVED_SECRET === undefined) delete process.env.ORIGIN_VERIFY_SECRET;
    else process.env.ORIGIN_VERIFY_SECRET = PRESERVED_SECRET;
  });

  it('keys a forged X-Forwarded-For on the address the request really came from', async () => {
    delete process.env.ORIGIN_VERIFY_SECRET;
    expect(await addressSeenFor({ 'x-forwarded-for': '10.9.8.7' })).toBe(SOURCE_IP);
  });

  it('trusts the viewer address CloudFront wrote when the secret matches', async () => {
    process.env.ORIGIN_VERIFY_SECRET = ORIGIN_SECRET;
    expect(
      await addressSeenFor({
        [VIEWER_ADDRESS_HEADER]: VIEWER_ADDRESS,
        [ORIGIN_VERIFY_HEADER]: ORIGIN_SECRET,
      }),
    ).toBe(VIEWER_ADDRESS);
  });

  it('ignores a viewer address a direct caller sends without the secret', async () => {
    process.env.ORIGIN_VERIFY_SECRET = ORIGIN_SECRET;
    expect(await addressSeenFor({ [VIEWER_ADDRESS_HEADER]: VIEWER_ADDRESS })).toBe(SOURCE_IP);
  });
});
