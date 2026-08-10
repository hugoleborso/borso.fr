/**
 * Tiny extractor: API songs ship the chord-chart variant under the
 * `chart` field; the catalog grid only needs the `kind` discriminant.
 * Extracting this resolves the round-5 regression where the page read
 * `chordChart?.kind` and every card therefore showed "no chart"
 * regardless of the actual chart attached.
 *
 * Pure, total — `null`/`undefined`/`{}` chart inputs collapse to
 * `null` so the rendering layer can switch on a single tag.
 */

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

/**
 * The ChordPro source to render, or `null` when the song carries a chart of
 * another kind or none at all. One reading replaces the three-way conjunction
 * the detail page used to spell out, and it narrows the text for the viewer.
 */
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
