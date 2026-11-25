import type { GearHolding, GearStatus } from '@domain/gear-status.core';
import { foldReferenceText, isSelfReference } from '../helpers/reference/reference.core';
import { type NamedEntity, nameEntity } from '../instruments/lineup-names.core';

export const VENUE_HOLDER = 'venue';

export interface ToolGearItem {
  readonly label: string;
  readonly status: GearStatus;
  readonly memberId: string | null;
}

export interface GearItemToolView {
  readonly label: string;
  readonly holder: string | null;
}

function nameHolder(item: ToolGearItem, members: readonly NamedEntity[]): string | null {
  if (item.status === 'asked_of_venue') return VENUE_HOLDER;
  if (item.memberId === null) return null;
  return nameEntity(members, item.memberId);
}

// @FollowsBlueprint core-projection
export function projectGearItemsForTool(
  items: readonly ToolGearItem[],
  members: readonly NamedEntity[],
): GearItemToolView[] {
  return items.map((item) => ({ label: item.label, holder: nameHolder(item, members) }));
}

export type GearHolderReading =
  | { readonly kind: 'holding'; readonly holding: GearHolding }
  | { readonly kind: 'member'; readonly reference: string };

// @FollowsBlueprint core-decision
export function readGearHolderReference(
  reference: string | null,
  actorMemberId: string,
): GearHolderReading {
  if (reference === null)
    return { kind: 'holding', holding: { status: 'to_find', memberId: null } };
  if (foldReferenceText(reference) === VENUE_HOLDER) {
    return { kind: 'holding', holding: { status: 'asked_of_venue', memberId: null } };
  }
  if (isSelfReference(reference)) {
    return { kind: 'holding', holding: { status: 'have', memberId: actorMemberId } };
  }
  return { kind: 'member', reference };
}

export interface GearToolUpdate {
  readonly label?: string;
  readonly status?: GearStatus;
  readonly memberId?: string | null;
}

export function buildGearToolUpdate(
  label: string | undefined,
  holding: GearHolding | undefined,
): GearToolUpdate {
  return { ...(label === undefined ? {} : { label }), ...holding };
}
