import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  instrumentKeys,
  useCreateInstrument,
  useDeleteInstrument,
  useInstrumentsList,
  useUpdateInstrument,
} from './instruments.queries';
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
  instruments: { id: string; name: string }[];
}

interface ProbeProps<Mutate> {
  sink: (mutate: Mutate) => void;
}

function ProbeCreate({
  sink,
}: ProbeProps<ReturnType<typeof useCreateInstrument>['mutateAsync']>): null {
  sink(useCreateInstrument().mutateAsync);
  return null;
}
function ProbeUpdate({
  sink,
}: ProbeProps<ReturnType<typeof useUpdateInstrument>['mutateAsync']>): null {
  sink(useUpdateInstrument().mutateAsync);
  return null;
}
function ProbeDelete({
  sink,
}: ProbeProps<ReturnType<typeof useDeleteInstrument>['mutateAsync']>): null {
  sink(useDeleteInstrument().mutateAsync);
  return null;
}

function ProbeDeleteOnTheListScreen({
  sink,
}: ProbeProps<ReturnType<typeof useDeleteInstrument>['mutateAsync']>): null {
  useInstrumentsList();
  sink(useDeleteInstrument().mutateAsync);
  return null;
}

const SEED = {
  instruments: [{ id: 'instr-a', name: 'Guitar', isHarmonic: true }],
};

// @FollowsBlueprint test-query-hook
describe('instruments mutations — optimistic updates', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  beforeEach(() => {
    stub = null;
  });
  afterEach(() => {
    stub?.restore();
  });

  it('useCreateInstrument inserts and rolls back on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(instrumentKeys.list(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useCreateInstrument>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);
    const send = slot.read();

    send({ name: 'Bass', family: 'harmonic' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticListShape>(instrumentKeys.list())?.instruments,
    ).toHaveLength(2);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticListShape>(instrumentKeys.list())?.instruments,
    ).toHaveLength(1);
    tree.unmount();
  });

  it('useUpdateInstrument patches the row in place', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(instrumentKeys.list(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useUpdateInstrument>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'instr-a', name: 'Acoustic Guitar' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticListShape>(instrumentKeys.list())?.instruments[0]?.name,
    ).toBe('Acoustic Guitar');

    pending.resolve(
      jsonResponse({ instrument: { ...SEED.instruments[0], name: 'Acoustic Guitar' } }),
    );
    await flushMicrotasks();
    tree.unmount();
  });

  it('useDeleteInstrument removes the row', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(instrumentKeys.list(), SEED);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useDeleteInstrument>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'instr-a' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticListShape>(instrumentKeys.list())?.instruments,
    ).toHaveLength(0);

    pending.resolve(jsonResponse({ id: 'instr-a', deleted: true }));
    await flushMicrotasks();
    tree.unmount();
  });

  it('useDeleteInstrument keeps the row out when a read would still serve it', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(instrumentKeys.list(), SEED);
    stub = stubFetch(async (request) =>
      request.method === 'DELETE'
        ? jsonResponse({ id: 'instr-a', deleted: true })
        : jsonResponse(SEED),
    );

    const slot = createMutateSlot<ReturnType<typeof useDeleteInstrument>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeDeleteOnTheListScreen sink={slot.sink} />);
    await flushMicrotasks();
    const callsBeforeTheDelete = stub.calls.length;

    await slot.read()({ id: 'instr-a' });
    await flushMicrotasks();

    expect(
      queryClient.getQueryData<OptimisticListShape>(instrumentKeys.list())?.instruments,
    ).toHaveLength(0);
    expect(stub.calls.slice(callsBeforeTheDelete).map((call) => call.method)).toStrictEqual([
      'DELETE',
    ]);
    tree.unmount();
  });

  it('useCreateInstrument settles the temporary row from the response', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(instrumentKeys.list(), SEED);
    const persisted = { id: 'instr-b', name: 'Bass', family: 'harmonic' };
    stub = stubFetch(async () => jsonResponse({ instrument: persisted }, 201));

    const slot = createMutateSlot<ReturnType<typeof useCreateInstrument>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);

    await slot.read()({ name: 'Bass', family: 'harmonic' });
    await flushMicrotasks();

    const instruments = queryClient.getQueryData<OptimisticListShape>(
      instrumentKeys.list(),
    )?.instruments;
    expect(instruments?.map((instrument) => instrument.id)).toStrictEqual(['instr-a', 'instr-b']);
    expect(stub.calls.map((call) => call.method)).toStrictEqual(['POST']);
    tree.unmount();
  });
});
