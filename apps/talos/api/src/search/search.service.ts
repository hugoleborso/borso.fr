import { summarizePage } from '@domain/markdown-page.core';
import { rankSearchHits, type SearchHit } from '@domain/search.core';
import { readPageCorpus } from '../content/content.service';

const MAXIMUM_SEARCH_HITS = 20;

// @FollowsBlueprint service-read-model
export async function searchPages(query: string): Promise<SearchHit[]> {
  const pages = (await readPageCorpus()).map((page) => summarizePage(page.path, page.markdown));
  return rankSearchHits(pages, query, MAXIMUM_SEARCH_HITS);
}
