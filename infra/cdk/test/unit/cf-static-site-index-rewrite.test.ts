import { describe, expect, it } from 'vitest';
import { STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE } from '../../src/internal/cf-static-site-index-rewrite.js';

interface CfEvent {
  readonly request: { readonly uri: string };
}

function evaluateHandler(event: CfEvent): unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE is the .code.js file read as a string at synth time and shipped verbatim to the edge runtime, so compiling that string is the only way to exercise the handler CloudFront actually runs
  const factory = new Function(`${STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE}; return handler;`);
  const handler: unknown = factory();
  if (typeof handler !== 'function') {
    throw new TypeError('CloudFront Function source did not yield a callable handler.');
  }
  return handler(event);
}

// @FollowsBlueprint test-pure-unit
describe('STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE', () => {
  it('exports a non-empty CloudFront Function source string', () => {
    expect(STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE).toContain('function handler');
    expect(STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE).toContain('index.html');
  });

  it('rewrites a trailing-slash directory URI to /<dir>/index.html', () => {
    expect(evaluateHandler({ request: { uri: '/art/mondrian/' } })).toStrictEqual({
      uri: '/art/mondrian/index.html',
    });
  });

  it('rewrites the apex / to /index.html', () => {
    expect(evaluateHandler({ request: { uri: '/' } })).toStrictEqual({ uri: '/index.html' });
  });

  it('rewrites the empty URI to index.html (defensive — CloudFront sends empty for /)', () => {
    expect(evaluateHandler({ request: { uri: '' } })).toStrictEqual({ uri: 'index.html' });
  });

  it('rewrites a no-trailing-slash directory URI to /<dir>/index.html', () => {
    expect(evaluateHandler({ request: { uri: '/art/mondrian' } })).toStrictEqual({
      uri: '/art/mondrian/index.html',
    });
  });

  it('rewrites a single-segment directory URI to /<seg>/index.html', () => {
    expect(evaluateHandler({ request: { uri: '/family' } })).toStrictEqual({
      uri: '/family/index.html',
    });
  });

  it('passes through asset URIs with file extensions', () => {
    expect(evaluateHandler({ request: { uri: '/style.css' } })).toStrictEqual({
      uri: '/style.css',
    });
    expect(evaluateHandler({ request: { uri: '/img/photo.jpg' } })).toStrictEqual({
      uri: '/img/photo.jpg',
    });
    expect(evaluateHandler({ request: { uri: '/art/mondrian/index.html' } })).toStrictEqual({
      uri: '/art/mondrian/index.html',
    });
  });

  it('passes through nested asset URIs with the dot in the last segment', () => {
    expect(
      evaluateHandler({
        request: { uri: '/assets/playfair-display-latin-400-normal-CFtfchNt.woff2' },
      }),
    ).toStrictEqual({ uri: '/assets/playfair-display-latin-400-normal-CFtfchNt.woff2' });
  });
});
