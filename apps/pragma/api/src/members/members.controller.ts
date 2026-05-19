/**
 * Members admin endpoints. Routes:
 *  - GET    /api/members                         — list members.
 *  - POST   /api/members                         — create a member.
 *  - PUT    /api/members/:id                     — partial update.
 *  - DELETE /api/members/:id                     — delete a member (cascade
 *                                                  the member_instrument
 *                                                  rows manually since DSQL
 *                                                  does not enforce FK).
 *  - GET    /api/members/:id/instruments         — list assigned instruments.
 *  - PUT    /api/members/:id/instruments         — replace the assignment set.
 *
 * Body shapes mirror the `Member` interface from the spec types section
 * plus the M2M assignment payload `{ instrumentIds: string[] }`.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { instrumentTable, memberInstrumentTable, memberTable } from '../database/schema';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

const firstNameSchema = z.string().trim().min(1).max(64);
const colorSchema = z.string().regex(HEX_COLOR_PATTERN, 'expected hex color like #abc or #aabbcc');
const avatarS3KeySchema = z.string().min(1).max(512).nullable();

const createMemberSchema = z.object({
  firstName: firstNameSchema,
  color: colorSchema,
  avatarS3Key: avatarS3KeySchema.optional(),
});

const updateMemberSchema = z.object({
  firstName: firstNameSchema.optional(),
  color: colorSchema.optional(),
  avatarS3Key: avatarS3KeySchema.optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });
const instrumentAssignmentSchema = z.object({
  instrumentIds: z.array(z.string().uuid()),
});

export function buildMembersRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const database = getDatabase();
    const rows = await database
      .select({
        id: memberTable.id,
        firstName: memberTable.firstName,
        color: memberTable.color,
        avatarS3Key: memberTable.avatarS3Key,
      })
      .from(memberTable);
    const members = rows.toSorted((left, right) => left.firstName.localeCompare(right.firstName));
    return context.json({ members });
  });

  router.post('/', zValidator('json', createMemberSchema), async (context) => {
    const database = getDatabase();
    const input = context.req.valid('json');
    const [row] = await database
      .insert(memberTable)
      .values({
        firstName: input.firstName,
        color: input.color,
        avatarS3Key: input.avatarS3Key ?? null,
      })
      .returning({
        id: memberTable.id,
        firstName: memberTable.firstName,
        color: memberTable.color,
        avatarS3Key: memberTable.avatarS3Key,
      });
    return context.json({ member: row }, 201);
  });

  router.put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateMemberSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      const updates: Partial<{ firstName: string; color: string; avatarS3Key: string | null }> = {};
      if (input.firstName !== undefined) updates.firstName = input.firstName;
      if (input.color !== undefined) updates.color = input.color;
      if (input.avatarS3Key !== undefined) updates.avatarS3Key = input.avatarS3Key;
      if (Object.keys(updates).length === 0) {
        return context.json({ error: 'empty-update' }, 400);
      }
      const [row] = await database
        .update(memberTable)
        .set(updates)
        .where(eq(memberTable.id, id))
        .returning({
          id: memberTable.id,
          firstName: memberTable.firstName,
          color: memberTable.color,
          avatarS3Key: memberTable.avatarS3Key,
        });
      if (row === undefined) return context.json({ error: 'not-found' }, 404);
      return context.json({ member: row });
    },
  );

  router.delete('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    // DSQL does not enforce foreign keys at write time, so the
    // member_instrument link rows are removed explicitly here.
    await database.delete(memberInstrumentTable).where(eq(memberInstrumentTable.memberId, id));
    const deleted = await database
      .delete(memberTable)
      .where(eq(memberTable.id, id))
      .returning({ id: memberTable.id });
    if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  router.get(
    '/:id/instruments',
    zValidator('param', idParamSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const rows = await database
        .select({
          id: instrumentTable.id,
          name: instrumentTable.name,
          isHarmonic: instrumentTable.isHarmonic,
        })
        .from(memberInstrumentTable)
        .innerJoin(instrumentTable, eq(memberInstrumentTable.instrumentId, instrumentTable.id))
        .where(eq(memberInstrumentTable.memberId, id));
      const instruments = rows.toSorted((left, right) => left.name.localeCompare(right.name));
      return context.json({ instruments });
    },
  );

  router.put(
    '/:id/instruments',
    zValidator('param', idParamSchema),
    zValidator('json', instrumentAssignmentSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const { instrumentIds } = context.req.valid('json');
      const memberExists = await database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.id, id))
        .limit(1);
      if (memberExists.length === 0) return context.json({ error: 'not-found' }, 404);
      if (instrumentIds.length > 0) {
        // Reject the call if any referenced instrument does not exist,
        // so the client surfaces a 400 instead of silently dropping the
        // row (DSQL would not raise an FK error).
        const known = await database
          .select({ id: instrumentTable.id })
          .from(instrumentTable)
          .where(inArray(instrumentTable.id, instrumentIds));
        if (known.length !== instrumentIds.length) {
          return context.json({ error: 'instrument-not-found' }, 400);
        }
      }
      await database
        .delete(memberInstrumentTable)
        .where(eq(memberInstrumentTable.memberId, id));
      if (instrumentIds.length > 0) {
        await database.insert(memberInstrumentTable).values(
          instrumentIds.map((instrumentId) => ({ memberId: id, instrumentId })),
        );
      }
      return context.json({ id, instrumentIds });
    },
  );

  return router;
}
