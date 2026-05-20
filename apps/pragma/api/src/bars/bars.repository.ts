/**
 * Repository for the bars (CRM) bounded context.
 */

import { eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { type BarStatus, barTable } from './bars.schema';

export interface BarRow {
  id: string;
  name: string;
  status: string;
  notes: string;
  lastInteractionAt: Date | null;
  city: string | null;
  capacity: number | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

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

export interface BarPersistedShape {
  name?: string;
  status?: BarStatus;
  notes?: string;
  lastInteractionAt?: Date | null;
  city?: string | null;
  capacity?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export async function listBars(database: Database): Promise<BarRow[]> {
  return await database.select(PROJECTION).from(barTable);
}

export async function findBarById(database: Database, id: string): Promise<BarRow | null> {
  const rows = await database.select(PROJECTION).from(barTable).where(eq(barTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertBar(database: Database, values: BarPersistedShape): Promise<BarRow> {
  const [row] = await database
    .insert(barTable)
    .values({
      name: values.name ?? '',
      status: values.status ?? 'lead',
      notes: values.notes ?? '',
      lastInteractionAt: values.lastInteractionAt ?? null,
      city: values.city ?? null,
      capacity: values.capacity ?? null,
      contactName: values.contactName ?? null,
      contactEmail: values.contactEmail ?? null,
      contactPhone: values.contactPhone ?? null,
    })
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateBar(
  database: Database,
  id: string,
  updates: BarPersistedShape,
): Promise<BarRow | null> {
  const [row] = await database
    .update(barTable)
    .set(updates)
    .where(eq(barTable.id, id))
    .returning(PROJECTION);
  return row ?? null;
}

export async function deleteBar(database: Database, id: string): Promise<boolean> {
  const deleted = await database
    .delete(barTable)
    .where(eq(barTable.id, id))
    .returning({ id: barTable.id });
  return deleted.length > 0;
}
