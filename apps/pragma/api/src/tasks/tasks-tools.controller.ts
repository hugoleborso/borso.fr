import {
  taskCreateFieldsSchema,
  taskListToolInputSchema,
  taskSaveToolInputSchema,
} from './tasks.schema';
import {
  confirmUpdate,
  createTask,
  defineDeletion,
  defineTool,
  listTasksForTool,
  pageItems,
  parseToolFields,
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
    name: 'save_task',
    description:
      'Add a task (`title` required), or, with `task` (title or id), change only the fields given. `assignee` is a name or `me`, `song` a title; null clears either.',
    routes: ['POST /api/tasks', 'PUT /api/tasks/:id'],
    inputSchema: taskSaveToolInputSchema,
    run: async ({ task, assignee, song, ...fields }, actor) => {
      if (task === undefined) {
        const input = parseToolFields(taskCreateFieldsSchema, fields);
        const links = await resolveTaskLinks({ assignee, song }, actor.memberId);
        const outcome = await createTask({ assigneeId: null, songId: null, ...input, ...links });
        if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
        return { kind: 'answered', body: { id: outcome.task.id } };
      }
      const id = await resolveTaskId(task);
      const update = {
        ...fields,
        ...(await resolveTaskLinks({ assignee, song }, actor.memberId)),
      };
      const outcome = await patchTask(id, update);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, update) };
    },
  }),
];

export const TASK_DELETION = defineDeletion({
  route: 'DELETE /api/tasks/:id',
  remove: async (reference) => {
    const id = await resolveTaskId(reference);
    const outcome = await removeTask(id);
    if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
    return { kind: 'answered', body: { id, deleted: true } };
  },
});
