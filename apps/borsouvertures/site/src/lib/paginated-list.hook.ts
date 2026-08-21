import { useState } from 'react';

export const DEFAULT_PAGE_SIZE = 20;

interface PaginatedList<Item> {
  visibleItems: Item[];
  hasMore: boolean;
  loadMore: () => void;
}

// @FollowsBlueprint hook-effect-free-mount
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
