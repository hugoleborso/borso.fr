/**
 * Service layer for mastery.
 */

import type { Database } from '../database/client';
import {
  type MasteryDefaultRow,
  type MasteryOverrideRow,
  deleteMasteryDefault,
  deleteMasteryOverride,
  listMasteryDefaults,
  listMasteryOverridesForSong,
  upsertMasteryDefault,
  upsertMasteryOverride,
} from './mastery.repository';

export async function getMasteryDefaults(database: Database): Promise<MasteryDefaultRow[]> {
  return await listMasteryDefaults(database);
}

export async function saveMasteryDefault(
  database: Database,
  row: MasteryDefaultRow,
): Promise<void> {
  await upsertMasteryDefault(database, row);
}

export async function removeMasteryDefault(
  database: Database,
  memberId: string,
  instrumentId: string,
): Promise<boolean> {
  return await deleteMasteryDefault(database, memberId, instrumentId);
}

export async function getMasteryOverridesForSong(
  database: Database,
  songId: string,
): Promise<MasteryOverrideRow[]> {
  return await listMasteryOverridesForSong(database, songId);
}

export async function saveMasteryOverride(
  database: Database,
  row: MasteryOverrideRow,
): Promise<void> {
  await upsertMasteryOverride(database, row);
}

export async function removeMasteryOverride(
  database: Database,
  memberId: string,
  instrumentId: string,
  songId: string,
): Promise<boolean> {
  return await deleteMasteryOverride(database, memberId, instrumentId, songId);
}
