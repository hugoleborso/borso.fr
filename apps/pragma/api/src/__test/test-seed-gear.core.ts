import type { GearStatus } from '@domain/gear-status.core';

export interface SeedGearItem {
  readonly label: string;
  readonly status: GearStatus;
  readonly holderFirstName: string | null;
}

export const SEED_GEAR_ITEMS: readonly SeedGearItem[] = [
  { label: 'Multiprise', status: 'to_find', holderFirstName: null },
  { label: 'Sono', status: 'asked_of_venue', holderFirstName: null },
  { label: 'Ampli basse', status: 'have', holderFirstName: 'Marc' },
  { label: 'Caisse claire', status: 'have', holderFirstName: 'Hugo' },
];

// @FollowsBlueprint core-projection
export function selectSeedGearHolding(
  item: SeedGearItem,
  memberIdByName: ReadonlyMap<string, string>,
): { readonly status: GearStatus; readonly memberId: string | null } {
  if (item.holderFirstName === null) return { status: item.status, memberId: null };
  const memberId = memberIdByName.get(item.holderFirstName);
  if (memberId === undefined) throw new Error('the seeded gear names no seeded member');
  return { status: item.status, memberId };
}
