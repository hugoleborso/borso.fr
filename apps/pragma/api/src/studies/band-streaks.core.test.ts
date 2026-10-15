import { describe, expect, it } from 'vitest';
import { buildMemberStreaks } from './band-streaks.core';

// @FollowsBlueprint test-pure-unit
describe('band-streaks.core', () => {
  it('computes each member streak and counts studies since Monday', () => {
    const streaks = buildMemberStreaks(
      [
        { memberId: 'hugo', firstName: 'Hugo' },
        { memberId: 'lea', firstName: 'Léa' },
      ],
      [
        { memberId: 'hugo', studiedOn: '2026-10-11' },
        { memberId: 'hugo', studiedOn: '2026-10-12' },
        { memberId: 'hugo', studiedOn: '2026-10-12' },
        { memberId: 'hugo', studiedOn: '2026-10-14' },
      ],
      '2026-10-14',
    );
    expect(streaks).toEqual([
      {
        memberId: 'hugo',
        firstName: 'Hugo',
        streak: { days: 3, isTodayCounted: true, isJokerAvailable: false },
        studiesThisWeek: 3,
      },
      {
        memberId: 'lea',
        firstName: 'Léa',
        streak: { days: 0, isTodayCounted: false, isJokerAvailable: true },
        studiesThisWeek: 0,
      },
    ]);
  });
});
