import { buildGraph, type Graph, type GraphNode, type GraphRelation } from '@domain/graph.core';
import { readPageTitle } from '@domain/markdown-page.core';

export interface StoredGraphSource {
  readonly entities: readonly {
    readonly slug: string;
    readonly title: string;
    readonly kind: string;
    readonly closeness: number | null;
    readonly archived: boolean;
  }[];
  readonly commitments: readonly {
    readonly slug: string;
    readonly action: string | null;
    readonly body: string;
  }[];
  readonly relations: readonly {
    readonly fromSlug: string;
    readonly verb: string;
    readonly toSlug: string;
    readonly since: string | null;
    readonly until: string | null;
    readonly seen: string | null;
  }[];
}

const COMMITMENT_TYPE = 'engagement';
const LOWEST_PROXIMITY = 1;
const HIGHEST_PROXIMITY = 5;
const PATH_SEPARATOR = '/';

function isValidProximity(closeness: number | null): closeness is number {
  return (
    closeness !== null &&
    Number.isInteger(closeness) &&
    closeness >= LOWEST_PROXIMITY &&
    closeness <= HIGHEST_PROXIMITY
  );
}

function readSlugTail(slug: string): string {
  return slug.slice(slug.lastIndexOf(PATH_SEPARATOR) + 1);
}

// @FollowsBlueprint core-projection
export function projectStoredGraph(source: StoredGraphSource, date: string | null): Graph {
  const entityNodes = source.entities
    .filter((entity) => !entity.archived)
    .map((entity): GraphNode => ({
      id: entity.slug,
      title: entity.title,
      type: entity.kind,
      ...(isValidProximity(entity.closeness) ? { proximity: entity.closeness } : {}),
    }));
  const commitmentNodes = source.commitments.map((commitment): GraphNode => ({
    id: commitment.slug,
    title: readPageTitle(commitment.body, commitment.action ?? readSlugTail(commitment.slug)),
    type: COMMITMENT_TYPE,
  }));
  const relations = source.relations.map((relation): GraphRelation => ({
    source: relation.fromSlug,
    relation: relation.verb,
    target: relation.toSlug,
    since: relation.since ?? '',
    until: relation.until ?? '',
    seen: relation.seen ?? '',
  }));
  return buildGraph([...entityNodes, ...commitmentNodes], relations, date);
}
