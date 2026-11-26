import {
  countGearByStatus,
  GEAR_STATUSES,
  type GearHolding,
  type GearStatus,
} from '@domain/gear-status.core';
import { GEAR_ITEM_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import type { ParseKeys } from 'i18next';
import type { IconName } from '../../components/atoms/Icon';

export const ALL_GEAR_FILTER = 'all';

export type GearFilter = typeof ALL_GEAR_FILTER | GearStatus;

const GEAR_FILTERS: readonly GearFilter[] = [ALL_GEAR_FILTER, ...GEAR_STATUSES];

export const GEAR_STATUS_LABEL_KEY = {
  to_find: 'gear.status.to_find',
  asked_of_venue: 'gear.status.asked_of_venue',
  have: 'gear.status.have',
} as const satisfies Readonly<Record<GearStatus, ParseKeys>>;

export const GEAR_STATUS_ICON = {
  to_find: 'pending',
  asked_of_venue: 'venue',
  have: 'check',
} as const satisfies Readonly<Record<GearStatus, IconName>>;

const GEAR_FILTER_LABEL_KEY = {
  [ALL_GEAR_FILTER]: 'common.all',
  ...GEAR_STATUS_LABEL_KEY,
} as const satisfies Readonly<Record<GearFilter, ParseKeys>>;

const GEAR_FILTER_ICON: Readonly<Record<GearFilter, IconName | null>> = {
  [ALL_GEAR_FILTER]: null,
  ...GEAR_STATUS_ICON,
};

export interface GearFilterChip {
  readonly filter: GearFilter;
  readonly labelKey: ParseKeys;
  readonly icon: IconName | null;
  readonly count: number;
  readonly isPressed: boolean;
}

export interface GearPageItem {
  readonly id: string;
  readonly label: string;
  readonly status: GearStatus;
  readonly memberId: string | null;
  readonly position: number;
}

export interface GearSection<Item extends GearPageItem> {
  readonly status: GearStatus;
  readonly items: readonly Item[];
}

export interface GearPageView<Item extends GearPageItem> {
  readonly counts: Readonly<Record<GearFilter, number>>;
  readonly sections: readonly GearSection<Item>[];
}

export interface GearPageScope {
  readonly filter: GearFilter;
  readonly isMineOnly: boolean;
  readonly memberId: string | null;
}

function compareListOrder(left: GearPageItem, right: GearPageItem): number {
  return (
    left.position - right.position ||
    left.label.localeCompare(right.label) ||
    left.id.localeCompare(right.id)
  );
}

// @FollowsBlueprint core-view-projection
export function selectGearPageView<Item extends GearPageItem>(
  items: readonly Item[],
  scope: GearPageScope,
): GearPageView<Item> {
  const scoped = items
    .filter((item) => !scope.isMineOnly || item.memberId === scope.memberId)
    .toSorted(compareListOrder);
  const counts = { [ALL_GEAR_FILTER]: scoped.length, ...countGearByStatus(scoped) };
  const sections = GEAR_STATUSES.filter(
    (status) => scope.filter === ALL_GEAR_FILTER || scope.filter === status,
  )
    .map((status) => ({ status, items: scoped.filter((item) => item.status === status) }))
    .filter((section) => section.items.length > 0);
  return { counts, sections };
}

export function selectGearFilterChips(
  counts: Readonly<Record<GearFilter, number>>,
  pickedFilter: GearFilter,
): readonly GearFilterChip[] {
  return GEAR_FILTERS.map((filter) => ({
    filter,
    labelKey: GEAR_FILTER_LABEL_KEY[filter],
    icon: GEAR_FILTER_ICON[filter],
    count: counts[filter],
    isPressed: filter === pickedFilter,
  }));
}

export function selectOfferedCopySource<Source>(
  itemCount: number,
  copySource: Source | null,
): Source | null {
  return itemCount === 0 ? copySource : null;
}

export interface GearSummary {
  readonly counts: Readonly<Record<GearStatus, number>>;
  readonly havePercent: number;
  readonly venuePercent: number;
}

const FULL_PERCENT = 100;

export function selectGearSummary(
  items: readonly { readonly status: GearStatus }[] | null,
): GearSummary | null {
  if (items === null || items.length === 0) return null;
  const counts = countGearByStatus(items);
  return {
    counts,
    havePercent: (counts.have / items.length) * FULL_PERCENT,
    venuePercent: (counts.asked_of_venue / items.length) * FULL_PERCENT,
  };
}

export type GearLabelRefusal = 'empty' | 'too-long';

export function selectGearLabelRefusal(label: string): GearLabelRefusal | null {
  const trimmed = label.trim();
  if (trimmed.length === 0) return 'empty';
  if (trimmed.length > GEAR_ITEM_LABEL_MAX_LENGTH) return 'too-long';
  return null;
}

export function gearHoldingChoiceKey(holding: GearHolding): string {
  return holding.memberId ?? holding.status;
}

export function readGearHoldingChoice(choiceKey: string): GearHolding {
  if (choiceKey === 'to_find' || choiceKey === 'asked_of_venue') {
    return { status: choiceKey, memberId: null };
  }
  return { status: 'have', memberId: choiceKey };
}
