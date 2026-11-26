import { randomUUID } from 'node:crypto';
import {
  DEFAULT_GEAR_STATUS,
  type GearHolding,
  isGearHoldingUpdateValid,
  isGearHoldingValid,
  keepHoldingOfPresentMember,
  selectGearHolderIds,
  selectGearCopySource,
} from '@domain/gear-status.core';
import type { DatabaseExecutor } from '../database/client';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { readLineupNames, resolveMemberId } from '../instruments/instruments.service';
import { resolveReference } from '../mcp/mcp.service';
import { didClaimMemberWithin } from '../members/members.service';
import {
  didClaimConcertWithin,
  findSessionById,
  getSessions,
  listSessions,
} from '../sessions/sessions.service';
import { selectSessionsInWindow } from '../sessions/session-tool.core';
import {
  type GearItemToolView,
  projectGearItemsForTool,
  readGearHolderReference,
} from './gear-item-tool.core';
import {
  countGearItemsPerSession,
  deleteGearItem,
  findGearItem,
  findGearItemWithin,
  type GearItemPersistedUpdate,
  type GearItemRow,
  insertGearItemOnceWithin,
  insertGearItemsWithin,
  listGearItemsOfSession,
  listGearItemsOfSessions,
  listGearItemsOfSessionWithin,
  nextGearPositionWithin,
  runInOneGearItemTransaction,
  updateGearItemWithin,
} from './gear-items.repository';
import type { GearItemCreateInput, GearItemUpdateInput } from './gear-items.schema';

const CONCERT_KIND = 'concert';

export interface GearCopySource {
  readonly sessionId: string;
  readonly venue: string | null;
  readonly date: Date;
  readonly itemCount: number;
}

export type GearChecklistOutcome =
  | { kind: 'ok'; items: GearItemRow[]; copySource: GearCopySource | null }
  | { kind: 'not-a-concert' };

export type GearItemCreateOutcome =
  | { kind: 'ok'; item: GearItemRow }
  | { kind: 'not-a-concert' }
  | { kind: 'holding-invalid' }
  | { kind: 'member-not-found' }
  | { kind: 'id-taken' };

export type GearItemPatchOutcome =
  | { kind: 'ok'; item: GearItemRow }
  | { kind: 'empty' }
  | { kind: 'holding-invalid' }
  | { kind: 'member-not-found' }
  | { kind: 'not-found' };

export type GearCopyOutcome =
  | { kind: 'ok'; items: GearItemRow[] }
  | { kind: 'not-a-concert' }
  | { kind: 'gear-not-empty' };

function valuesFromUpdate(input: GearItemUpdateInput): GearItemPersistedUpdate {
  const out: GearItemPersistedUpdate = {};
  if (input.label !== undefined) out.label = input.label;
  if (input.status !== undefined) out.status = input.status;
  if (input.memberId !== undefined) out.memberId = input.memberId;
  return out;
}

async function didClaimHolderWithin(
  executor: DatabaseExecutor,
  memberId: string | null | undefined,
): Promise<boolean> {
  if (memberId === null || memberId === undefined) return true;
  return await didClaimMemberWithin(executor, memberId);
}

async function findCopySource(target: {
  readonly id: string;
  readonly date: Date;
}): Promise<GearCopySource | null> {
  const [sessions, itemCounts] = await Promise.all([listSessions(), countGearItemsPerSession()]);
  const concerts = sessions
    .filter((session) => session.kind === CONCERT_KIND)
    .map((session) => ({ ...session, gearItemCount: itemCounts.get(session.id) ?? 0 }));
  const source = selectGearCopySource(concerts, target);
  if (source === null) return null;
  return {
    sessionId: source.id,
    venue: source.venue,
    date: source.date,
    itemCount: source.gearItemCount,
  };
}

// @FollowsBlueprint service-orchestration
export async function readGearChecklist(sessionId: string): Promise<GearChecklistOutcome> {
  const [session, items] = await Promise.all([
    findSessionById(sessionId),
    listGearItemsOfSession(sessionId),
  ]);
  if (session?.kind !== CONCERT_KIND) return { kind: 'not-a-concert' };
  return { kind: 'ok', items, copySource: await findCopySource(session) };
}

export async function createGearItem(
  sessionId: string,
  input: GearItemCreateInput,
): Promise<GearItemCreateOutcome> {
  const isHoldingValid = isGearHoldingValid(input);
  if (!isHoldingValid) return { kind: 'holding-invalid' };
  return await runInOneGearItemTransaction(async (executor): Promise<GearItemCreateOutcome> => {
    const isConcertClaimed = await didClaimConcertWithin(executor, sessionId);
    if (!isConcertClaimed) return { kind: 'not-a-concert' };
    const isHolderClaimed = await didClaimHolderWithin(executor, input.memberId);
    if (!isHolderClaimed) return { kind: 'member-not-found' };
    const position = await nextGearPositionWithin(executor, sessionId);
    await insertGearItemOnceWithin(executor, { ...input, sessionId, position });
    const writtenItem = await findGearItemWithin(executor, input.id);
    if (writtenItem === null)
      throw new Error('the written gear item is not visible to its own transaction');
    if (writtenItem.sessionId !== sessionId) return { kind: 'id-taken' };
    return { kind: 'ok', item: writtenItem };
  });
}

