import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { DEFAULT_TASK_STATUS, TASK_STATUSES, type TaskStatus } from '@domain/task-status.core';
import { taskTable } from './tasks.schema';

const taskStatusSchema = z.enum(TASK_STATUSES);

export interface TaskRow {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  assigneeId: string | null;
  songId: string | null;
  dueDate: Date | null;
}

export interface TaskPersistedShape {
  title?: string;
  notes?: string;
  status?: TaskStatus;
  assigneeId?: string | null;
  songId?: string | null;
  dueDate?: Date | null;
}

// @FollowsBlueprint repository-projection
const PROJECTION = {
  id: taskTable.id,
  title: taskTable.title,
  notes: taskTable.notes,
  status: taskTable.status,
  assigneeId: taskTable.assigneeId,
  songId: taskTable.songId,
  dueDate: taskTable.dueDate,
} as const;

function toTaskRow(row: {
  id: string;
  title: string;
  notes: string;
  status: string;
  assigneeId: string | null;
  songId: string | null;
  dueDate: Date | null;
}): TaskRow {
  return { ...row, status: taskStatusSchema.parse(row.status) };
}

export async function listTasks(): Promise<TaskRow[]> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(taskTable);
  return rows.map(toTaskRow);
}

export async function insertTask(values: TaskPersistedShape): Promise<TaskRow> {
  const database = getDatabase();
  const [row] = await database
    .insert(taskTable)
    .values({
      title: values.title ?? '',
      notes: values.notes ?? '',
      status: values.status ?? DEFAULT_TASK_STATUS,
      assigneeId: values.assigneeId ?? null,
      songId: values.songId ?? null,
      dueDate: values.dueDate ?? null,
    })
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return toTaskRow(row);
}

export async function updateTask(id: string, updates: TaskPersistedShape): Promise<TaskRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(taskTable)
    .set(updates)
    .where(eq(taskTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : toTaskRow(row);
}

export async function deleteTask(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(taskTable)
    .where(eq(taskTable.id, id))
    .returning({ id: taskTable.id });
  return selectDeletionOutcome(deleted.length);
}

export async function detachDeletedSongFromTasks(
  transaction: DatabaseExecutor,
  songId: string,
): Promise<void> {
  await transaction.update(taskTable).set({ songId: null }).where(eq(taskTable.songId, songId));
}

export async function unassignTasksOfDeletedMember(
  transaction: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await transaction
    .update(taskTable)
    .set({ assigneeId: null })
    .where(eq(taskTable.assigneeId, memberId));
}
