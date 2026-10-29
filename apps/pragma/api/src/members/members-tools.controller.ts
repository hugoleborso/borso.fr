import { z } from 'zod';
import { memberInstrumentAssignmentToolInputSchema } from './members.schema';
import {
  assignInstrumentsToMember,
  defineTool,
  getMembersForTool,
  resolveInstrumentIds,
  resolveMemberId,
} from './members.service';

// @FollowsBlueprint controller-dispatch
export const MEMBER_TOOLS = [
  defineTool({
    name: 'list_members',
    description: 'List the members by first name, with the instruments each plays.',
    routes: ['GET /api/members', 'GET /api/members/:id/instruments'],
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { members: await getMembersForTool() } }),
  }),
  defineTool({
    name: 'set_member_instruments',
    description: 'Replace the instruments a member plays with `instruments`.',
    routes: ['PUT /api/members/:id/instruments'],
    inputSchema: memberInstrumentAssignmentToolInputSchema,
    run: async ({ member, instruments }) => {
      const id = await resolveMemberId(member);
      const instrumentIds = await resolveInstrumentIds(instruments);
      const outcome = await assignInstrumentsToMember(id, instrumentIds);
      if (outcome.kind === 'member-not-found') {
        return { kind: 'refused', body: { error: 'not-found' } };
      }
      if (outcome.kind === 'instrument-not-found') {
        return { kind: 'refused', body: { error: outcome.kind } };
      }
      return { kind: 'answered', body: { id, instruments } };
    },
  }),
];
