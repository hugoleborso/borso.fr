import { logStudy } from '../studies/studies.service';
import { SEED_STUDIES } from './test-seed-studies.core';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// @FollowsBlueprint service-clock-injected
export async function seedStudies(
  memberIdByName: ReadonlyMap<string, string>,
  songIdByTitle: ReadonlyMap<string, string>,
  instrumentIdByName: ReadonlyMap<string, string>,
  now: Date,
): Promise<void> {
  for (const seed of SEED_STUDIES) {
    const logged = await logStudy({
      memberId: memberIdByName.get(seed.memberFirstName) ?? '',
      songId: songIdByTitle.get(seed.songTitle) ?? '',
      instrumentId: instrumentIdByName.get(seed.instrumentName) ?? '',
      now: new Date(now.getTime() - seed.daysAgo * MILLISECONDS_PER_DAY),
    });
    if (logged.kind !== 'ok') {
      throw new Error(`seed study of ${seed.memberFirstName}: ${logged.kind}`);
    }
  }
}
