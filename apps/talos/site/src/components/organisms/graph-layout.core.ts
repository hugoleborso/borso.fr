import { computeUpperBound } from '@domain/graph.core';
import { selectNodeColorVariable } from './knowledge-graph.core';

export type RelationTie = 'family' | 'friendship' | 'work' | 'other';

export type RecencyMode = 'ignored' | 'half-life';

export const RECENCY_MODE: RecencyMode = 'ignored';

const OWNER_NODE_TYPE = 'moi';
const OWNER_RADIUS = 0;
const UNSCORED_PROXIMITY = 2;
const UNSCORED_RADIUS = 215;
const RADIUS_BY_PROXIMITY: Readonly<Record<number, number>> = {
  5: 80,
  4: 130,
  3: 175,
  2: 215,
  1: 250,
};

const TIES_WITH_RELATIONS = ['family', 'friendship', 'work'] as const;

const RELATIONS_BY_TIE: Readonly<Record<(typeof TIES_WITH_RELATIONS)[number], readonly string[]>> =
  {
    family: ['en_couple_avec', 'parent_de', 'frere_soeur_de', 'cousin_de', 'parrain_de'],
    friendship: ['ami_de', 'colocataire_de', 'cofondateur_potentiel'],
    work: [
      'travaille_chez',
      'travaille_sur',
      'responsable_de',
      'rend_compte_a',
      'client',
      'recrute_pour',
      'en_discussion_avec',
      'membre_de',
      'participe_a',
      'comprend',
      'filiale_de',
      'a_presente',
    ],
  };

const TIE_BY_RELATION: ReadonlyMap<string, RelationTie> = new Map(
  TIES_WITH_RELATIONS.flatMap((tie) =>
    RELATIONS_BY_TIE[tie].map((relation) => [relation, tie] as const),
  ),
);

const DISTANCE_BY_TIE: Readonly<Record<RelationTie, number>> = {
  family: 60,
  friendship: 80,
  work: 130,
  other: 100,
};

const STRENGTH_BY_TIE: Readonly<Record<RelationTie, number>> = {
  family: 0.8,
  friendship: 0.5,
  work: 0.12,
  other: 0.2,
};

const CLOSED_DISTANCE_FACTOR = 1.5;
const CLOSED_STRENGTH_FACTOR = 0.25;
const RECENCY_HALF_LIFE_DAYS = 182;
const HALF = 0.5;
const RECENCY_FLOOR = 0.1;
const MILLISECONDS_PER_DAY = 86_400_000;
const MINIMUM_DISTANCE = 1e-6;

export interface LayoutNodeShape {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly proximity?: number | undefined;
}

export interface LayoutEdgeShape {
  readonly source: string;
  readonly target: string;
  readonly relation: string;
  readonly isClosed: boolean;
  readonly seen?: string | undefined;
}

export interface RenderableNode {
  readonly id: string;
  readonly title: string;
  readonly colorVariable: string;
  readonly targetRadius: number;
  readonly fx?: number;
  readonly fy?: number;
}

export interface RenderableLink {
  readonly source: string;
  readonly target: string;
  readonly distance: number;
  readonly strength: number;
  readonly isClosed: boolean;
}

export interface Velocity {
  readonly vx: number;
  readonly vy: number;
}

// @FollowsBlueprint core-view-projection
export function selectRelationTie(relation: string): RelationTie {
  return TIE_BY_RELATION.get(relation) ?? 'other';
}

export function selectTargetRadius(type: string, proximity: number | undefined): number {
  if (type === OWNER_NODE_TYPE) return OWNER_RADIUS;
  return RADIUS_BY_PROXIMITY[proximity ?? UNSCORED_PROXIMITY] ?? UNSCORED_RADIUS;
}

export function selectLinkDistance(relation: string, isClosed: boolean): number {
  const distance = DISTANCE_BY_TIE[selectRelationTie(relation)];
  return isClosed ? distance * CLOSED_DISTANCE_FACTOR : distance;
}

