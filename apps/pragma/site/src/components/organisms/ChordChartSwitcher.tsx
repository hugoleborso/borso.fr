/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { CHART_KIND_ICON } from '../../routes/catalog/chart-kind.utils';
import { titleChordCharts, type NamedInstrument } from '../../routes/catalog/chart-title.utils';
import { isChartSwitcherShown } from '../../routes/catalog/opening-chart.core';
import { SectionTabs, type SectionTabsTone } from '../molecules/SectionTabs';

export interface SwitchableChart {
  readonly kind: keyof typeof CHART_KIND_ICON;
  readonly instrumentIds: readonly string[];
  readonly label: string | null;
}

export interface ChordChartSwitcherProps {
  readonly charts: readonly SwitchableChart[];
  readonly instruments: readonly NamedInstrument[];
  readonly shownIndex: number;
  readonly onPick: (index: number) => void;
  readonly tone?: SectionTabsTone;
  readonly className?: string;
}

// @FollowsBlueprint organism-presentational
export function ChordChartSwitcher({
  charts,
  instruments,
  shownIndex,
  onPick,
  tone = 'paper',
  className,
}: ChordChartSwitcherProps): JSX.Element | null {
  const { t } = useTranslation();
  const isShown = isChartSwitcherShown(charts.length);
  if (!isShown) return null;
  const titledCharts = titleChordCharts(charts, instruments, {
    chords: t('catalog.chartTitleChords'),
    ensemble: t('catalog.chartTitleEnsemble'),
  });
  const tabs = titledCharts.map(({ chart, title }, index) => ({
    value: String(index),
    label: title,
    icon: CHART_KIND_ICON[chart.kind],
  }));
  return (
    <SectionTabs
      label={t('catalog.chartSwitcher')}
      tabs={tabs}
      value={String(shownIndex)}
      onChange={(value) => onPick(Number(value))}
      tone={tone}
      {...(className === undefined ? {} : { className })}
    />
  );
}
