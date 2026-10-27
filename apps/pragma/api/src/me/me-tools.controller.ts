import { z } from 'zod';
import { memberContactSchema } from '../members/members.schema';
import { defineTool, readSignedInMember, saveOwnContactDetails } from './me.service';

// @FollowsBlueprint controller-dispatch
export const ME_TOOLS = [
  defineTool({
    name: 'get_me',
    description:
      'Read who you are acting as: your member id, first name, colour, username, contact details and calendar feed state.',
    route: 'GET /api/me',
    inputSchema: z.object({}),
    run: async (_input, actor) => {
      const member = await readSignedInMember(actor.memberId);
      if (member === null) return { kind: 'refused', body: { error: 'unknown-member' } };
      return { kind: 'answered', body: member };
    },
  }),
  defineTool({
    name: 'update_my_contact',
    description:
      'Change your own phone number or email address; give at least one, and null clears it.',
    route: 'PUT /api/me/contact',
    inputSchema: memberContactSchema,
    run: async (contact, actor) => {
      const outcome = await saveOwnContactDetails(actor.memberId, contact);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found')
        return { kind: 'refused', body: { error: 'unknown-member' } };
      return { kind: 'answered', body: outcome.member };
    },
  }),
];
