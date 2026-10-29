import { z } from 'zod';
import { meUpdateToolInputSchema } from './me.schema';
import { defineTool, readMeForTool, updateMeForTool } from './me.service';

// @FollowsBlueprint controller-dispatch
export const ME_TOOLS = [
  defineTool({
    name: 'get_me',
    description:
      "Read who you are acting as (id, first name, contact details, the names of your connected calendars) and your studies: your queue, your flame, the band's and each member's, and which songs of the next concert are ready.",
    routes: ['GET /api/me', 'GET /api/studies/overview', 'GET /api/streaks'],
    inputSchema: z.object({}),
    run: async (_input, actor) => {
      const profile = await readMeForTool(actor.memberId, actor.now);
      if (profile === null) return { kind: 'refused', body: { error: 'unknown-member' } };
      return { kind: 'answered', body: profile };
    },
  }),
  defineTool({
    name: 'update_me',
    description:
      'Change your own `phone` or `email` (null clears it), and/or log with `study` that you worked a song today on one of your instruments in its lineup (titles, names or ids; `undo` removes that record).',
    routes: [
      'PUT /api/me/contact',
      'POST /api/studies',
      'DELETE /api/studies/:songId/:instrumentId',
    ],
    inputSchema: meUpdateToolInputSchema,
    run: async ({ study, ...contact }, actor) => {
      const outcome = await updateMeForTool(actor, contact, study);
      if (outcome.kind === 'refused') return { kind: 'refused', body: { error: outcome.error } };
      return {
        kind: 'answered',
        body: { id: outcome.id, updated: outcome.updated, study: outcome.study },
      };
    },
  }),
];
