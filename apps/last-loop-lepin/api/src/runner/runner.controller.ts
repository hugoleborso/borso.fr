import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { requireAdminSession } from '../auth/auth.middleware';
import { createRunnerInputSchema } from './runner.schema';
import {
  RunnerAlreadyExistsError,
  RunnerNotFoundError,
  createRunner,
  getRunner,
  listRunners,
} from './runner.service';

const runnerRouter = new Hono();

runnerRouter.get('/editions/:editionSlug/runners', async (context) => {
  const runners = await listRunners(getDatabase(), context.req.param('editionSlug'));
  return context.json({ runners });
});

runnerRouter.get('/editions/:editionSlug/runners/:runnerSlug', async (context) => {
  try {
    const runner = await getRunner(
      getDatabase(),
      context.req.param('editionSlug'),
      context.req.param('runnerSlug'),
    );
    return context.json({ runner });
  } catch (error) {
    if (error instanceof RunnerNotFoundError) return context.json({ error: error.message }, 404);
    throw error;
  }
});

const adminRunnerRouter = new Hono();

adminRunnerRouter.use('*', requireAdminSession);

adminRunnerRouter.post('/', zValidator('json', createRunnerInputSchema), async (context) => {
  const input = context.req.valid('json');
  try {
    const runner = await createRunner(getDatabase(), input);
    return context.json({ runner }, 201);
  } catch (error) {
    if (error instanceof RunnerAlreadyExistsError) return context.json({ error: error.message }, 409);
    throw error;
  }
});

export { runnerRouter, adminRunnerRouter };
