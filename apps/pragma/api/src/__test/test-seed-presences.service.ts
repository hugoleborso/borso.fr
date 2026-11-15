import { recordPresence } from '../streaks/presences.service';
import { SEED_PRESENCES, seedPresenceInstant } from './test-seed-presences.core';

// @FollowsBlueprint service-clock-injected
export async function seedPresences(
  memberIdByName: ReadonlyMap<string, string>,
  now: Date,
): Promise<void> {
  for (const seed of SEED_PRESENCES) {
    const memberId = memberIdByName.get(seed.memberFirstName);
    if (memberId === undefined) throw new Error(`seed presence of ${seed.memberFirstName}`);
    await recordPresence(memberId, seedPresenceInstant(now, seed.daysAgo));
  }
}
