import { describe, expect, it } from 'vitest';
import { resolveShortAddress } from './live-concert.core';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';

// @FollowsBlueprint test-pure-unit
describe('resolving the short vote address', () => {
  it('waits while the answer is still in flight', () => {
    expect(resolveShortAddress({ isResolving: true, liveSessionId: undefined })).toEqual({
      kind: 'resolving',
    });
  });

  it('says no concert is live rather than guessing from the calendar', () => {
    expect(resolveShortAddress({ isResolving: false, liveSessionId: null })).toEqual({
      kind: 'no-concert-live',
    });
  });

  it('says no concert is live when the answer never arrived', () => {
    expect(resolveShortAddress({ isResolving: false, liveSessionId: undefined })).toEqual({
      kind: 'no-concert-live',
    });
  });

  it('redirects to the full address of the concert with the open round', () => {
    expect(resolveShortAddress({ isResolving: false, liveSessionId: A_CONCERT })).toEqual({
      kind: 'redirect',
      path: `/vote/${A_CONCERT}`,
    });
  });
});
