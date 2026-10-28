import {
  taskCreateToolInputSchema,
  taskListToolInputSchema,
  taskReferenceToolInputSchema,
  taskUpdateToolInputSchema,
} from './tasks.schema';
import {
  confirmUpdate,
  createTask,
  defineTool,
  listTasksForTool,
  pageItems,
  patchTask,
  removeTask,
  resolveTaskId,
  resolveTaskLinks,
} from './tasks.service';

const TASK_PAGE_SIZE = 30;

// @FollowsBlueprint controller-dispatch
export const TASK_TOOLS = [
  defineTool({
    name: 'list_tasks',
    description:
      "List the band's tasks, most urgent first, optionally of one `assignee` (name, or `me`), `song` or `status`.",
    routes: ['GET /api/tasks'],
    inputSchema: taskListToolInputSchema,
    run: async ({ assignee, song, status, limit, cursor }, actor) => {
      const tasks = await listTasksForTool({ assignee, song }, status, actor.memberId);
      const page = pageItems(tasks, { limit, cursor }, TASK_PAGE_SIZE);
      return {
        kind: 'answered',
        body: { tasks: page.items, total: page.total, nextCursor: page.nextCursor },
      };
    },
  }),
  defineTool({
    name: 'create_task',
    description: 'Add a task, optionally assigned (name, or `me`) and linked to a song.',
    routes: ['POST /api/tasks'],
    inputSchema: taskCreateToolInputSchema,
    run: async ({ assignee, song, ...input }, actor) => {
      const links = await resolveTaskLinks({ assignee, song }, actor.memberId);
      const outcome = await createTask({ assigneeId: null, songId: null, ...input, ...links });
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { id: outcome.task.id } };
    },
  }),
  defineTool({
    name: 'update_task',
    description: 'Change the fields given of a task, named by title or id.',
    routes: ['PUT /api/tasks/:id'],
    inputSchema: taskUpdateToolInputSchema,
    run: async ({ task, assignee, song, ...changes }, actor) => {
      const id = await resolveTaskId(task);
      const update = {
        ...changes,
        ...(await resolveTaskLinks({ assignee, song }, actor.memberId)),
      };
      const outcome = await patchTask(id, update);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, update) };
    },
  }),
  defineTool({
    name: 'delete_task',
    description: 'Delete a task, named by title or id.',
    routes: ['DELETE /api/tasks/:id'],
    inputSchema: taskReferenceToolInputSchema,
    run: async ({ task }) => {
      const id = await resolveTaskId(task);
      const outcome = await removeTask(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
