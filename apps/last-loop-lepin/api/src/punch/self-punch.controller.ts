/**
 * Public self-punch router. Mounted at `/api/self-punches`, deliberately
 * WITHOUT `requireAdminSession` — any device on the public network can POST,
 * which is the whole point of the feature (a runner taps their own chip from
 * their phone). The geofence is the only barrier; identity is by self-
 * selection in the standings, accepted as a limit of the model (spec Q1).
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { PunchConflictError } from './punch.repository';
import { selfPunchInputSchema } from './punch.schema';
import { PunchRejectedError, registerSelfPunch } from './punch.service';

const USER_AGENT_HEADER = 'user-agent';

const selfPunchRouter = new Hono();

selfPunchRouter.post(
  '/self-punches',
  zValidator('json', selfPunchInputSchema),
  async (context) => {
    const input = context.req.valid('json');
    const userAgent = context.req.header(USER_AGENT_HEADER) ?? null;
    try {
      const punch = await registerSelfPunch(getDatabase(), input, userAgent, new Date());
      return context.json({ punch }, 201);
    } catch (error) {
      if (error instanceof PunchConflictError) {
        return context.json({ error: 'already-punched-this-loop', punch: error.existing }, 409);
      }
      if (error instanceof PunchRejectedError) {
        return context.json({ error: error.reason }, 400);
      }
      throw error;
    }
  },
);

export { selfPunchRouter };
