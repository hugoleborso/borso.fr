import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { BAR_STATUSES, type BarStatus, barTable } from './bars.schema';

const barStatusSchema = z.enum(BAR_STATUSES);

function toBarRow(row: {
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
}): BarRow {
  return { ...row, status: barStatusSchema.parse(row.status) };
}

export interface BarRow {
  id: string;
  name: string;
  status: BarStatus;
  notes: string;
  lastInteractionAt: Date | null;
  city: string | null;
  capacity: number | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

// @FollowsBlueprint repository-projection
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

export async function listBars(): Promise<BarRow[]> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(barTable);
  return rows.map(toBarRow);
}

export async function findBarById(id: string): Promise<BarRow | null> {
  const database = getDatabase();
  const rows = await database.select(PROJECTION).from(barTable).where(eq(barTable.id, id)).limit(1);
  return rows[0] === undefined ? null : toBarRow(rows[0]);
}

export async function insertBar(values: BarPersistedShape): Promise<BarRow> {
  const database = getDatabase();
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
  return toBarRow(row);
}

export async function updateBar(id: string, updates: BarPersistedShape): Promise<BarRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(barTable)
    .set(updates)
    .where(eq(barTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : toBarRow(row);
}

export async function deleteBar(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(barTable)
    .where(eq(barTable.id, id))
    .returning({ id: barTable.id });
  return selectDeletionOutcome(deleted.length);
}
