import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportStreaksReadFailed } from '../../observability/error-reporting.adapter';
import { ApiError } from '../api.client';
import { queryClient as appQueryClient } from '../query-client.setup';
import {
  createIsolatedQueryClient,
  flushMicrotasks,
  flushTasks,
  jsonResponse,
  mountWithClient,
  type MountedTree,
  stubFetch,
} from './queries.test-utils';
import { streakKeys, useStreaks } from './streaks.queries';

vi.mock('../../observability/error-reporting.adapter', () => ({
  reportStreaksReadFailed: vi.fn(),
}));

const RETRY_WINDOW_MS = 5_000;

const STREAKS = {
  today: '2026-10-29',
  mine: { days: 12, isTodayCounted: false, jokersLeftThisWeek: 2 },
  band: { days: 4, isTodayCounted: true },
};

function ProbeStreaks(): null {
  useStreaks();
  return null;
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
    stub = stubFetch(() => Promise.resolve(jsonResponse({ error: 'boom' }, 403)));
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
