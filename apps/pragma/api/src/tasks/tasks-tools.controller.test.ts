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

const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  assigneeId: z.string().nullable(),
});
const taskBodySchema = z.object({ task: taskSchema });
const tasksBodySchema = z.object({ tasks: z.array(taskSchema) });

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('tasks tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('creates, lists, updates and deletes a task, as the route does', async () => {
    const band = await prepareAssistantBand();

    const created = await callTool(band.assistant, 'create_task', {
      title: 'Book the van',
      assigneeId: band.lea.memberId,
    });
    const { task } = taskBodySchema.parse(created.body);
    const updated = await callTool(band.assistant, 'update_task', { id: task.id, status: 'done' });
    const listed = tasksBodySchema.parse((await callTool(band.assistant, 'list_tasks')).body);
    const deleted = await callTool(band.assistant, 'delete_task', { id: task.id });
    const rows = await testDatabase().select().from(taskTable).where(eq(taskTable.id, task.id));

    expect(task).toMatchObject({ title: 'Book the van', assigneeId: band.lea.memberId });
    expect(taskBodySchema.parse(updated.body).task.status).toBe('done');
    expect(listed.tasks.map((listedTask) => listedTask.id)).toEqual([task.id]);
    expect(deleted).toEqual({ isError: false, body: { id: task.id, deleted: true } });
    expect(rows).toEqual([]);
    expect(readSentNotifications(band.send)).toEqual([]);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const created = await callTool(band.assistant, 'create_task', { title: 'Tune the snare' });
    const { task } = taskBodySchema.parse(created.body);

    expect(
      await callTool(band.assistant, 'create_task', { title: 'Call', assigneeId: unknownId }),
    ).toEqual(refusal('assignee-not-found'));
    expect(
      await callTool(band.assistant, 'create_task', { title: 'Call', songId: unknownId }),
    ).toEqual(refusal('song-not-found'));
    expect(await callTool(band.assistant, 'update_task', { id: task.id })).toEqual(
      refusal('empty-update'),
    );
    expect(await callTool(band.assistant, 'update_task', { id: unknownId, title: 'x' })).toEqual(
      refusal('not-found'),
    );
    expect(await callTool(band.assistant, 'delete_task', { id: unknownId })).toEqual(
      refusal('not-found'),
    );
  });
});
