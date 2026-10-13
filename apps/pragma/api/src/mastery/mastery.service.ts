import type { DatabaseExecutor } from '../database/client';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteMasteryDefault,
  deleteMasteryOverride,
  deleteScoreHistoryOfMember,
  deleteScoreHistoryOfSong,
  listAllMasteryOverrides,
  listMasteryDefaults,
  listMasteryOverridesForSong,
  listScoreChangesForSong,
  type MasteryDefaultRow,
  type MasteryOverrideRow,
  type MasteryScoreChangeRow,
  upsertMasteryDefault,
  upsertMasteryOverride,
} from './mastery.repository';

/**
 * @Blueprint service-passthrough
 * @BlueprintName Service Passthrough
 * @BlueprintUsage Use when a slice has no rule to apply yet and the controller still must not import the repository.
 * @BlueprintDescription Forwards to one repository function with no branching and no reshaping, which keeps the controller-to-repository import ban intact and leaves the first business rule a place to land without moving any caller.
 */
export async function getMasteryDefaults(): Promise<MasteryDefaultRow[]> {
  return await listMasteryDefaults();
}

export async function saveMasteryDefault(row: MasteryDefaultRow): Promise<void> {
  await upsertMasteryDefault(row);
}

export async function removeMasteryDefault(
  memberId: string,
  instrumentId: string,
): Promise<DeletionOutcome> {
  return await deleteMasteryDefault(memberId, instrumentId);
}

export async function getMasteryOverridesForSong(songId: string): Promise<MasteryOverrideRow[]> {
  return await listMasteryOverridesForSong(songId);
}

export async function getAllMasteryOverrides(): Promise<MasteryOverrideRow[]> {
  return await listAllMasteryOverrides();
}

export async function getScoreHistoryOfSong(songId: string): Promise<MasteryScoreChangeRow[]> {
  return await listScoreChangesForSong(songId);
}

export async function saveMasteryOverride(row: MasteryOverrideRow, now: Date): Promise<void> {
  await upsertMasteryOverride(row, now);
}

export async function removeMasteryOverride(
  query: { memberId: string; instrumentId: string; songId: string },
  now: Date,
): Promise<DeletionOutcome> {
  return await deleteMasteryOverride(query.memberId, query.instrumentId, query.songId, now);
}

export async function deleteScoreHistoryOfDeletedMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deleteScoreHistoryOfMember(executor, memberId);
}

export async function deleteScoreHistoryOfDeletedSong(
  executor: DatabaseExecutor,
  songId: string,
): Promise<void> {
  await deleteScoreHistoryOfSong(executor, songId);
}
