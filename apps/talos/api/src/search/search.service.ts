import { summarizePage } from '@domain/markdown-page.core';
import { rankSearchHits, type SearchHit } from '@domain/search.core';
import { readPageCorpus } from '../content/content.service';
import { isMemoryInDatabase } from '../memory/memory-cutover.service';
import { searchMemory } from '../memory/memory-pwa.service';

const MAXIMUM_SEARCH_HITS = 20;

async function searchStoredPages(query: string): Promise<SearchHit[]> {
  if (query.trim() === '') return [];
  const hits = await searchMemory(query.trim(), MAXIMUM_SEARCH_HITS);
  return hits.map((hit) => ({ path: hit.slug, title: hit.title, excerpt: hit.excerpt }));
}

// @FollowsBlueprint service-read-model
export async function searchPages(query: string): Promise<SearchHit[]> {
  if (await isMemoryInDatabase()) return await searchStoredPages(query);
  const pages = (await readPageCorpus()).map((page) => summarizePage(page.path, page.markdown));
  return rankSearchHits(pages, query, MAXIMUM_SEARCH_HITS);
}
