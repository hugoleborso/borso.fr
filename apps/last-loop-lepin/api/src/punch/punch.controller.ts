import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { requireAdminSession } from '../auth/auth.middleware';
import { PunchConflictError } from './punch.repository';
import {
  PunchNotFoundError,
  PunchRejectedError,
  catchupPunch,
  correctPunch,
  recordManualDnf,
  registerPunch,
  voidPunch,
} from './punch.service';
import {
  catchupPunchInputSchema,
  correctPunchInputSchema,
  createDnfInputSchema,
  createPunchInputSchema,
} from './punch.schema';

const adminPunchRouter = new Hono()
  .use('*', requireAdminSession)
  .post(
    '/punches',
    zValidator('json', createPunchInputSchema),
    async (context) => {
      const input = context.req.valid('json');
      try {
        const punch = await registerPunch(getDatabase(), input, new Date());
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
    },
  )
  .put(
    '/punches/:id',
    zValidator('json', correctPunchInputSchema),
    async (context) => {
      const id = context.req.param('id');
      const { finishedAt } = context.req.valid('json');
      try {
        const punch = await correctPunch(getDatabase(), id, new Date(finishedAt), new Date());
        return context.json({ punch });
      } catch (error) {
        if (error instanceof PunchNotFoundError) return context.json({ error: error.message }, 404);
        throw error;
      }
    },
  )
  .delete('/punches/:id', async (context) => {
    try {
      const punch = await voidPunch(getDatabase(), context.req.param('id'), new Date());
      return context.json({ punch });
    } catch (error) {
      if (error instanceof PunchNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .post('/dnfs', zValidator('json', createDnfInputSchema), async (context) => {
    const input = context.req.valid('json');
    const dnf = await recordManualDnf(getDatabase(), input, new Date());
    return context.json({ dnf }, 201);
  })
  .post(
    '/punches/catchup',
    zValidator('json', catchupPunchInputSchema),
    async (context) => {
      const input = context.req.valid('json');
      try {
        const punch = await catchupPunch(getDatabase(), input, new Date());
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
    },
  );

export { adminPunchRouter };
