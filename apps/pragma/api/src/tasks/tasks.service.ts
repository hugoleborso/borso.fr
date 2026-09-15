import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { getMemberById } from '../members/members.service';
import { getSongById } from '../songs/songs.service';
import type { DatabaseExecutor } from '../database/client';
import { sortTasksByUrgency } from './tasks.core';
import {
  deleteTask,
  detachDeletedSongFromTasks,
  unassignTasksOfDeletedMember,
  insertTask,
  listTasks,
  type TaskPersistedShape,
  type TaskRow,
  updateTask,
} from './tasks.repository';
import type { taskCreateSchema, taskUpdateSchema } from './tasks.schema';

type TaskCreateInput = z.infer<typeof taskCreateSchema>;
type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export type TaskWriteOutcome =
  | { kind: 'ok'; task: TaskRow }
  | { kind: 'empty' }
  | { kind: 'not-found' }
  | { kind: 'assignee-not-found' }
  | { kind: 'song-not-found' };

function valuesFromCreate(input: TaskCreateInput): TaskPersistedShape {
  return {
    title: input.title,
    notes: input.notes,
    status: input.status,
    assigneeId: input.assigneeId,
    songId: input.songId,
    dueDate: input.dueDate === null ? null : new Date(input.dueDate),
  };
}

function valuesFromUpdate(input: TaskUpdateInput): TaskPersistedShape {
  const out: TaskPersistedShape = {};
  if (input.title !== undefined) out.title = input.title;
  if (input.notes !== undefined) out.notes = input.notes;
  if (input.status !== undefined) out.status = input.status;
  if (input.assigneeId !== undefined) out.assigneeId = input.assigneeId;
  if (input.songId !== undefined) out.songId = input.songId;
  if (input.dueDate !== undefined)
    out.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
  return out;
}

async function isAssigneeKnown(assigneeId: string | null | undefined): Promise<boolean> {
  if (assigneeId === null || assigneeId === undefined) return true;
  return (await getMemberById(assigneeId)) !== null;
}

async function isLinkedSongKnown(songId: string | null | undefined): Promise<boolean> {
  if (songId === null || songId === undefined) return true;
  return (await getSongById(songId)) !== null;
}

export async function getTasksSortedByUrgency(): Promise<readonly TaskRow[]> {
  return sortTasksByUrgency(await listTasks());
}

export async function createTask(input: TaskCreateInput): Promise<TaskWriteOutcome> {
  if (!(await isAssigneeKnown(input.assigneeId))) return { kind: 'assignee-not-found' };
  if (!(await isLinkedSongKnown(input.songId))) return { kind: 'song-not-found' };
  return { kind: 'ok', task: await insertTask(valuesFromCreate(input)) };
}

// @FollowsBlueprint service-crud-update
export async function patchTask(id: string, input: TaskUpdateInput): Promise<TaskWriteOutcome> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  if (!(await isAssigneeKnown(updates.assigneeId))) return { kind: 'assignee-not-found' };
  if (!(await isLinkedSongKnown(updates.songId))) return { kind: 'song-not-found' };
  const task = await updateTask(id, updates);
  if (task === null) return { kind: 'not-found' };
  return { kind: 'ok', task };
}

export async function removeTask(id: string): Promise<DeletionOutcome> {
  return await deleteTask(id);
}

export async function unassignTasksOfMemberBeingDeleted(
  transaction: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await unassignTasksOfDeletedMember(transaction, memberId);
}

export async function detachTasksOfSongBeingDeleted(
  transaction: DatabaseExecutor,
  songId: string,
): Promise<void> {
  await detachDeletedSongFromTasks(transaction, songId);
}
