import { afterEach, describe, expect, it } from 'vitest';
import {
  type CompositionRecord,
  compositionKeys,
  useCatalogueComposition,
  useCreateComposition,
  useDeleteComposition,
  useRenameComposition,
} from './compositions.queries';
import {
  createIsolatedQueryClient,
  createMutateSlot,
  deferred,
  flushMicrotasks,
  jsonResponse,
  mountWithClient,
  stubFetch,
} from './queries.test-utils';
import { sketchKeys, type SketchRecord } from './sketches.queries';
import { songKeys } from './songs.queries';

const COMPOSITION: CompositionRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Composition 1',
  songId: null,
  createdAt: '2026-11-13T10:00:00.000Z',
};
const SONG_ID = '22222222-2222-4222-8222-222222222222';
const NEW_ID = '33333333-3333-4333-8333-333333333333';

type QueryClientUnderTest = ReturnType<typeof createIsolatedQueryClient>;

function useCompositionWrites() {
  return {
    create: useCreateComposition().mutateAsync,
    rename: useRenameComposition().mutateAsync,
    remove: useDeleteComposition().mutateAsync,
    catalogue: useCatalogueComposition().mutateAsync,
  };
}

type CompositionWrites = ReturnType<typeof useCompositionWrites>;

function ProbeWrites({ sink }: { readonly sink: (writes: CompositionWrites) => void }): null {
  sink(useCompositionWrites());
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

function seedCompositions(): QueryClientUnderTest {
  const queryClient = createIsolatedQueryClient();
  queryClient.setQueryData(compositionKeys.list(), { compositions: [COMPOSITION] });
  queryClient.setQueryData(sketchKeys.detail(COMPOSITION.id), {
    sketch: { composition: COMPOSITION, lanes: [], clips: [] },
  });
  return queryClient;
}

function readList(queryClient: QueryClientUnderTest): readonly CompositionRecord[] | undefined {
  return queryClient.getQueryData<{ compositions: CompositionRecord[] }>(compositionKeys.list())
    ?.compositions;
}

function readSketchComposition(
  queryClient: QueryClientUnderTest,
  id: string,
): CompositionRecord | undefined {
  return queryClient.getQueryData<{ sketch: SketchRecord }>(sketchKeys.detail(id))?.sketch
    .composition;
}

function mountWrites(queryClient: QueryClientUnderTest) {
  const slot = createMutateSlot<CompositionWrites>();
  const tree = mountWithClient(queryClient, <ProbeWrites sink={slot.sink} />);
  return { writes: slot.read, tree };
}

// @FollowsBlueprint test-query-hook
describe('the composition writes', () => {
  it('lists a new composition at once and opens an empty sketch for it from the answer', async () => {
    const queryClient = seedCompositions();
    const pending = deferred<Response>();
    stubTransport(() => pending.promise);
    const { writes, tree } = mountWrites(queryClient);
    const created = { ...COMPOSITION, id: NEW_ID, title: 'Composition 2' };

    const creation = writes().create({ id: NEW_ID, title: 'Composition 2' });
    await flushMicrotasks();
    expect(readList(queryClient)?.map((listed) => listed.title)).toEqual([
      'Composition 2',
      'Composition 1',
    ]);

    pending.resolve(jsonResponse({ composition: created }, 201));
    await creation;
    expect(readList(queryClient)).toEqual([created, COMPOSITION]);
    expect(queryClient.getQueryData(sketchKeys.detail(NEW_ID))).toEqual({
      sketch: { composition: created, lanes: [], clips: [] },
    });
    tree.unmount();
  });

  it('takes a refused creation back out of the list', async () => {
    const queryClient = seedCompositions();
    stubTransport(() => Promise.resolve(jsonResponse({ error: 'boom' }, 500)));
    const { writes, tree } = mountWrites(queryClient);

    await writes()
      .create({ id: NEW_ID, title: 'Composition 2' })
      .catch(() => undefined);

    expect(readList(queryClient)).toEqual([COMPOSITION]);
    tree.unmount();
  });

  it('renames in the list and the open sketch at once, and puts the title back when refused', async () => {
    const queryClient = seedCompositions();
    const pending = deferred<Response>();
    stubTransport(() => pending.promise);
    const { writes, tree } = mountWrites(queryClient);

    const renaming = writes()
      .rename({ id: COMPOSITION.id, title: 'Avignon Nice' })
      .catch(() => undefined);
    await flushMicrotasks();
    expect(readList(queryClient)?.[0]?.title).toBe('Avignon Nice');
    expect(readSketchComposition(queryClient, COMPOSITION.id)?.title).toBe('Avignon Nice');

    pending.resolve(jsonResponse({ error: 'composition-not-found' }, 404));
    await renaming;
    expect(readList(queryClient)).toEqual([COMPOSITION]);
    expect(readSketchComposition(queryClient, COMPOSITION.id)).toEqual(COMPOSITION);
    tree.unmount();
  });

  it('settles a rename from the answer', async () => {
    const queryClient = seedCompositions();
    const renamed = { ...COMPOSITION, title: 'Avignon Nice' };
    stubTransport(() => Promise.resolve(jsonResponse({ composition: renamed })));
    const { writes, tree } = mountWrites(queryClient);

    await writes().rename({ id: COMPOSITION.id, title: 'Avignon Nice' });

    expect(readList(queryClient)).toEqual([renamed]);
    expect(readSketchComposition(queryClient, COMPOSITION.id)).toEqual(renamed);
    tree.unmount();
  });

  it('links the catalogue song in the list and the sketch, and refreshes the songs', async () => {
    const queryClient = seedCompositions();
    queryClient.setQueryData(songKeys.list(), { songs: [] });
    const catalogued = { ...COMPOSITION, songId: SONG_ID };
    stubTransport(() => Promise.resolve(jsonResponse({ composition: catalogued })));
    const { writes, tree } = mountWrites(queryClient);

    await writes().catalogue({ id: COMPOSITION.id });

    expect(readList(queryClient)).toEqual([catalogued]);
    expect(readSketchComposition(queryClient, COMPOSITION.id)?.songId).toBe(SONG_ID);
    expect(queryClient.getQueryState(songKeys.list())?.isInvalidated).toBe(true);
    tree.unmount();
  });

  it("keeps the list stale after cataloguing when another member's write had already made it stale", async () => {
    const queryClient = seedCompositions();
    const othersComposition = { ...COMPOSITION, id: NEW_ID, title: 'Composition 7' };
    queryClient.setQueryData(compositionKeys.list(), {
      compositions: [othersComposition, COMPOSITION],
    });
    await queryClient.invalidateQueries({ queryKey: compositionKeys.list() });
    const catalogued = { ...COMPOSITION, songId: SONG_ID };
    stubTransport(() => Promise.resolve(jsonResponse({ composition: catalogued })));
    const { writes, tree } = mountWrites(queryClient);

    await writes().catalogue({ id: COMPOSITION.id });

    expect(readList(queryClient)).toEqual([othersComposition, catalogued]);
    expect(queryClient.getQueryState(compositionKeys.list())?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(sketchKeys.detail(COMPOSITION.id))?.isInvalidated).toBe(false);
    tree.unmount();
  });

  it('removes a deleted composition at once and brings it back when refused', async () => {
    const queryClient = seedCompositions();
    const pending = deferred<Response>();
    stubTransport(() => pending.promise);
    const { writes, tree } = mountWrites(queryClient);

    const removal = writes()
      .remove({ id: COMPOSITION.id })
      .catch(() => undefined);
    await flushMicrotasks();
    expect(readList(queryClient)).toEqual([]);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await removal;
    expect(readList(queryClient)).toEqual([COMPOSITION]);
    tree.unmount();
  });
});
