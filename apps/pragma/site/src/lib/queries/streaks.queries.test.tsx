import type { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '../api.client';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  flushMicrotasks,
  flushTasks,
  jsonResponse,
  mountWithClient,
  type MountedTree,
  stubFetch,
} from './queries.test-utils';
import { streakKeys, useStreaks } from './streaks.queries';
import { useLogStudy, useUndoStudy } from './studies.queries';

const STREAKS = {
  today: '2026-10-29',
  mine: { days: 12, isTodayCounted: false, jokersLeftThisWeek: 2 },
  band: { days: 4, isTodayCounted: true },
  members: [],
};
const STREAKS_AFTER_WRITE = {
  ...STREAKS,
  mine: { days: 13, isTodayCounted: true, jokersLeftThisWeek: 2 },
};
const TARGET = { songId: 'song-1', instrumentId: 'guitar-1' };

type LogStudy = ReturnType<typeof useLogStudy>['mutateAsync'];
type UndoStudy = ReturnType<typeof useUndoStudy>['mutateAsync'];

function ProbeStreaks(): null {
  useStreaks();
  return null;
}
function ProbeLog({ sink }: { sink: (mutate: LogStudy) => void }): null {
  sink(useLogStudy().mutateAsync);
  return null;
}
function ProbeUndo({ sink }: { sink: (mutate: UndoStudy) => void }): null {
  sink(useUndoStudy().mutateAsync);
  return null;
}

function seedStreaks(queryClient: QueryClient): void {
  queryClient.setQueryData(streakKeys.all, STREAKS);
}

function isStreaksStale(queryClient: QueryClient): boolean {
  return queryClient.getQueryState(streakKeys.all)?.isInvalidated ?? false;
}

// @FollowsBlueprint test-query-hook
describe('useStreaks', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  let tree: MountedTree | null = null;

  afterEach(() => {
    tree?.unmount();
    stub?.restore();
  });

  it('reads the flames from /api/streaks', async () => {
    stub = stubFetch(() => Promise.resolve(jsonResponse(STREAKS)));
    const queryClient = createIsolatedQueryClient();
    tree = mountWithClient(queryClient, <ProbeStreaks />);
    await flushTasks();
    await flushMicrotasks();
    expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS);
    expect(new URL(stub.calls[0]?.url ?? '').pathname).toBe('/api/streaks');
  });

  it('fails with an ApiError on a non-OK answer', async () => {
    stub = stubFetch(() => Promise.resolve(jsonResponse({ error: 'boom' }, 500)));
    const queryClient = createIsolatedQueryClient();
    tree = mountWithClient(queryClient, <ProbeStreaks />);
    await flushTasks();
    await flushMicrotasks();
    expect(queryClient.getQueryState(streakKeys.all)?.error).toBeInstanceOf(ApiError);
  });
});

describe('the study mutations and the flames', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  let tree: MountedTree | null = null;

  afterEach(() => {
    tree?.unmount();
    stub?.restore();
  });

  it('settles the flames from the answer once a study is logged', async () => {
    const queryClient = createIsolatedQueryClient();
    seedStreaks(queryClient);
    stub = stubFetch(() =>
      Promise.resolve(
        jsonResponse(
          { study: { ...TARGET, studiedOn: STREAKS.today }, streaks: STREAKS_AFTER_WRITE },
          201,
        ),
      ),
    );
    const slot = createMutateSlot<LogStudy>();
    tree = mountWithClient(queryClient, <ProbeLog sink={slot.sink} />);
    await slot.read()(TARGET);
    await flushMicrotasks();
    expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS_AFTER_WRITE);
    expect(isStreaksStale(queryClient)).toBe(false);
  });

  it('settles the flames from the answer once a study is undone', async () => {
    const queryClient = createIsolatedQueryClient();
    seedStreaks(queryClient);
    stub = stubFetch(() =>
      Promise.resolve(jsonResponse({ ...TARGET, deleted: true, streaks: STREAKS_AFTER_WRITE })),
    );
    const slot = createMutateSlot<UndoStudy>();
    tree = mountWithClient(queryClient, <ProbeUndo sink={slot.sink} />);
    await slot.read()(TARGET);
    await flushMicrotasks();
    expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS_AFTER_WRITE);
    expect(isStreaksStale(queryClient)).toBe(false);
  });

  it('leaves the flames alone when the study is refused', async () => {
    const queryClient = createIsolatedQueryClient();
    seedStreaks(queryClient);
    stub = stubFetch(() => Promise.resolve(jsonResponse({ error: 'study-not-in-lineup' }, 422)));
    const slot = createMutateSlot<LogStudy>();
    tree = mountWithClient(queryClient, <ProbeLog sink={slot.sink} />);
    await expect(slot.read()(TARGET)).rejects.toBeInstanceOf(ApiError);
    expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS);
    expect(isStreaksStale(queryClient)).toBe(false);
  });
});
