import type { z } from 'zod';
import { pickNextPaletteHex } from './member-palette.utils';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteMemberWithLinks,
  didReplaceMemberInstruments,
  insertMember,
  areInstrumentsKnown,
  listInstrumentsForMember,
  listMembers,
  type MemberInstrumentRow,
  type MemberPersistedShape,
  type MemberRow,
  updateMember,
} from './members.repository';

import type { createMemberSchema, updateMemberSchema } from './members.schema';

export { didClaimMemberWithin } from './members.repository';

type MemberCreateInput = z.infer<typeof createMemberSchema>;
type MemberUpdateInput = z.infer<typeof updateMemberSchema>;

export async function getMembersSortedByFirstName(): Promise<MemberRow[]> {
  const rows = await listMembers();
  return rows.toSorted((left, right) => left.firstName.localeCompare(right.firstName));
}

export async function createMember(input: MemberCreateInput): Promise<MemberRow> {
  let color = input.color;
  if (color === undefined) {
    const existing = await listMembers();
    color = pickNextPaletteHex(existing.length);
  }
  return await insertMember({
    firstName: input.firstName,
    color,
    avatarS3Key: input.avatarS3Key ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
  });
}

// @FollowsBlueprint service-crud-update
export async function patchMember(
  id: string,
  input: MemberUpdateInput,
): Promise<{ kind: 'ok'; member: MemberRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  const updates: Partial<MemberPersistedShape> = {};
  if (input.firstName !== undefined) updates.firstName = input.firstName;
  if (input.color !== undefined) updates.color = input.color;
  if (input.avatarS3Key !== undefined) updates.avatarS3Key = input.avatarS3Key;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.email !== undefined) updates.email = input.email;
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
  primaryInstrumentIds?: readonly string[],
): Promise<AssignInstrumentsResult> {
  const isKnown = await areInstrumentsKnown(instrumentIds);
  if (!isKnown) return { kind: 'instrument-not-found' };
  const isReplaced = await didReplaceMemberInstruments(
    memberId,
    instrumentIds,
    primaryInstrumentIds,
  );
  if (!isReplaced) return { kind: 'member-not-found' };
  return { kind: 'ok' };
}
