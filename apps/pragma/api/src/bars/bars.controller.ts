/**
 * Bars CRM endpoints. Status mirrors the spec `BarStatus` enum:
 * `lead | contacted | booked | played | cold`. The kanban view on the
 * site reads the same values and groups by column.
 *
 * Spec.md lists only `name, status, notes, lastInteractionAt` on Bar;
 * we extend with `city, capacity, contactName, contactEmail,
 * contactPhone` because the v1 surface needs them to be useful.
 *
 * Routes:
 *  - GET    /api/bars
 *  - POST   /api/bars
 *  - GET    /api/bars/:id
 *  - PUT    /api/bars/:id     — partial update (covers the kanban
 *                                drag-and-drop stage transition).
 *  - DELETE /api/bars/:id
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { barTable } from '../database/schema';

const BAR_STATUSES = ['lead', 'contacted', 'booked', 'played', 'cold'] as const;

const barBaseSchema = z.object({
  name: z.string().trim().min(1).max(256),
  status: z.enum(BAR_STATUSES),
  notes: z.string().max(8_192).default(''),
  lastInteractionAt: z.string().datetime().nullable().default(null),
  city: z.string().max(128).nullable().default(null),
  capacity: z.number().int().min(0).max(100_000).nullable().default(null),
  contactName: z.string().max(128).nullable().default(null),
  contactEmail: z.string().email().nullable().default(null),
  contactPhone: z.string().max(32).nullable().default(null),
});

const barCreateSchema = barBaseSchema;
const barUpdateSchema = barBaseSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid() });

const PROJECTION = {
  id: barTable.id,
  name: barTable.name,
  status: barTable.status,
  notes: barTable.notes,
  lastInteractionAt: barTable.lastInteractionAt,
  city: barTable.city,
  capacity: barTable.capacity,
  contactName: barTable.contactName,
  contactEmail: barTable.contactEmail,
  contactPhone: barTable.contactPhone,
} as const;

interface BarPersistedShape {
  name?: string;
  status?: (typeof BAR_STATUSES)[number];
  notes?: string;
  lastInteractionAt?: Date | null;
  city?: string | null;
  capacity?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

function valuesFromInput(input: z.infer<typeof barUpdateSchema>): BarPersistedShape {
  const out: BarPersistedShape = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.status !== undefined) out.status = input.status;
  if (input.notes !== undefined) out.notes = input.notes;
  if (input.lastInteractionAt !== undefined) {
    out.lastInteractionAt = input.lastInteractionAt === null ? null : new Date(input.lastInteractionAt);
  }
  if (input.city !== undefined) out.city = input.city;
  if (input.capacity !== undefined) out.capacity = input.capacity;
  if (input.contactName !== undefined) out.contactName = input.contactName;
  if (input.contactEmail !== undefined) out.contactEmail = input.contactEmail;
  if (input.contactPhone !== undefined) out.contactPhone = input.contactPhone;
  return out;
}

export function buildBarsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const database = getDatabase();
    const rows = await database.select(PROJECTION).from(barTable);
    const bars = rows.toSorted((left, right) => left.name.localeCompare(right.name));
    return context.json({ bars });
  });

  router.get('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    const rows = await database.select(PROJECTION).from(barTable).where(eq(barTable.id, id)).limit(1);
    const row = rows[0];
    if (row === undefined) return context.json({ error: 'not-found' }, 404);
    return context.json({ bar: row });
  });

  router.post('/', zValidator('json', barCreateSchema), async (context) => {
    const database = getDatabase();
    const input = context.req.valid('json');
    const [row] = await database
      .insert(barTable)
      .values({
        name: input.name,
        status: input.status,
        notes: input.notes,
        lastInteractionAt:
          input.lastInteractionAt === null ? null : new Date(input.lastInteractionAt),
        city: input.city,
        capacity: input.capacity,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      })
      .returning(PROJECTION);
    return context.json({ bar: row }, 201);
  });

  router.put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', barUpdateSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      const updates = valuesFromInput(input);
      if (Object.keys(updates).length === 0) {
        return context.json({ error: 'empty-update' }, 400);
      }
      const [row] = await database
        .update(barTable)
        .set(updates)
        .where(eq(barTable.id, id))
        .returning(PROJECTION);
      if (row === undefined) return context.json({ error: 'not-found' }, 404);
      return context.json({ bar: row });
    },
  );

  router.delete('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    const deleted = await database
      .delete(barTable)
      .where(eq(barTable.id, id))
      .returning({ id: barTable.id });
    if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  return router;
}
