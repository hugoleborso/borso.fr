import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { testDatabase } from '../../../test/database-utils';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';
import { readSentNotifications } from '../../../test/push-utils';
import { taskTable } from './tasks.schema';

const createdSchema = z.object({ id: z.string().uuid() });

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('tasks tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('creates, lists, updates and deletes a task by name, as the route does', async () => {
    const band = await prepareAssistantBand();
    await callTool(band.assistant, 'create_song', { title: 'Creep', status: 'idea' });

    const created = await callTool(band.assistant, 'create_task', {
      title: 'Book the van',
      assignee: 'lea',
    });
    const task = createdSchema.parse(created.body);
    await callTool(band.assistant, 'create_task', {
      title: 'Learn the solo',
      assignee: 'me',
      song: 'Creep',
    });
    const updated = await callTool(band.assistant, 'update_task', {
      task: 'book the van',
      status: 'done',
      song: 'creep',
    });
    const listed = await callTool(band.assistant, 'list_tasks', { assignee: 'Léa' });
    const mine = await callTool(band.assistant, 'list_tasks', { assignee: 'me' });
    const deleted = await callTool(band.assistant, 'delete_task', { task: task.id });
    const rows = await testDatabase().select().from(taskTable).where(eq(taskTable.id, task.id));

    expect(updated).toEqual({
      isError: false,
      body: { id: task.id, updated: ['status', 'songId'] },
    });
    expect(listed.body).toEqual({
      tasks: [
        { id: task.id, title: 'Book the van', status: 'done', assignee: 'Léa', song: 'Creep' },
      ],
      total: 1,
    });
    expect(mine.body).toMatchObject({ tasks: [{ title: 'Learn the solo', assignee: 'Hugo' }] });
    expect(deleted).toEqual({ isError: false, body: { id: task.id, deleted: true } });
    expect(rows).toEqual([]);
    expect(readSentNotifications(band.send)).toEqual([]);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const created = await callTool(band.assistant, 'create_task', { title: 'Tune the snare' });
    const task = createdSchema.parse(created.body);

    expect(
      await callTool(band.assistant, 'create_task', { title: 'Call', assignee: unknownId }),
    ).toEqual(refusal('assignee-not-found'));
    expect(
      await callTool(band.assistant, 'create_task', { title: 'Call', song: unknownId }),
    ).toEqual(refusal('song-not-found'));
    expect(
      await callTool(band.assistant, 'create_task', { title: 'Call', assignee: 'Marc' }),
    ).toEqual({ isError: true, body: { error: 'member-not-found', reference: 'Marc' } });
    expect(await callTool(band.assistant, 'update_task', { task: task.id })).toEqual(
      refusal('empty-update'),
    );
    expect(await callTool(band.assistant, 'update_task', { task: unknownId, title: 'x' })).toEqual(
      refusal('not-found'),
    );
    expect(await callTool(band.assistant, 'delete_task', { task: unknownId })).toEqual(
      refusal('not-found'),
    );
  });
});
