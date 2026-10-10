import { z } from 'zod';

export interface GraphRelation {
  readonly source: string;
  readonly relation: string;
  readonly target: string;
  readonly since: string;
  readonly until: string;
  readonly seen: string;
}

export interface GraphNode {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly proximity?: number;
}

export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly relation: string;
  readonly since?: string;
  readonly until?: string;
  readonly seen?: string;
  readonly isClosed: boolean;
}

export interface Graph {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

const APPROXIMATION_MARK_PATTERN = /^~+/;
const YEAR_LENGTH = 4;
const MONTH_LENGTH = 7;
const UNKNOWN_NODE_TYPE = 'inconnu';
const PATH_SEPARATOR = '/';

const TARGET_FIELD = 'cible';
const SINCE_FIELD = 'depuis';
const UNTIL_FIELD = 'jusqua';
const SEEN_FIELD = 'vu';
const PROXIMITY_FIELD = 'proximite';
const HIGHEST_PROXIMITY = 5;
const PROXIMITY_BY_DECLARATION: ReadonlyMap<string | undefined, number> = new Map(
  Array.from({ length: HIGHEST_PROXIMITY }, (_unused, index) => [String(index + 1), index + 1]),
);

const relationLineSchema = z.object({
  source: z.string().min(1),
  relation: z.string().min(1),
  [TARGET_FIELD]: z.string().min(1),
  [SINCE_FIELD]: z.string().default(''),
  [UNTIL_FIELD]: z.string().default(''),
  [SEEN_FIELD]: z.string().default(''),
});

function readJsonLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function readRelation(line: string): GraphRelation | null {
  const relationLine = relationLineSchema.safeParse(readJsonLine(line));
  if (!relationLine.success) return null;
  return {
    source: relationLine.data.source,
    relation: relationLine.data.relation,
    target: relationLine.data[TARGET_FIELD],
    since: relationLine.data[SINCE_FIELD],
    until: relationLine.data[UNTIL_FIELD],
    seen: relationLine.data[SEEN_FIELD],
  };
}

// @FollowsBlueprint core-parse-untrusted
export function parseGraphRelations(jsonLines: string): GraphRelation[] {
  return jsonLines
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map(readRelation)
    .filter((relation) => relation !== null);
}

export function computeLowerBound(date: string): string {
  const bare = date.replace(APPROXIMATION_MARK_PATTERN, '');
  if (bare.length === YEAR_LENGTH) return `${bare}-01-01`;
  if (bare.length === MONTH_LENGTH) return `${bare}-01`;
  return bare;
}

export function computeUpperBound(date: string): string {
  const bare = date.replace(APPROXIMATION_MARK_PATTERN, '');
  if (bare.length === YEAR_LENGTH) return `${bare}-12-31`;
  if (bare.length === MONTH_LENGTH) return `${bare}-31`;
  return bare;
}

export function isRelationTrueOn(relation: GraphRelation, date: string): boolean {
  if (computeLowerBound(relation.since) > date) return false;
  return relation.until === '' || computeUpperBound(relation.until) >= date;
}

export function hasRelationStartedBy(relation: GraphRelation, date: string): boolean {
  return computeLowerBound(relation.since) <= date;
}

export function isRelationClosedOn(relation: GraphRelation, date: string | null): boolean {
  if (relation.until === '') return false;
  return date === null || computeUpperBound(relation.until) < date;
}

export function readProximity(frontMatter: Readonly<Record<string, string>>): number | null {
  return PROXIMITY_BY_DECLARATION.get(frontMatter[PROXIMITY_FIELD]) ?? null;
}

export interface GraphPageSummary {
  readonly path: string;
  readonly title: string;
  readonly type: string;
  readonly frontMatter: Readonly<Record<string, string>>;
}

export function projectPageNode(page: GraphPageSummary): GraphNode {
  const proximity = readProximity(page.frontMatter);
  return {
    id: page.path,
    title: page.title,
    type: page.type,
    ...(proximity === null ? {} : { proximity }),
  };
}

function projectEdge(relation: GraphRelation, date: string | null): GraphEdge {
  return {
    source: relation.source,
    target: relation.target,
    relation: relation.relation,
    ...(relation.since === '' ? {} : { since: relation.since }),
    ...(relation.until === '' ? {} : { until: relation.until }),
    ...(relation.seen === '' ? {} : { seen: relation.seen }),
    isClosed: isRelationClosedOn(relation, date),
  };
}

function buildUnknownNode(id: string): GraphNode {
  return { id, title: id.slice(id.lastIndexOf(PATH_SEPARATOR) + 1), type: UNKNOWN_NODE_TYPE };
}

// @FollowsBlueprint core-projection
export function buildGraph(
  pages: readonly GraphNode[],
  relations: readonly GraphRelation[],
  date: string | null,
): Graph {
  const keptRelations =
    date === null
      ? relations
      : relations.filter((relation) => hasRelationStartedBy(relation, date));
  const knownIds = new Set(pages.map((page) => page.id));
  const endpoints = keptRelations.flatMap((relation) => [relation.source, relation.target]);
  const unknownIds = [...new Set(endpoints)].filter((id) => !knownIds.has(id));
  return {
    nodes: [...pages, ...unknownIds.map(buildUnknownNode)],
    edges: keptRelations.map((relation) => projectEdge(relation, date)),
  };
}
