/**
 * Tests for the optimistic write path on the transition-comment save
 * mutation. The setlist editor's inline comment commits the new
 * comment into the byPair cache before the server replies; a 500
 * rolls back to whatever the cache held (null when there was no
 * previous comment).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { transitionKeys, useSaveTransitionComment } from './transitions';
import {
  createIsolatedQueryClient,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './test-helpers';

interface OptimisticPairCache {
  comment: { songAId: string; songBId: string; comment: string; updatedAt: string };
}

interface ProbeProps<Mutate> {
  sink: (mutate: Mutate) => void;
}
function ProbeSave({
  sink,
}: ProbeProps<ReturnType<typeof useSaveTransitionComment>['mutateAsync']>): null {
  sink(useSaveTransitionComment().mutateAsync);
  return null;
}

describe('transitions mutation — optimistic update', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  beforeEach(() => {
    stub = null;
  });
  afterEach(() => {
    stub?.restore();
  });

  it('useSaveTransitionComment commits the comment into the pair cache instantly', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(transitionKeys.byPair('song-a', 'song-b'), null);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useSaveTransitionComment>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeSave sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useSaveTransitionComment>['mutateAsync'] = dispatch;

    send({ a: 'song-a', b: 'song-b', comment: 'Tight key change here' }).catch(() => undefined);
    await flushMicrotasks();
    const midflight = queryClient.getQueryData<OptimisticPairCache | null>(
      transitionKeys.byPair('song-a', 'song-b'),
    );
    expect(midflight?.comment.comment).toBe('Tight key change here');

    pending.resolve(
      jsonResponse({ songAId: 'song-a', songBId: 'song-b', comment: 'Tight key change here' }),
    );
    await flushMicrotasks();
    tree.unmount();
  });

  it('useSaveTransitionComment rolls back to the previous null value on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(transitionKeys.byPair('song-a', 'song-b'), null);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useSaveTransitionComment>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeSave sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useSaveTransitionComment>['mutateAsync'] = dispatch;

    send({ a: 'song-a', b: 'song-b', comment: 'Will fail' }).catch(() => undefined);
    await flushMicrotasks();
    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticPairCache | null>(
        transitionKeys.byPair('song-a', 'song-b'),
      ),
    ).toBeNull();
    tree.unmount();
  });
});
