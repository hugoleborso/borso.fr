/**
 * Regression test for the post-login redirect bug: the route guard
 * (`RequireSession`) reads `useSessionProbe()`, which caches forever.
 * The user reaches /login only after that probe cached
 * `{ authenticated: false }`, so a successful login MUST overwrite the
 * cache — otherwise the redirect lands back on the guard, reads the
 * stale `false`, and bounces to /login again.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { authKeys, useLogin } from './auth.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

function ProbeLogin({
  sink,
}: {
  sink: (mutate: ReturnType<typeof useLogin>['mutateAsync']) => void;
}): null {
  sink(useLogin().mutateAsync);
  return null;
}

// @FollowsBlueprint test-query-hook
describe('useLogin — session cache reconciliation', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  afterEach(() => {
    stub?.restore();
    stub = null;
  });

  it('flips the cached session probe to authenticated on success', async () => {
    stub = stubFetch(async () => jsonResponse({ ok: true }));
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(authKeys.session(), { authenticated: false });

    const slot = createMutateSlot<ReturnType<typeof useLogin>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeLogin sink={slot.sink} />);
    await flushMicrotasks();
    const send = slot.read();

    await send({ password: 'correct-horse-battery' });
    await flushMicrotasks();

    expect(queryClient.getQueryData(authKeys.session())).toEqual({ authenticated: true });
    tree.unmount();
  });
});
