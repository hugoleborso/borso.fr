import { describe, expect, it } from 'vitest';
import {
  isRefusedBatch,
  keepCallers,
  mergeIdenticalReads,
  pairAnswersWithReads,
  readContentType,
  readIdentity,
  takeNextBatch,
  toBatchedRead,
  toAbortError,
  toCallerResponse,
  toReadBatchInit,
  toLoneRead,
  toLoneReadInit,
} from './read-batch.core';

const API_BASE = 'https://api.pragma.test';
const SONGS = { path: '/api/songs', headers: {} };
const BALLOT = { path: '/api/audience/votes', headers: { 'x-ballot-token': 'ballot-1' } };

// @FollowsBlueprint test-pure-unit
describe('which calls ride a read batch', () => {
  it('keeps the path and query of a read under the API base', () => {
    expect(toBatchedRead(`${API_BASE}/api/songs?sort=title`, undefined, API_BASE)).toStrictEqual({
      path: '/api/songs?sort=title',
      headers: {},
    });
  });

  it('reads a relative path when the API shares the page origin', () => {
    expect(toBatchedRead('/api/me', { method: 'GET' }, '')).toStrictEqual({
      path: '/api/me',
      headers: {},
    });
  });

  it('carries the ballot token a public read needs', () => {
    const init = { method: 'get', headers: new Headers({ 'X-Ballot-Token': 'ballot-1' }) };

    expect(toBatchedRead('/api/audience/votes', init, '')).toStrictEqual(BALLOT);
  });

  it.each([
    ['a write', '/api/songs', { method: 'POST' }],
    ['a read with a header outside the allowed list', '/api/songs', { headers: { accept: 'x' } }],
    ['a read outside the API', '/oauth/token', undefined],
    ['a read on another origin', 'https://elsewhere.test/api/songs', undefined],
    ['a read that climbs out of the API', '/api/../mcp', undefined],
    ['the batch itself', '/api/read-batch', undefined],
  ])('leaves %s alone', (_, url, init) => {
    expect(toBatchedRead(url, init, '')).toBeNull();
  });

  it('refuses a read that only starts like the API base', () => {
    expect(toBatchedRead(`${API_BASE}.evil/api/songs`, undefined, API_BASE)).toBeNull();
    expect(toBatchedRead('https://evil.pragma.tst/api/songs', undefined, API_BASE)).toBeNull();
  });
});

describe('reads that ask the same thing', () => {
  it('names a read by its path and its headers in any order', () => {
    const forward = { path: '/api/x', headers: { 'x-ballot-token': 'a', 'x-pragma-client': 'b' } };
    const backward = { path: '/api/x', headers: { 'x-pragma-client': 'b', 'x-ballot-token': 'a' } };

    expect(readIdentity(forward)).toBe(readIdentity(backward));
    expect(readIdentity(forward)).toBe('/api/x\n[["x-ballot-token","a"],["x-pragma-client","b"]]');
    expect(readIdentity(SONGS)).not.toBe(readIdentity(BALLOT));
  });

  it('sends the probe and the instruments list as one item with both callers, in arrival order', () => {
    const instruments = { path: '/api/instruments', headers: {} };
    const merged = mergeIdenticalReads(
      [{ read: SONGS, callers: ['songs'] }],
      [
        { read: instruments, caller: 'probe' },
        { read: SONGS, caller: 'home songs' },
        { read: { ...instruments }, caller: 'instruments list' },
      ],
    );

    expect(merged).toStrictEqual([
      { read: SONGS, callers: ['songs', 'home songs'] },
      { read: instruments, callers: ['probe', 'instruments list'] },
    ]);
  });

  it('drops the callers that stopped waiting, and a read nobody waits for', () => {
    const kept = keepCallers(
      [
        { read: SONGS, callers: ['aborted', 'waiting'] },
        { read: BALLOT, callers: ['aborted'] },
      ],
      (caller) => caller !== 'aborted',
    );

    expect(kept).toStrictEqual([{ read: SONGS, callers: ['waiting'] }]);
  });
});

