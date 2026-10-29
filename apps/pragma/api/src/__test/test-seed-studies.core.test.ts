import { describe, expect, it } from 'vitest';
import { SEED_SONGS } from './test-seed-fixture.core';
import { SEED_STUDIES } from './test-seed-studies.core';

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
