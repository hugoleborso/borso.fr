import { describe, expect, it } from 'vitest';
import { HOST_ROUTING_FUNCTION_CODE } from '../../src/internal/cf-host-routing-function.js';

interface CfEvent {
  readonly request: {
    readonly headers: { readonly host?: { readonly value: string } };
    readonly uri: string;
  };
}

function evaluateHandler(event: CfEvent): unknown {
  const factory = new Function(`${HOST_ROUTING_FUNCTION_CODE}; return handler;`);
  const result: unknown = factory();
  if (typeof result !== 'function') {
    throw new Error('CloudFront Function source did not yield a callable handler.');
  }
  return result(event);
}

describe('HOST_ROUTING_FUNCTION_CODE', () => {
  it('exports a non-empty CloudFront Function source string', () => {
    expect(HOST_ROUTING_FUNCTION_CODE).toContain('function handler');
    expect(HOST_ROUTING_FUNCTION_CODE).toContain('preview.borso.fr');
    expect(HOST_ROUTING_FUNCTION_CODE).toContain('bp-integ-');
  });

  it('rewrites a preview hostname into an app/pr-prefixed S3 URI', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'test-app-pr-7.preview.borso.fr' } },
          uri: '/about',
        },
      }),
    ).toMatchObject({ uri: '/test-app/pr-7/about/index.html' });
  });

  it('appends index.html when the URI ends in `/`', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'test-app-pr-7.preview.borso.fr' } },
          uri: '/',
        },
      }),
    ).toMatchObject({ uri: '/test-app/pr-7/index.html' });
  });

  it('routes the bp-integ- hostname into the integ S3 prefix', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'bp-integ-test-app-pr-7.preview.borso.fr' } },
          uri: '/api',
        },
      }),
    ).toMatchObject({ uri: '/bp-integ/test-app/pr-7/api/index.html' });
  });

  it('returns 400 when the request has no Host header', () => {
    expect(evaluateHandler({ request: { headers: {}, uri: '/' } })).toMatchObject({
      statusCode: 400,
    });
  });

  it('returns 404 when the host is not under preview.borso.fr', () => {
    expect(
      evaluateHandler({
        request: { headers: { host: { value: 'foo.example.com' } }, uri: '/' },
      }),
    ).toMatchObject({ statusCode: 404 });
  });

  it('returns 404 when the subdomain has no -pr-<n> suffix', () => {
    expect(
      evaluateHandler({
        request: { headers: { host: { value: 'no-pr-suffix.preview.borso.fr' } }, uri: '/' },
      }),
    ).toMatchObject({ statusCode: 404 });
  });

  it('appends /index.html on nested directory paths without trailing slash', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'test-app-pr-7.preview.borso.fr' } },
          uri: '/art/mondrian',
        },
      }),
    ).toMatchObject({ uri: '/test-app/pr-7/art/mondrian/index.html' });
  });

  it('leaves file paths with extensions untouched', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'test-app-pr-7.preview.borso.fr' } },
          uri: '/art/mondrian/script.js',
        },
      }),
    ).toMatchObject({ uri: '/test-app/pr-7/art/mondrian/script.js' });
  });

  it('treats /.well-known/foo as a directory (no file extension after last slash)', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'test-app-pr-7.preview.borso.fr' } },
          uri: '/.well-known/foo',
        },
      }),
    ).toMatchObject({ uri: '/test-app/pr-7/.well-known/foo/index.html' });
  });
});
