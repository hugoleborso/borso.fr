import { z } from 'zod';
import {
  createMemberSchema,
  memberIdParamSchema,
  memberInstrumentAssignmentToolInputSchema,
  memberUpdateToolInputSchema,
} from './members.schema';
import {
  assignInstrumentsToMember,
  createMember,
  defineTool,
  getMemberInstruments,
  getMembersSortedByFirstName,
  patchMember,
  removeMember,
} from './members.service';

// @FollowsBlueprint controller-dispatch
export const MEMBER_TOOLS = [
  defineTool({
    name: 'list_members',
    description: 'List the members of the band, by first name.',
    route: 'GET /api/members',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { members: await getMembersSortedByFirstName() } }),
  }),
  defineTool({
    name: 'create_member',
    description: 'Add a member to the band.',
    route: 'POST /api/members',
    inputSchema: createMemberSchema,
    run: async (input) => ({ kind: 'answered', body: { member: await createMember(input) } }),
  }),
  defineTool({
    name: 'update_member',
    description: 'Change the fields given of the member `id`; give at least one.',
    route: 'PUT /api/members/:id',
    inputSchema: memberUpdateToolInputSchema,
    run: async ({ id, ...changes }) => {
      const outcome = await patchMember(id, changes);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { member: outcome.member } };
    },
  }),
  defineTool({
    name: 'delete_member',
    description: 'Remove the member `id` from the band.',
    route: 'DELETE /api/members/:id',
    inputSchema: memberIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeMember(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'list_member_instruments',
    description: 'List the instruments the member `id` plays, and which are their main ones.',
    route: 'GET /api/members/:id/instruments',
    inputSchema: memberIdParamSchema,
    run: async ({ id }) => ({
      kind: 'answered',
      body: { instruments: await getMemberInstruments(id) },
    }),
  }),
  defineTool({
    name: 'set_member_instruments',
    description:
      'Replace the instruments the member `id` plays with `instrumentIds`; `primaryInstrumentIds` names their main ones among them.',
    route: 'PUT /api/members/:id/instruments',
    inputSchema: memberInstrumentAssignmentToolInputSchema,
    run: async ({ id, instrumentIds, primaryInstrumentIds }) => {
      const outcome = await assignInstrumentsToMember(id, instrumentIds, primaryInstrumentIds);
      if (outcome.kind === 'member-not-found') {
        return { kind: 'refused', body: { error: 'not-found' } };
      }
      if (outcome.kind === 'instrument-not-found') {
        return { kind: 'refused', body: { error: outcome.kind } };
      }
      return { kind: 'answered', body: { id, instrumentIds } };
    },
  }),
];
