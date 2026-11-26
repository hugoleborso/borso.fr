import type { DatabaseExecutor } from '../database/client';
import { deleteGearOfDeletedSession, releaseGearOfDeletedMember } from './gear-items.repository';

// @FollowsBlueprint service-passthrough
export async function releaseGearOfMemberBeingDeleted(
  transaction: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await releaseGearOfDeletedMember(transaction, memberId);
}

// @FollowsBlueprint service-passthrough
export async function deleteGearOfSessionBeingDeleted(
  transaction: DatabaseExecutor,
  sessionId: string,
): Promise<void> {
  await deleteGearOfDeletedSession(transaction, sessionId);
}
