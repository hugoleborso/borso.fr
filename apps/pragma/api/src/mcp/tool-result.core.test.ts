import { describe, expect, it } from 'vitest';
import { ToolRefusedError } from './tool-refusal.core';
import {
  selectFailureCode,
  selectThrownRefusal,
  selectToolOutcome,
  serializeCompactly,
  shapeToolFailure,
  shapeToolResult,
} from './tool-result.core';

const SONG = { id: 'song-1', createdAt: new Date('2026-10-27T10:00:00.000Z') };

// @FollowsBlueprint test-pure-unit
describe('shapeToolResult', () => {
  it('answers the route body as one text block, dates written as the route writes them', () => {
    expect(shapeToolResult({ kind: 'answered', body: { song: SONG } })).toEqual({
      content: [
        { type: 'text', text: '{"song":{"id":"song-1","createdAt":"2026-10-27T10:00:00.000Z"}}' },
      ],
    });
  });

  it('marks a refusal as an error carrying the route error body', () => {
    expect(
      shapeToolResult({ kind: 'refused', body: { error: 'deezer-track-taken', songId: 'song-1' } }),
    ).toEqual({
      isError: true,
      content: [{ type: 'text', text: '{"error":"deezer-track-taken","songId":"song-1"}' }],
    });
  });
});

describe('serializeCompactly', () => {
  it('leaves out the fields that are null, missing or empty text, at any depth', () => {
    expect(
      serializeCompactly({
        id: 'song-1',
        venue: null,
        album: undefined,
        notes: '',
        tags: [],
        energy: 0,
        isDone: false,
        entry: { capo: null, notes: 'Slower' },
      }),
    ).toBe('{"id":"song-1","tags":[],"energy":0,"isDone":false,"entry":{"notes":"Slower"}}');
  });

  it('keeps the items of a list as they are', () => {
    expect(serializeCompactly({ order: ['a', null, ''] })).toBe('{"order":["a",null,""]}');
    expect(serializeCompactly(null)).toBe('null');
  });
});

describe('shapeToolFailure', () => {
  it('answers an internal error without the thrown message', () => {
    expect(shapeToolFailure()).toEqual({
      isError: true,
      content: [{ type: 'text', text: '{"error":"internal-error"}' }],
    });
  });
});

describe('selectToolOutcome', () => {
  it('reads an answer as ok and a refusal as refused', () => {
    expect(selectToolOutcome({ kind: 'answered', body: {} })).toBe('ok');
    expect(selectToolOutcome({ kind: 'refused', body: { error: 'not-found' } })).toBe('refused');
  });
});

describe('selectFailureCode', () => {
  it('names an error by its class name', () => {
    expect(selectFailureCode(new RangeError('boom'))).toBe('RangeError');
  });

  it('names anything else unknown', () => {
    expect(selectFailureCode('boom')).toBe('unknown');
  });
});

describe('selectThrownRefusal', () => {
  it('turns a thrown refusal into a refused answer', () => {
    expect(selectThrownRefusal(new ToolRefusedError({ error: 'song-not-found' }))).toEqual({
      kind: 'refused',
      body: { error: 'song-not-found' },
    });
  });

  it('answers nothing for any other thrown value', () => {
    expect(selectThrownRefusal(new RangeError('boom'))).toBeNull();
  });
});
