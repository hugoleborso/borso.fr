import { readPageTitle } from '@domain/markdown-page.core';
import { buildExcerpt, hasFoldedMatch, readSlugTail } from './memory-text.core';

export type MatchedIn = 'title' | 'alias' | 'summary' | 'fact' | 'body' | 'content';
export type MemoryObjectType =
  | 'entity'
  | 'commitment'
  | 'proposal'
  | 'draft'
  | 'source'
  | 'journal'
  | 'document';

export interface SearchHit {
  readonly slug: string;
  readonly type: MemoryObjectType;
  readonly title: string;
  readonly excerpt: string;
  readonly matchedIn: MatchedIn;
}

export interface SearchableEntity {
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly body: string;
}

export interface SearchCorpus {
  readonly entities: readonly SearchableEntity[];
  readonly aliases: readonly { readonly entitySlug: string; readonly value: string }[];
  readonly facts: readonly {
    readonly entitySlug: string;
    readonly value: string;
    readonly raw: string | null;
  }[];
  readonly entityTitles: ReadonlyMap<string, string>;
  readonly commitments: readonly {
    readonly slug: string;
    readonly action: string | null;
    readonly body: string;
  }[];
  readonly sources: readonly {
    readonly slug: string;
    readonly title: string | null;
    readonly content: string;
  }[];
  readonly journalEntries: readonly { readonly slug: string; readonly content: string }[];
  readonly documents: readonly { readonly slug: string; readonly content: string }[];
}

const MATCH_PRIORITY: readonly MatchedIn[] = [
  'title',
  'alias',
  'summary',
  'fact',
  'body',
  'content',
];

function selectEntityMatch(entity: SearchableEntity, query: string): SearchHit | null {
  const candidates: readonly [MatchedIn, string | null][] = [
    ['title', entity.title],
    ['summary', entity.summary],
    ['body', entity.body],
  ];
  // Stryker disable MethodExpression,ConditionalExpression: equivalent mutant, an empty column never matches a query, which the schema keeps non-blank.
  const columns = candidates.filter(
    (candidate): candidate is [MatchedIn, string] => candidate[1] !== null,
  );
  // Stryker restore MethodExpression,ConditionalExpression
  const match = columns.find(([, text]) => hasFoldedMatch(text, query));
  if (match === undefined) return null;
  const [matchedIn, text] = match;
  return {
    slug: entity.slug,
    type: 'entity',
    title: entity.title,
    excerpt: buildExcerpt(text, query),
    matchedIn,
  };
}

function contentHit(
  slug: string,
  type: MemoryObjectType,
  content: string,
  query: string,
  title?: string | null,
): SearchHit {
  return {
    slug,
    type,
    title: title ?? readPageTitle(content, readSlugTail(slug)),
    excerpt: buildExcerpt(content, query),
    matchedIn: 'content',
  };
}

// @FollowsBlueprint core-projection
export function rankSearchHits(corpus: SearchCorpus, query: string, limit: number): SearchHit[] {
  const titleOf = (slug: string) => corpus.entityTitles.get(slug) ?? readSlugTail(slug);
  const hits: SearchHit[] = [
    ...corpus.entities
      .map((entity) => selectEntityMatch(entity, query))
      .filter((hit) => hit !== null),
    ...corpus.aliases.map((alias) => ({
      slug: alias.entitySlug,
      type: 'entity' as const,
      title: titleOf(alias.entitySlug),
      excerpt: alias.value,
      matchedIn: 'alias' as const,
    })),
    ...corpus.facts.map((fact) => ({
      slug: fact.entitySlug,
      type: 'entity' as const,
      title: titleOf(fact.entitySlug),
      excerpt: buildExcerpt(fact.raw ?? fact.value, query),
      matchedIn: 'fact' as const,
    })),
    ...corpus.commitments.map((commitment) =>
      contentHit(commitment.slug, 'commitment', commitment.body, query, commitment.action),
    ),
    ...corpus.sources.map((source) =>
      contentHit(source.slug, 'source', source.content, query, source.title),
    ),
    ...corpus.journalEntries.map((entry) =>
      contentHit(entry.slug, 'journal', entry.content, query),
    ),
    ...corpus.documents.map((document) =>
      contentHit(document.slug, 'document', document.content, query),
    ),
  ];
  const seen = new Set<string>();
  return hits
    .toSorted(
      (left, right) =>
        MATCH_PRIORITY.indexOf(left.matchedIn) - MATCH_PRIORITY.indexOf(right.matchedIn),
    )
    .filter((hit) => {
      if (seen.has(hit.slug)) return false;
      seen.add(hit.slug);
      return true;
    })
    .slice(0, limit);
}
