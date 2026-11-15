import { parisCalendarDay } from '@domain/paris-day.core';
import type { DatabaseExecutor } from '../database/client';
import { deletePresencesOfMember, insertPresenceIfAbsent } from './streaks.repository';

// @FollowsBlueprint service-clock-injected
export async function recordPresence(memberId: string, now: Date): Promise<void> {
  await insertPresenceIfAbsent({ memberId, presentOn: parisCalendarDay(now) }, now);
}

export async function deletePresencesOfDeletedMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deletePresencesOfMember(executor, memberId);
}
