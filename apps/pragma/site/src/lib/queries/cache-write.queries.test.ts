import { describe, expect, it } from 'vitest';
import { writeKeepingStaleness } from './cache-write.queries';
import { createIsolatedQueryClient } from './queries.test-utils';

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

  it('creates nothing for a key the cache does not hold', () => {
    const queryClient = createIsolatedQueryClient();

    writeKeepingStaleness<ListShape>(queryClient, LIST_KEY, addTitle);

    expect(queryClient.getQueryState(LIST_KEY)).toBeUndefined();
  });
});
