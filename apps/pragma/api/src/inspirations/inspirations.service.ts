import type { DatabaseExecutor } from '../database/client';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { projectInspirationViews, selectInspirationDeletion } from './inspirations.core';
import {
  deleteInspirationWithin,
  detachInspirationsOfMemberWithin,
  didClaimInspirationRowWithin,
  didUpdateInspirationWithin,
  findWrittenInspirationWithin,
  hasInsertedInspirationWithin,
  listInspirationsNewestFirst,
  listInspirationUsages,
  listUsagesOfInspirationWithin,
  runInOneInspirationTransaction,
} from './inspirations.repository';
import type { InspirationCreateInput, InspirationUpdateInput } from './inspirations.schema';
import type {
  InspirationDeletion,
  InspirationView,
  InspirationWriteOutcome,
} from './inspirations.types';

interface ActorCommand {
  readonly memberId: string;
  readonly now: Date;
}

async function findInspirationViewWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<InspirationView | null> {
  const row = await findWrittenInspirationWithin(executor, id);
  if (row === null) return null;
  const usages = await listUsagesOfInspirationWithin(executor, id);
  return projectInspirationViews([row], usages)[0] ?? null;
}

async function getWrittenInspirationViewWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<InspirationView> {
  const inspiration = await findInspirationViewWithin(executor, id);
  if (inspiration === null) {
    throw new Error('the written inspiration is not visible to its own transaction');
  }
  return inspiration;
}

export async function listInspirationViewsNewestFirst(): Promise<InspirationView[]> {
  const [rows, usages] = await Promise.all([
    listInspirationsNewestFirst(),
    listInspirationUsages(),
  ]);
  return projectInspirationViews(rows, usages);
}

// @FollowsBlueprint service-orchestration
export async function createInspiration(
  input: InspirationCreateInput,
  command: ActorCommand,
): Promise<InspirationView> {
  const { id, ...fields } = input;
  const recording = await runInOneInspirationTransaction(async (executor) => {
    const isNewInspiration = await hasInsertedInspirationWithin(executor, {
      id,
      ...fields,
      authorMemberId: command.memberId,
      createdAt: command.now,
    });
    return {
      isNewInspiration,
      inspiration: await getWrittenInspirationViewWithin(executor, id),
    };
  });
  if (recording.isNewInspiration) {
    recordProductEvent({
      event: 'inspiration_created',
      has_deezer_track: fields.deezerTrackId !== null,
    });
  }
  return recording.inspiration;
}

export async function updateInspiration(
  id: string,
  input: InspirationUpdateInput,
): Promise<InspirationWriteOutcome> {
  return await runInOneInspirationTransaction(async (executor) => {
    const isUpdated = await didUpdateInspirationWithin(executor, id, input);
    if (!isUpdated) return { kind: 'inspiration-not-found' };
    return { kind: 'ok', inspiration: await getWrittenInspirationViewWithin(executor, id) };
  });
}

export async function removeInspiration(id: string): Promise<InspirationDeletion> {
  return await runInOneInspirationTransaction(async (executor): Promise<InspirationDeletion> => {
    const isClaimed = await didClaimInspirationRowWithin(executor, id);
    if (!isClaimed) return { kind: 'inspiration-not-found' };
    const decision = selectInspirationDeletion(await listUsagesOfInspirationWithin(executor, id));
    if (decision.kind === 'inspiration-in-use') return decision;
    await deleteInspirationWithin(executor, id);
    return { kind: 'deleted' };
  });
}

export async function didClaimInspirationWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<boolean> {
  return await didClaimInspirationRowWithin(executor, id);
}

export async function detachInspirationsOfDeletedMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await detachInspirationsOfMemberWithin(executor, memberId);
}
