import { z } from 'zod';
import { taskCreateSchema, taskIdParamSchema, taskUpdateToolInputSchema } from './tasks.schema';
import {
  createTask,
  defineTool,
  getTasksSortedByUrgency,
  patchTask,
  removeTask,
} from './tasks.service';

// @FollowsBlueprint controller-dispatch
export const TASK_TOOLS = [
  defineTool({
    name: 'list_tasks',
    description: "List the band's tasks, most urgent first.",
    route: 'GET /api/tasks',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { tasks: await getTasksSortedByUrgency() } }),
  }),
  defineTool({
    name: 'create_task',
    description:
      'Add a task to the band, optionally assigned to the member `assigneeId` and linked to the song `songId`.',
    route: 'POST /api/tasks',
    inputSchema: taskCreateSchema,
    run: async (input) => {
      const outcome = await createTask(input);
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { task: outcome.task } };
    },
  }),
  defineTool({
    name: 'update_task',
    description: 'Change the fields given of the task `id`; give at least one.',
    route: 'PUT /api/tasks/:id',
    inputSchema: taskUpdateToolInputSchema,
    run: async ({ id, ...changes }) => {
      const outcome = await patchTask(id, changes);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { task: outcome.task } };
    },
  }),
  defineTool({
    name: 'delete_task',
    description: 'Delete the task `id`.',
    route: 'DELETE /api/tasks/:id',
    inputSchema: taskIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeTask(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
