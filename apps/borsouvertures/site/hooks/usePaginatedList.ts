import { useCallback, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 20;

interface PaginatedList<Item> {
  visibleItems: Item[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
}

export function usePaginatedList<Item>(
  items: Item[],
  pageSize: number = DEFAULT_PAGE_SIZE,
): PaginatedList<Item> {
  const [page, setPage] = useState(1);

  const visibleItems = useMemo(() => items.slice(0, page * pageSize), [items, page, pageSize]);
  const hasMore = items.length > visibleItems.length;
  const loadMore = useCallback(() => setPage((current) => current + 1), []);
  const reset = useCallback(() => setPage(1), []);

  return { visibleItems, hasMore, loadMore, reset };
}
