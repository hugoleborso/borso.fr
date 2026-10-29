import { logStudy } from '../studies/studies.service';
import { SEED_STUDIES, seedStudyInstant } from './test-seed-studies.core';

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
      now: seedStudyInstant(now, seed.daysAgo),
    });
    if (logged.kind !== 'ok') {
      throw new Error(`seed study of ${seed.memberFirstName}: ${logged.kind}`);
    }
  }
}
