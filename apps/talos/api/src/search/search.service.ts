import type { SearchHit } from '@domain/search.core';
import { searchMemory } from '../memory/memory-pwa.service';

const MAXIMUM_SEARCH_HITS = 20;

// @FollowsBlueprint service-read-model
export async function searchPages(query: string): Promise<SearchHit[]> {
  if (query.trim() === '') return [];
  const hits = await searchMemory(query.trim(), MAXIMUM_SEARCH_HITS);
  return hits.map((hit) => ({ path: hit.slug, title: hit.title, excerpt: hit.excerpt }));
}
