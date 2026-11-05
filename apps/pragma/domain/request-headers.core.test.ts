import { describe, expect, it } from 'vitest';
import { BALLOT_TOKEN_HEADER } from './ballot-token.core';
import { PRAGMA_REQUEST_HEADER_NAMES } from './request-headers.core';
import { REALTIME_CLIENT_HEADER } from './stale-scope.core';

// @FollowsBlueprint test-pure-unit
describe('the request headers the site sends beyond the CORS-safelisted ones', () => {
  it('names every custom header the site sends, in the lower case the preflight compares', () => {
    expect(PRAGMA_REQUEST_HEADER_NAMES).toStrictEqual([
      BALLOT_TOKEN_HEADER,
      REALTIME_CLIENT_HEADER,
    ]);
  });
});
