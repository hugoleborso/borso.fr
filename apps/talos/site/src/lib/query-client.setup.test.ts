import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api.client';
import { SIGNED_IN, SIGNED_OUT, sessionKeys } from './queries/session.queries';
import { queryClient } from './query-client.setup';
import { todayKeys } from './queries/today.queries';

async function readFailingWith(status: number): Promise<void> {
  await queryClient
    .query({
      queryKey: ['messages', status],
      queryFn: () => Promise.reject(new ApiError(status, `messages ${status}`, null)),
    })
    .catch(() => undefined);
}

describe('a session the server stops accepting', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('ends in the tab as soon as a read is refused as unauthorised, so the gate shows sign-in', async () => {
    queryClient.setQueryData(sessionKeys.current(), SIGNED_IN);

    await readFailingWith(401);

    expect(queryClient.getQueryData(sessionKeys.current())).toStrictEqual(SIGNED_OUT);
  });

  it('stays open when a read fails for another reason', async () => {
    queryClient.setQueryData(sessionKeys.current(), SIGNED_IN);

    await readFailingWith(500);

    expect(queryClient.getQueryData(sessionKeys.current())).toStrictEqual(SIGNED_IN);
  });
});

describe('the app icon badge', () => {
  afterEach(() => {
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it('follows the pending proposal count of the today overview, optimistic changes included', () => {
    const setAppBadge = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { setAppBadge });
    queryClient.setQueryData(['messages', 'other'], { pendingProposalCount: 9 });
    queryClient.setQueryData(todayKeys.overview(), { pendingProposalCount: 2 });
    queryClient.setQueryData(todayKeys.overview(), { pendingProposalCount: 1 });
    expect(setAppBadge.mock.calls).toEqual([[2], [1]]);
  });
});
