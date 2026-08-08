/**
 * Members admin endpoints. Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { getDatabase } from '../database/client';
import {
  createMemberSchema,
  memberIdParamSchema,
  memberInstrumentAssignmentSchema,
  updateMemberSchema,
} from './members.schema';
import {
  assignInstrumentsToMember,
  createMember,
  getMemberInstruments,
  getMembersSortedByFirstName,
  patchMember,
  removeMember,
} from './members.service';

// @FollowsBlueprint controller-dispatch
export function buildMembersRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const members = await getMembersSortedByFirstName(getDatabase());
      return context.json({ members });
    })
    .post('/', zValidator('json', createMemberSchema), async (context) => {
      const input = context.req.valid('json');
      const member = await createMember(getDatabase(), input);
      return context.json({ member }, 201);
    })
    .put(
      '/:id',
      zValidator('param', memberIdParamSchema),
      zValidator('json', updateMemberSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await patchMember(getDatabase(), id, input);
        if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ member: result.member });
      },
    )
    .delete('/:id', zValidator('param', memberIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const isOk = await removeMember(getDatabase(), id);
      if (!isOk) return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    })
    .get('/:id/instruments', zValidator('param', memberIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const instruments = await getMemberInstruments(getDatabase(), id);
      return context.json({ instruments });
    })
    .put(
      '/:id/instruments',
      zValidator('param', memberIdParamSchema),
      zValidator('json', memberInstrumentAssignmentSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const { instrumentIds } = context.req.valid('json');
        const result = await assignInstrumentsToMember(getDatabase(), id, instrumentIds);
        if (result.kind === 'member-not-found') return context.json({ error: 'not-found' }, 404);
        if (result.kind === 'instrument-not-found') {
          return context.json({ error: 'instrument-not-found' }, 400);
        }
        return context.json({ id, instrumentIds });
      },
    );
}