describe('batches of at most ten', () => {
  it('takes the first 10 of 23 reads and leaves 13 waiting', () => {
    const reads = Array.from({ length: 23 }, (_, index) => index);
    const { batch, rest } = takeNextBatch(reads);

    expect(batch).toStrictEqual(reads.slice(0, 10));
    expect(rest).toStrictEqual(reads.slice(10));
  });

  it('takes every read when there are no more than the batch holds', () => {
    expect(takeNextBatch([1, 2, 3])).toStrictEqual({ batch: [1, 2, 3], rest: [] });
    expect(takeNextBatch([1, 2, 3], 2)).toStrictEqual({ batch: [1, 2], rest: [3] });
  });

  it('names the read of a batch that holds one', () => {
    expect(toLoneRead(['songs'])).toBe('songs');
    expect(toLoneRead(['songs', 'profile'])).toBeNull();
    expect(toLoneRead([])).toBeNull();
  });

  it('posts the reads as JSON with the session cookie', () => {
    expect(toReadBatchInit([SONGS, BALLOT])).toStrictEqual({
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reads: [SONGS, BALLOT] }),
    });
  });

  it('sends a lone read with its own headers and the session cookie', () => {
    expect(toLoneReadInit(BALLOT)).toStrictEqual({
      credentials: 'include',
      headers: { 'x-ballot-token': 'ballot-1' },
    });
  });
});

describe('the answers of a batch', () => {
  const answered = { status: 200, contentType: 'application/json', body: '{"songs":[]}' };
  const gone = { status: 404, contentType: null, body: '' };

  it('pairs each answer with its read, in order', () => {
    expect(pairAnswersWithReads(['songs', 'missing'], { answers: [answered, gone] })).toStrictEqual(
      [
        ['songs', answered],
        ['missing', gone],
      ],
    );
  });

  it.each([
    ['no object', 'oops'],
    ['null', null],
    ['no answers list', { answers: 'none' }],
    ['one answer too few', { answers: [answered] }],
    ['one answer too many', { answers: [answered, gone, gone] }],
    ['an answer that is not an object', { answers: [answered, 'x'] }],
    ['an answer that is null', { answers: [answered, null] }],
    ['a status below 200', { answers: [answered, { ...answered, status: 199 }] }],
    ['a status above 599', { answers: [answered, { ...answered, status: 600 }] }],
    ['a status that is not whole', { answers: [answered, { ...answered, status: 200.5 }] }],
    ['a status as text', { answers: [answered, { ...answered, status: '200' }] }],
    ['a content type that is a number', { answers: [answered, { ...answered, contentType: 1 }] }],
    ['a body that is not text', { answers: [answered, { ...answered, body: {} }] }],
  ])('refuses an answer with %s', (_, answer) => {
    expect(pairAnswersWithReads(['songs', 'missing'], answer)).toBeNull();
  });

  it('accepts the first and the last status a response can carry', () => {
    const answers = [
      { ...answered, status: 200 },
      { ...answered, status: 599 },
    ];

    expect(pairAnswersWithReads(['a', 'b'], { answers })).toHaveLength(2);
  });
});

describe('the response each caller receives', () => {
  it('rebuilds the status, the content type and the body of one read', async () => {
    const response = toCallerResponse({
      status: 401,
      contentType: 'application/json',
      body: '{"error":"session-invalid"}',
    });

    expect(response.status).toBe(401);
    expect(readContentType(response)).toBe('application/json');
    expect(await response.json()).toStrictEqual({ error: 'session-invalid' });
  });

  it('sets no content type when the read had none', () => {
    const response = toCallerResponse({ status: 204, contentType: null, body: '' });

    expect(readContentType(response)).toBeNull();
  });

  it.each([204, 205, 304])(
    'answers %s with no body, which a response refuses to carry',
    (status) => {
      const response = toCallerResponse({ status, contentType: null, body: '' });

      expect(response.status).toBe(status);
      expect(response.body).toBeNull();
    },
  );

  it('keeps an empty body on a status that may carry one', () => {
    expect(toCallerResponse({ status: 200, contentType: null, body: '' }).body).not.toBeNull();
  });
});

describe('a batch the API did not answer', () => {
  it('reads every status but 200 as a refused batch', () => {
    expect(isRefusedBatch(200)).toBe(false);
    expect(isRefusedBatch(201)).toBe(true);
    expect(isRefusedBatch(503)).toBe(true);
  });

  it('keeps the error a signal aborted with', () => {
    const reason = new Error('gone');

    expect(toAbortError(reason)).toBe(reason);
  });

  it('wraps any other abort reason in an abort error', () => {
    const error = toAbortError('left the screen');

    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('left the screen');
  });
});
