import { describe, expect, it } from 'vitest';
import { HOST_ROUTING_FUNCTION_CODE } from '../../src/internal/cf-host-routing-function.js';

interface CfEvent {
  readonly request: {
    readonly headers: { readonly host?: { readonly value: string } };
    readonly uri: string;
  };
}

function evaluateHandler(event: CfEvent): unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- HOST_ROUTING_FUNCTION_CODE is the .code.js file read as a string at synth time and shipped verbatim to the edge runtime, so compiling that string is the only way to exercise the handler CloudFront actually runs
  const factory = new Function(`${HOST_ROUTING_FUNCTION_CODE}; return handler;`);
  const handler: unknown = factory();
  if (typeof handler !== 'function') {
    throw new TypeError('CloudFront Function source did not yield a callable handler.');
  }
  return handler(event);
}

// @FollowsBlueprint test-pure-unit
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

  it('rewrites SPA deep routes for pragma to /<app>/pr-<n>/index.html so the React router takes over', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'pragma-pr-26.preview.borso.fr' } },
          uri: '/login',
        },
      }),
    ).toMatchObject({ uri: '/pragma/pr-26/index.html' });
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'pragma-pr-26.preview.borso.fr' } },
          uri: '/sessions/abc/setlist',
        },
      }),
    ).toMatchObject({ uri: '/pragma/pr-26/index.html' });
  });

  it('rewrites SPA root and trailing-slash URIs to the bundle index.html for pragma', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'pragma-pr-26.preview.borso.fr' } },
          uri: '/',
        },
      }),
    ).toMatchObject({ uri: '/pragma/pr-26/index.html' });
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'pragma-pr-26.preview.borso.fr' } },
          uri: '/catalog/',
        },
      }),
    ).toMatchObject({ uri: '/pragma/pr-26/index.html' });
  });

  it('passes SPA asset paths through to S3 with the app/pr-<n> prefix', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'pragma-pr-26.preview.borso.fr' } },
          uri: '/assets/index-abc.js',
        },
      }),
    ).toMatchObject({ uri: '/pragma/pr-26/assets/index-abc.js' });
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'last-loop-lepin-pr-12.preview.borso.fr' } },
          uri: '/favicon.svg',
        },
      }),
    ).toMatchObject({ uri: '/last-loop-lepin/pr-12/favicon.svg' });
  });

  it('keeps the multi-page directory-rewrite behavior for non-SPA apps (borso-fr)', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'borso-fr-pr-3.preview.borso.fr' } },
          uri: '/art/mondrian',
        },
      }),
    ).toMatchObject({ uri: '/borso-fr/pr-3/art/mondrian/index.html' });
  });

  it('routes the bp-integ-<spa-app> hostname with SPA fallback too', () => {
    expect(
      evaluateHandler({
        request: {
          headers: { host: { value: 'bp-integ-pragma-pr-26.preview.borso.fr' } },
          uri: '/login',
        },
      }),
    ).toMatchObject({ uri: '/bp-integ/pragma/pr-26/index.html' });
  });
});
