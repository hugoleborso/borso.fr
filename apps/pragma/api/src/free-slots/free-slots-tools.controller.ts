import { z } from 'zod';
import { computeFreeSlots, defineTool } from './free-slots.service';

// @FollowsBlueprint controller-dispatch
export const FREE_SLOT_TOOLS = [
  defineTool({
    name: 'list_free_slots',
    description:
      'List the spans of at least two hours in the next 28 days, evenings on weekdays and from 10:00 at weekends, Paris time, when no member is busy according to their calendar feed; members whose feed could not be read are listed with the reason.',
    routes: ['GET /api/free-slots'],
    inputSchema: z.object({}),
    run: async (_input, actor) => ({ kind: 'answered', body: await computeFreeSlots(actor.now) }),
  }),
];
