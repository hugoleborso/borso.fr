/**
 * Service layer for mastery.
 */

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
