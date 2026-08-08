/**
 * Tests for the optimistic write path on the bars mutations. The
 * kanban status switch (`useUpdateBar({ status })`) is the most
 * visible: the card jumps to the new column instantly, the server
 * confirms in the background, and a 500 rolls the card back.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { barKeys, useCreateBar, useDeleteBar, useUpdateBar } from './bars';
import {
  createIsolatedQueryClient,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './test-helpers';

interface OptimisticListShape {
  bars: { id: string; name: string; status: string }[];
}

interface ProbeProps<Mutate> {
  sink: (mutate: Mutate) => void;
}

function ProbeCreate({ sink }: ProbeProps<ReturnType<typeof useCreateBar>['mutateAsync']>): null {
  sink(useCreateBar().mutateAsync);
  return null;
}
function ProbeUpdate({ sink }: ProbeProps<ReturnType<typeof useUpdateBar>['mutateAsync']>): null {
  sink(useUpdateBar().mutateAsync);
  return null;
}
function ProbeDelete({ sink }: ProbeProps<ReturnType<typeof useDeleteBar>['mutateAsync']>): null {
  sink(useDeleteBar().mutateAsync);
  return null;
}

const SEED = {
  bars: [
    {
      id: 'bar-a',
      name: 'Alpha Bar',
      status: 'lead',
      notes: '',
      lastInteractionAt: null,
      city: null,
      capacity: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
    },
  ],
};

describe('bars mutations — optimistic updates', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  beforeEach(() => {
    stub = null;
  });
  afterEach(() => {
    stub?.restore();
  });

  it('useUpdateBar moves the card to the new kanban column instantly', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(barKeys.list(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useUpdateBar>['mutateAsync'] | null = null;
    const tree = mountWithClient(
      queryClient,
      <ProbeUpdate sink={(mutateAsync) => (dispatch = mutateAsync)} />,
    );
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useUpdateBar>['mutateAsync'] = dispatch;

    send({ id: 'bar-a', status: 'booked' }).catch(() => undefined);
    await flushMicrotasks();
    const midflight = queryClient.getQueryData<OptimisticListShape>(barKeys.list());
    expect(midflight?.bars[0]?.status).toBe('booked');

    pending.resolve(jsonResponse({ bar: { ...SEED.bars[0], status: 'booked' } }));
    await flushMicrotasks();
    tree.unmount();
  });

  it('useUpdateBar rolls back the kanban move on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(barKeys.list(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useUpdateBar>['mutateAsync'] | null = null;
    const tree = mountWithClient(
      queryClient,
      <ProbeUpdate sink={(mutateAsync) => (dispatch = mutateAsync)} />,
    );
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useUpdateBar>['mutateAsync'] = dispatch;

    send({ id: 'bar-a', status: 'booked' }).catch(() => undefined);
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(barKeys.list())?.bars[0]?.status).toBe(
      'booked',
    );

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(barKeys.list())?.bars[0]?.status).toBe(
      'lead',
    );
    tree.unmount();
  });

  it('useCreateBar inserts the new row before the server replies', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(barKeys.list(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useCreateBar>['mutateAsync'] | null = null;
    const tree = mountWithClient(
      queryClient,
      <ProbeCreate sink={(mutateAsync) => (dispatch = mutateAsync)} />,
    );
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useCreateBar>['mutateAsync'] = dispatch;

    send({ name: 'Zeta Bar', status: 'lead', notes: '' }).catch(() => undefined);
    await flushMicrotasks();
    const midflight = queryClient.getQueryData<OptimisticListShape>(barKeys.list());
    expect(midflight?.bars).toHaveLength(2);

    pending.resolve(jsonResponse({ bar: { ...SEED.bars[0], id: 'srv', name: 'Zeta Bar' } }, 201));
    await flushMicrotasks();
    tree.unmount();
  });

  it('useDeleteBar removes the row and restores on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(barKeys.list(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    let dispatch: ReturnType<typeof useDeleteBar>['mutateAsync'] | null = null;
    const tree = mountWithClient(
      queryClient,
      <ProbeDelete sink={(mutateAsync) => (dispatch = mutateAsync)} />,
    );
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useDeleteBar>['mutateAsync'] = dispatch;

    send({ id: 'bar-a' }).catch(() => undefined);
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(barKeys.list())?.bars).toHaveLength(0);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(barKeys.list())?.bars).toHaveLength(1);
    tree.unmount();
  });
});