// @FollowsBlueprint service-crud-update
export async function patchGearItem(
  sessionId: string,
  id: string,
  input: GearItemUpdateInput,
): Promise<GearItemPatchOutcome> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const isHoldingValid = isGearHoldingUpdateValid(updates);
  if (!isHoldingValid) return { kind: 'holding-invalid' };
  return await runInOneGearItemTransaction(async (executor): Promise<GearItemPatchOutcome> => {
    const isHolderClaimed = await didClaimHolderWithin(executor, updates.memberId);
    if (!isHolderClaimed) return { kind: 'member-not-found' };
    const updatedItem = await updateGearItemWithin(executor, sessionId, id, updates);
    if (updatedItem === null) return { kind: 'not-found' };
    return { kind: 'ok', item: updatedItem };
  });
}

export async function removeGearItem(sessionId: string, id: string): Promise<DeletionOutcome> {
  return await deleteGearItem(sessionId, id);
}

async function claimPresentMembersWithin(
  executor: DatabaseExecutor,
  items: readonly GearItemRow[],
): Promise<ReadonlySet<string>> {
  const present = new Set<string>();
  for (const memberId of selectGearHolderIds(items)) {
    const isClaimed = await didClaimMemberWithin(executor, memberId);
    if (isClaimed) present.add(memberId);
  }
  return present;
}

export async function copyGearItems(
  targetSessionId: string,
  fromSessionId: string,
): Promise<GearCopyOutcome> {
  return await runInOneGearItemTransaction(async (executor): Promise<GearCopyOutcome> => {
    const isConcertClaimed = await didClaimConcertWithin(executor, targetSessionId);
    if (!isConcertClaimed) return { kind: 'not-a-concert' };
    const existing = await listGearItemsOfSessionWithin(executor, targetSessionId);
    if (existing.length > 0) return { kind: 'gear-not-empty' };
    const source = await listGearItemsOfSessionWithin(executor, fromSessionId);
    const presentMemberIds = await claimPresentMembersWithin(executor, source);
    const copies = source.map((item, position): GearItemRow => {
      const holding = keepHoldingOfPresentMember(item, presentMemberIds);
      return {
        id: randomUUID(),
        sessionId: targetSessionId,
        label: item.label,
        status: holding.status,
        memberId: holding.memberId,
        position,
      };
    });
    return { kind: 'ok', items: await insertGearItemsWithin(executor, copies) };
  });
}

export { confirmUpdate, defineDeletion, defineTool, parseToolFields } from '../mcp/mcp.service';
export { resolveSessionId } from '../sessions/sessions.service';
export { buildGearToolUpdate } from './gear-item-tool.core';

export async function readGearItemsForTool(sessionId: string): Promise<GearItemToolView[]> {
  const [items, names] = await Promise.all([listGearItemsOfSession(sessionId), readLineupNames()]);
  return projectGearItemsForTool(items, names.members);
}

export async function resolveGearHolding(
  reference: string | null | undefined,
  actorMemberId: string,
): Promise<GearHolding | undefined> {
  if (reference === undefined) return undefined;
  const reading = readGearHolderReference(reference, actorMemberId);
  if (reading.kind === 'holding') return reading.holding;
  return { status: 'have', memberId: await resolveMemberId(reading.reference) };
}

export async function addGearItemFromTool(
  sessionId: string,
  label: string,
  holding: GearHolding | undefined,
): Promise<GearItemCreateOutcome> {
  return await createGearItem(sessionId, {
    id: randomUUID(),
    label,
    status: holding?.status ?? DEFAULT_GEAR_STATUS,
    memberId: holding?.memberId ?? null,
  });
}

export async function resolveGearItemId(sessionId: string, reference: string): Promise<string> {
  return await resolveReference('gear item', reference, async () =>
    (await listGearItemsOfSession(sessionId)).map((item) => ({ id: item.id, label: item.label })),
  );
}

async function listGearItemsOfUpcomingConcerts(now: Date): Promise<GearItemRow[]> {
  const upcoming = selectSessionsInWindow(await getSessions(now), 'upcoming', now);
  const concertIds = upcoming
    .filter((session) => session.kind === CONCERT_KIND)
    .map((session) => session.id);
  return await listGearItemsOfSessions(concertIds);
}

export async function removeGearItemByReference(
  reference: string,
  now: Date,
): Promise<{ kind: 'ok'; id: string } | { kind: 'not-found' }> {
  const id = await resolveReference('gear item', reference, async () =>
    (await listGearItemsOfUpcomingConcerts(now)).map((item) => ({
      id: item.id,
      label: item.label,
    })),
  );
  const namedItem = await findGearItem(id);
  if (namedItem === null) return { kind: 'not-found' };
  const outcome = await removeGearItem(namedItem.sessionId, id);
  if (outcome === 'not-found') return { kind: 'not-found' };
  return { kind: 'ok', id };
}
