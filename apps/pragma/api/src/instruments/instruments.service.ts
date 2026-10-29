import { isReorderOfTheSameIds } from '../helpers/ordering/reorder.core';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import type { Lineup } from '@domain/lineup.core';
import { pickReference, refuseUnresolvedReference, resolveReference } from '../mcp/mcp.service';
import { comparePositionThenName, foldPlayersIntoInstruments } from './instrument-players.core';
import { type InstrumentToolView, projectInstrumentForTool } from './instrument-tool.core';
import {
  type LineupNames,
  listNameCandidates,
  type NamedLineupInput,
  resolveNamedLineup,
} from './lineup-names.core';
import {
  deleteInstrumentWithLinks,
  didClaimInstrumentsWithin,
  type InstrumentCreateInput,
  type InstrumentUpdates,
  type InstrumentWithPlayersRow,
  insertInstrument,
  listInstrumentIdsWithin,
  listInstrumentPlayerLinks,
  listInstruments,
  listMemberNames,
  listPlayersOfInstrument,
  runInOneInstrumentTransaction,
  setInstrumentPositionWithin,
  updateInstrument,
} from './instruments.repository';

export { didClaimInstrumentsWithin } from './instruments.repository';

export async function getInstrumentsSorted(): Promise<InstrumentWithPlayersRow[]> {
  const [instruments, links] = await Promise.all([listInstruments(), listInstrumentPlayerLinks()]);
  return foldPlayersIntoInstruments(instruments, links).toSorted(comparePositionThenName);
}

export async function createInstrument(
  input: InstrumentCreateInput,
): Promise<InstrumentWithPlayersRow> {
  return { ...(await insertInstrument(input)), players: [] };
}

export type PatchInstrumentResult =
  | { kind: 'ok'; instrument: InstrumentWithPlayersRow }
  | { kind: 'empty' }
  | { kind: 'not-found' };

// @FollowsBlueprint service-crud-update
export async function patchInstrument(
  id: string,
  input: InstrumentUpdates,
): Promise<PatchInstrumentResult> {
  const updates: InstrumentUpdates = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.family !== undefined) updates.family = input.family;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.position !== undefined) updates.position = input.position;
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const instrument = await updateInstrument(id, updates);
  if (instrument === null) return { kind: 'not-found' };
  return { kind: 'ok', instrument: { ...instrument, players: await listPlayersOfInstrument(id) } };
}

export type ReorderInstrumentsResult =
  | { kind: 'ok'; instruments: InstrumentWithPlayersRow[] }
  | { kind: 'stale' };

type InstrumentReorder = { kind: 'ok' } | { kind: 'stale' };

export async function reorderInstruments(
  instrumentIds: readonly string[],
): Promise<ReorderInstrumentsResult> {
  const reorder = await runInOneInstrumentTransaction(
    async (executor): Promise<InstrumentReorder> => {
      const areInstrumentsClaimed = await didClaimInstrumentsWithin(executor, instrumentIds);
      if (!areInstrumentsClaimed) return { kind: 'stale' };
      const existingIds = await listInstrumentIdsWithin(executor);
      const isCurrent = isReorderOfTheSameIds(existingIds, instrumentIds);
      if (!isCurrent) return { kind: 'stale' };
      for (const [position, instrumentId] of instrumentIds.entries()) {
        await setInstrumentPositionWithin(executor, instrumentId, position);
      }
      return { kind: 'ok' };
    },
  );
  if (reorder.kind === 'stale') return reorder;
  return { kind: 'ok', instruments: await getInstrumentsSorted() };
}

export async function removeInstrument(id: string): Promise<DeletionOutcome> {
  return await deleteInstrumentWithLinks(id);
}

export async function readLineupNames(): Promise<LineupNames> {
  const [instruments, members] = await Promise.all([listInstruments(), listMemberNames()]);
  return {
    members,
    instruments: instruments.map((instrument) => ({ id: instrument.id, name: instrument.name })),
  };
}

export async function resolveMemberId(reference: string): Promise<string> {
  return await resolveReference('member', reference, async () =>
    listNameCandidates(await listMemberNames()),
  );
}

export async function resolveInstrumentId(reference: string): Promise<string> {
  return await resolveReference('instrument', reference, async () =>
    listNameCandidates((await readLineupNames()).instruments),
  );
}

export async function resolveInstrumentIds(references: readonly string[]): Promise<string[]> {
  const candidates = listNameCandidates((await readLineupNames()).instruments);
  return references.map((reference) => pickReference('instrument', candidates, reference));
}

export async function resolveNamedLineupOrRefuse(input: NamedLineupInput): Promise<Lineup> {
  const resolution = resolveNamedLineup(input, await readLineupNames());
  if (resolution.kind === 'unresolved') {
    return refuseUnresolvedReference(resolution.noun, resolution.reference, resolution.match);
  }
  return resolution.lineup;
}

export async function getInstrumentsForTool(): Promise<InstrumentToolView[]> {
  const [instruments, members] = await Promise.all([getInstrumentsSorted(), listMemberNames()]);
  return instruments.map((instrument) => projectInstrumentForTool(instrument, members));
}

export { defineTool } from '../mcp/mcp.service';
export type { LineupNames, NamedLineupInput } from './lineup-names.core';
