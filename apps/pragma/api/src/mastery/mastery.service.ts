import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteMasteryDefault,
  deleteMasteryOverride,
  listMasteryDefaults,
  listMasteryOverridesForSong,
  type MasteryDefaultRow,
  type MasteryOverrideRow,
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

export async function saveMasteryOverride(row: MasteryOverrideRow): Promise<void> {
  await upsertMasteryOverride(row);
}

export async function removeMasteryOverride(
  memberId: string,
  instrumentId: string,
  songId: string,
): Promise<DeletionOutcome> {
  return await deleteMasteryOverride(memberId, instrumentId, songId);
}
