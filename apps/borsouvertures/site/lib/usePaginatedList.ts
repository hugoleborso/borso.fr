import { useState } from 'react';

export const DEFAULT_PAGE_SIZE = 20;

interface PaginatedList<Item> {
  visibleItems: Item[];
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * A page cursor over a flat list.
 *
 * The cursor resets by remounting rather than by watching the inputs: a caller
 * whose list changes meaning gives the owning component a new `key`, which is
 * React's own answer to "reset all state when a prop changes" and needs
 * neither an effect nor state written during render.
 */
export function usePaginatedList<Item>(
  items: readonly Item[],
  pageSize: number = DEFAULT_PAGE_SIZE,
): PaginatedList<Item> {
  const [pageCount, setPageCount] = useState(1);
  const visibleItems = items.slice(0, pageCount * pageSize);
  return {
    visibleItems,
    hasMore: items.length > visibleItems.length,
    loadMore: () => setPageCount((current) => current + 1),
  };
}
