import type ForceGraph from 'force-graph';
import {
  computeRadialPull,
  isConfigurableChargeForce,
  isConfigurableLinkForce,
  RECENCY_MODE,
  type RenderableLink,
  type RenderableNode,
  toRenderableGraph,
} from '../components/organisms/graph-layout.core';
import {
  collectPositions,
  type Point,
  seedPositions,
  selectSimulationPlan,
} from '../components/organisms/graph-simulation.core';

export interface GraphNode extends RenderableNode {
  x?: number;
  y?: number;
  fx?: number | undefined;
  fy?: number | undefined;
  isHeldInPlace?: boolean;
  vx?: number;
  vy?: number;
}

export interface GraphLink extends Omit<RenderableLink, 'source' | 'target'> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export type GraphInstance = ForceGraph<GraphNode, GraphLink>;

export type RadialForce = ((alpha: number) => void) & {
  initialize: (nodes: GraphNode[]) => void;
};

export interface ForceHost {
  d3Force(name: string, force?: RadialForce | null): unknown;
}

export interface LayoutHost {
  graphData(): { nodes: GraphNode[] };
  graphData(data: { nodes: GraphNode[]; links: GraphLink[] }): unknown;
  d3AlphaDecay(alphaDecay: number): unknown;
  warmupTicks(ticks: number): unknown;
  cooldownTicks(ticks: number): unknown;
}

const RADIAL_STRENGTH = 0.3;
const CHARGE_STRENGTH = -70;

// @FollowsBlueprint injected-storage-slice
export function buildRadialForce(): RadialForce {
  let graphNodes: GraphNode[] = [];
  const pullTowardsCircles = (alpha: number): void => {
    for (const graphNode of graphNodes) {
      const pull = computeRadialPull(
        { x: graphNode.x ?? 0, y: graphNode.y ?? 0 },
        graphNode.targetRadius,
        RADIAL_STRENGTH,
        alpha,
      );
      graphNode.vx = (graphNode.vx ?? 0) + pull.vx;
      graphNode.vy = (graphNode.vy ?? 0) + pull.vy;
    }
  };
  return Object.assign(pullTowardsCircles, {
    initialize: (initialNodes: GraphNode[]) => {
      graphNodes = initialNodes;
    },
  });
}

function configureLinkForce(host: ForceHost): void {
  const linkForce = host.d3Force('link');
  if (!isConfigurableLinkForce<GraphLink>(linkForce)) return;
  linkForce.distance((link) => link.distance);
  linkForce.strength((link) => link.strength);
}

function configureChargeForce(host: ForceHost): void {
  const chargeForce = host.d3Force('charge');
  if (!isConfigurableChargeForce(chargeForce)) return;
  chargeForce.strength(CHARGE_STRENGTH);
}

export function arrangeAroundOwner(host: ForceHost): void {
  configureLinkForce(host);
  configureChargeForce(host);
  host.d3Force('center', null);
  host.d3Force('radial', buildRadialForce());
}

const rememberedPositions = new Map<string, Point>();

export function rememberPositions(nodes: readonly GraphNode[]): void {
  for (const [id, point] of collectPositions(nodes)) rememberedPositions.set(id, point);
}

export function forgetPositions(): void {
  rememberedPositions.clear();
}

export function releaseHeldNodes(nodes: readonly GraphNode[]): void {
  for (const heldNode of nodes.filter((graphNode) => graphNode.isHeldInPlace === true)) {
    heldNode.fx = undefined;
    heldNode.fy = undefined;
    heldNode.isHeldInPlace = false;
  }
}

export function relayout(
  host: LayoutHost,
  graph: Parameters<typeof toRenderableGraph>[0],
  date: string,
  hasFramed: boolean,
): number | null {
  rememberPositions(host.graphData().nodes);
  const plan = selectSimulationPlan(rememberedPositions.size === 0, !hasFramed);
  host.d3AlphaDecay(plan.alphaDecay);
  host.warmupTicks(plan.warmupTicks);
  host.cooldownTicks(plan.cooldownTicks);
  host.graphData(seedPositions(toRenderableGraph(graph, date, RECENCY_MODE), rememberedPositions));
  return plan.fitDurationMs;
}
