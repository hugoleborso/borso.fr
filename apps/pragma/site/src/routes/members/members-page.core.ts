/** @Feature members */

export interface MemberRow {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface InstrumentRow {
  readonly id: string;
  readonly name: string;
}

export interface MemberSelection {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface MemberFormValues {
  readonly firstName: string;
  readonly color: string;
}

export type MemberFormMode = 'create' | 'edit';

export const DEFAULT_MEMBER_COLOR = '#2d5fa0';

export function sortMembersByFirstName(members: readonly MemberRow[]): MemberRow[] {
  return members.toSorted((left, right) => left.firstName.localeCompare(right.firstName));
}

export function sortInstrumentsByName(instruments: readonly InstrumentRow[]): InstrumentRow[] {
  return instruments.toSorted((left, right) => left.name.localeCompare(right.name));
}

export function selectMemberFormMode(selection: MemberSelection | null): MemberFormMode {
  return selection === null ? 'create' : 'edit';
}

export function buildMemberFormValues(selection: MemberSelection | null): MemberFormValues {
  return {
    firstName: selection?.firstName ?? '',
    color: selection?.color ?? DEFAULT_MEMBER_COLOR,
  };
}

export function buildMemberFormKey(selection: MemberSelection | null): string {
  return selection?.id ?? 'new-member';
}

export type InstrumentListState = 'empty' | 'filled';

export function selectInstrumentListState(
  instruments: readonly InstrumentRow[],
): InstrumentListState {
  return instruments.length === 0 ? 'empty' : 'filled';
}

export function toggleInstrumentAssignment(
  assignedInstrumentIds: readonly string[],
  instrumentId: string,
): string[] {
  return assignedInstrumentIds.includes(instrumentId)
    ? assignedInstrumentIds.filter((candidate) => candidate !== instrumentId)
    : [...assignedInstrumentIds, instrumentId];
}

export function selectSelectionAfterDeletion(
  selection: MemberSelection | null,
  deletedMemberId: string,
): MemberSelection | null {
  return selection?.id === deletedMemberId ? null : selection;
}

export type MemberWriteIntent =
  | { readonly kind: 'skip' }
  | { readonly kind: 'create'; readonly firstName: string; readonly color: string }
  | {
      readonly kind: 'update';
      readonly id: string;
      readonly firstName: string;
      readonly color: string;
    };

// @FollowsBlueprint core-view-intent
export function selectMemberWriteIntent(
  selection: MemberSelection | null,
  values: MemberFormValues,
): MemberWriteIntent {
  const firstName = values.firstName.trim();
  if (firstName.length === 0) return { kind: 'skip' };
  if (selection === null) return { kind: 'create', firstName, color: values.color };
  return { kind: 'update', id: selection.id, firstName, color: values.color };
}

export interface MemberWriteVisitor<Result> {
  readonly skip: () => Result;
  readonly create: (input: { firstName: string; color: string }) => Result;
  readonly update: (input: { id: string; firstName: string; color: string }) => Result;
}

export function applyMemberWriteIntent<Result>(
  intent: MemberWriteIntent,
  visitor: MemberWriteVisitor<Result>,
): Result {
  if (intent.kind === 'skip') return visitor.skip();
  if (intent.kind === 'create') {
    return visitor.create({ firstName: intent.firstName, color: intent.color });
  }
  return visitor.update({ id: intent.id, firstName: intent.firstName, color: intent.color });
}
