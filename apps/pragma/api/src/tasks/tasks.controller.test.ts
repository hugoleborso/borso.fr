import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  notes: z.string(),
  status: z.enum(['todo', 'doing', 'done']),
  assigneeId: z.string().uuid().nullable(),
  songId: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
});
const singleTaskEnvelope = z.object({ task: taskSchema });
const taskListEnvelope = z.object({ tasks: z.array(taskSchema) });

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

// @FollowsBlueprint test-back-e2e
describe('tasks controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const listResponse = await jsonRequest(app, '/api/tasks');
    const createResponse = await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Buy strings' },
    });
    const updateResponse = await jsonRequest(app, `/api/tasks/${UNKNOWN_ID}`, {
      method: 'PUT',
      body: { title: 'x' },
    });
    const deleteResponse = await jsonRequest(app, `/api/tasks/${UNKNOWN_ID}`, { method: 'DELETE' });
    expect(listResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
    expect(updateResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
  });

  it('creates, lists, updates and deletes a task', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();

    const create = await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Buy strings', assigneeId: memberId },
      cookieHeader,
    });
    expect(create.status).toBe(201);
    const created = await readJson(create, singleTaskEnvelope);
    expect(created.task).toMatchObject({
      title: 'Buy strings',
      status: 'todo',
      assigneeId: memberId,
      songId: null,
      dueDate: null,
    });

    const update = await jsonRequest(app, `/api/tasks/${created.task.id}`, {
      method: 'PUT',
      body: { status: 'done' },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    expect((await readJson(update, singleTaskEnvelope)).task.status).toBe('done');

    const list = await jsonRequest(app, '/api/tasks', { cookieHeader });
    expect((await readJson(list, taskListEnvelope)).tasks).toHaveLength(1);

    const remove = await jsonRequest(app, `/api/tasks/${created.task.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(remove.status).toBe(200);
    const emptyList = await jsonRequest(app, '/api/tasks', { cookieHeader });
    expect((await readJson(emptyList, taskListEnvelope)).tasks).toEqual([]);
  });

  it('orders the list by what is most urgent', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Print setlists', status: 'done' },
      cookieHeader,
    });
    await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Buy strings', dueDate: '2026-05-01T12:00:00.000Z' },
      cookieHeader,
    });
    await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Mix the demo', status: 'doing' },
      cookieHeader,
    });

    const list = await jsonRequest(app, '/api/tasks', { cookieHeader });
    expect((await readJson(list, taskListEnvelope)).tasks.map((task) => task.title)).toEqual([
      'Mix the demo',
      'Buy strings',
      'Print setlists',
    ]);
  });

  it('refuses a task pointed at a member or a song that does not exist', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();

    const unknownAssignee = await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Buy strings', assigneeId: UNKNOWN_ID },
      cookieHeader,
    });
    expect(unknownAssignee.status).toBe(400);

    const unknownSong = await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Buy strings', songId: UNKNOWN_ID },
      cookieHeader,
    });
    expect(unknownSong.status).toBe(400);
  });

  it('answers not-found on a task that is gone, and refuses an empty patch', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();

    const emptyPatch = await jsonRequest(app, `/api/tasks/${UNKNOWN_ID}`, {
      method: 'PUT',
      body: {},
      cookieHeader,
    });
    expect(emptyPatch.status).toBe(400);

    const missing = await jsonRequest(app, `/api/tasks/${UNKNOWN_ID}`, {
      method: 'PUT',
      body: { title: 'Ghost' },
      cookieHeader,
    });
    expect(missing.status).toBe(404);

    const missingDelete = await jsonRequest(app, `/api/tasks/${UNKNOWN_ID}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(missingDelete.status).toBe(404);
  });

  it('keeps a task when the member it was assigned to is deleted', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const addMember = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Alma' },
      cookieHeader,
    });
    const added = await readJson(addMember, z.object({ member: z.object({ id: z.string() }) }));
    const create = await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      body: { title: 'Buy strings', assigneeId: added.member.id },
      cookieHeader,
    });
    const created = await readJson(create, singleTaskEnvelope);

    const removeMember = await jsonRequest(app, `/api/members/${added.member.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(removeMember.status).toBe(200);

    const list = await jsonRequest(app, '/api/tasks', { cookieHeader });
    const tasks = (await readJson(list, taskListEnvelope)).tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: created.task.id, assigneeId: null });
  });
});
