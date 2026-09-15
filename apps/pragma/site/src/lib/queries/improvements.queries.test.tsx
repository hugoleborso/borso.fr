import { afterEach, describe, expect, it } from 'vitest';
import {
  improvementKeys,
  useImprovementsList,
  useUpdateImprovement,
  useVoteOnImprovement,
} from './improvements.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

interface ImprovementShape {
  id: string;
  title: string;
  details: string;
  status: string;
  authorMemberId: string;
  createdAt: string;
  voteCount: number;
  votedByViewer: boolean;
}

function improvement(overrides: Partial<ImprovementShape> = {}): ImprovementShape {
  return {
    id: 'improvement-1',
    title: 'Dark mode',
    details: '',
    status: 'idea',
    authorMemberId: 'member-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    voteCount: 1,
    votedByViewer: false,
    ...overrides,
  };
}

function ProbeVote({
  sink,
}: {
  sink: (mutate: ReturnType<typeof useVoteOnImprovement>['mutateAsync']) => void;
}): null {
  useImprovementsList();
  sink(useVoteOnImprovement().mutateAsync);
  return null;
}

describe('useVoteOnImprovement', () => {
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  afterEach(() => {
    fetchStub?.restore();
    fetchStub = null;
  });

  it('shows the vote before the server answers, then settles on the row it returned', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(improvementKeys.list(), { improvements: [improvement()] });
    const pending = deferred<Response>();
    fetchStub = stubFetch(async (request) =>
      request.method === 'GET'
        ? jsonResponse({ improvements: [improvement()] })
        : await pending.promise,
    );
    const slot = createMutateSlot<ReturnType<typeof useVoteOnImprovement>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeVote sink={slot.sink} />);

    void slot.read()({ id: 'improvement-1', intent: 'cast' });
    await flushMicrotasks();
    const optimistic = queryClient.getQueryData<{ improvements: ImprovementShape[] }>(
      improvementKeys.list(),
    );
    expect(optimistic?.improvements[0]).toMatchObject({ voteCount: 2, votedByViewer: true });

    pending.resolve(
      jsonResponse({ improvement: improvement({ voteCount: 7, votedByViewer: true }) }),
    );
    await flushMicrotasks();
    const settled = queryClient.getQueryData<{ improvements: ImprovementShape[] }>(
      improvementKeys.list(),
    );
    expect(settled?.improvements[0]?.voteCount).toBe(7);
    tree.unmount();
  });

  it('rolls the list back when the write fails', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(improvementKeys.list(), { improvements: [improvement()] });
    fetchStub = stubFetch(async (request) =>
      request.method === 'GET'
        ? jsonResponse({ improvements: [improvement()] })
        : jsonResponse({ error: 'not-found' }, 404),
    );
    const slot = createMutateSlot<ReturnType<typeof useVoteOnImprovement>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeVote sink={slot.sink} />);

    await slot
      .read()({ id: 'improvement-1', intent: 'cast' })
      .catch(() => undefined);
    await flushMicrotasks();
    const rolledBack = queryClient.getQueryData<{ improvements: ImprovementShape[] }>(
      improvementKeys.list(),
    );
    expect(rolledBack?.improvements[0]).toMatchObject({ voteCount: 1, votedByViewer: false });
    tree.unmount();
  });

  it('sends a DELETE when the viewer withdraws a vote', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(improvementKeys.list(), {
      improvements: [improvement({ voteCount: 1, votedByViewer: true })],
    });
    fetchStub = stubFetch(async (request) =>
      request.method === 'GET'
        ? jsonResponse({ improvements: [improvement({ voteCount: 1, votedByViewer: true })] })
        : jsonResponse({ improvement: improvement({ voteCount: 0, votedByViewer: false }) }),
    );
    const slot = createMutateSlot<ReturnType<typeof useVoteOnImprovement>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeVote sink={slot.sink} />);

    await slot.read()({ id: 'improvement-1', intent: 'withdraw' });
    await flushMicrotasks();
    expect(fetchStub.calls.at(-1)?.method).toBe('DELETE');
    tree.unmount();
  });
});

function ProbeUpdate({
  sink,
}: {
  sink: (mutate: ReturnType<typeof useUpdateImprovement>['mutateAsync']) => void;
}): null {
  useImprovementsList();
  sink(useUpdateImprovement().mutateAsync);
  return null;
}

describe('useUpdateImprovement', () => {
  let fetchStub: ReturnType<typeof stubFetch> | null = null;

  afterEach(() => {
    fetchStub?.restore();
    fetchStub = null;
  });

  it('drops an improvement below the open ones the moment it is shipped', async () => {
    const queryClient = createIsolatedQueryClient();
    const promoted = improvement({ id: 'promoted', title: 'Promoted', voteCount: 5 });
    const quiet = improvement({ id: 'quiet', title: 'Quiet', voteCount: 0 });
    queryClient.setQueryData(improvementKeys.list(), { improvements: [promoted, quiet] });
    fetchStub = stubFetch(async (request) =>
      request.method === 'GET'
        ? jsonResponse({ improvements: [promoted, quiet] })
        : jsonResponse({ improvement: { ...promoted, status: 'shipped' } }),
    );
    const slot = createMutateSlot<ReturnType<typeof useUpdateImprovement>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);

    await slot.read()({ id: 'promoted', status: 'shipped' });
    await flushMicrotasks();
    const reranked = queryClient.getQueryData<{ improvements: ImprovementShape[] }>(
      improvementKeys.list(),
    );
    expect(reranked?.improvements.map((row) => row.id)).toEqual(['quiet', 'promoted']);
    tree.unmount();
  });
});
