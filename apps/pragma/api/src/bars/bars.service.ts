/**
 * Service layer for bars. Holds the orchestration: list ordering,
 * input-to-persisted-shape translation (dates from ISO strings, etc.),
 * and the empty-update guard. The repository receives a clean
 * persisted shape; the controller never sees Drizzle.
 */

import type { Database } from '../database/client';
import {
  type BarPersistedShape,
  type BarRow,
  deleteBar,
  findBarById,
  insertBar,
  listBars,
  updateBar,
} from './bars.repository';
import type { barCreateSchema, barUpdateSchema } from './bars.schema';
import type { z } from 'zod';

type BarCreateInput = z.infer<typeof barCreateSchema>;
type BarUpdateInput = z.infer<typeof barUpdateSchema>;

function valuesFromCreate(input: BarCreateInput): BarPersistedShape {
  return {
    name: input.name,
    status: input.status,
    notes: input.notes,
    lastInteractionAt: input.lastInteractionAt === null ? null : new Date(input.lastInteractionAt),
    city: input.city,
    capacity: input.capacity,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
  };
}

function valuesFromUpdate(input: BarUpdateInput): BarPersistedShape {
  const out: BarPersistedShape = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.status !== undefined) out.status = input.status;
  if (input.notes !== undefined) out.notes = input.notes;
  if (input.lastInteractionAt !== undefined) {
    out.lastInteractionAt =
      input.lastInteractionAt === null ? null : new Date(input.lastInteractionAt);
  }
  if (input.city !== undefined) out.city = input.city;
  if (input.capacity !== undefined) out.capacity = input.capacity;
  if (input.contactName !== undefined) out.contactName = input.contactName;
  if (input.contactEmail !== undefined) out.contactEmail = input.contactEmail;
  if (input.contactPhone !== undefined) out.contactPhone = input.contactPhone;
  return out;
}

export async function getBarsSortedByName(database: Database): Promise<BarRow[]> {
  const rows = await listBars(database);
  return rows.toSorted((left, right) => left.name.localeCompare(right.name));
}

export async function getBarById(database: Database, id: string): Promise<BarRow | null> {
  return await findBarById(database, id);
}

export async function createBar(database: Database, input: BarCreateInput): Promise<BarRow> {
  return await insertBar(database, valuesFromCreate(input));
}

export async function patchBar(
  database: Database,
  id: string,
  input: BarUpdateInput,
): Promise<{ kind: 'ok'; bar: BarRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const bar = await updateBar(database, id, updates);
  if (bar === null) return { kind: 'not-found' };
  return { kind: 'ok', bar };
}

export async function removeBar(database: Database, id: string): Promise<boolean> {
  return await deleteBar(database, id);
}
