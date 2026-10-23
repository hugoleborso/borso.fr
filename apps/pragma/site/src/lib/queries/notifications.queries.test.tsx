import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  notificationKeys,
  useEnablePush,
  useNotificationPreferences,
  usePushSubscription,
  useUpdateNotificationPreference,
} from './notifications.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';

const SAVED_SUBSCRIPTION = {
  endpoint: 'https://push.example/device',
  keys: { p256dh: 'p', auth: 'a' },
};

const subscribeToPush = vi.fn<(key: string) => Promise<typeof SAVED_SUBSCRIPTION>>(() =>
  Promise.resolve(SAVED_SUBSCRIPTION),
);
const readExistingPushSubscription = vi.fn(() => Promise.resolve(SAVED_SUBSCRIPTION));

vi.mock('../push-subscription.adapter', () => ({
  subscribeToPush: (key: string) => subscribeToPush(key),
  readExistingPushSubscription: () => readExistingPushSubscription(),
}));

const SEED_PREFERENCES = {
  preferences: [
    { category: 'takes', enabled: true },
    { category: 'take_comments', enabled: true },
    { category: 'sessions', enabled: true },
    { category: 'setlists', enabled: true },
  ],
};

interface ProbeProps<Mutate> {
  sink: (mutate: Mutate) => void;
}

function ProbeEnable({ sink }: ProbeProps<ReturnType<typeof useEnablePush>['mutateAsync']>): null {
  sink(useEnablePush().mutateAsync);
  return null;
}

function ProbeToggle({
  sink,
}: ProbeProps<ReturnType<typeof useUpdateNotificationPreference>['mutateAsync']>): null {
  sink(useUpdateNotificationPreference().mutateAsync);
  return null;
}

function ProbeReads({ isSupported }: { isSupported: boolean }): null {
  usePushSubscription(isSupported);
  useNotificationPreferences();
  return null;
}

function readTakesToggle(queryClient: ReturnType<typeof createIsolatedQueryClient>) {
  const cached = queryClient.getQueryData<typeof SEED_PREFERENCES>(notificationKeys.preferences());
  return cached?.preferences.find((toggle) => toggle.category === 'takes')?.enabled;
}

