import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { requireAdminSession } from '../auth/auth.middleware';
import { listPunchesForEdition } from '../punch/punch.repository';
import { readPhotosCdnHost, toRunnerDto } from './runner.dto.utils';
import { createRunnerInputSchema } from './runner.schema';
import {
  RunnerAlreadyExistsError,
  RunnerNotFoundError,
  createRunner,
  getRunner,
  listRunners,
} from './runner.service';

const runnerRouter = new Hono()
  .get('/editions/:editionSlug/runners', async (context) => {
    const cdnHost = readPhotosCdnHost();
    const runners = await listRunners(getDatabase(), context.req.param('editionSlug'));
    return context.json({ runners: runners.map((runner) => toRunnerDto(runner, cdnHost)) });
  })
  .get('/editions/:editionSlug/runners/:runnerSlug', async (context) => {
    try {
      const runner = await getRunner(
        getDatabase(),
        context.req.param('editionSlug'),
        context.req.param('runnerSlug'),
      );
      return context.json({ runner: toRunnerDto(runner, readPhotosCdnHost()) });
    } catch (error) {
      if (error instanceof RunnerNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .get('/editions/:editionSlug/runners/:runnerSlug/punches', async (context) => {
    const editionSlug = context.req.param('editionSlug');
    const runnerSlug = context.req.param('runnerSlug');
    const allPunches = await listPunchesForEdition(getDatabase(), editionSlug);
    const punches = allPunches
      .filter((punch) => punch.runnerSlug === runnerSlug)
      .toSorted((left, right) => left.loopIndex - right.loopIndex);
    return context.json({ punches });
  });

const adminRunnerRouter = new Hono()
  .use('*', requireAdminSession)
  .post('/', zValidator('json', createRunnerInputSchema), async (context) => {
    const input = context.req.valid('json');
    try {
      const runner = await createRunner(getDatabase(), input);
      return context.json({ runner: toRunnerDto(runner, readPhotosCdnHost()) }, 201);
    } catch (error) {
      if (error instanceof RunnerAlreadyExistsError) return context.json({ error: error.message }, 409);
      throw error;
    }
  });

export { runnerRouter, adminRunnerRouter };
