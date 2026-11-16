/** @Feature songs */

import { instrumentsHeldBy, type Lineup } from '@domain/lineup.core';

export interface AssignedChart {
  readonly instrumentIds: readonly string[];
}

export interface SignedInMemberLike {
  readonly memberId: string;
}

const NO_CHART = -1;
const FIRST_CHART = 0;
const SWITCHER_MIN_CHARTS = 2;

function isNamingAnyOf(chart: AssignedChart, heldInstrumentIds: readonly string[]): boolean {
  return chart.instrumentIds.some((instrumentId) => heldInstrumentIds.includes(instrumentId));
}

// @FollowsBlueprint core-decision
export function selectOpeningChartIndex(
  charts: readonly AssignedChart[],
  heldInstrumentIds: readonly string[] | null,
): number {
  if (charts.length === 0) return NO_CHART;
  if (heldInstrumentIds === null) return FIRST_CHART;
  const named = charts.findIndex((chart) => isNamingAnyOf(chart, heldInstrumentIds));
  if (named !== NO_CHART) return named;
  const forEveryInstrument = charts.findIndex((chart) => chart.instrumentIds.length === 0);
  return forEveryInstrument === NO_CHART ? FIRST_CHART : forEveryInstrument;
}

export function selectShownChartIndex(
  pickedIndex: number | null,
  openingIndex: number,
  chartCount: number,
): number {
  if (pickedIndex === null || pickedIndex >= chartCount) return openingIndex;
  return pickedIndex;
}

export function isChartSwitcherShown(chartCount: number): boolean {
  return chartCount >= SWITCHER_MIN_CHARTS;
}

export function isSwitchToAnotherChart(pickedIndex: number, shownIndex: number): boolean {
  return pickedIndex !== shownIndex;
}

export function selectHeldInstrumentIds(
  lineup: Lineup,
  member: SignedInMemberLike | null | undefined,
): readonly string[] | null {
  if (member === undefined) return null;
  if (member === null) return [];
  return instrumentsHeldBy(lineup, member.memberId);
}
