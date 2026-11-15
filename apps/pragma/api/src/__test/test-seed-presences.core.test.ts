import { describe, expect, it } from 'vitest';
import { parisCalendarDay } from '@domain/paris-day.core';
import { SEED_PRESENCES, seedPresenceInstant } from './test-seed-presences.core';

function listDaysAgoPresentBy(firstName: string): number[] {
  return SEED_PRESENCES.filter((presence) => presence.memberFirstName === firstName).map(
    (presence) => presence.daysAgo,
  );
}

// @FollowsBlueprint test-pure-unit
describe('the seeded presences', () => {
  it('leaves Hugo today open and yesterday missed, so his flame spends a joker', () => {
    expect(listDaysAgoPresentBy('Hugo')).toEqual([2, 3, 4, 5]);
  });

  it('counts today for Léa, so the band flame is lit', () => {
    expect(listDaysAgoPresentBy('Léa')).toEqual([0]);
  });
});

describe('seedPresenceInstant', () => {
  const lateEveningAfterClockChange = new Date('2026-10-29T22:30:00Z');

  it('puts each past seed on its own Paris day across the 25 October 2026 clock change', () => {
    const presentOn = [2, 3, 4, 5].map((daysAgo) =>
      parisCalendarDay(seedPresenceInstant(lateEveningAfterClockChange, daysAgo)),
    );
    expect(presentOn).toEqual(['2026-10-27', '2026-10-26', '2026-10-25', '2026-10-24']);
  });

  it('dates a past seed at midday UTC of its Paris day', () => {
    expect(seedPresenceInstant(lateEveningAfterClockChange, 4)).toEqual(
      new Date('2026-10-25T12:00:00Z'),
    );
  });

  it('dates a seed of today at now when now is before midday UTC', () => {
    const earlyMorning = new Date('2026-10-29T06:00:00Z');
    expect(seedPresenceInstant(earlyMorning, 0)).toEqual(earlyMorning);
  });

  it('dates a seed of today at midday UTC when now is later, so no seed lies in the future', () => {
    expect(seedPresenceInstant(lateEveningAfterClockChange, 0)).toEqual(
      new Date('2026-10-29T12:00:00Z'),
    );
  });
});
