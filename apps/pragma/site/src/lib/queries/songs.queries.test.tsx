import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { songKeys, useCreateSong, useDeleteSong, useUpdateSong } from './songs.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

interface OptimisticListShape {
  songs: { id: string; title: string }[];
}

interface ProbeProps<Mutate> {
  sink: (mutate: Mutate) => void;
}

function ProbeCreate({ sink }: ProbeProps<ReturnType<typeof useCreateSong>['mutateAsync']>): null {
  const mutation = useCreateSong();
  sink(mutation.mutateAsync);
  return null;
}

function ProbeUpdate({ sink }: ProbeProps<ReturnType<typeof useUpdateSong>['mutateAsync']>): null {
  const mutation = useUpdateSong();
  sink(mutation.mutateAsync);
  return null;
}

function ProbeDelete({ sink }: ProbeProps<ReturnType<typeof useDeleteSong>['mutateAsync']>): null {
  const mutation = useDeleteSong();
  sink(mutation.mutateAsync);
  return null;
}

const SEED_LIST = {
  songs: [
    {
      id: 'song-a',
      title: 'Existing Song',
      artist: 'Pre-existing',
      status: 'idea',
      links: [],
      chart: null,
      tonalityStart: null,
      tonalityEnd: null,
      defaultLineup: {},
      baseEnergy: null,
      mbid: null,
      album: null,
      durationSeconds: null,
      isrcs: [],
      tags: [],
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
};

/**
 * @Blueprint test-query-hook
 * @BlueprintName Query Hook Test
 * @BlueprintUsage Use for testing a query or mutation hook, including its optimistic write and its rollback.
 * @BlueprintDescription Mounts a probe component that does nothing but publish the hook's `mutateAsync` into a slot, under a query client created for this test alone so no cache leaks between cases. The transport is a stubbed `fetch` returning a deferred promise, which is what lets the test read the cache while the request is still in flight and assert the optimistic write, then resolve the deferred with a 500 and assert the cache is back to its seeded value.
 */
describe('songs mutations — optimistic updates', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;

  beforeEach(() => {
    stub = null;
  });

  afterEach(() => {
    stub?.restore();
  });

  it('useCreateSong inserts the new row before the server replies', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(songKeys.list(), SEED_LIST);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useCreateSong>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);
    const send = slot.read();

    const inflight = send({ title: 'Brand New', artist: 'X', status: 'idea' });
    inflight.catch(() => undefined);
    await flushMicrotasks();

    const midflight = queryClient.getQueryData<OptimisticListShape>(songKeys.list());
    expect(midflight?.songs).toHaveLength(2);
    expect(midflight?.songs[0]?.title).toBe('Brand New');

    pending.resolve(
      jsonResponse({ song: { ...SEED_LIST.songs[0], id: 'srv', title: 'Brand New' } }, 201),
    );
    await flushMicrotasks();
    tree.unmount();
  });

  it('useCreateSong rolls back on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(songKeys.list(), SEED_LIST);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useCreateSong>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);
    const send = slot.read();

    send({ title: 'Will Fail', status: 'idea' }).catch(() => undefined);
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(songKeys.list())?.songs).toHaveLength(2);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();

    const after = queryClient.getQueryData<OptimisticListShape>(songKeys.list());
    expect(after?.songs).toHaveLength(1);
    expect(after?.songs[0]?.id).toBe('song-a');
    tree.unmount();
  });

  it('useUpdateSong patches the cached row in place', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(songKeys.list(), SEED_LIST);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useUpdateSong>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'song-a', title: 'Renamed' }).catch(() => undefined);
    await flushMicrotasks();

    const midflight = queryClient.getQueryData<OptimisticListShape>(songKeys.list());
    expect(midflight?.songs[0]?.title).toBe('Renamed');

    pending.resolve(jsonResponse({ song: { ...SEED_LIST.songs[0], title: 'Renamed' } }));
    await flushMicrotasks();
    tree.unmount();
  });

  it('useDeleteSong removes the row and restores it on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(songKeys.list(), SEED_LIST);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useDeleteSong>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'song-a' }).catch(() => undefined);
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(songKeys.list())?.songs).toHaveLength(0);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    const after = queryClient.getQueryData<OptimisticListShape>(songKeys.list());
    expect(after?.songs).toHaveLength(1);
    tree.unmount();
  });
});
