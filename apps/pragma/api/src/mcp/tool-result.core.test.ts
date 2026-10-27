import { describe, expect, it } from 'vitest';
import {
  selectFailureCode,
  selectToolOutcome,
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
