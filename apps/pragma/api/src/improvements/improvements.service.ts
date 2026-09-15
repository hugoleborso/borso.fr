import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { rankImprovements, readTally, summariseVotes } from './improvements.core';
import {
  type ImprovementPersistedShape,
  type ImprovementRow,
  deleteImprovement,
  deleteVote,
  findImprovementById,
  insertImprovement,
  listImprovements,
  listVotes,
  listVotesForImprovement,
  updateImprovement,
  upsertVote,
} from './improvements.repository';
import type { improvementCreateSchema, improvementUpdateSchema } from './improvements.schema';

type ImprovementCreateInput = z.infer<typeof improvementCreateSchema>;
type ImprovementUpdateInput = z.infer<typeof improvementUpdateSchema>;

export interface ImprovementView extends ImprovementRow {
  voteCount: number;
  votedByViewer: boolean;
}

function valuesFromUpdate(input: ImprovementUpdateInput): ImprovementPersistedShape {
  const out: ImprovementPersistedShape = {};
  if (input.title !== undefined) out.title = input.title;
  if (input.details !== undefined) out.details = input.details;
  if (input.status !== undefined) out.status = input.status;
  return out;
}

export async function getImprovementsRanked(viewerMemberId: string): Promise<ImprovementView[]> {
  const [rows, votes] = await Promise.all([listImprovements(), listVotes()]);
  const tallies = summariseVotes(votes, viewerMemberId);
  return rankImprovements(rows.map((row) => ({ ...row, ...readTally(tallies, row.id) })));
}

export async function createImprovement(
  input: ImprovementCreateInput,
  authorMemberId: string,
  now: Date,
): Promise<ImprovementView> {
  const row = await insertImprovement({
    title: input.title,
    details: input.details,
    status: input.status,
    authorMemberId,
    createdAt: now,
  });
  return { ...row, voteCount: 0, votedByViewer: false };
}

// @FollowsBlueprint service-crud-update
export async function patchImprovement(
  id: string,
  input: ImprovementUpdateInput,
  viewerMemberId: string,
): Promise<
  { kind: 'ok'; improvement: ImprovementView } | { kind: 'empty' } | { kind: 'not-found' }
> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const row = await updateImprovement(id, updates);
  if (row === null) return { kind: 'not-found' };
  return { kind: 'ok', improvement: await withTally(row, viewerMemberId) };
}

export async function removeImprovement(id: string): Promise<DeletionOutcome> {
  return await deleteImprovement(id);
}

async function withTally(row: ImprovementRow, viewerMemberId: string): Promise<ImprovementView> {
  const votes = await listVotesForImprovement(row.id);
  return { ...row, ...readTally(summariseVotes(votes, viewerMemberId), row.id) };
}

export async function castVote(
  improvementId: string,
  memberId: string,
  now: Date,
): Promise<ImprovementView | null> {
  const row = await findImprovementById(improvementId);
  if (row === null) return null;
  await upsertVote(improvementId, memberId, now);
  return await withTally(row, memberId);
}

export async function withdrawVote(
  improvementId: string,
  memberId: string,
): Promise<ImprovementView | null> {
  const row = await findImprovementById(improvementId);
  if (row === null) return null;
  await deleteVote(improvementId, memberId);
  return await withTally(row, memberId);
}
