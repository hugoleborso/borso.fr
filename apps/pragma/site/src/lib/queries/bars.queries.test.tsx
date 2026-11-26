import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { barKeys, useCreateBar, useDeleteBar, useUpdateBar } from './bars.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

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
      city: null,
      capacity: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      ownerMemberId: null,
    },
  ],
};

// @FollowsBlueprint test-query-hook
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

    const slot = createMutateSlot<ReturnType<typeof useUpdateBar>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);
    const send = slot.read();

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

    const slot = createMutateSlot<ReturnType<typeof useUpdateBar>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);
    const send = slot.read();

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

    const slot = createMutateSlot<ReturnType<typeof useCreateBar>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);
    const send = slot.read();

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

    const slot = createMutateSlot<ReturnType<typeof useDeleteBar>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'bar-a' }).catch(() => undefined);
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(barKeys.list())?.bars).toHaveLength(0);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(queryClient.getQueryData<OptimisticListShape>(barKeys.list())?.bars).toHaveLength(1);
    tree.unmount();
  });

  it('useUpdateBar keeps a saved rename when an earlier rename failed and put its snapshot back', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(barKeys.list(), SEED);
    const firstAnswer = deferred<Response>();
    const secondAnswer = deferred<Response>();
    let calls = 0;
    stub = stubFetch(async () => {
      calls += 1;
      return await (calls === 1 ? firstAnswer.promise : secondAnswer.promise);
    });

    const slot = createMutateSlot<ReturnType<typeof useUpdateBar>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'bar-a', name: 'First try' }).catch(() => undefined);
    const second = send({ id: 'bar-a', name: 'Second try' });
    await flushMicrotasks();
    firstAnswer.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    secondAnswer.resolve(jsonResponse({ bar: { ...SEED.bars[0], name: 'Second try' } }));
    await second;
    expect(queryClient.getQueryData<OptimisticListShape>(barKeys.list())?.bars[0]?.name).toBe(
      'Second try',
    );
    tree.unmount();
  });

  it('useDeleteBar keeps a deleted bar out when an earlier deletion failed and put its snapshot back', async () => {
    const queryClient = createIsolatedQueryClient();
    const secondBar = { ...SEED.bars[0], id: 'bar-b', name: 'Beta Bar' };
    queryClient.setQueryData(barKeys.list(), { bars: [...SEED.bars, secondBar] });
    const firstAnswer = deferred<Response>();
    const secondAnswer = deferred<Response>();
    stub = stubFetch(
      async (request) =>
        await (request.url.endsWith('bar-a') ? firstAnswer.promise : secondAnswer.promise),
    );

    const slot = createMutateSlot<ReturnType<typeof useDeleteBar>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'bar-a' }).catch(() => undefined);
    const second = send({ id: 'bar-b' });
    await flushMicrotasks();
    firstAnswer.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    secondAnswer.resolve(jsonResponse({ ok: true }));
    await second;
    const ids = queryClient
      .getQueryData<OptimisticListShape>(barKeys.list())
      ?.bars.map((bar) => bar.id);
    expect(ids).toEqual(['bar-a']);
    tree.unmount();
  });
});
