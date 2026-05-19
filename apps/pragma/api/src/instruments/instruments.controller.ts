/**
 * Instruments admin endpoints. All routes are gated by the
 * shared-password session middleware applied at mount time in
 * `app.ts`. The shape of the JSON payload mirrors the `Instrument`
 * interface declared in the spec types section.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { instrumentTable } from '../database/schema';

const instrumentNameSchema = z.string().trim().min(1).max(64);

const createInstrumentSchema = z.object({
  name: instrumentNameSchema,
  isHarmonic: z.boolean(),
});

const updateInstrumentSchema = z.object({
  name: instrumentNameSchema.optional(),
  isHarmonic: z.boolean().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

export function buildInstrumentsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const database = getDatabase();
    const rows = await database
      .select({
        id: instrumentTable.id,
        name: instrumentTable.name,
        isHarmonic: instrumentTable.isHarmonic,
      })
      .from(instrumentTable);
    const instruments = rows.toSorted((left, right) => left.name.localeCompare(right.name));
    return context.json({ instruments });
  });

  router.post('/', zValidator('json', createInstrumentSchema), async (context) => {
    const database = getDatabase();
    const input = context.req.valid('json');
    const [row] = await database
      .insert(instrumentTable)
      .values({ name: input.name, isHarmonic: input.isHarmonic })
      .returning({
        id: instrumentTable.id,
        name: instrumentTable.name,
        isHarmonic: instrumentTable.isHarmonic,
      });
    return context.json({ instrument: row }, 201);
  });

  router.put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateInstrumentSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      const updates: Partial<{ name: string; isHarmonic: boolean }> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.isHarmonic !== undefined) updates.isHarmonic = input.isHarmonic;
      if (Object.keys(updates).length === 0) {
        return context.json({ error: 'empty-update' }, 400);
      }
      const [row] = await database
        .update(instrumentTable)
        .set(updates)
        .where(eq(instrumentTable.id, id))
        .returning({
          id: instrumentTable.id,
          name: instrumentTable.name,
          isHarmonic: instrumentTable.isHarmonic,
        });
      if (row === undefined) return context.json({ error: 'not-found' }, 404);
      return context.json({ instrument: row });
    },
  );

  router.delete('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    const deleted = await database
      .delete(instrumentTable)
      .where(eq(instrumentTable.id, id))
      .returning({ id: instrumentTable.id });
    if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  return router;
}
