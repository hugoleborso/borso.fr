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

const NODE_BASE_HEIGHT = 38;
export const NODE_LINE_HEIGHT = 14;
const NODE_MIN_WIDTH = 138;
const LABEL_CHARACTER_WIDTH = 9.3;
const LINE_CHARACTER_WIDTH = 6.5;
const LABEL_PADDING = 28;

function textWidth(text: string, characterWidth: number): number {
  return Math.max(NODE_MIN_WIDTH, text.length * characterWidth + LABEL_PADDING);
}

const ICON_WIDTH = 22;
const CHIP_PADDING = 16;
const CHIP_GAP = 6;
export const CHIP_ROW_HEIGHT = 22;
const CHIP_ROW_MAX_WIDTH = 320;

export function chipWidth(text: string): number {
  return ICON_WIDTH + text.length * LINE_CHARACTER_WIDTH + CHIP_PADDING;
}

export function chipRows(chips: readonly { readonly text: string }[]): number[][] {
  const rows: number[][] = [];
  let current: number[] = [];
  let used = 0;
  for (const chip of chips) {
    const width = chipWidth(chip.text);
    if (current.length > 0 && used + CHIP_GAP + width > CHIP_ROW_MAX_WIDTH) {
      rows.push(current);
      current = [];
      used = 0;
    }
    current.push(width);
    used += (current.length > 1 ? CHIP_GAP : 0) + width;
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

function rowWidth(row: readonly number[]): number {
  return row.reduce((total, width) => total + width, 0) + CHIP_GAP * Math.max(0, row.length - 1);
}

function nodeBox(
  label: string,
  hasIcon: boolean,
  lines: readonly string[],
  chips: readonly { readonly text: string }[],
): { width: number; height: number } {
  const rows = chipRows(chips);
  return {
    width: Math.max(
      textWidth(label, LABEL_CHARACTER_WIDTH) + (hasIcon ? ICON_WIDTH : 0),
      ...lines.map((line) => textWidth(line, LINE_CHARACTER_WIDTH)),
      ...rows.map((row) => rowWidth(row) + LABEL_PADDING),
    ),
    height: NODE_BASE_HEIGHT + NODE_LINE_HEIGHT * lines.length + CHIP_ROW_HEIGHT * rows.length,
  };
}

const ONE_DECIMAL_PLACE_SCALE = 10;

function roundToOneDecimal(value: number): number {
  return Math.round(value * ONE_DECIMAL_PLACE_SCALE) / ONE_DECIMAL_PLACE_SCALE;
}

const LAYOUT_OPTIONS: Readonly<Record<string, string>> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'POLYLINE',
  'elk.layered.spacing.nodeNodeBetweenLayers': '104',
  'elk.spacing.nodeNode': '26',
  'elk.spacing.edgeNode': '18',
  'elk.spacing.edgeEdge': '12',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.padding': '[top=28,left=28,bottom=28,right=28]',
};

export async function layoutLevel(level: GraphLevel): Promise<LevelLayout> {
  const nodeIds = new Set(level.nodes.map((node) => node.id));
  const usableEdges = level.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to,
  );

  const nodesOrderedByKindThenLabel = [...level.nodes].sort((left, right) => {
    const byKind = left.kind.localeCompare(right.kind);
    return byKind === 0 ? left.label.localeCompare(right.label) : byKind;
  });

  const elk = new ELK();
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: { ...LAYOUT_OPTIONS },
    children: nodesOrderedByKindThenLabel.map((node) => ({
      id: node.id,
      ...nodeBox(node.label, node.icon !== undefined, node.lines ?? [], node.chips ?? []),
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
    x: roundToOneDecimal(child.x ?? 0),
    y: roundToOneDecimal(child.y ?? 0),
    width: roundToOneDecimal(child.width ?? NODE_MIN_WIDTH),
    height: roundToOneDecimal(child.height ?? NODE_BASE_HEIGHT),
  }));

  const edges: RoutedEdge[] = (laidOut.edges ?? []).map((routed, index) => {
    const source = usableEdges[index];
    const section = routed.sections?.[0];
    const points =
      section === undefined
        ? []
        : [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((point) => ({
            x: roundToOneDecimal(point.x),
            y: roundToOneDecimal(point.y),
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
    width: roundToOneDecimal(laidOut.width ?? 0),
    height: roundToOneDecimal(laidOut.height ?? 0),
  };
}
