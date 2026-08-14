/**
 * Lays out one diagram level with ELK, at generation time.
 *
 * The page used to lay itself out in the browser, with a bezier straight from
 * each source to each target, and 72 of the component level's 125 edges ran
 * through the box of a node they do not connect. Keeping edges out of boxes
 * means inserting a dummy node per rank an edge crosses and routing it through
 * the reserved lane, which is the expensive half of the Sugiyama pipeline and
 * the reason layout engines exist.
 *
 * ELK does it and reaches zero such crossings. Running it here rather than in
 * the page means the reader downloads coordinates instead of a 1.6 MB engine,
 * and the emitted HTML stays byte-identical between runs, which the `--check`
 * gate requires. See ADR-0011.
 */

import ELK, { type ElkNode } from 'elkjs';
import type { GraphLevel } from './architecture-graph';

export interface PlacedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RoutedEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: string;
  readonly label: string;
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

export interface LevelLayout {
  readonly nodes: readonly PlacedNode[];
  readonly edges: readonly RoutedEdge[];
  readonly width: number;
  readonly height: number;
}

/** The box a node with a name and nothing under it needs. */
const NODE_BASE_HEIGHT = 34;
/** Added per line printed under the name, matching the renderer's row pitch. */
export const NODE_LINE_HEIGHT = 14;
const NODE_MIN_WIDTH = 138;
// Measured in the page with `getComputedTextLength`: 7.513 px per character for
// the name and 6.315 for the lines under it. The estimate carries headroom
// because the box is sized here and the text is measured by whichever monospace
// face the reader's machine resolves.
const LABEL_CHARACTER_WIDTH = 7.7;
const LINE_CHARACTER_WIDTH = 6.5;
const LABEL_PADDING = 28;

/**
 * The box a piece of text needs, matched by the renderer's type size.
 *
 * There is no ceiling. A capped width clips whatever runs past it, silently and
 * only in the page, which is how a route as long as
 * `DELETE /api/mastery/defaults/:memberId/:instrumentId` came to sit outside its
 * own block. A box wide enough for its content is visible; a clipped one is not.
 */
function textWidth(text: string, characterWidth: number): number {
  return Math.max(NODE_MIN_WIDTH, text.length * characterWidth + LABEL_PADDING);
}

/**
 * A block prints its name and then a line per fact about it, so the box is as
 * wide as the widest of them and as tall as their count. Sizing on the name
 * alone is what let a blueprint name run past the edge.
 */
function nodeBox(label: string, lines: readonly string[]): { width: number; height: number } {
  return {
    width: Math.max(
      textWidth(label, LABEL_CHARACTER_WIDTH),
      ...lines.map((line) => textWidth(line, LINE_CHARACTER_WIDTH)),
    ),
    height: NODE_BASE_HEIGHT + NODE_LINE_HEIGHT * lines.length,
  };
}

/**
 * Coordinates are rounded before they reach the page. ELK returns fractions,
 * and a committed file that carries fifteen decimal places is noise in every
 * diff for a difference no reader can see.
 */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

const LAYOUT_OPTIONS: Readonly<Record<string, string>> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  // POLYLINE routes around obstacles and returns few points, which keeps the
  // committed payload small. SPLINES reaches the same zero crossings but emits
  // roughly three times the points for a curve the reader cannot tell apart.
  'elk.edgeRouting': 'POLYLINE',
  'elk.layered.spacing.nodeNodeBetweenLayers': '104',
  'elk.spacing.nodeNode': '26',
  'elk.spacing.edgeNode': '18',
  'elk.spacing.edgeEdge': '12',
  // Measured on the component level, all four placement strategies reach zero
  // crossings, so the choice is area: SIMPLE gives 2926x709 against
  // BRANDES_KOEPF's 3007x1087, and the shorter canvas fits the stage without
  // scrolling vertically as well as sideways.
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.padding': '[top=28,left=28,bottom=28,right=28]',
};

export async function layoutLevel(level: GraphLevel): Promise<LevelLayout> {
  const nodeIds = new Set(level.nodes.map((node) => node.id));
  const usableEdges = level.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to,
  );

  // Model order is a tiebreaker once crossings are minimised, so sorting the
  // input by kind pulls blocks of one kind together inside a column: the
  // external systems land beside each other instead of interleaved with the
  // browser APIs they happen to share a rank with.
  const orderedNodes = [...level.nodes].sort((left, right) => {
    const byKind = left.kind.localeCompare(right.kind);
    return byKind === 0 ? left.label.localeCompare(right.label) : byKind;
  });

  const elk = new ELK();
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: { ...LAYOUT_OPTIONS },
    children: orderedNodes.map((node) => ({
      id: node.id,
      ...nodeBox(node.label, node.lines ?? []),
    })),
    edges: usableEdges.map((edge, index) => ({
      id: `edge-${index}`,
      sources: [edge.from],
      targets: [edge.to],
    })),
  };

  const laidOut = await elk.layout(graph);

  const nodes: PlacedNode[] = (laidOut.children ?? []).map((child) => ({
    id: child.id,
    x: round(child.x ?? 0),
    y: round(child.y ?? 0),
    width: round(child.width ?? NODE_MIN_WIDTH),
    height: round(child.height ?? NODE_BASE_HEIGHT),
  }));

  const edges: RoutedEdge[] = (laidOut.edges ?? []).map((routed, index) => {
    const source = usableEdges[index];
    const section = routed.sections?.[0];
    const points =
      section === undefined
        ? []
        : [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((point) => ({
            x: round(point.x),
            y: round(point.y),
          }));
    return {
      from: source?.from ?? '',
      to: source?.to ?? '',
      kind: source?.kind ?? 'import',
      label: source?.label ?? '',
      points,
    };
  });

  return {
    nodes,
    edges,
    width: round(laidOut.width ?? 0),
    height: round(laidOut.height ?? 0),
  };
}
