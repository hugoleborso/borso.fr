/**
 * Service layer for members. Includes the M2M assignment to
 * instruments and the auto-pick of a chip color on create (palette
 * slot N for the N-th member), which closes the design-bundle
 * member-chip wiring (VD blocker).
 */

import type { Database } from '../database/client';
import { pickNextPaletteHex } from './member-palette.utils';
import {
  type MemberInstrumentRow,
  type MemberRow,
  deleteMemberWithLinks,
  findMemberById,
  insertMember,
  instrumentsExist,
  listInstrumentsForMember,
  listMembers,
  replaceMemberInstruments,
  updateMember,
} from './members.repository';

export async function getMembersSortedByFirstName(database: Database): Promise<MemberRow[]> {
  const rows = await listMembers(database);
  return rows.toSorted((left, right) => left.firstName.localeCompare(right.firstName));
}

export async function createMember(
  database: Database,
  input: { firstName: string; color?: string; avatarS3Key?: string | null },
): Promise<MemberRow> {
  let color = input.color;
  if (color === undefined) {
    const existing = await listMembers(database);
    color = pickNextPaletteHex(existing.length);
  }
  return await insertMember(database, {
    firstName: input.firstName,
    color,
    avatarS3Key: input.avatarS3Key ?? null,
  });
}

export async function patchMember(
  database: Database,
  id: string,
  input: { firstName?: string; color?: string; avatarS3Key?: string | null },
): Promise<{ kind: 'ok'; member: MemberRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  const updates: Partial<{ firstName: string; color: string; avatarS3Key: string | null }> = {};
  if (input.firstName !== undefined) updates.firstName = input.firstName;
  if (input.color !== undefined) updates.color = input.color;
  if (input.avatarS3Key !== undefined) updates.avatarS3Key = input.avatarS3Key;
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const member = await updateMember(database, id, updates);
  if (member === null) return { kind: 'not-found' };
  return { kind: 'ok', member };
}

export async function removeMember(database: Database, id: string): Promise<boolean> {
  return await deleteMemberWithLinks(database, id);
}

export async function getMemberInstruments(
  database: Database,
  memberId: string,
): Promise<MemberInstrumentRow[]> {
  const rows = await listInstrumentsForMember(database, memberId);
  return rows.toSorted((left, right) => left.name.localeCompare(right.name));
}

export type AssignInstrumentsResult =
  | { kind: 'ok' }
  | { kind: 'member-not-found' }
  | { kind: 'instrument-not-found' };

export async function assignInstrumentsToMember(
  database: Database,
  memberId: string,
  instrumentIds: readonly string[],
): Promise<AssignInstrumentsResult> {
  const member = await findMemberById(database, memberId);
  if (member === null) return { kind: 'member-not-found' };
  const known = await instrumentsExist(database, instrumentIds);
  if (!known) return { kind: 'instrument-not-found' };
  await replaceMemberInstruments(database, memberId, instrumentIds);
  return { kind: 'ok' };
}
