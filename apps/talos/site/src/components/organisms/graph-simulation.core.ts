import type { RenderableLink, RenderableNode } from './graph-layout.core';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface SimulationPlan {
  readonly warmupTicks: number;
  readonly cooldownTicks: number;
  readonly alphaDecay: number;
  readonly fitDurationMs: number | null;
}

const SETTLED_WARMUP_TICKS = 80;
const SETTLED_ALPHA_DECAY = 0.1;
const ANIMATED_COOLDOWN_TICKS = 200;
const ANIMATED_ALPHA_DECAY = 0.0228;
const FIRST_FIT_DURATION_MS = 400;
const NEW_NODE_OFFSET = 18;
const GOLDEN_ANGLE = 2.399_963_229_728_653;

// @FollowsBlueprint core-view-projection
export function selectSimulationPlan(isFirstLayout: boolean, isNewMount: boolean): SimulationPlan {
  if (isFirstLayout) {
    return {
      warmupTicks: 0,
      cooldownTicks: ANIMATED_COOLDOWN_TICKS,
      alphaDecay: ANIMATED_ALPHA_DECAY,
      fitDurationMs: FIRST_FIT_DURATION_MS,
    };
  }
  return {
    warmupTicks: SETTLED_WARMUP_TICKS,
    cooldownTicks: 0,
    alphaDecay: SETTLED_ALPHA_DECAY,
    fitDurationMs: isNewMount ? 0 : null,
  };
}

function averagePoint(points: readonly Point[]): Point | null {
  if (points.length === 0) return null;
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
    x: 0,
    y: 0,
  });
  return { x: total.x / points.length, y: total.y / points.length };
}

function listNeighbourPoints(
  nodeId: string,
  links: readonly RenderableLink[],
  known: ReadonlyMap<string, Point>,
): Point[] {
  return [
    ...links.filter((link) => link.source === nodeId).map((link) => link.target),
    ...links.filter((link) => link.target === nodeId).map((link) => link.source),
  ]
    .map((neighbourId) => known.get(neighbourId))
    .filter((point) => point !== undefined);
}

function placeNewNode(
  node: RenderableNode,
  index: number,
  links: readonly RenderableLink[],
  known: ReadonlyMap<string, Point>,
): Point {
  const angle = index * GOLDEN_ANGLE;
  const anchor = averagePoint(listNeighbourPoints(node.id, links, known));
  if (anchor === null) {
    return { x: Math.cos(angle) * node.targetRadius, y: Math.sin(angle) * node.targetRadius };
  }
  return {
    x: anchor.x + Math.cos(angle) * NEW_NODE_OFFSET,
    y: anchor.y + Math.sin(angle) * NEW_NODE_OFFSET,
  };
}

export interface SeededNode extends RenderableNode, Point {
  readonly isHeldInPlace: boolean;
}

function seedNode(
  node: RenderableNode,
  index: number,
  links: readonly RenderableLink[],
  known: ReadonlyMap<string, Point>,
): SeededNode {
  const kept = known.get(node.id);
  if (kept === undefined) {
    return { ...node, ...placeNewNode(node, index, links, known), isHeldInPlace: false };
  }
  return { fx: kept.x, fy: kept.y, ...node, ...kept, isHeldInPlace: node.fx === undefined };
}

export function seedPositions(
  graph: { readonly nodes: readonly RenderableNode[]; readonly links: readonly RenderableLink[] },
  known: ReadonlyMap<string, Point>,
): { nodes: SeededNode[]; links: RenderableLink[] } {
  return {
    nodes: graph.nodes.map((node, index) => seedNode(node, index, graph.links, known)),
    links: [...graph.links],
  };
}

export function collectPositions(
  nodes: readonly {
    readonly id: string;
    readonly x?: number | undefined;
    readonly y?: number | undefined;
  }[],
): [string, Point][] {
  return nodes.flatMap(({ id, x, y }) =>
    x === undefined || y === undefined ? [] : [[id, { x, y }] satisfies [string, Point]],
  );
}
