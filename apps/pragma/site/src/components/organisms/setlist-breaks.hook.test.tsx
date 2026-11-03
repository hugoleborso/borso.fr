import { afterEach, describe, expect, it } from 'vitest';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { setlistKeys } from '../../lib/queries/setlists.queries';
import type { EntriesCache, MinimalSetlistEntry } from '../../lib/queries/setlists.utils';
import { type SetlistBreakActions, useSetlistBreakActions } from './setlist-breaks.hook';

const SETLIST_ID = '00000000-0000-4000-8000-000000000001';
const INTERMISSION = {
  id: 'p',
  setlistId: SETLIST_ID,
  label: 'Intermission',
  position: 2,
  songsBefore: 2,
};

function makeEntry(id: string, position: number): MinimalSetlistEntry {
  return {
    id,
    songId: `song-${id}`,
    position,
    energy: null,
    keyOverride: null,
    capo: null,
    notes: '',
    lineupOverride: null,
  };
}

function ProbeBreakActions({ sink }: { sink: (actions: SetlistBreakActions) => void }): null {
  sink(useSetlistBreakActions(SETLIST_ID, () => undefined));
  return null;
}

function readBreaks(queryClient: ReturnType<typeof createIsolatedQueryClient>) {
  return queryClient.getQueryData<{ breaks: (typeof INTERMISSION)[] }>(
    setlistKeys.breaksOf(SETLIST_ID),
  )?.breaks;
}

// @FollowsBlueprint test-query-hook
describe('useSetlistBreakActions', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  afterEach(() => {
    stub?.restore();
    stub = null;
  });

  it('puts a break back after the song before it, once that song is restored', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData<EntriesCache>(setlistKeys.entriesOf(SETLIST_ID), {
      entries: [makeEntry('a', 0), makeEntry('b', 1), makeEntry('c', 3)],
    });
    queryClient.setQueryData(setlistKeys.breaksOf(SETLIST_ID), { breaks: [INTERMISSION] });
    stub = stubFetch(async (request) =>
      request.method === 'PUT'
        ? jsonResponse({ id: SETLIST_ID, entryIds: [] })
        : jsonResponse({ breaks: [INTERMISSION] }),
    );
    const slot = createMutateSlot<SetlistBreakActions>();
    const tree = mountWithClient(queryClient, <ProbeBreakActions sink={slot.sink} />);
    await flushMicrotasks();

    const putBreaksBack = slot.read().rememberPlacement();
    slot.read().withdrawSong(1, () => undefined);
    expect(readBreaks(queryClient)?.[0]?.songsBefore).toBe(1);
    queryClient.setQueryData<EntriesCache>(setlistKeys.entriesOf(SETLIST_ID), {
      entries: [makeEntry('a', 0), makeEntry('restored', 1), makeEntry('c', 2)],
    });
    putBreaksBack();
    await flushMicrotasks();

    const reorder = stub.calls.find((request) => request.method === 'PUT');
    expect(await reorder?.clone().json()).toEqual({ entryIds: ['a', 'restored', 'p', 'c'] });
    expect(readBreaks(queryClient)?.[0]?.songsBefore).toBe(2);
    tree.unmount();
  });

  it('sends no reorder when the setlist held no break', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(setlistKeys.breaksOf(SETLIST_ID), { breaks: [] });
    stub = stubFetch(async () => jsonResponse({ breaks: [] }));
    const slot = createMutateSlot<SetlistBreakActions>();
    const tree = mountWithClient(queryClient, <ProbeBreakActions sink={slot.sink} />);
    await flushMicrotasks();

    slot.read().rememberPlacement()();
    await flushMicrotasks();

    expect(stub.calls.some((request) => request.method === 'PUT')).toBe(false);
    tree.unmount();
  });
});
