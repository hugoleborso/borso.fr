import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assistantGrantKeys,
  type AssistantGrantSummary,
  useDecideConsent,
  useRevokeAssistantGrant,
} from './assistant-grants.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

const leavePageFor = vi.fn<(address: string) => void>();

vi.mock('../page-location.adapter', () => ({
  leavePageFor: (address: string) => leavePageFor(address),
}));

type RevokeDispatch = ReturnType<typeof useRevokeAssistantGrant>['mutateAsync'];
type DecideDispatch = ReturnType<typeof useDecideConsent>['mutateAsync'];

function ProbeRevoke({ sink }: { sink: (dispatch: RevokeDispatch) => void }): null {
  sink(useRevokeAssistantGrant().mutateAsync);
  return null;
}

function ProbeDecide({ sink }: { sink: (dispatch: DecideDispatch) => void }): null {
  sink(useDecideConsent().mutateAsync);
  return null;
}

const SEEDED_GRANTS: AssistantGrantSummary[] = [
  {
    id: 'grant-claude',
    clientName: 'Claude Code',
    createdAt: '2026-10-23T10:00:00.000Z',
    lastUsedAt: '2026-10-27T11:58:00.000Z',
  },
  {
    id: 'grant-vibe',
    clientName: 'Mistral Vibe',
    createdAt: '2026-10-20T10:00:00.000Z',
    lastUsedAt: null,
  },
];

const CONSENT_QUERY = { client_id: 'client-1', state: 'opaque-state' };

const installedStubs: ReturnType<typeof stubFetch>[] = [];

function installFetch(handler: Parameters<typeof stubFetch>[0]): ReturnType<typeof stubFetch> {
  const installed = stubFetch(handler);
  installedStubs.push(installed);
  return installed;
}

afterEach(() => {
  for (const installed of installedStubs.splice(0)) installed.restore();
  leavePageFor.mockClear();
});

// @FollowsBlueprint test-query-hook
describe('useRevokeAssistantGrant', () => {
  it('keeps the grant listed until the server has deleted it, then drops only that one', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(assistantGrantKeys.list(), SEEDED_GRANTS);
    const pending = deferred<Response>();
    const stub = installFetch(() => pending.promise);
    const slot = createMutateSlot<RevokeDispatch>();
    const tree = mountWithClient(queryClient, <ProbeRevoke sink={slot.sink} />);

    const inflight = slot.read()({ grantId: 'grant-claude' });
    await flushMicrotasks();
    expect(queryClient.getQueryData(assistantGrantKeys.list())).toEqual(SEEDED_GRANTS);

    pending.resolve(jsonResponse({ ok: true }));
    await inflight;
    await flushMicrotasks();
    expect(queryClient.getQueryData(assistantGrantKeys.list())).toEqual([SEEDED_GRANTS[1]]);
    expect(stub.calls[0]?.method).toBe('DELETE');
    expect(stub.calls[0]?.url).toContain('/api/assistant-grants/grant-claude');
    expect(stub.calls).toHaveLength(1);
    tree.unmount();
  });

  it('leaves the list untouched when the server refuses', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(assistantGrantKeys.list(), SEEDED_GRANTS);
    installFetch(async () => jsonResponse({ error: 'assistant-grant-not-found' }, 404));
    const slot = createMutateSlot<RevokeDispatch>();
    const tree = mountWithClient(queryClient, <ProbeRevoke sink={slot.sink} />);

    await expect(slot.read()({ grantId: 'grant-claude' })).rejects.toThrow();
    expect(queryClient.getQueryData(assistantGrantKeys.list())).toEqual(SEEDED_GRANTS);
    tree.unmount();
  });

  it('writes nothing into a list that was never read', async () => {
    const queryClient = createIsolatedQueryClient();
    installFetch(async () => jsonResponse({ ok: true }));
    const slot = createMutateSlot<RevokeDispatch>();
    const tree = mountWithClient(queryClient, <ProbeRevoke sink={slot.sink} />);

    await slot.read()({ grantId: 'grant-claude' });
    expect(queryClient.getQueryData(assistantGrantKeys.list())).toBeUndefined();
    tree.unmount();
  });
});

describe('useDecideConsent', () => {
  it('posts the authorization request with the decision, then leaves for the redirect', async () => {
    const queryClient = createIsolatedQueryClient();
    const redirectTo = 'http://127.0.0.1:4000/callback?code=abc&state=opaque-state';
    const stub = installFetch(async () => jsonResponse({ redirectTo }));
    const slot = createMutateSlot<DecideDispatch>();
    const tree = mountWithClient(queryClient, <ProbeDecide sink={slot.sink} />);

    await slot.read()({ query: CONSENT_QUERY, decision: 'allow' });
    await flushMicrotasks();
    const sentBody: unknown = await stub.calls[0]?.json();
    expect(sentBody).toEqual({ ...CONSENT_QUERY, decision: 'allow' });
    expect(leavePageFor).toHaveBeenCalledWith(redirectTo);
    tree.unmount();
  });

  it('stays on the page when the server refuses the request', async () => {
    const queryClient = createIsolatedQueryClient();
    installFetch(async () => jsonResponse({ error: 'invalid-authorization-request' }, 400));
    const slot = createMutateSlot<DecideDispatch>();
    const tree = mountWithClient(queryClient, <ProbeDecide sink={slot.sink} />);

    await expect(slot.read()({ query: CONSENT_QUERY, decision: 'deny' })).rejects.toThrow();
    expect(leavePageFor).not.toHaveBeenCalled();
    tree.unmount();
  });
});
