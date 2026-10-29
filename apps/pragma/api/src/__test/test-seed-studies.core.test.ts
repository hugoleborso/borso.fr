import { describe, expect, it } from 'vitest';
import { SEED_SONGS } from './test-seed-fixture.core';
import { parisCalendarDay } from '@domain/paris-day.core';
import { SEED_STUDIES, seedStudyInstant } from './test-seed-studies.core';

function listDaysAgoStudiedBy(firstName: string): number[] {
  return SEED_STUDIES.filter((study) => study.memberFirstName === firstName).map(
    (study) => study.daysAgo,
  );
}

// @FollowsBlueprint test-pure-unit
describe('the seeded studies', () => {
  it('logs each study on an instrument the member plays in that song', () => {
    for (const study of SEED_STUDIES) {
      const song = SEED_SONGS.find((candidate) => candidate.title === study.songTitle);
      expect(song?.lineup[study.memberFirstName]).toContain(study.instrumentName);
    }
  });

  it('leaves Hugo today open and yesterday missed, so his flame spends a joker', () => {
    expect(listDaysAgoStudiedBy('Hugo')).toEqual([2, 3, 4, 5]);
  });

  it('counts today for Léa, so the band flame is lit', () => {
    expect(listDaysAgoStudiedBy('Léa')).toEqual([0]);
  });
});

describe('seedStudyInstant', () => {
  const lateEveningAfterClockChange = new Date('2026-10-29T22:30:00Z');

  it('puts each past seed on its own Paris day across the 25 October 2026 clock change', () => {
    const studiedOn = [2, 3, 4, 5].map((daysAgo) =>
      parisCalendarDay(seedStudyInstant(lateEveningAfterClockChange, daysAgo)),
    );
    expect(studiedOn).toEqual(['2026-10-27', '2026-10-26', '2026-10-25', '2026-10-24']);
  });

  it('dates a past seed at midday UTC of its Paris day', () => {
    expect(seedStudyInstant(lateEveningAfterClockChange, 4)).toEqual(
      new Date('2026-10-25T12:00:00Z'),
    );
  });

  it('dates a seed of today at now when now is before midday UTC', () => {
    const earlyMorning = new Date('2026-10-29T06:00:00Z');
    expect(seedStudyInstant(earlyMorning, 0)).toEqual(earlyMorning);
  });

  it('dates a seed of today at midday UTC when now is later, so no seed lies in the future', () => {
    expect(seedStudyInstant(lateEveningAfterClockChange, 0)).toEqual(
      new Date('2026-10-29T12:00:00Z'),
    );
  });
});
