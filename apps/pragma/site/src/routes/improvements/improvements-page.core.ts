/** @Feature improvements */

import type { ParseKeys } from 'i18next';

export const IMPROVEMENT_STATUSES = ['idea', 'planned', 'building', 'shipped', 'declined'] as const;

export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number];

// @FollowsBlueprint core-label-key
const STATUS_LABEL_KEY = {
  idea: 'improvements.statusIdea',
  planned: 'improvements.statusPlanned',
  building: 'improvements.statusBuilding',
  shipped: 'improvements.statusShipped',
  declined: 'improvements.statusDeclined',
} as const satisfies Record<ImprovementStatus, ParseKeys>;

export function selectStatusLabelKey(status: ImprovementStatus): ParseKeys {
  return STATUS_LABEL_KEY[status];
}

const FALLBACK_STATUS: ImprovementStatus = 'idea';

export function readStatus(value: string): ImprovementStatus {
  return IMPROVEMENT_STATUSES.find((status) => status === value) ?? FALLBACK_STATUS;
}

export type StatusFilter = ImprovementStatus | 'all';

export interface FilterableImprovement {
  readonly status: string;
}

export function filterByStatus<TImprovement extends FilterableImprovement>(
  improvements: readonly TImprovement[],
  filter: StatusFilter,
): TImprovement[] {
  if (filter === 'all') return [...improvements];
  return improvements.filter((improvement) => improvement.status === filter);
}

export type DeletionEffect = 'keep-form' | 'clear-form';

// @FollowsBlueprint core-view-intent
export function selectImprovementDeletionEffect(
  selectedImprovementId: string | null,
  deletedImprovementId: string,
): DeletionEffect {
  return selectedImprovementId === deletedImprovementId ? 'clear-form' : 'keep-form';
}

export type WriteFailureStatus = number | null;

const UNKNOWN_ERROR_MESSAGE_KEY: ParseKeys = 'improvements.errorUnknown';

const ERROR_MESSAGE_KEY_BY_STATUS = new Map<number, ParseKeys>([
  [400, 'improvements.errorRefused'],
  [401, 'improvements.errorSignedOut'],
  [404, 'improvements.errorGone'],
]);

// @FollowsBlueprint core-label-key
export function selectErrorMessageKey(status: WriteFailureStatus): ParseKeys {
  if (status === null) return UNKNOWN_ERROR_MESSAGE_KEY;
  return ERROR_MESSAGE_KEY_BY_STATUS.get(status) ?? UNKNOWN_ERROR_MESSAGE_KEY;
}
