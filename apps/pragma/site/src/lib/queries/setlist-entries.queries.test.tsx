import { afterEach, describe, expect, it } from 'vitest';
import { useRestoreSetlistEntry } from './setlist-entries.queries';
import { setlistKeys } from './setlists.queries';
import type { EntriesCache, MinimalSetlistEntry } from './setlists.utils';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

type RestoreMutate = ReturnType<typeof useRestoreSetlistEntry>['mutateAsync'];

function ProbeRestore({ sink }: { sink: (mutate: RestoreMutate) => void }): null {
  sink(useRestoreSetlistEntry().mutateAsync);
  return null;
}

const SETLIST_ID = '00000000-0000-4000-8000-000000000001';

function makeEntry(id: string, position: number, notes = ''): MinimalSetlistEntry {
  return {
    id,
    songId: `song-${id}`,
    position,
    energy: 3,
    keyOverride: 'Am',
    capo: 2,
    notes,
    lineupOverride: { member: ['guitar'] },
  };
}

const REMOVED = makeEntry('removed', 1, 'slow down');

function readOrder(queryClient: ReturnType<typeof createIsolatedQueryClient>): string[] {
  const cache = queryClient.getQueryData<EntriesCache>(setlistKeys.entriesOf(SETLIST_ID));
  return (cache?.entries ?? []).map((entry) => entry.id);
}

// @FollowsBlueprint test-query-hook
describe('useRestoreSetlistEntry', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  afterEach(() => {
    stub?.restore();
    stub = null;
  });

  it('puts the entry back with its note and lineup, then moves it to its old place', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<EntriesCache>(setlistKeys.entriesOf(SETLIST_ID), {
      entries: [makeEntry('a', 0), makeEntry('c', 1)],
    });
    const created = deferred<Response>();
    stub = stubFetch(async (request) =>
      request.method === 'POST'
        ? created.promise
        : jsonResponse({ id: SETLIST_ID, entryIds: ['a', 'new', 'c'] }),
    );
    const slot = createMutateSlot<RestoreMutate>();
    const tree = mountWithClient(queryClient, <ProbeRestore sink={slot.sink} />);

    slot
      .read()({ setlistId: SETLIST_ID, entry: REMOVED, index: 1 })
      .catch(() => undefined);
    await flushMicrotasks();
    expect(readOrder(queryClient)).toEqual(['a', 'removed', 'c']);

    created.resolve(jsonResponse({ entry: { ...makeEntry('new', 2, 'slow down') } }, 201));
    await flushMicrotasks();

    const [post, reorder] = stub.calls;
    expect(await post?.clone().json()).toEqual({
      songId: 'song-removed',
      energy: 3,
      keyOverride: 'Am',
      capo: 2,
      notes: 'slow down',
      lineupOverride: { member: ['guitar'] },
    });
    expect(reorder?.method).toBe('PUT');
    expect(await reorder?.clone().json()).toEqual({ entryIds: ['a', 'new', 'c'] });
    expect(readOrder(queryClient)).toEqual(['a', 'new', 'c']);
    tree.unmount();
  });

  it('sends no reorder when the entry was the last one', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<EntriesCache>(setlistKeys.entriesOf(SETLIST_ID), {
      entries: [makeEntry('a', 0)],
    });
    stub = stubFetch(async () => jsonResponse({ entry: makeEntry('new', 1) }, 201));
    const slot = createMutateSlot<RestoreMutate>();
    const tree = mountWithClient(queryClient, <ProbeRestore sink={slot.sink} />);

    await slot.read()({ setlistId: SETLIST_ID, entry: REMOVED, index: 1 });
    await flushMicrotasks();

    expect(stub.calls).toHaveLength(1);
    expect(readOrder(queryClient)).toEqual(['a', 'new']);
    tree.unmount();
  });

  it('leaves the entry at the end when the reorder is refused', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<EntriesCache>(setlistKeys.entriesOf(SETLIST_ID), {
      entries: [makeEntry('a', 0), makeEntry('c', 1)],
    });
    stub = stubFetch(async (request) =>
      request.method === 'POST'
        ? jsonResponse({ entry: makeEntry('new', 2) }, 201)
        : jsonResponse({ error: 'reorder-stale' }, 409),
    );
    const slot = createMutateSlot<RestoreMutate>();
    const tree = mountWithClient(queryClient, <ProbeRestore sink={slot.sink} />);

    await slot.read()({ setlistId: SETLIST_ID, entry: REMOVED, index: 0 });
    await flushMicrotasks();

    expect(readOrder(queryClient)).toEqual(['a', 'c', 'new']);
    tree.unmount();
  });

  it('takes the entry back out when the server refuses it', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<EntriesCache>(setlistKeys.entriesOf(SETLIST_ID), {
      entries: [makeEntry('a', 0)],
    });
    stub = stubFetch(async () => jsonResponse({ error: 'boom' }, 500));
    const slot = createMutateSlot<RestoreMutate>();
    const tree = mountWithClient(queryClient, <ProbeRestore sink={slot.sink} />);

    await slot
      .read()({ setlistId: SETLIST_ID, entry: REMOVED, index: 0 })
      .catch(() => undefined);
    await flushMicrotasks();

    expect(readOrder(queryClient)).toEqual(['a']);
    tree.unmount();
  });
});
