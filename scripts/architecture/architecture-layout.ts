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

export const NODE_HEIGHT = 46;
const NODE_MIN_WIDTH = 138;
const NODE_MAX_WIDTH = 240;
const CHARACTER_WIDTH = 7.2;
const LABEL_PADDING = 28;

/** The box a node needs, from its label, matched by the renderer's type size. */
export function nodeWidth(label: string): number {
  return Math.max(
    NODE_MIN_WIDTH,
    Math.min(NODE_MAX_WIDTH, label.length * CHARACTER_WIDTH + LABEL_PADDING),
  );
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
  'elk.padding': '[top=28,left=28,bottom=28,right=28]',
};

export async function layoutLevel(level: GraphLevel): Promise<LevelLayout> {
  const nodeIds = new Set(level.nodes.map((node) => node.id));
  const usableEdges = level.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to,
  );

  const elk = new ELK();
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: { ...LAYOUT_OPTIONS },
    children: level.nodes.map((node) => ({
      id: node.id,
      width: nodeWidth(node.label),
      height: NODE_HEIGHT,
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
    height: round(child.height ?? NODE_HEIGHT),
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
