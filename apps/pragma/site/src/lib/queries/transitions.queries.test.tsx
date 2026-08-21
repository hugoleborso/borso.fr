import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';
import { transitionKeys, useSaveTransitionComment } from './transitions.queries';

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

// @FollowsBlueprint test-query-hook
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

    const slot = createMutateSlot<ReturnType<typeof useSaveTransitionComment>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeSave sink={slot.sink} />);
    const send = slot.read();

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

    const slot = createMutateSlot<ReturnType<typeof useSaveTransitionComment>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeSave sink={slot.sink} />);
    const send = slot.read();

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
