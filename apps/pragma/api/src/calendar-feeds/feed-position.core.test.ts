import { describe, expect, it } from 'vitest';
import { numberFeedsOfEachMember } from './feed-position.core';

// @FollowsBlueprint test-pure-unit
describe('numberFeedsOfEachMember', () => {
  it('numbers each member’s calendars from one, in the order the Account page lists them', () => {
    expect(
      numberFeedsOfEachMember([
        { memberId: 'hugo', address: 'a', name: 'Band' },
        { memberId: 'hugo', address: 'b', name: null },
        { memberId: 'lea', address: 'c', name: null },
        { memberId: 'hugo', address: 'd', name: null },
      ]).map((feed) => [feed.memberId, feed.position]),
    ).toStrictEqual([
      ['hugo', 1],
      ['hugo', 2],
      ['lea', 1],
      ['hugo', 3],
    ]);
  });
});
