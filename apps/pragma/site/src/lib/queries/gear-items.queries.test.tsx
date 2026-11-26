import { afterEach, describe, expect, it } from 'vitest';
import {
  gearItemKeys,
  useCreateGearItem,
  useGearChecklist,
  useUpdateGearItem,
} from './gear-items.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

const SESSION_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const MULTIPRISE = {
  id: '00000000-7777-4777-8777-777777777777',
  sessionId: SESSION_ID,
  label: 'Multiprise',
  status: 'to_find',
  memberId: null,
  position: 0,
};
const SONO_ID = '00000001-7777-4777-8777-777777777777';

interface ChecklistShape {
  readonly items: readonly {
    readonly id: string;
    readonly status: string;
    readonly position: number;
  }[];
}

function readChecklist(
  queryClient: ReturnType<typeof createIsolatedQueryClient>,
): ChecklistShape | undefined {
  return queryClient.getQueryData<ChecklistShape>(gearItemKeys.checklist(SESSION_ID));
}

function ProbeUpdate({
  sink,
}: {
  readonly sink: (mutate: ReturnType<typeof useUpdateGearItem>['mutateAsync']) => void;
}): null {
  useGearChecklist(SESSION_ID);
  sink(useUpdateGearItem().mutateAsync);
  return null;
}

function ProbeCreate({
  sink,
}: {
  readonly sink: (mutate: ReturnType<typeof useCreateGearItem>['mutateAsync']) => void;
}): null {
  useGearChecklist(SESSION_ID);
  sink(useCreateGearItem().mutateAsync);
  return null;
}

// @FollowsBlueprint test-query-hook
describe('the gear item writes', () => {
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  afterEach(() => {
    fetchStub?.restore();
    fetchStub = null;
  });

  it('restores the list when the write fails', async () => {
    const queryClient = createIsolatedQueryClient();
    const listed = { items: [MULTIPRISE], copySource: null };
    queryClient.setQueryData(gearItemKeys.checklist(SESSION_ID), listed);
    const pending = deferred<Response>();
    fetchStub = stubFetch(async (request) =>
      request.method === 'GET' ? jsonResponse(listed) : await pending.promise,
    );
    const slot = createMutateSlot<ReturnType<typeof useUpdateGearItem>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);

    const write = slot
      .read()({
        sessionId: SESSION_ID,
        id: MULTIPRISE.id,
        status: 'asked_of_venue',
        memberId: null,
      })
      .catch(() => undefined);
    await flushMicrotasks();
    expect(readChecklist(queryClient)?.items[0]?.status).toBe('asked_of_venue');

    pending.resolve(jsonResponse({ error: 'not-found' }, 404));
    await write;
    await flushMicrotasks();
    expect(readChecklist(queryClient)?.items[0]?.status).toBe('to_find');
    tree.unmount();
  });

  it('shows a new item at the end of the list under the id the device chose, then keeps the stored row', async () => {
    const queryClient = createIsolatedQueryClient();
    const listed = { items: [MULTIPRISE], copySource: null };
    queryClient.setQueryData(gearItemKeys.checklist(SESSION_ID), listed);
    const pending = deferred<Response>();
    fetchStub = stubFetch(async (request) =>
      request.method === 'GET' ? jsonResponse(listed) : await pending.promise,
    );
    const slot = createMutateSlot<ReturnType<typeof useCreateGearItem>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);

    const write = slot.read()({
      sessionId: SESSION_ID,
      id: SONO_ID,
      label: 'Sono',
      status: 'asked_of_venue',
      memberId: null,
    });
    await flushMicrotasks();
    expect(readChecklist(queryClient)?.items[1]).toMatchObject({ id: SONO_ID, position: 1 });

    pending.resolve(
      jsonResponse(
        {
          item: {
            ...MULTIPRISE,
            id: SONO_ID,
            label: 'Sono',
            status: 'asked_of_venue',
            position: 7,
          },
        },
        201,
      ),
    );
    await write;
    await flushMicrotasks();
    expect(readChecklist(queryClient)?.items.map((item) => item.position)).toStrictEqual([0, 7]);
    tree.unmount();
  });
});
