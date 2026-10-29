import { describe, expect, it } from 'vitest';
import { summarizeComment, summarizeTake } from './take-tool.core';

// @FollowsBlueprint test-pure-unit
describe('summarizeTake', () => {
  it('keeps what tells takes apart, the recording time as an ISO string', () => {
    expect(
      summarizeTake({
        id: 'take-1',
        songId: 'song-1',
        sessionId: null,
        memberId: 'member-hugo',
        authorName: 'Hugo',
        objectKey: 'take/song-1/take-1.mp3',
        contentType: 'audio/mpeg',
        durationSeconds: 240,
        recordedAt: new Date('2026-10-27T20:00:00.000Z'),
        createdAt: new Date('2026-10-28T08:00:00.000Z'),
        commentCount: 2,
      }),
    ).toEqual({
      id: 'take-1',
      recordedAt: '2026-10-27T20:00:00.000Z',
      by: 'Hugo',
      durationSeconds: 240,
      sessionId: null,
      comments: 2,
    });
  });
});

describe('summarizeComment', () => {
  it('keeps who wrote it, the moment and the text', () => {
    expect(
      summarizeComment({
        id: 'comment-1',
        takeId: 'take-1',
        memberId: 'member-hugo',
        authorName: 'Hugo',
        body: 'Slower bridge',
        atSeconds: 60,
        createdAt: new Date('2026-10-28T08:00:00.000Z'),
      }),
    ).toEqual({ id: 'comment-1', by: 'Hugo', atSeconds: 60, body: 'Slower bridge' });
  });
});
