import { findClosenessScore } from '@domain/closeness.core';
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
const PATH_SEPARATOR = '/';

function readSlugTail(slug: string): string {
  return slug.slice(slug.lastIndexOf(PATH_SEPARATOR) + 1);
}

// @FollowsBlueprint core-projection
export function projectStoredGraph(source: StoredGraphSource, date: string | null): Graph {
  const entityNodes = source.entities
    .filter((entity) => !entity.archived)
    .map((entity): GraphNode => {
      const proximity = findClosenessScore(entity.closeness);
      return {
        id: entity.slug,
        title: entity.title,
        type: entity.kind,
        ...(proximity === null ? {} : { proximity }),
      };
    });
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
