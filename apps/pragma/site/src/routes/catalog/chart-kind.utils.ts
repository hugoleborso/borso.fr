/** @Feature songs */

export type ChartKindTag = 'chordpro' | 'pdf' | 'image' | null;

const CHART_KINDS = ['chordpro', 'pdf', 'image'] as const;

interface ChartLike {
  readonly kind?: unknown;
}

interface ChordProChartLike extends ChartLike {
  readonly text?: unknown;
}

function isChordProChart(chart: ChordProChartLike | null | undefined): chart is ChordProChartLike {
  return extractChartKind(chart) === 'chordpro';
}

export function selectChordProText(chart: ChordProChartLike | null | undefined): string | null {
  if (!isChordProChart(chart)) return null;
  const { text } = chart;
  if (typeof text !== 'string') return null;
  return text;
}

// @FollowsBlueprint core-lookup-table
export function extractChartKind(chart: ChartLike | null | undefined): ChartKindTag {
  if (chart === null || chart === undefined) return null;
  const candidate = chart.kind;
  for (const known of CHART_KINDS) {
    if (candidate === known) return known;
  }
  return null;
}
