import { hasRelationStartedBy, isRelationClosedOn } from '@domain/graph.core';
import { readSlugTail } from './memory-text.core';

export interface GraphPage {
  readonly slug: string;
  readonly title: string;
  readonly kind: string;
  readonly closeness: number | null;
}

export interface StoredRelation {
  readonly id: string;
  readonly fromSlug: string;
  readonly verb: string;
  readonly toSlug: string;
  readonly since: string | null;
  readonly until: string | null;
  readonly seen: string | null;
  readonly sourceRef: string | null;
}

export interface NeighbourEdge {
  readonly id: string;
  readonly from: string;
  readonly verb: string;
  readonly to: string;
  readonly since: string | null;
  readonly until: string | null;
  readonly seen: string | null;
  readonly sourceRef: string | null;
  readonly isClosed: boolean;
}

export interface Neighbourhood {
  readonly nodes: GraphPage[];
  readonly edges: NeighbourEdge[];
}

export interface PathStep {
  readonly slug: string;
  readonly via: { readonly verb: string; readonly direction: 'out' | 'in' } | null;
}

const UNKNOWN_KIND = 'inconnu';

function toGraphRelation(relation: StoredRelation) {
  return {
    source: relation.fromSlug,
    relation: relation.verb,
    target: relation.toSlug,
    since: relation.since ?? '',
    until: relation.until ?? '',
    seen: relation.seen ?? '',
  };
}

export function selectRelationsBegunBy(
  relations: readonly StoredRelation[],
  date: string | null,
): StoredRelation[] {
  if (date === null) return [...relations];
  return relations.filter((relation) => hasRelationStartedBy(toGraphRelation(relation), date));
}

function projectNode(slug: string, pages: ReadonlyMap<string, GraphPage>): GraphPage {
  return (
    pages.get(slug) ?? { slug, title: readSlugTail(slug), kind: UNKNOWN_KIND, closeness: null }
  );
}

// @FollowsBlueprint core-projection
export function buildNeighbourhood(
  pages: readonly GraphPage[],
  relations: readonly StoredRelation[],
  origin: string,
  date: string | null,
  depth: number,
): Neighbourhood {
  const pagesBySlug = new Map(pages.map((page) => [page.slug, page]));
  const kept = selectRelationsBegunBy(relations, date);
  const reached = new Set([origin]);
  const edges = new Map<string, StoredRelation>();
  let frontier = [origin];
  for (let level = 0; level < depth; level += 1) {
    const next: string[] = [];
    for (const relation of kept) {
      const isFromFrontier = frontier.includes(relation.fromSlug);
      const isToFrontier = frontier.includes(relation.toSlug);
      if (!isFromFrontier && !isToFrontier) continue;
      edges.set(relation.id, relation);
      for (const slug of [relation.fromSlug, relation.toSlug]) {
        if (!reached.has(slug)) {
          reached.add(slug);
          next.push(slug);
        }
      }
    }
    frontier = next;
  }
  return {
    nodes: [...reached].map((slug) => projectNode(slug, pagesBySlug)),
    edges: [...edges.values()].map((relation) => ({
      id: relation.id,
      from: relation.fromSlug,
      verb: relation.verb,
      to: relation.toSlug,
      since: relation.since,
      until: relation.until,
      seen: relation.seen,
      sourceRef: relation.sourceRef,
      isClosed: isRelationClosedOn(toGraphRelation(relation), date),
    })),
  };
}

export function findShortestPath(
  relations: readonly StoredRelation[],
  from: string,
  target: string,
  date: string | null,
): PathStep[] | null {
  const kept = selectRelationsBegunBy(relations, date);
  const previous = new Map<string, PathStep & { readonly parent: string | null }>([
    [from, { slug: from, via: null, parent: null }],
  ]);
  let frontier = [from];
  while (frontier.length > 0 && !previous.has(target)) {
    const next: string[] = [];
    for (const slug of frontier) {
      for (const relation of kept) {
        const hops = [
          { from: relation.fromSlug, to: relation.toSlug, direction: 'out' as const },
          { from: relation.toSlug, to: relation.fromSlug, direction: 'in' as const },
        ];
        for (const hop of hops) {
          if (hop.from !== slug || previous.has(hop.to)) continue;
          previous.set(hop.to, {
            slug: hop.to,
            via: { verb: relation.verb, direction: hop.direction },
            parent: slug,
          });
          next.push(hop.to);
        }
      }
    }
    frontier = next;
  }
  const path: PathStep[] = [];
  let cursor = previous.get(target);
  if (cursor === undefined) return null;
  while (cursor !== undefined) {
    path.unshift({ slug: cursor.slug, via: cursor.via });
    cursor = cursor.parent === null ? undefined : previous.get(cursor.parent);
  }
  return path;
}
