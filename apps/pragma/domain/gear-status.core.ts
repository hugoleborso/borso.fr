export const GEAR_STATUSES = ['to_find', 'asked_of_venue', 'have'] as const;

export type GearStatus = (typeof GEAR_STATUSES)[number];

export const DEFAULT_GEAR_STATUS: GearStatus = 'to_find';

export interface GearHolding {
  readonly status: GearStatus;
  readonly memberId: string | null;
}

// @FollowsBlueprint core-decision
export function isGearHoldingValid(holding: GearHolding): boolean {
  return (holding.status === 'have') === (holding.memberId !== null);
}

export function isGearHoldingUpdateValid(update: Partial<GearHolding>): boolean {
  const { status, memberId } = update;
  if (status === undefined && memberId === undefined) return true;
  if (status === undefined || memberId === undefined) return false;
  return isGearHoldingValid({ status, memberId });
}

export function keepHoldingOfPresentMember(
  holding: GearHolding,
  presentMemberIds: ReadonlySet<string>,
): GearHolding {
  if (holding.memberId === null || presentMemberIds.has(holding.memberId)) return holding;
  return { status: DEFAULT_GEAR_STATUS, memberId: null };
}

export function selectGearHolderIds(
  items: readonly { readonly memberId: string | null }[],
): ReadonlySet<string> {
  return new Set(items.flatMap((item) => (item.memberId === null ? [] : [item.memberId])));
}

export function nextGearHoldingAfterTap(status: GearStatus, tappingMemberId: string): GearHolding {
  if (status === 'to_find') return { status: 'asked_of_venue', memberId: null };
  if (status === 'asked_of_venue') return { status: 'have', memberId: tappingMemberId };
  return { status: DEFAULT_GEAR_STATUS, memberId: null };
}

export function countGearByStatus(
  items: readonly { readonly status: GearStatus }[],
): Readonly<Record<GearStatus, number>> {
  const counts: Record<GearStatus, number> = { to_find: 0, asked_of_venue: 0, have: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

export interface GearCopyCandidate {
  readonly id: string;
  readonly date: Date;
  readonly gearItemCount: number;
}

function compareLatestFirst(left: GearCopyCandidate, right: GearCopyCandidate): number {
  return right.date.getTime() - left.date.getTime() || left.id.localeCompare(right.id);
}

export function selectGearCopySource<Concert extends GearCopyCandidate>(
  concerts: readonly Concert[],
  target: { readonly id: string; readonly date: Date },
): Concert | null {
  const earlierWithItems = concerts.filter(
    (concert) =>
      concert.id !== target.id &&
      concert.gearItemCount > 0 &&
      concert.date.getTime() < target.date.getTime(),
  );
  return earlierWithItems.toSorted(compareLatestFirst)[0] ?? null;
}
