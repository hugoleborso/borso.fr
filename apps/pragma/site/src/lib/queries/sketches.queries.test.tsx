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
import { inspirationKeys } from './inspirations.queries';
import {
  sketchKeys,
  type SketchRecord,
  useAddSketchLane,
  useDeleteSketchLane,
  useMoveSketchClip,
  usePlaceSketchClip,
  useRemoveSketchClip,
  useRenameSketchLane,
} from './sketches.queries';

const COMPOSITION_ID = '11111111-1111-4111-8111-111111111111';
const DRUMS = { id: 'lane-a', compositionId: COMPOSITION_ID, name: 'drums', position: 0 };
const BRASS = { id: 'lane-b', compositionId: COMPOSITION_ID, name: 'brass', position: 1 };
const CLIP = { id: 'clip-1', laneId: 'lane-a', inspirationId: 'inspiration-1', offsetSeconds: 0 };
const SKETCH: SketchRecord = {
  composition: {
    id: COMPOSITION_ID,
    title: 'New 7',
    songId: null,
    createdAt: '2026-11-13T10:00:00.000Z',
  },
  lanes: [DRUMS, BRASS],
  clips: [CLIP],
};

type QueryClientUnderTest = ReturnType<typeof createIsolatedQueryClient>;

function useSketchWrites() {
  return {
    addLane: useAddSketchLane().mutateAsync,
    renameLane: useRenameSketchLane().mutateAsync,
    deleteLane: useDeleteSketchLane().mutateAsync,
    placeClip: usePlaceSketchClip().mutateAsync,
    moveClip: useMoveSketchClip().mutateAsync,
    removeClip: useRemoveSketchClip().mutateAsync,
  };
}

type SketchWrites = ReturnType<typeof useSketchWrites>;

function ProbeWrites({ sink }: { readonly sink: (writes: SketchWrites) => void }): null {
  sink(useSketchWrites());
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

function seedSketch(): QueryClientUnderTest {
  const queryClient = createIsolatedQueryClient();
  queryClient.setQueryData(sketchKeys.detail(COMPOSITION_ID), { sketch: SKETCH });
  return queryClient;
}

function readSketch(queryClient: QueryClientUnderTest): SketchRecord | undefined {
  return queryClient.getQueryData<{ sketch: SketchRecord }>(sketchKeys.detail(COMPOSITION_ID))
    ?.sketch;
}

function mountWrites(queryClient: QueryClientUnderTest) {
  const slot = createMutateSlot<SketchWrites>();
  const tree = mountWithClient(queryClient, <ProbeWrites sink={slot.sink} />);
  return { writes: slot.read, tree };
}

// @FollowsBlueprint test-query-hook
describe('useMoveSketchClip', () => {
  it('moves the clip at once and puts it back when the server fails', async () => {
    const queryClient = seedSketch();
    const pending = deferred<Response>();
    stubTransport(() => pending.promise);
    const { writes, tree } = mountWrites(queryClient);

    writes()
      .moveClip({
        compositionId: COMPOSITION_ID,
        clipId: 'clip-1',
        laneId: 'lane-b',
        offsetSeconds: 4,
      })
      .catch(() => undefined);
    await flushMicrotasks();
    expect(readSketch(queryClient)?.clips).toEqual([
      { ...CLIP, laneId: 'lane-b', offsetSeconds: 4 },
    ]);

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(readSketch(queryClient)).toEqual(SKETCH);
    expect(queryClient.getQueryState(sketchKeys.detail(COMPOSITION_ID))?.isInvalidated).toBe(false);
    tree.unmount();
  });

  it('reloads the sketch when the clip was removed meanwhile', async () => {
    const queryClient = seedSketch();
    stubTransport(() => Promise.resolve(jsonResponse({ error: 'clip-not-found' }, 404)));
    const { writes, tree } = mountWrites(queryClient);

    await writes()
      .moveClip({
        compositionId: COMPOSITION_ID,
        clipId: 'clip-1',
        laneId: 'lane-a',
        offsetSeconds: 4,
      })
      .catch(() => undefined);
    await flushMicrotasks();

    expect(queryClient.getQueryState(sketchKeys.detail(COMPOSITION_ID))?.isInvalidated).toBe(true);
    tree.unmount();
  });
});

describe('the lane writes', () => {
  it('adds, renames and deletes a lane at once, the deletion taking its clips', async () => {
    const queryClient = seedSketch();
    const keys = { id: 'lane-0', compositionId: COMPOSITION_ID, name: 'keys', position: 2 };
    stubTransport((request) =>
      Promise.resolve(
        request.method === 'POST' ? jsonResponse({ lane: keys }, 201) : jsonResponse({ ok: true }),
      ),
    );
    const { writes, tree } = mountWrites(queryClient);

    await writes().addLane({
      compositionId: COMPOSITION_ID,
      id: 'lane-0',
      name: 'keys',
      position: 2,
    });
    await writes().renameLane({ compositionId: COMPOSITION_ID, laneId: 'lane-b', name: 'horns' });
    await writes().deleteLane({ compositionId: COMPOSITION_ID, laneId: 'lane-a' });
    await flushMicrotasks();

    expect(readSketch(queryClient)).toEqual({
      composition: SKETCH.composition,
      lanes: [{ ...BRASS, name: 'horns' }, keys],
      clips: [],
    });
    tree.unmount();
  });
});

describe('the clip writes', () => {
  it('places a clip at once, settles it from the answer, removes another, and refreshes the sketch counts', async () => {
    const queryClient = seedSketch();
    const placed = {
      id: 'clip-2',
      laneId: 'lane-b',
      inspirationId: 'inspiration-1',
      offsetSeconds: 8,
    };
    stubTransport((request) =>
      Promise.resolve(
        request.method === 'POST'
          ? jsonResponse({ clip: placed }, 201)
          : jsonResponse({ id: 'clip-1', deleted: true }),
      ),
    );
    const { writes, tree } = mountWrites(queryClient);

    queryClient.setQueryData(inspirationKeys.list(), { inspirations: [] });
    await writes().placeClip({ compositionId: COMPOSITION_ID, ...placed });
    await writes().removeClip({ compositionId: COMPOSITION_ID, clipId: 'clip-1' });
    await flushMicrotasks();

    expect(readSketch(queryClient)?.clips).toEqual([placed]);
    expect(queryClient.getQueryState(inspirationKeys.list())?.isInvalidated).toBe(true);
    tree.unmount();
  });
});
