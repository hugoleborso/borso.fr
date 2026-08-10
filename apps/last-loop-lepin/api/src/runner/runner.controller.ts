import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireAdminSession } from '../auth/auth.middleware';
import { createRunnerInputSchema } from './runner.schema';
import {
  createRunnerAsDto,
  getDatabase,
  getRunnerAsDto,
  listPunchesForRunner,
  listRunnersAsDto,
  RunnerAlreadyExistsError,
  RunnerNotFoundError,
} from './runner.service';

// @FollowsBlueprint controller-public-router
const runnerRouter = new Hono()
  .get('/editions/:editionSlug/runners', async (context) => {
    const runners = await listRunnersAsDto(getDatabase(), context.req.param('editionSlug'));
    return context.json({ runners });
  })
  .get('/editions/:editionSlug/runners/:runnerSlug', async (context) => {
    try {
      const runner = await getRunnerAsDto(
        getDatabase(),
        context.req.param('editionSlug'),
        context.req.param('runnerSlug'),
      );
      return context.json({ runner });
    } catch (error) {
      if (error instanceof RunnerNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .get('/editions/:editionSlug/runners/:runnerSlug/punches', async (context) => {
    const punches = await listPunchesForRunner(
      getDatabase(),
      context.req.param('editionSlug'),
      context.req.param('runnerSlug'),
    );
    return context.json({ punches });
  });

// @FollowsBlueprint controller-guarded-router
const adminRunnerRouter = new Hono()
  .use('*', requireAdminSession)
  .post('/', zValidator('json', createRunnerInputSchema), async (context) => {
    try {
      const runner = await createRunnerAsDto(getDatabase(), context.req.valid('json'));
      return context.json({ runner }, 201);
    } catch (error) {
      if (error instanceof RunnerAlreadyExistsError)
        return context.json({ error: error.message }, 409);
      throw error;
    }
  });

export { adminRunnerRouter, runnerRouter };
