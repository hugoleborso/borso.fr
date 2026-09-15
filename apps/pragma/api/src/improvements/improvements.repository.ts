import { IMPROVEMENT_STATUSES, type ImprovementStatus } from '@domain/improvement.core';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import type { ImprovementVoteRecord } from './improvements.core';
import { improvementTable, improvementVoteTable } from './improvements.schema';

const improvementStatusSchema = z.enum(IMPROVEMENT_STATUSES);

export interface ImprovementRow {
  id: string;
  title: string;
  details: string;
  status: ImprovementStatus;
  authorMemberId: string;
  createdAt: Date;
}

export interface ImprovementPersistedShape {
  title?: string;
  details?: string;
  status?: ImprovementStatus;
}

interface ImprovementInsertShape extends ImprovementPersistedShape {
  authorMemberId: string;
  createdAt: Date;
}

// @FollowsBlueprint repository-projection
const PROJECTION = {
  id: improvementTable.id,
  title: improvementTable.title,
  details: improvementTable.details,
  status: improvementTable.status,
  authorMemberId: improvementTable.authorMemberId,
  createdAt: improvementTable.createdAt,
} as const;

function toImprovementRow(row: {
  id: string;
  title: string;
  details: string;
  status: string;
  authorMemberId: string;
  createdAt: Date;
}): ImprovementRow {
  return { ...row, status: improvementStatusSchema.parse(row.status) };
}

const DEFAULT_STATUS: ImprovementStatus = 'idea';

export async function listImprovements(): Promise<ImprovementRow[]> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(improvementTable);
  return rows.map(toImprovementRow);
}

export async function findImprovementById(id: string): Promise<ImprovementRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(improvementTable)
    .where(eq(improvementTable.id, id))
    .limit(1);
  return rows[0] === undefined ? null : toImprovementRow(rows[0]);
}

export async function insertImprovement(values: ImprovementInsertShape): Promise<ImprovementRow> {
  const database = getDatabase();
  const [row] = await database
    .insert(improvementTable)
    .values({
      title: values.title ?? '',
      details: values.details ?? '',
      status: values.status ?? DEFAULT_STATUS,
      authorMemberId: values.authorMemberId,
      createdAt: values.createdAt,
    })
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return toImprovementRow(row);
}

export async function updateImprovement(
  id: string,
  updates: ImprovementPersistedShape,
): Promise<ImprovementRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(improvementTable)
    .set(updates)
    .where(eq(improvementTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : toImprovementRow(row);
}

export async function deleteImprovement(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  await database.delete(improvementVoteTable).where(eq(improvementVoteTable.improvementId, id));
  const deleted = await database
    .delete(improvementTable)
    .where(eq(improvementTable.id, id))
    .returning({ id: improvementTable.id });
  return selectDeletionOutcome(deleted.length);
}

export async function listVotes(): Promise<ImprovementVoteRecord[]> {
  const database = getDatabase();
  return await database
    .select({
      improvementId: improvementVoteTable.improvementId,
      memberId: improvementVoteTable.memberId,
    })
    .from(improvementVoteTable);
}

export async function listVotesForImprovement(
  improvementId: string,
): Promise<ImprovementVoteRecord[]> {
  const database = getDatabase();
  return await database
    .select({
      improvementId: improvementVoteTable.improvementId,
      memberId: improvementVoteTable.memberId,
    })
    .from(improvementVoteTable)
    .where(eq(improvementVoteTable.improvementId, improvementId));
}

export async function upsertVote(
  improvementId: string,
  memberId: string,
  castAt: Date,
): Promise<void> {
  const database = getDatabase();
  await database
    .insert(improvementVoteTable)
    .values({ improvementId, memberId, castAt })
    .onConflictDoUpdate({
      target: [improvementVoteTable.improvementId, improvementVoteTable.memberId],
      set: { castAt },
    });
}

export async function deleteVote(improvementId: string, memberId: string): Promise<void> {
  const database = getDatabase();
  await database
    .delete(improvementVoteTable)
    .where(
      and(
        eq(improvementVoteTable.improvementId, improvementId),
        eq(improvementVoteTable.memberId, memberId),
      ),
    );
}
