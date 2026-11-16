/** @Feature songs */

import { useState } from 'react';
import { recordProductEvent } from '../../observability/product-event.adapter';
import {
  type AssignedChart,
  isSwitchToAnotherChart,
  selectOpeningChartIndex,
  selectShownChartIndex,
} from './opening-chart.core';

export type ChartSwitchSurface = 'song' | 'setlist-sheet' | 'song-scene' | 'setlist-scene';

export interface ChartSwitch {
  readonly shownIndex: number;
  readonly pick: (index: number) => void;
  readonly resetPick: () => void;
}

interface ScopedPick {
  readonly scope: string | undefined;
  readonly index: number;
}

// @FollowsBlueprint hook-stateful-helper
export function useChartSwitch(
  charts: readonly AssignedChart[],
  heldInstrumentIds: readonly string[] | null,
  surface: ChartSwitchSurface,
  pickScope?: string,
): ChartSwitch {
  const [pick, setPick] = useState<ScopedPick | null>(null);
  const pickedIndex = pick !== null && pick.scope === pickScope ? pick.index : null;
  const openingIndex = selectOpeningChartIndex(charts, heldInstrumentIds);
  const shownIndex = selectShownChartIndex(pickedIndex, openingIndex, charts.length);
  const pickChart = (index: number): void => {
    const isSwitch = isSwitchToAnotherChart(index, shownIndex);
    if (isSwitch) {
      recordProductEvent('chord_chart_switched', {
        surface,
        fromOpening: shownIndex === openingIndex,
      });
    }
    setPick({ scope: pickScope, index });
  };
  return { shownIndex, pick: pickChart, resetPick: () => setPick(null) };
}
