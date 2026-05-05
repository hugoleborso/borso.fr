import { useCallback, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 20;

interface PaginatedList<Item> {
  visibleItems: Item[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
}

/**
 * A page cursor on top of a flat list. `resetKey` is the canonical
 * "the inputs changed; start over" signal — when it differs from the previous
 * render's key, the cursor snaps back to page 1 *during render*, no useEffect.
 *
 * Pattern from React docs §"You Might Not Need an Effect" → "Resetting all
 * state when a prop changes": store the previous key in state, compare during
 * render, call setState while rendering. React schedules a re-render before
 * commit, so the change is invisible to consumers.
 */
export function usePaginatedList<Item>(
  items: Item[],
  resetKey: unknown,
  pageSize: number = DEFAULT_PAGE_SIZE,
): PaginatedList<Item> {
  const [page, setPage] = useState(1);
  const [previousKey, setPreviousKey] = useState(resetKey);
  if (previousKey !== resetKey) {
    setPreviousKey(resetKey);
    setPage(1);
  }

  const visibleItems = useMemo(() => items.slice(0, page * pageSize), [items, page, pageSize]);
  const hasMore = items.length > visibleItems.length;
  const loadMore = useCallback(() => setPage((current) => current + 1), []);
  const reset = useCallback(() => setPage(1), []);

  return { visibleItems, hasMore, loadMore, reset };
}
