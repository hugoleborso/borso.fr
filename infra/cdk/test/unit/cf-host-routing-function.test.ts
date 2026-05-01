import { describe, expect, it } from 'vitest';
import { HOST_ROUTING_FUNCTION_CODE } from '../../src/internal/cf-host-routing-function.js';

describe('HOST_ROUTING_FUNCTION_CODE', () => {
  it('exports a non-empty CloudFront Function source string', () => {
    expect(HOST_ROUTING_FUNCTION_CODE).toContain('function handler');
    expect(HOST_ROUTING_FUNCTION_CODE).toContain('preview.borso.fr');
    expect(HOST_ROUTING_FUNCTION_CODE).toContain('bp-integ-');
  });

  it('is valid JS that routes <app>-pr-<n>.preview.borso.fr', async () => {
    // Evaluate the function source in a sandbox-ish context.
    const factory = new Function(`${HOST_ROUTING_FUNCTION_CODE}; return handler;`);
    const handler = factory() as (e: unknown) => unknown;

    const out = handler({
      request: {
        headers: { host: { value: 'test-app-pr-7.preview.borso.fr' } },
        uri: '/about',
      },
    }) as { uri?: string; statusCode?: number };
    expect(out.uri).toBe('/test-app/pr-7/about');

    const root = handler({
      request: {
        headers: { host: { value: 'test-app-pr-7.preview.borso.fr' } },
        uri: '/',
      },
    }) as { uri?: string };
    expect(root.uri).toBe('/test-app/pr-7/index.html');

    const integ = handler({
      request: {
        headers: { host: { value: 'bp-integ-test-app-pr-7.preview.borso.fr' } },
        uri: '/api',
      },
    }) as { uri?: string };
    expect(integ.uri).toBe('/bp-integ/test-app/pr-7/api');

    const noHost = handler({ request: { headers: {}, uri: '/' } }) as { statusCode?: number };
    expect(noHost.statusCode).toBe(400);

    const wrongDomain = handler({
      request: { headers: { host: { value: 'foo.example.com' } }, uri: '/' },
    }) as { statusCode?: number };
    expect(wrongDomain.statusCode).toBe(404);

    const malformed = handler({
      request: {
        headers: { host: { value: 'no-pr-suffix.preview.borso.fr' } },
        uri: '/',
      },
    }) as { statusCode?: number };
    expect(malformed.statusCode).toBe(404);
  });
});
