import { describe, expect, it } from 'vitest';
import { buildItemRequest, toBatchedAnswer } from './read-batch.core';

const OUTER_URL = 'https://api.pragma.example/api/read-batch';

function buildOuterHeaders(): Headers {
  return new Headers({
    cookie: 'pragma_session=abc',
    'content-type': 'application/json',
    'content-length': '42',
    'x-pragma-client': 'outer-tab',
    'sentry-trace': 'trace',
  });
}

// @FollowsBlueprint test-pure-unit
describe('a read taken out of a batch', () => {
  it('reads the path on the batch origin with GET, keeping its query', () => {
    const request = buildItemRequest(
      { path: '/api/songs?x=1', headers: {} },
      OUTER_URL,
      buildOuterHeaders(),
    );

    expect(request.method).toBe('GET');
    expect(request.url).toBe('https://api.pragma.example/api/songs?x=1');
  });

  it('carries the outer cookie and the item ballot token, and no body headers', () => {
    const request = buildItemRequest(
      { path: '/api/audience/live', headers: { 'x-ballot-token': 'ballot' } },
      OUTER_URL,
      buildOuterHeaders(),
    );

    expect(request.headers.get('cookie')).toBe('pragma_session=abc');
    expect(request.headers.get('x-ballot-token')).toBe('ballot');
    expect(request.headers.get('sentry-trace')).toBe('trace');
    expect(request.headers.has('content-type')).toBe(false);
    expect(request.headers.has('content-length')).toBe(false);
  });

  it('lets the item header win over the outer one of the same name', () => {
    const request = buildItemRequest(
      { path: '/api/songs', headers: { 'x-pragma-client': 'item-tab' } },
      OUTER_URL,
      buildOuterHeaders(),
    );

    expect(request.headers.get('x-pragma-client')).toBe('item-tab');
  });

  it('leaves the outer headers untouched', () => {
    const outerHeaders = buildOuterHeaders();
    buildItemRequest(
      { path: '/api/songs', headers: { 'x-ballot-token': 'ballot' } },
      OUTER_URL,
      outerHeaders,
    );

    expect(outerHeaders.get('content-type')).toBe('application/json');
    expect(outerHeaders.has('x-ballot-token')).toBe(false);
  });
});

describe('the answer of one read', () => {
  it('keeps the status, the content type and the body, and nothing else', () => {
    expect(toBatchedAnswer(204, null, '')).toStrictEqual({
      status: 204,
      contentType: null,
      body: '',
    });
    expect(toBatchedAnswer(200, 'application/json', '{"songs":[]}')).toStrictEqual({
      status: 200,
      contentType: 'application/json',
      body: '{"songs":[]}',
    });
  });
});
