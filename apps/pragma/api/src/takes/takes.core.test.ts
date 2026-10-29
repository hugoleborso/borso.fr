import type { TakeContentType } from '@domain/take-upload.core';
import { describe, expect, it } from 'vitest';
import {
  buildTakeObjectKey,
  isMomentWithinTake,
  isExactlyOneTakeFilterNamed,
  orderCommentsByTime,
} from './takes.core';

const SONG_ID = '11111111-1111-4111-8111-111111111111';
const TAKE_ID = '22222222-2222-4222-8222-222222222222';
const DURATION_SECONDS = 232;

function extensionOf(contentType: TakeContentType): string | undefined {
  return buildTakeObjectKey({ songId: SONG_ID, takeId: TAKE_ID, contentType }).split('.').pop();
}

// @FollowsBlueprint test-pure-unit
describe('buildTakeObjectKey', () => {
  it('files the take under its song, named after its own id', () => {
    expect(
      buildTakeObjectKey({ songId: SONG_ID, takeId: TAKE_ID, contentType: 'audio/webm' }),
    ).toBe(`take/${SONG_ID}/${TAKE_ID}.webm`);
  });

  it('gives each accepted type the extension the site names its download with', () => {
    expect(extensionOf('audio/mp4')).toBe('m4a');
    expect(extensionOf('audio/x-m4a')).toBe('m4a');
    expect(extensionOf('audio/mpeg')).toBe('mp3');
    expect(extensionOf('audio/ogg')).toBe('ogg');
    expect(extensionOf('audio/wav')).toBe('wav');
    expect(extensionOf('audio/aac')).toBe('aac');
  });
});

describe('isMomentWithinTake', () => {
  it('accepts a comment without a moment', () => {
    expect(isMomentWithinTake(null, DURATION_SECONDS)).toBe(true);
  });

  it('accepts the very start and the very end of the take', () => {
    expect(isMomentWithinTake(0, DURATION_SECONDS)).toBe(true);
    expect(isMomentWithinTake(DURATION_SECONDS, DURATION_SECONDS)).toBe(true);
  });

  it('refuses a moment one second past the end', () => {
    expect(isMomentWithinTake(DURATION_SECONDS + 1, DURATION_SECONDS)).toBe(false);
  });

  it('refuses a moment before the start', () => {
    expect(isMomentWithinTake(-1, DURATION_SECONDS)).toBe(false);
  });

  it('refuses a moment between two seconds', () => {
    expect(isMomentWithinTake(1.5, DURATION_SECONDS)).toBe(false);
  });
});

describe('orderCommentsByTime', () => {
  const earlier = new Date('2026-10-18T20:00:00.000Z');
  const later = new Date('2026-10-18T20:05:00.000Z');

  it('lists the oldest comment first, whatever order they arrive in', () => {
    const comments = [
      { id: 'a', createdAt: later },
      { id: 'b', createdAt: earlier },
    ];
    expect(orderCommentsByTime(comments).map((comment) => comment.id)).toEqual(['b', 'a']);
  });

  it('breaks a tie on the same instant by id, so two reads agree', () => {
    const comments = [
      { id: 'b', createdAt: earlier },
      { id: 'a', createdAt: earlier },
      { id: 'c', createdAt: earlier },
    ];
    expect(orderCommentsByTime(comments).map((comment) => comment.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves the list it was given untouched', () => {
    const comments = [
      { id: 'b', createdAt: later },
      { id: 'a', createdAt: earlier },
    ];
    orderCommentsByTime(comments);
    expect(comments.map((comment) => comment.id)).toEqual(['b', 'a']);
  });
});

// @FollowsBlueprint test-pure-unit
describe('isExactlyOneTakeFilterNamed', () => {
  it('accepts a song alone or a session alone', () => {
    expect(isExactlyOneTakeFilterNamed({ songId: SONG_ID })).toBe(true);
    expect(isExactlyOneTakeFilterNamed({ sessionId: TAKE_ID })).toBe(true);
  });

  it('refuses neither and both', () => {
    expect(isExactlyOneTakeFilterNamed({})).toBe(false);
    expect(isExactlyOneTakeFilterNamed({ songId: SONG_ID, sessionId: TAKE_ID })).toBe(false);
  });
});
