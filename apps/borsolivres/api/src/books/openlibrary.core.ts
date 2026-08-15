/**
 * Pure mapper for the OpenLibrary `search.json` payload. Takes the JSON that
 * `https://openlibrary.org/search.json?q=...` returns and projects it onto the
 * shape the lookup panel renders.
 *
 * The mapper is permissive, because every field the endpoint documents is
 * optional in practice: a work with no author, no cover and no ISBN still
 * surfaces, and only a work with no title is dropped, since a blank row in the
 * lookup list is worse than a missing one.
 *
 * The live call and its rate limit live in `openlibrary.adapter.ts`; this file
 * reaches nothing outside its arguments.
 */

import { z } from 'zod';

export interface BookLookupHit {
  readonly key: string;
  readonly title: string;
  readonly author: string;
  readonly firstPublishedYear: number | null;
  readonly isbn: string | null;
  readonly coverUrl: string | null;
  /** How many editions OpenLibrary knows of, which is its only notability signal. */
  readonly editionCount: number;
}

const COVER_IMAGE_BASE_URL = 'https://covers.openlibrary.org/b/id/';
const COVER_IMAGE_SIZE_SUFFIX = '-M.jpg';
const AUTHOR_SEPARATOR = ', ';
const NO_EDITIONS = 0;

const documentSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  author_name: z.array(z.string()).optional(),
  first_publish_year: z.number().optional(),
  isbn: z.array(z.string()).optional(),
  cover_i: z.number().optional(),
  edition_count: z.number().optional(),
});

const searchResponseSchema = z.object({
  docs: z.array(documentSchema).default([]),
});

type OpenLibraryDocument = z.infer<typeof documentSchema>;

function composeAuthor(names: readonly string[] | undefined): string {
  return (names ?? []).join(AUTHOR_SEPARATOR);
}

function buildCoverUrl(coverIdentifier: number | undefined): string | null {
  if (coverIdentifier === undefined) return null;
  return `${COVER_IMAGE_BASE_URL}${coverIdentifier}${COVER_IMAGE_SIZE_SUFFIX}`;
}

function pickPreferredIsbn(isbns: readonly string[] | undefined): string | null {
  return isbns?.[0] ?? null;
}

function toLookupHit(document: OpenLibraryDocument): BookLookupHit {
  return {
    key: document.key,
    title: document.title ?? '',
    author: composeAuthor(document.author_name),
    firstPublishedYear: document.first_publish_year ?? null,
    isbn: pickPreferredIsbn(document.isbn),
    coverUrl: buildCoverUrl(document.cover_i),
    editionCount: document.edition_count ?? NO_EDITIONS,
  };
}

/**
 * The lookup hits a search payload carries. A shape change upstream empties
 * the lookup panel rather than failing the request, because a search nobody
 * can act on is not an error the caller can recover from either.
 */
// @FollowsBlueprint core-parse-untrusted
export function mapOpenLibraryDocuments(payload: unknown): BookLookupHit[] {
  const searchResponse = searchResponseSchema.safeParse(payload);
  if (!searchResponse.success) return [];
  const hits: BookLookupHit[] = [];
  for (const document of searchResponse.data.docs) {
    const hit = toLookupHit(document);
    if (hit.title.length === 0) continue;
    hits.push(hit);
  }
  return hits;
}

/**
 * The cache key of a lookup. Lower case rather than upper, so a key read in a
 * log is the query the reader typed.
 */
export function buildLookupCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

export interface LookupCacheEntry {
  readonly value: readonly BookLookupHit[];
  readonly expiresAt: number;
}

/**
 * The keys of a lookup cache whose entries have reached their expiry, so the
 * caller can drop them without iterating a map it is mutating.
 */
export function listExpiredLookupCacheKeys(
  cache: ReadonlyMap<string, LookupCacheEntry>,
  nowMillis: number,
): readonly string[] {
  return [...cache]
    .filter(([, entry]) => entry.expiresAt <= nowMillis)
    .map(([cacheKey]) => cacheKey);
}
