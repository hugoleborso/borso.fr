import { describe, expect, it } from 'vitest';
import { selectSessionFacts } from './session-facts.core';

const CONCERT = {
  isConcert: true,
  capacity: 120,
  guestCount: 3,
  capacityLabel: 'Capacity',
  guestsLabel: 'guests',
};

describe('selectSessionFacts', () => {
  it('states the capacity and the guests of a concert', () => {
    expect(selectSessionFacts(CONCERT)).toEqual(['Capacity 120', '3 guests']);
  });

  it('states nothing for a rehearsal, which has neither', () => {
    expect(selectSessionFacts({ ...CONCERT, isConcert: false })).toEqual([]);
  });

  it('leaves out a capacity nobody filled in', () => {
    expect(selectSessionFacts({ ...CONCERT, capacity: null })).toEqual(['3 guests']);
  });

  it('leaves out the guests until somebody is bringing one', () => {
    expect(selectSessionFacts({ ...CONCERT, guestCount: 0 })).toEqual(['Capacity 120']);
  });
});
