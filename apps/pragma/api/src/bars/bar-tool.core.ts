import { foldReferenceText } from '../helpers/reference/reference.core';

export interface ListedBar {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly lastInteractionAt: Date | null;
}

export interface BarSummary {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly lastInteractionAt: string | null;
}

export interface BarFilter {
  readonly query?: string | undefined;
  readonly status?: string | undefined;
}

function isBarKept(bar: ListedBar, filter: BarFilter): boolean {
  const isStatusKept = filter.status === undefined || bar.status === filter.status;
  const searched = foldReferenceText([bar.name, bar.city].join(' '));
  return isStatusKept && searched.includes(foldReferenceText(filter.query ?? ''));
}

// @FollowsBlueprint core-projection
export function summarizeBars(bars: readonly ListedBar[], filter: BarFilter): BarSummary[] {
  return bars
    .filter((bar) => isBarKept(bar, filter))
    .map((bar) => ({
      id: bar.id,
      name: bar.name,
      status: bar.status,
      city: bar.city,
      capacity: bar.capacity,
      lastInteractionAt: bar.lastInteractionAt?.toISOString() ?? null,
    }));
}