function computeAgeInDays(seen: string, date: string): number {
  return (Date.parse(date) - Date.parse(computeUpperBound(seen))) / MILLISECONDS_PER_DAY;
}

export function computeRecencyWeight(seen: string | undefined, date: string): number {
  if (seen === undefined) return RECENCY_FLOOR;
  const age = computeAgeInDays(seen, date);
  if (Number.isNaN(age)) return RECENCY_FLOOR;
  const decay = HALF ** (Math.max(age, 0) / RECENCY_HALF_LIFE_DAYS);
  return Math.max(decay, RECENCY_FLOOR);
}

export function selectLinkStrength(
  edge: LayoutEdgeShape,
  date: string,
  recencyMode: RecencyMode,
): number {
  const tieStrength = STRENGTH_BY_TIE[selectRelationTie(edge.relation)];
  const strength = edge.isClosed ? tieStrength * CLOSED_STRENGTH_FACTOR : tieStrength;
  return recencyMode === 'half-life' ? strength * computeRecencyWeight(edge.seen, date) : strength;
}

function toRenderableNode(node: LayoutNodeShape): RenderableNode {
  const base = {
    id: node.id,
    title: node.title,
    colorVariable: selectNodeColorVariable(node.type),
    targetRadius: selectTargetRadius(node.type, node.proximity),
  };
  return node.type === OWNER_NODE_TYPE ? { ...base, fx: 0, fy: 0 } : base;
}

export function toRenderableGraph(
  graph: { readonly nodes: readonly LayoutNodeShape[]; readonly edges: readonly LayoutEdgeShape[] },
  date: string,
  recencyMode: RecencyMode,
): { nodes: RenderableNode[]; links: RenderableLink[] } {
  return {
    nodes: graph.nodes.map(toRenderableNode),
    links: graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      distance: selectLinkDistance(edge.relation, edge.isClosed),
      strength: selectLinkStrength(edge, date, recencyMode),
      isClosed: edge.isClosed,
    })),
  };
}

export function computeRadialPull(
  position: { readonly x: number; readonly y: number },
  targetRadius: number,
  strength: number,
  alpha: number,
): Velocity {
  const radius = Math.hypot(position.x, position.y) || MINIMUM_DISTANCE;
  const factor = ((targetRadius - radius) * strength * alpha) / radius;
  return { vx: position.x * factor, vy: position.y * factor };
}

export function selectLinkColorVariable(isClosed: boolean): string {
  return isClosed ? '--color-line' : '--color-line-strong';
}

export interface ConfigurableLinkForce<Link> {
  distance: (accessor: (link: Link) => number) => unknown;
  strength: (accessor: (link: Link) => number) => unknown;
}

export function isConfigurableLinkForce<Link>(
  force: unknown,
): force is ConfigurableLinkForce<Link> {
  return (
    typeof force === 'function' &&
    'distance' in force &&
    typeof force.distance === 'function' &&
    'strength' in force &&
    typeof force.strength === 'function'
  );
}

export interface ConfigurableChargeForce {
  strength: (strength: number) => unknown;
}

export function isConfigurableChargeForce(force: unknown): force is ConfigurableChargeForce {
  return typeof force === 'function' && 'strength' in force && typeof force.strength === 'function';
}

const DEFAULT_ZOOM = 1;
const HALVES = 2;

export function computeCentredZoom(
  positions: readonly { readonly x?: number | undefined; readonly y?: number | undefined }[],
  viewport: { readonly width: number; readonly height: number },
  padding: number,
): number {
  const outermost = Math.max(0, ...positions.map(({ x, y }) => Math.hypot(x ?? 0, y ?? 0)));
  if (outermost === 0) return DEFAULT_ZOOM;
  return (Math.min(viewport.width, viewport.height) / HALVES - padding) / outermost;
}
