/**
 * Tests for the optimistic write path on the mastery defaults mutations.
 * The scroll-wheel ±1 in the matrix relies on the cell upserting the
 * default row immediately; a 500 reply rolls the cell back to its
 * previous score.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { masteryKeys, useDeleteMasteryDefault, useSaveMasteryDefault } from './mastery';
import {
  createIsolatedQueryClient,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './test-helpers';

interface OptimisticDefaultsShape {
  defaults: Array<{ memberId: string; instrumentId: string; score: number }>;
}

interface ProbeProps<Mutate> {
  sink: (mutate: Mutate) => void;
}
function ProbeSave({ sink }: ProbeProps<ReturnType<typeof useSaveMasteryDefault>['mutateAsync']>): null {
  sink(useSaveMasteryDefault().mutateAsync);
  return null;
}
function ProbeDelete({
  sink,
}: ProbeProps<ReturnType<typeof useDeleteMasteryDefault>['mutateAsync']>): null {
  sink(useDeleteMasteryDefault().mutateAsync);
  return null;
}

const SEED = {
  defaults: [
    { memberId: 'mem-a', instrumentId: 'instr-a', score: 5 },
    { memberId: 'mem-a', instrumentId: 'instr-b', score: 8 },
  ],
};

describe('mastery default mutations — optimistic updates', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  beforeEach(() => {
    stub = null;
  });
  afterEach(() => {
    stub?.restore();
  });

  it('useSaveMasteryDefault upserts the existing cell instantly', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(masteryKeys.defaults(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useSaveMasteryDefault>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeSave sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useSaveMasteryDefault>['mutateAsync'] = dispatch;

    send({ memberId: 'mem-a', instrumentId: 'instr-a', score: 6 }).catch(() => undefined);
    await flushMicrotasks();
    const midflight = queryClient.getQueryData<OptimisticDefaultsShape>(masteryKeys.defaults());
    const target = midflight?.defaults.find(
      (row) => row.memberId === 'mem-a' && row.instrumentId === 'instr-a',
    );
    expect(target?.score).toBe(6);

    pending.resolve(jsonResponse({ memberId: 'mem-a', instrumentId: 'instr-a', score: 6 }));
    await flushMicrotasks();
    tree.unmount();
  });

  it('useSaveMasteryDefault inserts a new cell when no row exists yet', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(masteryKeys.defaults(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useSaveMasteryDefault>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeSave sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useSaveMasteryDefault>['mutateAsync'] = dispatch;

    send({ memberId: 'mem-b', instrumentId: 'instr-c', score: 4 }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticDefaultsShape>(masteryKeys.defaults())?.defaults,
    ).toHaveLength(3);

    pending.resolve(jsonResponse({ memberId: 'mem-b', instrumentId: 'instr-c', score: 4 }));
    await flushMicrotasks();
    tree.unmount();
  });

  it('useSaveMasteryDefault rolls back the cell on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(masteryKeys.defaults(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useSaveMasteryDefault>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeSave sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useSaveMasteryDefault>['mutateAsync'] = dispatch;

    send({ memberId: 'mem-a', instrumentId: 'instr-a', score: 9 }).catch(() => undefined);
    await flushMicrotasks();
    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    const after = queryClient
      .getQueryData<OptimisticDefaultsShape>(masteryKeys.defaults())
      ?.defaults.find((row) => row.memberId === 'mem-a' && row.instrumentId === 'instr-a');
    expect(after?.score).toBe(5);
    tree.unmount();
  });

  it('useDeleteMasteryDefault removes the cell and restores on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(masteryKeys.defaults(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useDeleteMasteryDefault>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeDelete sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useDeleteMasteryDefault>['mutateAsync'] = dispatch;

    send({ memberId: 'mem-a', instrumentId: 'instr-a' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticDefaultsShape>(masteryKeys.defaults())?.defaults,
    ).toHaveLength(1);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticDefaultsShape>(masteryKeys.defaults())?.defaults,
    ).toHaveLength(2);
    tree.unmount();
  });
});
