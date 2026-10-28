import { z } from 'zod';
import {
  createMemberSchema,
  memberInstrumentAssignmentToolInputSchema,
  memberReferenceToolInputSchema,
  memberUpdateToolInputSchema,
} from './members.schema';
import {
  assignInstrumentsToMember,
  confirmUpdate,
  createMember,
  defineTool,
  getMembersForTool,
  patchMember,
  removeMember,
  resolveInstrumentIds,
  resolveMemberId,
  resolveOptionalInstrumentIds,
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
    name: 'create_member',
    description: 'Add a member to the band.',
    routes: ['POST /api/members'],
    inputSchema: createMemberSchema,
    run: async (input) => {
      const member = await createMember(input);
      return { kind: 'answered', body: { id: member.id, firstName: member.firstName } };
    },
  }),
  defineTool({
    name: 'update_member',
    description: 'Change the fields given of a member.',
    routes: ['PUT /api/members/:id'],
    inputSchema: memberUpdateToolInputSchema,
    run: async ({ member, ...changes }) => {
      const id = await resolveMemberId(member);
      const outcome = await patchMember(id, changes);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, changes) };
    },
  }),
  defineTool({
    name: 'delete_member',
    description: 'Remove a member from the band.',
    routes: ['DELETE /api/members/:id'],
    inputSchema: memberReferenceToolInputSchema,
    run: async ({ member }) => {
      const id = await resolveMemberId(member);
      const outcome = await removeMember(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'set_member_instruments',
    description:
      'Replace the instruments a member plays with `instruments`; `main` names their main ones.',
    routes: ['PUT /api/members/:id/instruments'],
    inputSchema: memberInstrumentAssignmentToolInputSchema,
    run: async ({ member, instruments, main }) => {
      const id = await resolveMemberId(member);
      const instrumentIds = await resolveInstrumentIds(instruments);
      const mainIds = await resolveOptionalInstrumentIds(main);
      const outcome = await assignInstrumentsToMember(id, instrumentIds, mainIds);
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
