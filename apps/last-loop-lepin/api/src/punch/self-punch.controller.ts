import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { selfPunchInputSchema } from './punch.schema';
import { PunchConflictError, PunchRejectedError, registerSelfPunch } from './punch.service';

const USER_AGENT_HEADER = 'user-agent';

/**
 * @Blueprint controller-public-router
 * @BlueprintName Public Controller Router
 * @BlueprintUsage Use for a router that is deliberately left ungated, so the missing guard reads as a choice a test pins rather than as an omission.
 * @BlueprintDescription Builds the router with no authentication middleware, and names itself for the public surface it serves so the absent `requireAdminSession` is visible from the export. Its sibling test asserts the endpoint answers without an admin session, which is what keeps the choice from being reverted by accident.
 */
const selfPunchRouter = new Hono().post(
  '/self-punches',
  zValidator('json', selfPunchInputSchema),
  async (context) => {
    const input = context.req.valid('json');
    const userAgent = context.req.header(USER_AGENT_HEADER) ?? null;
    try {
      const punch = await registerSelfPunch(input, userAgent, new Date());
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
