import { afterEach, describe, expect, it } from 'vitest';
import type { QueuedTake } from '../take-queue.core';
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
  createTakeRecord,
  type ListedTake,
  signTakeUpload,
  takeKeys,
  useCreateTakeComment,
  useDeleteTake,
  writeCreatedTake,
} from './takes.queries';

const SONG_ID = '11111111-1111-4111-8111-111111111111';
const TAKE_ID = '22222222-2222-4222-8222-222222222222';

function listedTake(id: string, recordedAt: string, commentCount = 0): ListedTake {
  return {
    id,
    songId: SONG_ID,
    sessionId: null,
    memberId: 'member-1',
    authorName: 'Hugo',
    objectKey: `take/${SONG_ID}/${id}.webm`,
    contentType: 'audio/webm',
    durationSeconds: 120,
    recordedAt,
    createdAt: recordedAt,
    commentCount,
  };
}

const NEWER = listedTake('b', '2026-10-18T18:00:00.000Z', 2);
const OLDER = listedTake('a', '2026-10-02T18:00:00.000Z');

const QUEUED: QueuedTake = {
  id: TAKE_ID,
  songId: SONG_ID,
  sessionId: null,
  recordedAt: '2026-10-23T17:00:00.000Z',
  durationSeconds: 137,
  contentType: 'audio/webm',
  byteLength: 2_048,
  source: 'live',
  upload: null,
  isUploaded: false,
  wasDeferred: false,
  hasFailed: false,
};

type DeleteTake = ReturnType<typeof useDeleteTake>['mutateAsync'];
type CreateComment = ReturnType<typeof useCreateTakeComment>['mutateAsync'];

function ProbeDelete({ sink }: { readonly sink: (mutate: DeleteTake) => void }): null {
  sink(useDeleteTake().mutateAsync);
  return null;
}

function ProbeComment({ sink }: { readonly sink: (mutate: CreateComment) => void }): null {
  sink(useCreateTakeComment().mutateAsync);
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

// @FollowsBlueprint test-query-hook
describe('useDeleteTake', () => {
  it('drops the take from its song at once and puts it back when the server refuses', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(takeKeys.ofSong(SONG_ID), { takes: [NEWER, OLDER] });
    const pending = deferred<Response>();
    stubTransport(() => pending.promise);
    const slot = createMutateSlot<DeleteTake>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);

    slot
      .read()({ takeId: 'b', songId: SONG_ID })
      .catch(() => undefined);
    await flushMicrotasks();
    expect(queryClient.getQueryData(takeKeys.ofSong(SONG_ID))).toEqual({ takes: [OLDER] });

    pending.resolve(jsonResponse({ error: 'boom' }, 500));
    await flushMicrotasks();
    expect(queryClient.getQueryData(takeKeys.ofSong(SONG_ID))).toEqual({ takes: [NEWER, OLDER] });
    tree.unmount();
  });

  it('keeps the take gone once the server confirms, without reading the list again', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(takeKeys.ofSong(SONG_ID), { takes: [NEWER, OLDER] });
    const stub = stubTransport(() => Promise.resolve(jsonResponse({ id: 'b', deleted: true })));
    const slot = createMutateSlot<DeleteTake>();
    const tree = mountWithClient(queryClient, <ProbeDelete sink={slot.sink} />);

    await slot.read()({ takeId: 'b', songId: SONG_ID });
    await flushMicrotasks();

    expect(queryClient.getQueryData(takeKeys.ofSong(SONG_ID))).toEqual({ takes: [OLDER] });
    expect(stub.calls.map((request) => request.method)).toEqual(['DELETE']);
    tree.unmount();
  });
});

