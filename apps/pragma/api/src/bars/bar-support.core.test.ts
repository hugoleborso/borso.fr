import { describe, expect, it } from 'vitest';
import { orderAvailableSupport, resolveConcertMood } from './bar-support.core';

describe('orderAvailableSupport', () => {
  it('reads back in the declared order, whatever order it was given', () => {
    expect(orderAvailableSupport(['sound-engineer', 'pa-system'])).toEqual([
      'pa-system',
      'sound-engineer',
    ]);
  });

  it('keeps each support once', () => {
    expect(orderAvailableSupport(['lights', 'lights'])).toEqual(['lights']);
  });

  it('keeps every support the bar lends', () => {
    expect(orderAvailableSupport(['lights', 'sound-engineer', 'pa-system'])).toEqual([
      'pa-system',
      'lights',
      'sound-engineer',
    ]);
  });

  it('answers an empty list for a bar that lends nothing', () => {
    expect(orderAvailableSupport([])).toEqual([]);
  });
});

describe('resolveConcertMood', () => {
  it('names every mood the column may hold', () => {
    for (const mood of ['chill', 'gig', 'ticketed'] as const) {
      expect(resolveConcertMood(mood)).toBe(mood);
    }
  });

  it('reads a null or unknown mood as not known yet', () => {
    expect(resolveConcertMood(null)).toBeNull();
    expect(resolveConcertMood('enormous')).toBeNull();
  });
});
