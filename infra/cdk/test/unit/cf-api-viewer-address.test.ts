import { describe, expect, it } from 'vitest';
import { API_VIEWER_ADDRESS_FUNCTION_CODE } from '../../src/internal/cf-api-viewer-address.js';
import { VIEWER_ADDRESS_HEADER } from '../../src/internal/client-address.js';

interface ViewerRequestEvent {
  readonly viewer: { readonly ip: string };
  readonly request: { readonly headers: Record<string, { readonly value: string }> };
}

function evaluateHandler(event: ViewerRequestEvent): unknown {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- API_VIEWER_ADDRESS_FUNCTION_CODE is the .code.js file read as a string at synth time and shipped verbatim to the edge runtime, so compiling that string is the only way to exercise the handler CloudFront actually runs
  const factory = new Function(`${API_VIEWER_ADDRESS_FUNCTION_CODE}; return handler;`);
  const handler: unknown = factory();
  if (typeof handler !== 'function') {
    throw new TypeError('CloudFront Function source did not yield a callable handler.');
  }
  return handler(event);
}

// @FollowsBlueprint test-pure-unit
describe('API_VIEWER_ADDRESS_FUNCTION_CODE', () => {
  it('writes the viewer address under the header name the API reads', () => {
    expect(API_VIEWER_ADDRESS_FUNCTION_CODE).toContain(`'${VIEWER_ADDRESS_HEADER}'`);
  });

  it('sets the header from the address CloudFront saw', () => {
    expect(
      evaluateHandler({ viewer: { ip: '198.51.100.10' }, request: { headers: {} } }),
    ).toStrictEqual({ headers: { [VIEWER_ADDRESS_HEADER]: { value: '198.51.100.10' } } });
  });

  it('overwrites a value the client sent under the same name', () => {
    expect(
      evaluateHandler({
        viewer: { ip: '198.51.100.10' },
        request: {
          headers: {
            [VIEWER_ADDRESS_HEADER]: { value: '203.0.113.99' },
            'x-forwarded-for': { value: '203.0.113.1' },
          },
        },
      }),
    ).toStrictEqual({
      headers: {
        [VIEWER_ADDRESS_HEADER]: { value: '198.51.100.10' },
        'x-forwarded-for': { value: '203.0.113.1' },
      },
    });
  });
});
