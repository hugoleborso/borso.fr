import type { ParseKeys } from 'i18next';

export interface GraphNodeShape {
  readonly id: string;
  readonly title: string;
  readonly type: string;
}

export interface GraphEdgeShape {
  readonly source: string;
  readonly target: string;
  readonly relation: string;
}

export interface GraphShape<Node extends GraphNodeShape, Edge extends GraphEdgeShape> {
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
}

export const NEIGHBOURHOOD_HOP_LIMIT = 2;
const FIRST_TIMELINE_MONTH = '2017-01';
const TWO_DIGITS = 2;
const MONTHS_PER_YEAR = 12;
const YEAR_END = 4;
const MONTH_START = 5;
const MONTH_END = 7;

export type NodeColorToken =
  | 'node-person'
  | 'node-organization'
  | 'node-project'
  | 'node-domain'
  | 'node-concept'
  | 'node-commitment'
  | 'node-objective'
  | 'node-meeting'
  | 'ink-faint';

const NODE_COLOR_TOKEN_BY_TYPE: Readonly<Record<string, NodeColorToken>> = {
  moi: 'node-person',
  personne: 'node-person',
  organisation: 'node-organization',
  projet: 'node-project',
  domaine: 'node-domain',
  concept: 'node-concept',
  engagement: 'node-commitment',
  objectifs: 'node-objective',
  reunion: 'node-meeting',
};

// @FollowsBlueprint core-view-projection
export function selectNodeColorToken(type: string): NodeColorToken {
  return NODE_COLOR_TOKEN_BY_TYPE[type] ?? 'ink-faint';
}

export function selectNodeColorVariable(type: string): string {
  return `--color-${selectNodeColorToken(type)}`;
}

const NODE_TYPE_LABEL_KEY: Readonly<Record<string, ParseKeys>> = {
  moi: 'graph.type.moi',
  personne: 'graph.type.person',
  organisation: 'graph.type.organisation',
  projet: 'graph.type.project',
  domaine: 'graph.type.domain',
  concept: 'graph.type.concept',
  engagement: 'graph.type.commitment',
  objectifs: 'graph.type.objectives',
  carte: 'graph.type.map',
  reunion: 'graph.type.meeting',
};

export function selectNodeTypeLabelKey(type: string): ParseKeys {
  return NODE_TYPE_LABEL_KEY[type] ?? 'graph.type.other';
}

export interface NodeTypeCount {
  readonly type: string;
  readonly count: number;
}

export function countNodeTypes(nodes: readonly GraphNodeShape[]): NodeTypeCount[] {
  const countByType = new Map<string, number>();
  for (const node of nodes) countByType.set(node.type, (countByType.get(node.type) ?? 0) + 1);
  return [...countByType.entries()]
    .map(([type, count]) => ({ type, count }))
    .toSorted((left, right) => right.count - left.count || left.type.localeCompare(right.type));
}

export function hideNodeTypes<Node extends GraphNodeShape, Edge extends GraphEdgeShape>(
  graph: GraphShape<Node, Edge>,
  hiddenTypes: ReadonlySet<string>,
): GraphShape<Node, Edge> {
  const shownNodes = graph.nodes.filter((node) => !hiddenTypes.has(node.type));
  const shownIds = new Set(shownNodes.map((node) => node.id));
  return {
    nodes: shownNodes,
    edges: graph.edges.filter((edge) => shownIds.has(edge.source) && shownIds.has(edge.target)),
  };
}

export function toggleHiddenType(hiddenTypes: ReadonlySet<string>, type: string): Set<string> {
  const toggled = new Set(hiddenTypes);
  if (toggled.has(type)) toggled.delete(type);
  else toggled.add(type);
  return toggled;
}

export function isLatestTimelineIndex(timeline: readonly string[], index: number): boolean {
  return index >= timeline.length - 1;
}

function listNeighbourIds(
  edges: readonly GraphEdgeShape[],
  reached: ReadonlySet<string>,
): string[] {
  return [
    ...edges.filter((edge) => reached.has(edge.source)).map((edge) => edge.target),
    ...edges.filter((edge) => reached.has(edge.target)).map((edge) => edge.source),
  ];
}

function collectReachableIds(
  edges: readonly GraphEdgeShape[],
  focusId: string,
  hopLimit: number,
): Set<string> {
  const reached = new Set([focusId]);
  for (let hop = 0; hop < hopLimit; hop += 1) {
    for (const neighbourId of listNeighbourIds(edges, reached)) reached.add(neighbourId);
  }
  return reached;
}

export function selectNeighbourhood<Node extends GraphNodeShape, Edge extends GraphEdgeShape>(
  graph: GraphShape<Node, Edge>,
  focusId: string | null,
  hopLimit: number,
): GraphShape<Node, Edge> {
  if (focusId === null) return graph;
  const reached = collectReachableIds(graph.edges, focusId, hopLimit);
  return {
    nodes: graph.nodes.filter((node) => reached.has(node.id)),
    edges: graph.edges.filter((edge) => reached.has(edge.source) && reached.has(edge.target)),
  };
}

function padTwoDigits(value: number): string {
  return String(value).padStart(TWO_DIGITS, '0');
}

function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${padTwoDigits(month)}-${padTwoDigits(day)}`;
}

export function buildMonthlyTimeline(today: string): string[] {
  const [firstYear, firstMonth] = FIRST_TIMELINE_MONTH.split('-').map(Number);
  const todayYear = Number(today.slice(0, YEAR_END));
  const todayMonth = Number(today.slice(MONTH_START, MONTH_END));
  const monthCount =
    (todayYear - Number(firstYear)) * MONTHS_PER_YEAR + (todayMonth - Number(firstMonth));
  const pastMonths = Array.from({ length: monthCount }, (_unused, offset) => {
    const monthIndex = Number(firstMonth) - 1 + offset;
    return lastDayOfMonth(
      Number(firstYear) + Math.floor(monthIndex / MONTHS_PER_YEAR),
      (monthIndex % MONTHS_PER_YEAR) + 1,
    );
  });
  return [...pastMonths, today];
}

export function selectTimelineDate(timeline: readonly string[], index: number): string {
  const clampedIndex = Math.min(Math.max(index, 0), timeline.length - 1);
  return String(timeline.slice(clampedIndex, clampedIndex + 1));
}

export function findNodeTitle(
  nodes: readonly GraphNodeShape[],
  nodeId: string | null,
): string | null {
  return nodes.find((node) => node.id === nodeId)?.title ?? null;
}

const LABELLED_NODE_LIMIT = 40;
const LABEL_ZOOM_THRESHOLD = 2;

export function shouldDrawLabels(nodeCount: number, zoomScale: number): boolean {
  return nodeCount <= LABELLED_NODE_LIMIT || zoomScale >= LABEL_ZOOM_THRESHOLD;
}

export type NodeClickIntent = 'focus' | 'open';

export function selectNodeClickIntent(
  focusedId: string | null,
  clickedId: string,
): NodeClickIntent {
  return focusedId === clickedId ? 'open' : 'focus';
}
