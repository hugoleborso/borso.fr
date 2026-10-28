import type { DatabaseExecutor } from '../database/client';
import {
  readLineupNames,
  resolveInstrumentId,
  resolveMemberId,
} from '../instruments/instruments.service';
import { nameScoreChanges, nameScores } from './mastery-tool.core';
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

async function resolveOptionalMemberId(reference: string | undefined): Promise<string | undefined> {
  if (reference === undefined) return undefined;
  return await resolveMemberId(reference);
}

export async function getMasteryDefaultsForTool(memberReference: string | undefined) {
  const [memberId, defaults, names] = await Promise.all([
    resolveOptionalMemberId(memberReference),
    getMasteryDefaults(),
    readLineupNames(),
  ]);
  return nameScores(defaults, names, memberId);
}

export interface MasteryScoreReferences {
  readonly member: string;
  readonly instrument: string;
}

async function resolveScoreKey(references: MasteryScoreReferences) {
  const [memberId, instrumentId] = await Promise.all([
    resolveMemberId(references.member),
    resolveInstrumentId(references.instrument),
  ]);
  return { memberId, instrumentId };
}

export async function writeMasteryDefault(
  references: MasteryScoreReferences,
  score: number | null,
): Promise<DeletionOutcome | 'saved'> {
  const key = await resolveScoreKey(references);
  if (score === null) return await removeMasteryDefault(key.memberId, key.instrumentId);
  await saveMasteryDefault({ ...key, score });
  return 'saved';
}

export async function writeMasteryOverride(
  references: MasteryScoreReferences & { readonly songId: string },
  score: number | null,
  now: Date,
): Promise<DeletionOutcome | 'saved'> {
  const key = { ...(await resolveScoreKey(references)), songId: references.songId };
  if (score === null) return await removeMasteryOverride(key, now);
  await saveMasteryOverride({ ...key, score }, now);
  return 'saved';
}

export async function readSongMasteryForTool(songId: string, isHistoryIncluded: boolean) {
  const [overrides, history, names] = await Promise.all([
    getMasteryOverridesForSong(songId),
    isHistoryIncluded ? getScoreHistoryOfSong(songId) : Promise.resolve([]),
    readLineupNames(),
  ]);
  return {
    overrides: nameScores(overrides, names, undefined),
    history: isHistoryIncluded ? nameScoreChanges(history, names) : undefined,
  };
}

export { defineTool } from '../mcp/mcp.service';
