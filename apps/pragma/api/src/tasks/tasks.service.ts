import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { didClaimMemberWithin } from '../members/members.service';
import { didClaimSongWithin, getSongs, resolveSongId } from '../songs/songs.service';
import { readLineupNames, resolveMemberId } from '../instruments/instruments.service';
import { resolveReference } from '../mcp/mcp.service';
import {
  isSelfReference,
  keepGivenLinks,
  projectTasksForTool,
  type TaskFilter,
  type TaskLinks,
  type TaskToolView,
} from './task-tool.core';
import type { DatabaseExecutor } from '../database/client';
import { sortTasksByUrgency } from './tasks.core';
import {
  deleteTask,
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

type TaskLinkRefusal = { kind: 'assignee-not-found' } | { kind: 'song-not-found' };

export type TaskCreateOutcome = { kind: 'ok'; task: TaskRow } | TaskLinkRefusal;

export type TaskWriteOutcome = TaskCreateOutcome | { kind: 'empty' } | { kind: 'not-found' };

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

async function findLinkRefusalWithin(
  executor: DatabaseExecutor,
  links: Pick<TaskPersistedShape, 'assigneeId' | 'songId'>,
): Promise<TaskLinkRefusal | null> {
  const { assigneeId, songId } = links;
  const isAssigneeMissing =
    assigneeId !== null &&
    assigneeId !== undefined &&
    !(await didClaimMemberWithin(executor, assigneeId));
  if (isAssigneeMissing) return { kind: 'assignee-not-found' };
  const isSongMissing =
    songId !== null && songId !== undefined && !(await didClaimSongWithin(executor, songId));
  if (isSongMissing) return { kind: 'song-not-found' };
  return null;
}

export async function getTasksSortedByUrgency(): Promise<readonly TaskRow[]> {
  return sortTasksByUrgency(await listTasks());
}

export async function createTask(input: TaskCreateInput): Promise<TaskCreateOutcome> {
  const values = valuesFromCreate(input);
  return await runInOneTaskTransaction(async (executor): Promise<TaskCreateOutcome> => {
    const refusal = await findLinkRefusalWithin(executor, values);
    if (refusal !== null) return refusal;
    return { kind: 'ok', task: await insertTaskWithin(executor, values) };
  });
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

export { confirmUpdate, defineTool, pageItems } from '../mcp/mcp.service';

export async function resolveTaskId(reference: string): Promise<string> {
  return await resolveReference('task', reference, async () =>
    (await listTasks()).map((task) => ({ id: task.id, label: task.title })),
  );
}

async function resolveAssigneeId(
  reference: string | null | undefined,
  actorMemberId: string,
): Promise<string | null | undefined> {
  if (reference === undefined || reference === null) return reference;
  const isSelf = isSelfReference(reference);
  if (isSelf) return actorMemberId;
  return await resolveMemberId(reference);
}

async function resolveLinkedSongId(
  reference: string | null | undefined,
): Promise<string | null | undefined> {
  if (reference === undefined || reference === null) return reference;
  return await resolveSongId(reference);
}

export interface TaskLinkReferences {
  readonly assignee?: string | null | undefined;
  readonly song?: string | null | undefined;
}

export async function resolveTaskLinks(
  references: TaskLinkReferences,
  actorMemberId: string,
): Promise<TaskLinks> {
  const [assigneeId, songId] = await Promise.all([
    resolveAssigneeId(references.assignee, actorMemberId),
    resolveLinkedSongId(references.song),
  ]);
  return keepGivenLinks(assigneeId, songId);
}

export async function listTasksForTool(
  references: { readonly assignee?: string | undefined; readonly song?: string | undefined },
  status: TaskFilter['status'],
  actorMemberId: string,
): Promise<TaskToolView[]> {
  const links = await resolveTaskLinks(references, actorMemberId);
  const [tasks, names, songs] = await Promise.all([
    getTasksSortedByUrgency(),
    readLineupNames(),
    getSongs(),
  ]);
  const filter = {
    assigneeId: links.assigneeId ?? undefined,
    songId: links.songId ?? undefined,
    status,
  };
  return projectTasksForTool(
    tasks,
    names.members,
    songs.map((song) => ({ id: song.id, name: song.title })),
    filter,
  );
}
