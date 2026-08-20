import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
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

export async function getBarsSortedByName(): Promise<BarRow[]> {
  const rows = await listBars();
  return rows.toSorted((left, right) => left.name.localeCompare(right.name));
}

export async function getBarById(id: string): Promise<BarRow | null> {
  return await findBarById(id);
}

export async function createBar(input: BarCreateInput): Promise<BarRow> {
  return await insertBar(valuesFromCreate(input));
}

/**
 * @Blueprint service-crud-update
 * @BlueprintName Service Patch Returning A Union
 * @BlueprintUsage Use for every partial update, so the controller maps arms to statuses instead of re-deriving why the write failed.
 * @BlueprintDescription Translates the validated body into the persisted shape, answers `empty` when that shape carries no key, calls the repository once, and answers `not-found` when no row came back. The controller reads `result.kind` and never inspects the request body a second time to tell the two failures apart.
 */
export async function patchBar(
  id: string,
  input: BarUpdateInput,
): Promise<{ kind: 'ok'; bar: BarRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const bar = await updateBar(id, updates);
  if (bar === null) return { kind: 'not-found' };
  return { kind: 'ok', bar };
}

export async function removeBar(id: string): Promise<DeletionOutcome> {
  return await deleteBar(id);
}
