import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireAdminSession } from '../auth/auth.middleware';
import {
  catchupPunchInputSchema,
  correctPunchInputSchema,
  createDidNotFinishInputSchema,
  createPunchInputSchema,
} from './punch.schema';
import {
  catchupPunch,
  correctPunch,
  PunchConflictError,
  PunchNotFoundError,
  PunchRejectedError,
  recordManualDidNotFinish,
  registerPunch,
  voidPunch,
} from './punch.service';

/**
 * @Blueprint controller-guarded-router
 * @BlueprintName Guarded Controller Router
 * @BlueprintUsage Use for an administration router, so authentication is applied to every route of the chain before any handler can be reached.
 * @BlueprintDescription Mounts `requireAdminSession` as the first link of the chain, so a route added later inherits the guard by position rather than by remembering to repeat it, and each handler answers by matching the service's named errors onto their status codes instead of parsing messages.
 */
const adminPunchRouter = new Hono()
  .use('*', requireAdminSession)
  .post('/punches', zValidator('json', createPunchInputSchema), async (context) => {
    const input = context.req.valid('json');
    try {
      const punch = await registerPunch(input, new Date());
      return context.json({ punch }, 201);
    } catch (error) {
      if (error instanceof PunchConflictError) {
        return context.json({ error: 'already punched', punch: error.existing }, 409);
      }
      if (error instanceof PunchRejectedError) {
        return context.json({ error: error.reason }, 400);
      }
      throw error;
    }
  })
  .put('/punches/:id', zValidator('json', correctPunchInputSchema), async (context) => {
    const id = context.req.param('id');
    const { finishedAt } = context.req.valid('json');
    try {
      const punch = await correctPunch(id, finishedAt, new Date());
      return context.json({ punch });
    } catch (error) {
      if (error instanceof PunchNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .delete('/punches/:id', async (context) => {
    try {
      const punch = await voidPunch(context.req.param('id'), new Date());
      return context.json({ punch });
    } catch (error) {
      if (error instanceof PunchNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .post('/dnfs', zValidator('json', createDidNotFinishInputSchema), async (context) => {
    const input = context.req.valid('json');
    const didNotFinish = await recordManualDidNotFinish(input, new Date());
    return context.json({ dnf: didNotFinish }, 201);
  })
  .post('/punches/catchup', zValidator('json', catchupPunchInputSchema), async (context) => {
    const input = context.req.valid('json');
    try {
      const punch = await catchupPunch(input, new Date());
      return context.json({ punch }, 201);
    } catch (error) {
      if (error instanceof PunchConflictError) {
        return context.json({ error: 'already punched', punch: error.existing }, 409);
      }
      if (error instanceof PunchRejectedError) {
        return context.json({ error: error.reason }, 400);
      }
      throw error;
    }
  });

export { adminPunchRouter };
