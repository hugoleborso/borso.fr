import { SONG_CHARTS_MAX_ENCODED_BYTES } from '@domain/input-limits.core';

export interface ChordChartAssignment {
  instrumentIds: string[];
  label: string | null;
}

export function listEachInstrumentOnce(instrumentIds: readonly string[]): string[] {
  return [...new Set(instrumentIds)];
}

export function isWithinChartsByteBudget(charts: readonly unknown[]): boolean {
  return new TextEncoder().encode(JSON.stringify(charts)).length <= SONG_CHARTS_MAX_ENCODED_BYTES;
}

// @FollowsBlueprint core-projection
export function resolveSongCharts<Chart extends ChordChartAssignment, LegacyChart extends object>(
  storedCharts: Chart[] | null,
  storedLegacyChart: LegacyChart | null,
): (Chart | (LegacyChart & ChordChartAssignment))[] {
  if (storedCharts !== null) return storedCharts;
  if (storedLegacyChart === null) return [];
  return [{ ...storedLegacyChart, instrumentIds: [], label: null }];
}

// @FollowsBlueprint core-projection
export function dropInstrumentFromCharts<Chart extends ChordChartAssignment>(
  charts: readonly Chart[],
  instrumentId: string,
): Chart[] {
  return charts.map((chart) => ({
    ...chart,
    instrumentIds: chart.instrumentIds.filter((heldId) => heldId !== instrumentId),
  }));
}
