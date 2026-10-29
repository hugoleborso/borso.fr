import type { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportStreaksReadFailed } from '../../observability/error-reporting.adapter';
import { ApiError } from '../api.client';
import { queryClient as appQueryClient } from '../query-client.setup';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  flushTasks,
  jsonResponse,
  mountWithClient,
  type MountedTree,
  stubFetch,
} from './queries.test-utils';
import { streakKeys, useStreaks } from './streaks.queries';
import { useLogStudy, useUndoStudy } from './studies.queries';

vi.mock('../../observability/error-reporting.adapter', () => ({
  reportStreaksReadFailed: vi.fn(),
}));

const RETRY_WINDOW_MS = 5_000;

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
const OTHER_PART = { songId: 'song-1', instrumentId: 'voice-1' };
const STREAKS_COUNTED = {
  ...STREAKS,
  mine: { days: 5, isTodayCounted: true, jokersLeftThisWeek: 3 },
};
const STREAKS_OPEN = {
  ...STREAKS,
  mine: { days: 4, isTodayCounted: false, jokersLeftThisWeek: 3 },
};

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

function ProbeBoth({
  logSink,
  undoSink,
}: {
  logSink: (mutate: LogStudy) => void;
  undoSink: (mutate: UndoStudy) => void;
}): null {
  logSink(useLogStudy().mutateAsync);
  undoSink(useUndoStudy().mutateAsync);
  return null;
}

function queueAnswers(): {
  readonly stub: ReturnType<typeof stubFetch>;
  readonly answer: (index: number, body: unknown, status?: number) => void;
} {
  const pending: ReturnType<typeof deferred<Response>>[] = [];
  const stubbed = stubFetch(() => {
    const next = deferred<Response>();
    pending.push(next);
    return next.promise;
  });
  return {
    stub: stubbed,
    answer: (index, body, status) => pending[index]?.resolve(jsonResponse(body, status)),
  };
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

  it('reports a failed read once, after the app client has spent its retry', async () => {
    vi.useFakeTimers();
    stub = stubFetch(() => Promise.resolve(jsonResponse({ error: 'boom' }, 500)));
    tree = mountWithClient(appQueryClient, <ProbeStreaks />);
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
    vi.useRealTimers();
    expect(stub.calls).toHaveLength(2);
    expect(vi.mocked(reportStreaksReadFailed)).toHaveBeenCalledOnce();
    expect(vi.mocked(reportStreaksReadFailed).mock.calls[0]?.[0]).toBeInstanceOf(ApiError);
    appQueryClient.clear();
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

  it('sends the second write of one tap only once the first is answered, so the last answer wins', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(streakKeys.all, STREAKS_COUNTED);
    const queue = queueAnswers();
    stub = queue.stub;
    const slot = createMutateSlot<UndoStudy>();
    tree = mountWithClient(queryClient, <ProbeUndo sink={slot.sink} />);
    const firstUndo = slot.read()(TARGET);
    const secondUndo = slot.read()(OTHER_PART);
    await flushMicrotasks();
    expect(stub.calls).toHaveLength(1);
    queue.answer(0, { ...TARGET, deleted: true, streaks: STREAKS_COUNTED });
    await firstUndo;
    await flushMicrotasks();
    expect(stub.calls).toHaveLength(2);
    queue.answer(1, { ...OTHER_PART, deleted: true, streaks: STREAKS_OPEN });
    await secondUndo;
    await flushMicrotasks();
    expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS_OPEN);
  });

  it('queues an undo behind a pending log, because both share one write scope', async () => {
    const queryClient = createIsolatedQueryClient();
    seedStreaks(queryClient);
    const queue = queueAnswers();
    stub = queue.stub;
    const logSlot = createMutateSlot<LogStudy>();
    const undoSlot = createMutateSlot<UndoStudy>();
    tree = mountWithClient(
      queryClient,
      <ProbeBoth logSink={logSlot.sink} undoSink={undoSlot.sink} />,
    );
    const log = logSlot.read()(TARGET);
    const undo = undoSlot.read()(TARGET);
    await flushMicrotasks();
    expect(stub.calls.map((call) => call.method)).toEqual(['POST']);
    queue.answer(
      0,
      { study: { ...TARGET, studiedOn: STREAKS.today }, streaks: STREAKS_COUNTED },
      201,
    );
    await log;
    await flushMicrotasks();
    queue.answer(1, { ...TARGET, deleted: true, streaks: STREAKS_OPEN });
    await undo;
    await flushMicrotasks();
    expect(stub.calls.map((call) => call.method)).toEqual(['POST', 'DELETE']);
    expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS_OPEN);
  });
});
