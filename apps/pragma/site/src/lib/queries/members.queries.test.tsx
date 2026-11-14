import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inspirationKeys } from './inspirations.queries';
import { instrumentKeys } from './instruments.queries';
import {
  memberKeys,
  useAssignMemberInstruments,
  useCreateMember,
  useDeleteMember,
  useUpdateMember,
} from './members.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

interface OptimisticMembersList {
  members: { id: string; firstName: string; color: string; avatarS3Key: string | null }[];
}
interface OptimisticRoster {
  instruments: { id: string; name: string; isHarmonic: boolean }[];
}

interface ProbeProps<Mutate> {
  sink: (mutate: Mutate) => void;
}
function ProbeCreate({
  sink,
}: ProbeProps<ReturnType<typeof useCreateMember>['mutateAsync']>): null {
  sink(useCreateMember().mutateAsync);
  return null;
}
function ProbeUpdate({
  sink,
}: ProbeProps<ReturnType<typeof useUpdateMember>['mutateAsync']>): null {
  sink(useUpdateMember().mutateAsync);
  return null;
}
function ProbeDelete({
  sink,
}: ProbeProps<ReturnType<typeof useDeleteMember>['mutateAsync']>): null {
  sink(useDeleteMember().mutateAsync);
  return null;
}
function ProbeAssign({
  sink,
}: ProbeProps<ReturnType<typeof useAssignMemberInstruments>['mutateAsync']>): null {
  sink(useAssignMemberInstruments().mutateAsync);
  return null;
}

const SEED_MEMBERS = {
  members: [{ id: 'mem-a', firstName: 'Alice', color: '#abcdef', avatarS3Key: null }],
};
const OUTREACH_KEY = ['outreach', 'list'] as const;
const SEED_INSTRUMENTS = {
  instruments: [
    { id: 'instr-a', name: 'Guitar', isHarmonic: true },
    { id: 'instr-b', name: 'Drums', isHarmonic: false },
  ],
};

// @FollowsBlueprint test-query-hook
describe('members mutations — optimistic updates', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;
  beforeEach(() => {
    stub = null;
  });
  afterEach(() => {
    stub?.restore();
  });

  it('useCreateMember inserts the new row and rolls back on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(memberKeys.list(), SEED_MEMBERS);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useCreateMember>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);
    const send = slot.read();

    send({ firstName: 'Bob', color: '#123456' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticMembersList>(memberKeys.list())?.members,
    ).toHaveLength(2);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticMembersList>(memberKeys.list())?.members,
    ).toHaveLength(1);
    tree.unmount();
  });

  it('useUpdateMember patches the row in place', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(memberKeys.list(), SEED_MEMBERS);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useUpdateMember>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'mem-a', firstName: 'Alicia' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticMembersList>(memberKeys.list())?.members[0]?.firstName,
    ).toBe('Alicia');

    pending.resolve(jsonResponse({ member: { ...SEED_MEMBERS.members[0], firstName: 'Alicia' } }));
    await flushMicrotasks();
    tree.unmount();
  });

  it('useDeleteMember removes the row and restores on 500', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(memberKeys.list(), SEED_MEMBERS);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useDeleteMember>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);
    const send = slot.read();

    send({ id: 'mem-a' }).catch(() => undefined);
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticMembersList>(memberKeys.list())?.members,
    ).toHaveLength(0);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(
      queryClient.getQueryData<OptimisticMembersList>(memberKeys.list())?.members,
    ).toHaveLength(1);
    tree.unmount();
  });

  it('useDeleteMember makes the writer\'s own inspirations stale, so the card reads "former member", and leaves its list alone', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(memberKeys.list(), SEED_MEMBERS);
    queryClient.setQueryData(inspirationKeys.list(), { inspirations: [] });
    queryClient.setQueryData(OUTREACH_KEY, { contacts: [] });
    stub = stubFetch(() => Promise.resolve(jsonResponse({ ok: true })));

    const slot = createMutateSlot<ReturnType<typeof useDeleteMember>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);
    await slot.read()({ id: 'mem-a' });
    await flushMicrotasks();

    expect(queryClient.getQueryState(inspirationKeys.list())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(memberKeys.list())?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(OUTREACH_KEY)?.isInvalidated).toBe(false);
    tree.unmount();
  });

  it("useUpdateMember makes the writer's own inspirations stale, so a renamed author shows", async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(memberKeys.list(), SEED_MEMBERS);
    queryClient.setQueryData(inspirationKeys.list(), { inspirations: [] });
    stub = stubFetch(() => Promise.resolve(jsonResponse({ ok: true })));

    const slot = createMutateSlot<ReturnType<typeof useUpdateMember>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);
    await slot.read()({ id: 'mem-a', firstName: 'Alicia' });
    await flushMicrotasks();

    expect(queryClient.getQueryState(inspirationKeys.list())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(memberKeys.list())?.isInvalidated).toBe(false);
    tree.unmount();
  });

  it('useAssignMemberInstruments swaps the roster using the instruments cache as the lookup source', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(instrumentKeys.list(), SEED_INSTRUMENTS);
    queryClient.setQueryData(memberKeys.instrumentsOf('mem-a'), {
      instruments: [SEED_INSTRUMENTS.instruments[0]],
    });
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);

    const slot = createMutateSlot<ReturnType<typeof useAssignMemberInstruments>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeAssign sink={slot.sink} />);
    const send = slot.read();

    send({ memberId: 'mem-a', instrumentIds: ['instr-a', 'instr-b'] }).catch(() => undefined);
    await flushMicrotasks();
    const midflight = queryClient.getQueryData<OptimisticRoster>(memberKeys.instrumentsOf('mem-a'));
    expect(midflight?.instruments.map((instrument) => instrument.id)).toEqual([
      'instr-a',
      'instr-b',
    ]);

    pending.resolve(jsonResponse({ id: 'mem-a', instrumentIds: ['instr-a', 'instr-b'] }));
    await flushMicrotasks();
    tree.unmount();
  });
});
