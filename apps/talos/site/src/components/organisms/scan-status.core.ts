import type { AgeUnit } from '../../lib/relative-age.utils';

export interface RunReportShape {
  readonly at: string;
  readonly failedSources: readonly string[];
}

export interface LastRunsShape {
  readonly scan: RunReportShape | null;
  readonly macCollection: RunReportShape | null;
}

// @FollowsBlueprint core-view-projection
export function listFailedSources(lastRuns: LastRunsShape, macPrefix: string): string[] {
  return [
    ...(lastRuns.scan?.failedSources ?? []),
    ...(lastRuns.macCollection?.failedSources ?? []).map((source) => `${macPrefix} · ${source}`),
  ];
}

const AGE_LABEL_KEY = {
  minutes: 'age.minutes',
  hours: 'age.hours',
  days: 'age.days',
} as const satisfies Record<AgeUnit, string>;

export function selectAgeLabelKey(unit: AgeUnit): (typeof AGE_LABEL_KEY)[AgeUnit] {
  return AGE_LABEL_KEY[unit];
}
