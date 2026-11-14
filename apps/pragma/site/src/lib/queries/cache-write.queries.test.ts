import { QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { writeEachKeepingStaleness, writeKeepingStaleness } from './cache-write.queries';
import { createIsolatedQueryClient, flushMicrotasks } from './queries.test-utils';

const LIST_KEY = ['compositions', 'list'] as const;
const OTHER_KEY = ['compositions', 'other'] as const;

interface ListShape {
  readonly titles: readonly string[];
}

function seed(): ReturnType<typeof createIsolatedQueryClient> {
  const queryClient = createIsolatedQueryClient();
  queryClient.setQueryData<ListShape>(LIST_KEY, { titles: ['Composition 7'] });
  queryClient.setQueryData<ListShape>(OTHER_KEY, { titles: [] });
  return queryClient;
}

function addTitle(old: ListShape | undefined): ListShape | undefined {
  return old === undefined ? old : { titles: [...old.titles, 'Repro Y'] };
}

// @FollowsBlueprint test-query-hook
describe('writeKeepingStaleness', () => {
  it("writes the data and keeps an entry another member's write made stale", async () => {
    const queryClient = seed();
    await queryClient.invalidateQueries({ queryKey: LIST_KEY, exact: true });

    writeKeepingStaleness<ListShape>(queryClient, LIST_KEY, addTitle);

    expect(queryClient.getQueryData(LIST_KEY)).toEqual({ titles: ['Composition 7', 'Repro Y'] });
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(OTHER_KEY)?.isInvalidated).toBe(false);
  });

  it('leaves a fresh entry fresh', () => {
    const queryClient = seed();

    writeKeepingStaleness<ListShape>(queryClient, LIST_KEY, addTitle);

    expect(queryClient.getQueryData(LIST_KEY)).toEqual({ titles: ['Composition 7', 'Repro Y'] });
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
  });

  it('marks the stale entry without refetching it', async () => {
    const queryClient = seed();
    await queryClient.invalidateQueries({ queryKey: LIST_KEY, exact: true });

    writeKeepingStaleness<ListShape>(queryClient, LIST_KEY, { titles: [] });

    expect(queryClient.getQueryState(LIST_KEY)?.fetchStatus).toBe('idle');
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
  });

  it('sends no request for a stale entry a screen is watching', async () => {
    const queryClient = seed();
    const fetchList = vi.fn(() => Promise.resolve<ListShape>({ titles: ['Composition 7'] }));
    const observer = new QueryObserver<ListShape>(queryClient, {
      queryKey: LIST_KEY,
      queryFn: fetchList,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().fetchStatus).toBe('idle'));
    await queryClient.invalidateQueries({ queryKey: LIST_KEY, exact: true, refetchType: 'none' });
    fetchList.mockClear();

    writeKeepingStaleness<ListShape>(queryClient, LIST_KEY, addTitle);
    await flushMicrotasks();

    expect(fetchList).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
    unsubscribe();
  });

  it('creates nothing for a key the cache does not hold', () => {
    const queryClient = createIsolatedQueryClient();

    writeKeepingStaleness<ListShape>(queryClient, LIST_KEY, addTitle);

    expect(queryClient.getQueryState(LIST_KEY)).toBeUndefined();
  });
});

// @FollowsBlueprint test-query-hook
describe('writeEachKeepingStaleness', () => {
  it('writes every entry under the prefix and keeps only the stale one stale', async () => {
    const queryClient = seed();
    await queryClient.invalidateQueries({ queryKey: LIST_KEY, exact: true });

    writeEachKeepingStaleness<ListShape>(queryClient, ['compositions'], addTitle);

    expect(queryClient.getQueryData(LIST_KEY)).toEqual({ titles: ['Composition 7', 'Repro Y'] });
    expect(queryClient.getQueryData(OTHER_KEY)).toEqual({ titles: ['Repro Y'] });
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(OTHER_KEY)?.isInvalidated).toBe(false);
  });

  it('leaves an entry outside the prefix untouched', () => {
    const queryClient = seed();

    writeEachKeepingStaleness<ListShape>(queryClient, ['setlists'], addTitle);

    expect(queryClient.getQueryData(LIST_KEY)).toEqual({ titles: ['Composition 7'] });
  });
});
