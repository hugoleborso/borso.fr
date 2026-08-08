/**
 * Tests for the optimistic write path on the songs mutations. Each
 * test primes the list cache, dispatches a mutation with a deferred
 * fetch handler, and asserts:
 *   - apply: the cache reflects the optimistic change before resolve;
 *   - rollback: a 500 reply puts the cache back to its previous state.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { songKeys, useCreateSong, useDeleteSong, useUpdateSong } from './songs';
import {
  createIsolatedQueryClient,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './test-helpers';

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

    let dispatch: ReturnType<typeof useCreateSong>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeCreate sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('probe never reported a mutate handle');
    const send: ReturnType<typeof useCreateSong>['mutateAsync'] = dispatch;

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

    let dispatch: ReturnType<typeof useCreateSong>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeCreate sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('probe never reported a mutate handle');
    const send: ReturnType<typeof useCreateSong>['mutateAsync'] = dispatch;

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

    let dispatch: ReturnType<typeof useUpdateSong>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('probe never reported a mutate handle');
    const send: ReturnType<typeof useUpdateSong>['mutateAsync'] = dispatch;

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

    let dispatch: ReturnType<typeof useDeleteSong>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeDelete sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('probe never reported a mutate handle');
    const send: ReturnType<typeof useDeleteSong>['mutateAsync'] = dispatch;

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
