/**
 * Tiny extractor: API songs ship the chord-chart variant under the
 * `chart` field; the catalog grid only needs the `kind` discriminant.
 * Extracting this resolves the round-5 regression where the page read
 * `chordChart?.kind` and every card therefore showed "pas d'accord"
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

export function extractChartKind(
  chart: ChartLike | null | undefined,
): ChartKindTag {
  if (chart === null || chart === undefined) return null;
  const candidate = chart.kind;
  for (const known of CHART_KINDS) {
    if (candidate === known) return known;
  }
  return null;
}
