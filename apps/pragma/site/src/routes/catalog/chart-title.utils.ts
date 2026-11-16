/** @Feature songs */

export interface TitledChart {
  readonly kind: string;
  readonly instrumentIds: readonly string[];
}

export interface NamedInstrument {
  readonly id: string;
  readonly name: string;
}

export interface SharedChartTitles {
  readonly chords: string;
  readonly ensemble: string;
}

const FIRST_OCCURRENCE = 1;

function describeChordChartTitle(
  chart: TitledChart,
  instruments: readonly NamedInstrument[],
  sharedTitles: SharedChartTitles,
): string {
  const named = instruments.filter((instrument) => chart.instrumentIds.includes(instrument.id));
  const soleInstrument = named.length === 1 ? named.at(0) : undefined;
  if (soleInstrument !== undefined) return soleInstrument.name;
  return chart.kind === 'chordpro' ? sharedTitles.chords : sharedTitles.ensemble;
}

// @FollowsBlueprint utils-pure-module
export function titleChordCharts<Chart extends TitledChart>(
  charts: readonly Chart[],
  instruments: readonly NamedInstrument[],
  sharedTitles: SharedChartTitles,
): { readonly chart: Chart; readonly title: string }[] {
  const occurrences = new Map<string, number>();
  return charts.map((chart) => {
    const title = describeChordChartTitle(chart, instruments, sharedTitles);
    const occurrence = (occurrences.get(title) ?? 0) + 1;
    occurrences.set(title, occurrence);
    return { chart, title: occurrence === FIRST_OCCURRENCE ? title : `${title} ${occurrence}` };
  });
}
