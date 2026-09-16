import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import { taskCreateSchema, taskIdParamSchema, taskUpdateSchema } from './tasks.schema';
import { createTask, getTasksSortedByUrgency, patchTask, removeTask } from './tasks.service';

// @FollowsBlueprint controller-dispatch
export function buildTasksRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/', async (context) => {
      const tasks = await getTasksSortedByUrgency();
      return context.json({ tasks });
    })
    .post('/', zValidator('json', taskCreateSchema), async (context) => {
      const outcome = await createTask(context.req.valid('json'));
      if (outcome.kind === 'assignee-not-found')
        return context.json({ error: 'assignee-not-found' }, 400);
      if (outcome.kind === 'song-not-found') return context.json({ error: 'song-not-found' }, 400);
      if (outcome.kind !== 'ok') return context.json({ error: 'empty-update' }, 400);
      return context.json({ task: outcome.task }, 201);
    })
    .put(
      '/:id',
      zValidator('param', taskIdParamSchema),
      zValidator('json', taskUpdateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const outcome = await patchTask(id, context.req.valid('json'));
        if (outcome.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (outcome.kind === 'assignee-not-found')
          return context.json({ error: 'assignee-not-found' }, 400);
        if (outcome.kind === 'song-not-found')
          return context.json({ error: 'song-not-found' }, 400);
        if (outcome.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ task: outcome.task });
      },
    )
    .delete('/:id', zValidator('param', taskIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeTask(id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
