import { describe, expect, it } from 'vitest';
import { projectConcertPrize, readConcertPrizeIcon } from './concert-prize.core';

// @FollowsBlueprint test-pure-unit
describe('concert prize', () => {
  it('reads a stored icon, and falls back to the beer for none or an unknown one', () => {
    expect(readConcertPrizeIcon('gift')).toBe('gift');
    expect(readConcertPrizeIcon('shirt')).toBe('shirt');
    expect(readConcertPrizeIcon(null)).toBe('beer');
    expect(readConcertPrizeIcon('trophy')).toBe('beer');
  });

  it('shows a prize only when a member wrote its label', () => {
    expect(projectConcertPrize(null, 'ticket')).toBeNull();
    expect(projectConcertPrize('2 places', 'ticket')).toStrictEqual({
      label: '2 places',
      icon: 'ticket',
    });
    expect(projectConcertPrize('3 bières', null)).toStrictEqual({
      label: '3 bières',
      icon: 'beer',
    });
  });
});
