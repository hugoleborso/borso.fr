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

// @FollowsBlueprint hook-stateful-helper
export function useChartSwitch(
  charts: readonly AssignedChart[],
  heldInstrumentIds: readonly string[] | null,
  surface: ChartSwitchSurface,
): ChartSwitch {
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const openingIndex = selectOpeningChartIndex(charts, heldInstrumentIds);
  const shownIndex = selectShownChartIndex(pickedIndex, openingIndex, charts.length);
  const pick = (index: number): void => {
    const isSwitch = isSwitchToAnotherChart(index, shownIndex);
    if (isSwitch) {
      recordProductEvent('chord_chart_switched', {
        surface,
        fromOpening: shownIndex === openingIndex,
      });
    }
    setPickedIndex(index);
  };
  return { shownIndex, pick, resetPick: () => setPickedIndex(null) };
}
