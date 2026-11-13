import { afterEach, describe, expect, it } from 'vitest';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';
import {
  inspirationKeys,
  type InspirationRecord,
  useCreateInspiration,
  useDeleteInspiration,
  useUpdateInspiration,
} from './inspirations.queries';

const NEW_ID = '11111111-1111-4111-8111-111111111111';
const FIELDS = {
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: 'Call Me Maybe',
  artist: 'Carly Rae Jepsen',
  deezerTrackId: null,
  deezerAlbumId: null,
  startSeconds: 52,
  endSeconds: 64,
  note: '',
};
const LISTED: InspirationRecord = {
  ...FIELDS,
  id: '22222222-2222-4222-8222-222222222222',
  title: 'In the Air Tonight',
  authorMemberId: 'member-2',
  authorName: 'Thomas',
  createdAt: '2026-11-12T10:00:00.000Z',
  sketchCount: 1,
};

type CreateInspiration = ReturnType<typeof useCreateInspiration>['mutateAsync'];
type UpdateInspiration = ReturnType<typeof useUpdateInspiration>['mutateAsync'];
type DeleteInspiration = ReturnType<typeof useDeleteInspiration>['mutateAsync'];

function ProbeCreate({ sink }: { readonly sink: (mutate: CreateInspiration) => void }): null {
  sink(useCreateInspiration().mutateAsync);
  return null;
}

function ProbeUpdate({ sink }: { readonly sink: (mutate: UpdateInspiration) => void }): null {
  sink(useUpdateInspiration().mutateAsync);
  return null;
}

function ProbeDelete({ sink }: { readonly sink: (mutate: DeleteInspiration) => void }): null {
  sink(useDeleteInspiration().mutateAsync);
  return null;
}

const activeStubs: ReturnType<typeof stubFetch>[] = [];

function stubTransport(handler: (request: Request) => Promise<Response>) {
  const transportStub = stubFetch(handler);
  activeStubs.push(transportStub);
  return transportStub;
}

afterEach(() => {
  for (const transportStub of activeStubs.splice(0).reverse()) transportStub.restore();
});

function readList(queryClient: ReturnType<typeof createIsolatedQueryClient>) {
  return queryClient.getQueryData<{ inspirations: InspirationRecord[] }>(inspirationKeys.list())
    ?.inspirations;
}

// @FollowsBlueprint test-query-hook
describe('useCreateInspiration', () => {
  it('shows the new inspiration first at once, by the signed-in member, and settles it from the answer', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(inspirationKeys.list(), { inspirations: [LISTED] });
    const pending = deferred<Response>();
    const stub = stubTransport(() => pending.promise);
    const slot = createMutateSlot<CreateInspiration>();
    const tree = mountWithClient(queryClient, <ProbeCreate sink={slot.sink} />);

    const creation = slot.read()({
      inspiration: { id: NEW_ID, ...FIELDS },
      author: { memberId: 'member-1', firstName: 'Hugo' },
    });
    await flushMicrotasks();
    expect(readList(queryClient)?.map((inspiration) => inspiration.id)).toEqual([
      NEW_ID,
      LISTED.id,
    ]);
    expect(readList(queryClient)?.[0]).toEqual(
      expect.objectContaining({ authorName: 'Hugo', sketchCount: 0 }),
    );

    const stored = {
      ...FIELDS,
      id: NEW_ID,
      authorMemberId: 'member-1',
      authorName: 'Hugo',
      createdAt: '2026-11-13T10:00:00.000Z',
      sketchCount: 0,
    };
    pending.resolve(jsonResponse({ inspiration: stored }, 201));
    await creation;
    await flushMicrotasks();

    expect(readList(queryClient)).toEqual([stored, LISTED]);
    expect(stub.calls.filter((request) => request.method === 'GET')).toEqual([]);
    tree.unmount();
  });
});

describe('useUpdateInspiration', () => {
  it('shows the edited passage at once and puts the old one back when the server refuses', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(inspirationKeys.list(), { inspirations: [LISTED] });
    const pending = deferred<Response>();
    stubTransport(() => pending.promise);
    const slot = createMutateSlot<UpdateInspiration>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);

    slot
      .read()({ id: LISTED.id, changes: { ...FIELDS, startSeconds: 40 } })
      .catch(() => undefined);
    await flushMicrotasks();
    expect(readList(queryClient)?.[0]).toEqual(
      expect.objectContaining({ title: 'Call Me Maybe', startSeconds: 40, sketchCount: 1 }),
    );

    pending.resolve(jsonResponse({ error: 'inspiration-not-found' }, 404));
    await flushMicrotasks();
    expect(readList(queryClient)).toEqual([LISTED]);
    tree.unmount();
  });

  it('keeps the answer the server settled the edit with', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(inspirationKeys.list(), { inspirations: [LISTED] });
    const settled = { ...LISTED, note: 'the drum break', sketchCount: 2 };
    stubTransport(() => Promise.resolve(jsonResponse({ inspiration: settled })));
    const slot = createMutateSlot<UpdateInspiration>();
    const tree = mountWithClient(queryClient, <ProbeUpdate sink={slot.sink} />);

    await slot.read()({ id: LISTED.id, changes: { ...FIELDS, note: 'the drum break' } });
    await flushMicrotasks();

    expect(readList(queryClient)).toEqual([settled]);
    tree.unmount();
  });
});

describe('useDeleteInspiration', () => {
  it('drops the card at once and puts it back when a sketch still uses it', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(inspirationKeys.list(), { inspirations: [LISTED] });
    const pending = deferred<Response>();
    stubTransport(() => pending.promise);
    const slot = createMutateSlot<DeleteInspiration>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);

    const deletion = slot.read()({ id: LISTED.id });
    await flushMicrotasks();
    expect(readList(queryClient)).toEqual([]);

    pending.resolve(
      jsonResponse(
        { error: 'inspiration-in-use', sketches: [{ songId: 's', title: 'New 7' }] },
        409,
      ),
    );
    await expect(deletion).rejects.toMatchObject({
      status: 409,
      body: { error: 'inspiration-in-use' },
    });
    expect(readList(queryClient)).toEqual([LISTED]);
    tree.unmount();
  });
});
