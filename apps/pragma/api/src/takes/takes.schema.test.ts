import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  takeCommentCreateSchema,
  takeCommentPathSchema,
  takeCommentTable,
  takeCommentUpdateSchema,
  takeCreateSchema,
  takeListQuerySchema,
  takePathSchema,
  takeSignSchema,
  takeTable,
} from './takes.schema';

const SONG_ID = '11111111-1111-4111-8111-111111111111';
const TAKE_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';
const FIFTY_MEBIBYTES = 52_428_800;

const VALID_CREATE = {
  id: TAKE_ID,
  objectKey: `take/${SONG_ID}/${TAKE_ID}.webm`,
  songId: SONG_ID,
  recordedAt: '2026-10-18T20:00:00.000Z',
  durationSeconds: 232,
  contentType: 'audio/webm',
  source: 'live',
  queued: false,
} as const;

// @FollowsBlueprint test-pure-unit
describe('take tables', () => {
  it('index takes on their song and recording time, and comments on their take and time', () => {
    expect(getTableConfig(takeTable).indexes.map((index) => index.config.name)).toEqual([
      'take_song_recorded_idx',
    ]);
    expect(getTableConfig(takeCommentTable).indexes.map((index) => index.config.name)).toEqual([
      'take_comment_take_created_idx',
    ]);
  });
});

describe('takeSignSchema', () => {
  const validSign = { takeId: TAKE_ID, songId: SONG_ID, contentType: 'audio/mp4' } as const;

  it('accepts a take of exactly 50 MiB', () => {
    expect(takeSignSchema.safeParse({ ...validSign, contentLength: FIFTY_MEBIBYTES }).success).toBe(
      true,
    );
  });

  it('refuses a take one byte over 50 MiB, an empty one, and a type that is not audio', () => {
    expect(
      takeSignSchema.safeParse({ ...validSign, contentLength: FIFTY_MEBIBYTES + 1 }).success,
    ).toBe(false);
    expect(takeSignSchema.safeParse({ ...validSign, contentLength: 0 }).success).toBe(false);
    expect(
      takeSignSchema.safeParse({ ...validSign, contentType: 'application/pdf', contentLength: 1 })
        .success,
    ).toBe(false);
  });

  it('refuses a field it does not know', () => {
    expect(
      takeSignSchema.safeParse({ ...validSign, contentLength: 1, bucket: 'other' }).success,
    ).toBe(false);
  });
});

describe('takeCreateSchema', () => {
  it('defaults the session to none', () => {
    expect(takeCreateSchema.parse(VALID_CREATE).sessionId).toBeNull();
  });

  it('accepts a session', () => {
    expect(takeCreateSchema.parse({ ...VALID_CREATE, sessionId: SESSION_ID }).sessionId).toBe(
      SESSION_ID,
    );
  });

  it('counts a take as recorded outside practice mode unless the site says otherwise', () => {
    expect(takeCreateSchema.parse(VALID_CREATE).fromPracticeMode).toBe(false);
    expect(
      takeCreateSchema.parse({ ...VALID_CREATE, fromPracticeMode: true }).fromPracticeMode,
    ).toBe(true);
  });

  it('refuses a take without a song', () => {
    const { songId: _songId, ...withoutSong } = VALID_CREATE;
    expect(takeCreateSchema.safeParse(withoutSong).success).toBe(false);
  });

  it('accepts a zero-second take and one of four hours, and refuses one second more', () => {
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, durationSeconds: 0 }).success).toBe(true);
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, durationSeconds: 14_400 }).success).toBe(
      true,
    );
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, durationSeconds: 14_401 }).success).toBe(
      false,
    );
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, durationSeconds: -1 }).success).toBe(
      false,
    );
  });

  it('refuses a recording time that is not an instant, and an empty or oversized object key', () => {
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, recordedAt: 'yesterday' }).success).toBe(
      false,
    );
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, objectKey: '' }).success).toBe(false);
    expect(
      takeCreateSchema.safeParse({ ...VALID_CREATE, objectKey: 'k'.repeat(513) }).success,
    ).toBe(false);
  });

  it('accepts an upload source and refuses any other', () => {
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, source: 'upload' }).success).toBe(true);
    expect(takeCreateSchema.safeParse({ ...VALID_CREATE, source: 'import' }).success).toBe(false);
  });
});

describe('take path and query schemas', () => {
  it('want uuids', () => {
    expect(takeListQuerySchema.safeParse({ songId: SONG_ID }).success).toBe(true);
    expect(takeListQuerySchema.safeParse({ songId: 'song' }).success).toBe(false);
    expect(takeListQuerySchema.safeParse({ sessionId: SESSION_ID }).success).toBe(true);
    expect(takeListQuerySchema.safeParse({}).success).toBe(false);
    expect(takeListQuerySchema.safeParse({ songId: SONG_ID, sessionId: SESSION_ID }).success).toBe(
      false,
    );
    expect(takePathSchema.safeParse({ id: 'take' }).success).toBe(false);
    expect(takeCommentPathSchema.safeParse({ id: TAKE_ID, commentId: SONG_ID }).success).toBe(true);
    expect(takeCommentPathSchema.safeParse({ id: TAKE_ID, commentId: 'comment' }).success).toBe(
      false,
    );
  });
});

describe('takeCommentCreateSchema', () => {
  it('trims the body and defaults to no moment', () => {
    expect(takeCommentCreateSchema.parse({ body: '  the bass comes in late ' })).toStrictEqual({
      body: 'the bass comes in late',
      atSeconds: null,
    });
  });

  it('accepts a moment at the start and refuses one before it', () => {
    expect(takeCommentCreateSchema.parse({ body: 'intro', atSeconds: 0 }).atSeconds).toBe(0);
    expect(takeCommentCreateSchema.safeParse({ body: 'intro', atSeconds: -1 }).success).toBe(false);
    expect(takeCommentCreateSchema.safeParse({ body: 'intro', atSeconds: 1.5 }).success).toBe(
      false,
    );
  });

  it('refuses a body of whitespace alone or over 4 096 characters', () => {
    expect(takeCommentCreateSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(takeCommentCreateSchema.safeParse({ body: 'x'.repeat(4_096) }).success).toBe(true);
    expect(takeCommentCreateSchema.safeParse({ body: 'x'.repeat(4_097) }).success).toBe(false);
  });
});

describe('takeCommentUpdateSchema', () => {
  it('accepts a body alone, a moment alone, and clearing the moment', () => {
    expect(takeCommentUpdateSchema.parse({ body: 'later' })).toStrictEqual({ body: 'later' });
    expect(takeCommentUpdateSchema.parse({ atSeconds: 12 })).toStrictEqual({ atSeconds: 12 });
    expect(takeCommentUpdateSchema.parse({ atSeconds: null })).toStrictEqual({ atSeconds: null });
  });

  it('refuses an update that changes nothing', () => {
    expect(takeCommentUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('refuses a field it does not know', () => {
    expect(takeCommentUpdateSchema.safeParse({ body: 'later', takeId: TAKE_ID }).success).toBe(
      false,
    );
  });
});
