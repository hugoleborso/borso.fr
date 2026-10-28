import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { didClaimMemberWithin } from '../members/members.service';
import { didClaimSessionWithin } from '../sessions/sessions.service';
import { didClaimSongWithin } from '../songs/songs.service';
import type { DatabaseExecutor } from '../database/client';
import { describeTaskCreatedEvent, sortTasksByUrgency } from './tasks.core';
import {
  deleteTask,
  detachDeletedSessionFromTasks,
  detachDeletedSongFromTasks,
  unassignTasksOfDeletedMember,
  insertTaskWithin,
  listTasks,
  runInOneTaskTransaction,
  type TaskPersistedShape,
  type TaskRow,
  updateTaskWithin,
} from './tasks.repository';
import type { taskCreateSchema, taskUpdateSchema } from './tasks.schema';

type TaskCreateInput = z.infer<typeof taskCreateSchema>;
type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

type TaskLinkRefusal =
  | { kind: 'assignee-not-found' }
  | { kind: 'song-not-found' }
  | { kind: 'session-not-found' };

export type TaskCreateOutcome = { kind: 'ok'; task: TaskRow } | TaskLinkRefusal;

export type TaskWriteOutcome = TaskCreateOutcome | { kind: 'empty' } | { kind: 'not-found' };

function valuesFromCreate(input: TaskCreateInput): TaskPersistedShape {
  return {
    title: input.title,
    notes: input.notes,
    status: input.status,
    assigneeId: input.assigneeId,
    songId: input.songId,
    sessionId: input.sessionId,
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
  if (input.sessionId !== undefined) out.sessionId = input.sessionId;
  if (input.dueDate !== undefined)
    out.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
  return out;
}

async function findLinkRefusalWithin(
  executor: DatabaseExecutor,
  links: Pick<TaskPersistedShape, 'assigneeId' | 'songId' | 'sessionId'>,
): Promise<TaskLinkRefusal | null> {
  const { assigneeId, songId, sessionId } = links;
  const isAssigneeMissing =
    assigneeId !== null &&
    assigneeId !== undefined &&
    !(await didClaimMemberWithin(executor, assigneeId));
  if (isAssigneeMissing) return { kind: 'assignee-not-found' };
  const isSongMissing =
    songId !== null && songId !== undefined && !(await didClaimSongWithin(executor, songId));
  if (isSongMissing) return { kind: 'song-not-found' };
  const isSessionMissing =
    sessionId !== null &&
    sessionId !== undefined &&
    !(await didClaimSessionWithin(executor, sessionId));
  if (isSessionMissing) return { kind: 'session-not-found' };
  return null;
}

export async function getTasksSortedByUrgency(): Promise<readonly TaskRow[]> {
  return sortTasksByUrgency(await listTasks());
}

export async function createTask(input: TaskCreateInput): Promise<TaskCreateOutcome> {
  const values = valuesFromCreate(input);
  const outcome = await runInOneTaskTransaction(async (executor): Promise<TaskCreateOutcome> => {
    const refusal = await findLinkRefusalWithin(executor, values);
    if (refusal !== null) return refusal;
    return { kind: 'ok', task: await insertTaskWithin(executor, values) };
  });
  const createdEvent = describeTaskCreatedEvent(outcome);
  if (createdEvent !== null) recordProductEvent({ ...createdEvent });
  return outcome;
}

// @FollowsBlueprint service-crud-update
export async function patchTask(id: string, input: TaskUpdateInput): Promise<TaskWriteOutcome> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  return await runInOneTaskTransaction(async (executor): Promise<TaskWriteOutcome> => {
    const refusal = await findLinkRefusalWithin(executor, updates);
    if (refusal !== null) return refusal;
    const task = await updateTaskWithin(executor, id, updates);
    if (task === null) return { kind: 'not-found' };
    return { kind: 'ok', task };
  });
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

export async function detachTasksOfSessionBeingDeleted(
  transaction: DatabaseExecutor,
  sessionId: string,
): Promise<void> {
  await detachDeletedSessionFromTasks(transaction, sessionId);
}
