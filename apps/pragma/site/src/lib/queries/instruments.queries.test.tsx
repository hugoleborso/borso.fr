/**
 * Tests for the optimistic write path on the instruments mutations.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  instrumentKeys,
  useCreateInstrument,
  useDeleteInstrument,
  useUpdateInstrument,
} from './instruments';
import {
  createIsolatedQueryClient,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './test-helpers';

interface OptimisticListShape {
  instruments: { id: string; name: string; isHarmonic: boolean }[];
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

const SEED = {
  instruments: [{ id: 'instr-a', name: 'Guitar', isHarmonic: true }],
};

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

    let dispatch: ReturnType<typeof useCreateInstrument>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeCreate sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useCreateInstrument>['mutateAsync'] = dispatch;

    send({ name: 'Bass', isHarmonic: true }).catch(() => undefined);
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

    let dispatch: ReturnType<typeof useUpdateInstrument>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useUpdateInstrument>['mutateAsync'] = dispatch;

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

    let dispatch: ReturnType<typeof useDeleteInstrument>['mutateAsync'] | null = null;
    const tree = mountWithClient(queryClient, <ProbeDelete sink={(m) => (dispatch = m)} />);
    if (dispatch === null) throw new Error('no mutate');
    const send: ReturnType<typeof useDeleteInstrument>['mutateAsync'] = dispatch;

    send({ id: 'instr-a' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticListShape>(instrumentKeys.list())?.instruments,
    ).toHaveLength(0);

    pending.resolve(jsonResponse({ id: 'instr-a', deleted: true }));
    await flushMicrotasks();
    tree.unmount();
  });
});
