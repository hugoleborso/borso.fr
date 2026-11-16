/** @Feature songs */

export interface TitledChart {
  readonly instrumentIds: readonly string[];
  readonly label: string | null;
}

export interface NamedInstrument {
  readonly id: string;
  readonly name: string;
}

const INSTRUMENT_SEPARATOR = ' + ';
const LABEL_SEPARATOR = ' · ';

// @FollowsBlueprint utils-pure-module
export function describeChartInstruments(
  chart: TitledChart,
  instruments: readonly NamedInstrument[],
  everyInstrumentText: string,
): string {
  const names = instruments
    .filter((instrument) => chart.instrumentIds.includes(instrument.id))
    .map((instrument) => instrument.name);
  return names.length === 0 ? everyInstrumentText : names.join(INSTRUMENT_SEPARATOR);
}

// @FollowsBlueprint utils-pure-module
export function describeChordChartTitle(
  chart: TitledChart,
  instruments: readonly NamedInstrument[],
  everyInstrumentText: string,
): string {
  const instrumentsText = describeChartInstruments(chart, instruments, everyInstrumentText);
  return chart.label === null
    ? instrumentsText
    : `${instrumentsText}${LABEL_SEPARATOR}${chart.label}`;
}