describe('useCreateTakeComment', () => {
  it('adds the comment the server answered and counts it on the take', async () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(takeKeys.ofSong(SONG_ID), { takes: [NEWER] });
    queryClient.setQueryData(takeKeys.commentsOf('b'), { comments: [] });
    const comment = {
      id: 'comment-1',
      takeId: 'b',
      memberId: 'member-1',
      authorName: 'Hugo',
      body: 'the bass comes in late',
      atSeconds: 102,
      createdAt: '2026-10-23T18:00:00.000Z',
    };
    const stub = stubTransport(() => Promise.resolve(jsonResponse({ comment }, 201)));
    const slot = createMutateSlot<CreateComment>();
    const tree = mountWithClient(queryClient, <ProbeComment sink={slot.sink} />);

    await slot.read()({ takeId: 'b', songId: SONG_ID, body: comment.body, atSeconds: 102 });
    await flushMicrotasks();

    expect(queryClient.getQueryData(takeKeys.commentsOf('b'))).toEqual({ comments: [comment] });
    expect(queryClient.getQueryData(takeKeys.ofSong(SONG_ID))).toEqual({
      takes: [{ ...NEWER, commentCount: 3 }],
    });
    expect(await stub.calls[0]?.json()).toEqual({ body: comment.body, atSeconds: 102 });
    tree.unmount();
  });
});

describe('writeCreatedTake', () => {
  it('places the created take where it was recorded in its song list', () => {
    const queryClient = createIsolatedQueryClient();
    queryClient.setQueryData(takeKeys.ofSong(SONG_ID), { takes: [NEWER, OLDER] });
    const middle = listedTake('c', '2026-10-14T18:00:00.000Z');

    writeCreatedTake(queryClient, middle);

    expect(queryClient.getQueryData(takeKeys.ofSong(SONG_ID))).toEqual({
      takes: [NEWER, middle, OLDER],
    });
  });

  it('leaves a song list nobody has read yet unread', () => {
    const queryClient = createIsolatedQueryClient();
    writeCreatedTake(queryClient, NEWER);
    expect(queryClient.getQueryData(takeKeys.ofSong(SONG_ID))).toBeUndefined();
  });
});

describe('signTakeUpload', () => {
  it('asks for an address bound to the take length and answers it', async () => {
    const signed = {
      uploadUrl: 'https://bucket.test/put',
      objectKey: `take/${SONG_ID}/${TAKE_ID}.webm`,
      expiresAt: '2026-10-23T18:05:00.000Z',
    };
    const stub = stubTransport(() => Promise.resolve(jsonResponse(signed)));

    expect(await signTakeUpload(QUEUED)).toEqual({ kind: 'ok', value: signed });
    expect(await stub.calls[0]?.json()).toEqual({
      takeId: TAKE_ID,
      songId: SONG_ID,
      contentType: 'audio/webm',
      contentLength: 2_048,
    });
  });

  it('answers the status of a refusal, and no status when the network fails', async () => {
    stubTransport(() => Promise.resolve(jsonResponse({ error: 'song-not-found' }, 404)));
    expect(await signTakeUpload(QUEUED)).toEqual({ kind: 'failed', status: 404 });
    stubTransport(() => Promise.reject(new TypeError('offline')));
    expect(await signTakeUpload(QUEUED)).toEqual({ kind: 'failed', status: null });
  });

  it('refuses an answer that carries no address', async () => {
    stubTransport(() => Promise.resolve(jsonResponse({ error: 'song-not-found' }, 200)));
    expect(await signTakeUpload(QUEUED)).toEqual({ kind: 'failed', status: 200 });
  });
});

describe('createTakeRecord', () => {
  const BODY = {
    id: TAKE_ID,
    objectKey: `take/${SONG_ID}/${TAKE_ID}.webm`,
    songId: SONG_ID,
    sessionId: null,
    recordedAt: QUEUED.recordedAt,
    durationSeconds: 137,
    contentType: 'audio/webm' as const,
    source: 'live' as const,
    queued: false,
  };

  it('answers the take the server created', async () => {
    const created = listedTake(TAKE_ID, QUEUED.recordedAt);
    stubTransport(() => Promise.resolve(jsonResponse({ take: created }, 201)));
    expect(await createTakeRecord(BODY)).toEqual({ kind: 'ok', value: created });
  });

  it('answers the status of a refusal, and no status when the network fails', async () => {
    stubTransport(() => Promise.resolve(jsonResponse({ error: 'song-not-found' }, 404)));
    expect(await createTakeRecord(BODY)).toEqual({ kind: 'failed', status: 404 });
    stubTransport(() => Promise.reject(new TypeError('offline')));
    expect(await createTakeRecord(BODY)).toEqual({ kind: 'failed', status: null });
  });
});