describe('notifications queries', () => {
  let stub: ReturnType<typeof stubFetch> | null = null;

  afterEach(() => {
    stub?.restore();
    stub = null;
    subscribeToPush.mockClear();
    readExistingPushSubscription.mockClear();
  });

  it('reads the device subscription only where push exists, and the preferences always', async () => {
    stub = stubFetch(() => Promise.resolve(jsonResponse(SEED_PREFERENCES)));
    const queryClient = createIsolatedQueryClient();
    const tree = mountWithClient(queryClient, <ProbeReads isSupported={false} />);
    await flushMicrotasks();
    expect(readExistingPushSubscription).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(notificationKeys.preferences())).toEqual(SEED_PREFERENCES);
    expect(stub.calls[0]?.url).toContain('/api/notifications/preferences');
    tree.unmount();

    const supported = createIsolatedQueryClient();
    const secondTree = mountWithClient(supported, <ProbeReads isSupported />);
    await flushMicrotasks();
    expect(supported.getQueryData(notificationKeys.subscription())).toEqual(SAVED_SUBSCRIPTION);
    secondTree.unmount();
  });

  it('fails the preferences read on a refused answer', async () => {
    stub = stubFetch(() => Promise.resolve(jsonResponse({ error: 'nope' }, 500)));
    const queryClient = createIsolatedQueryClient();
    const tree = mountWithClient(queryClient, <ProbeReads isSupported={false} />);
    await flushMicrotasks();
    expect(queryClient.getQueryState(notificationKeys.preferences())?.status).toBe('error');
    tree.unmount();
  });

  it('subscribes this device with the server key and saves the subscription', async () => {
    stub = stubFetch((request) =>
      Promise.resolve(
        request.url.endsWith('/vapid-public-key')
          ? jsonResponse({ key: 'AQID' })
          : jsonResponse({ ok: true }, 201),
      ),
    );
    const queryClient = createIsolatedQueryClient();
    const slot = createMutateSlot<ReturnType<typeof useEnablePush>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeEnable sink={slot.sink} />);

    await slot.read()();
    await flushMicrotasks();

    expect(subscribeToPush).toHaveBeenCalledWith('AQID');
    const saved = stub.calls[1];
    expect(saved?.method).toBe('POST');
    expect(saved?.url).toContain('/api/notifications/subscriptions');
    expect(await saved?.json()).toEqual(SAVED_SUBSCRIPTION);
    expect(queryClient.getQueryData(notificationKeys.subscription())).toEqual(SAVED_SUBSCRIPTION);
    tree.unmount();
  });

  it('stops before asking the browser when push is not configured on this stage', async () => {
    stub = stubFetch(() => Promise.resolve(jsonResponse({ error: 'push-not-configured' }, 503)));
    const queryClient = createIsolatedQueryClient();
    const slot = createMutateSlot<ReturnType<typeof useEnablePush>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeEnable sink={slot.sink} />);

    await expect(slot.read()()).rejects.toMatchObject({ status: 503 });
    expect(subscribeToPush).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(notificationKeys.subscription())).toBeUndefined();
    tree.unmount();
  });

  it('reports a subscription the server refused to save', async () => {
    stub = stubFetch((request) =>
      Promise.resolve(
        request.url.endsWith('/vapid-public-key')
          ? jsonResponse({ key: 'AQID' })
          : jsonResponse({ error: 'bad' }, 400),
      ),
    );
    const queryClient = createIsolatedQueryClient();
    const slot = createMutateSlot<ReturnType<typeof useEnablePush>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeEnable sink={slot.sink} />);

    await expect(slot.read()()).rejects.toMatchObject({ status: 400 });
    expect(queryClient.getQueryData(notificationKeys.subscription())).toBeUndefined();
    tree.unmount();
  });

  it('shows a toggle flipped before the server answers, then keeps the answer', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(notificationKeys.preferences(), SEED_PREFERENCES);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);
    const slot =
      createMutateSlot<ReturnType<typeof useUpdateNotificationPreference>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeToggle sink={slot.sink} />);

    const inflight = slot.read()({ category: 'takes', enabled: false });
    await flushMicrotasks();
    expect(readTakesToggle(queryClient)).toBe(false);
    expect(await stub.calls[0]?.json()).toEqual({ category: 'takes', enabled: false });

    const answered = {
      preferences: SEED_PREFERENCES.preferences.map((toggle) => ({ ...toggle, enabled: false })),
    };
    pending.resolve(jsonResponse(answered));
    await inflight;
    expect(queryClient.getQueryData(notificationKeys.preferences())).toEqual(answered);
    expect(stub.calls).toHaveLength(1);
    tree.unmount();
  });

  it('puts the toggle back when the server refuses it', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(notificationKeys.preferences(), SEED_PREFERENCES);
    const pending = deferred<Response>();
    stub = stubFetch(() => pending.promise);
    const slot =
      createMutateSlot<ReturnType<typeof useUpdateNotificationPreference>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeToggle sink={slot.sink} />);

    const inflight = slot.read()({ category: 'takes', enabled: false });
    inflight.catch(() => undefined);
    await flushMicrotasks();
    expect(readTakesToggle(queryClient)).toBe(false);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await expect(inflight).rejects.toMatchObject({ status: 500 });
    expect(queryClient.getQueryData(notificationKeys.preferences())).toEqual(SEED_PREFERENCES);
    tree.unmount();
  });

  it('writes nothing into a cache that holds no preferences yet', async () => {
    const queryClient = createIsolatedQueryClient();
    stub = stubFetch(() => Promise.resolve(jsonResponse({ error: 'boom' }, 500)));
    const slot =
      createMutateSlot<ReturnType<typeof useUpdateNotificationPreference>['mutateAsync']>();
    const tree = mountWithClient(queryClient, <ProbeToggle sink={slot.sink} />);

    await expect(slot.read()({ category: 'takes', enabled: false })).rejects.toBeInstanceOf(Error);
    expect(queryClient.getQueryData(notificationKeys.preferences())).toBeUndefined();
    tree.unmount();
  });
});
