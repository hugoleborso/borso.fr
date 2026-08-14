/**
 * Service layer for members. Includes the M2M assignment to
 * instruments and the auto-pick of a chip color on create (palette
 * slot N for the N-th member), which closes the design-bundle
 * member-chip wiring (VD blocker).
 */

import { pickNextPaletteHex } from './member-palette.utils';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteMemberWithLinks,
  findMemberById,
  insertMember,
  areInstrumentsKnown,
  listInstrumentsForMember,
  listMembers,
  type MemberInstrumentRow,
  type MemberRow,
  replaceMemberInstruments,
  updateMember,
} from './members.repository';

export async function getMembersSortedByFirstName(): Promise<MemberRow[]> {
  const rows = await listMembers();
  return rows.toSorted((left, right) => left.firstName.localeCompare(right.firstName));
}

export async function createMember(input: {
  firstName: string;
  color?: string;
  avatarS3Key?: string | null;
}): Promise<MemberRow> {
  let color = input.color;
  if (color === undefined) {
    const existing = await listMembers();
    color = pickNextPaletteHex(existing.length);
  }
  return await insertMember({
    firstName: input.firstName,
    color,
    avatarS3Key: input.avatarS3Key ?? null,
  });
}

// @FollowsBlueprint service-crud-update
export async function patchMember(
  id: string,
  input: { firstName?: string; color?: string; avatarS3Key?: string | null },
): Promise<{ kind: 'ok'; member: MemberRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  const updates: Partial<{ firstName: string; color: string; avatarS3Key: string | null }> = {};
  if (input.firstName !== undefined) updates.firstName = input.firstName;
  if (input.color !== undefined) updates.color = input.color;
  if (input.avatarS3Key !== undefined) updates.avatarS3Key = input.avatarS3Key;
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const member = await updateMember(id, updates);
  if (member === null) return { kind: 'not-found' };
  return { kind: 'ok', member };
}

export async function removeMember(id: string): Promise<DeletionOutcome> {
  return await deleteMemberWithLinks(id);
}

export async function getMemberInstruments(memberId: string): Promise<MemberInstrumentRow[]> {
  const rows = await listInstrumentsForMember(memberId);
  return rows.toSorted((left, right) => left.name.localeCompare(right.name));
}

export type AssignInstrumentsResult =
  { kind: 'ok' } | { kind: 'member-not-found' } | { kind: 'instrument-not-found' };

export async function assignInstrumentsToMember(
  memberId: string,
  instrumentIds: readonly string[],
): Promise<AssignInstrumentsResult> {
  const member = await findMemberById(memberId);
  if (member === null) return { kind: 'member-not-found' };
  const isKnown = await areInstrumentsKnown(instrumentIds);
  if (!isKnown) return { kind: 'instrument-not-found' };
  await replaceMemberInstruments(memberId, instrumentIds);
  return { kind: 'ok' };
}
