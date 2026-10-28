import { z } from 'zod';
import { memberContactSchema } from '../members/members.schema';
import { confirmUpdate, defineTool, readSignedInMember, saveOwnContactDetails } from './me.service';

// @FollowsBlueprint controller-dispatch
export const ME_TOOLS = [
  defineTool({
    name: 'get_me',
    description:
      'Read who you are acting as: member id, first name, username, contact details, calendar feed state.',
    routes: ['GET /api/me'],
    inputSchema: z.object({}),
    run: async (_input, actor) => {
      const member = await readSignedInMember(actor.memberId);
      if (member === null) return { kind: 'refused', body: { error: 'unknown-member' } };
      return { kind: 'answered', body: member };
    },
  }),
  defineTool({
    name: 'update_my_contact',
    description: 'Change your own phone or email; give at least one, null clears it.',
    routes: ['PUT /api/me/contact'],
    inputSchema: memberContactSchema,
    run: async (contact, actor) => {
      const outcome = await saveOwnContactDetails(actor.memberId, contact);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found')
        return { kind: 'refused', body: { error: 'unknown-member' } };
      return { kind: 'answered', body: confirmUpdate(actor.memberId, contact) };
    },
  }),
];
