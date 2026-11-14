import { randomUUID } from 'node:crypto';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { INSPIRATION_NOTE_MAX_LENGTH } from '@domain/input-limits.core';
import {
  inspirationCreateSchema,
  inspirationTable,
  inspirationUpdateSchema,
} from './inspirations.schema';

const CHANGES = {
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: ' Call Me Maybe ',
  artist: 'Carly Rae Jepsen',
  deezerTrackId: null,
  deezerAlbumId: null,
  startSeconds: 52,
  endSeconds: 64,
  note: 'the trumpet',
};

// @FollowsBlueprint test-pure-unit
describe('the inspiration input', () => {
  it('trims the title and accepts a passage that ends after it starts', () => {
    expect(inspirationCreateSchema.parse({ id: randomUUID(), ...CHANGES }).title).toBe(
      'Call Me Maybe',
    );
    expect(inspirationUpdateSchema.safeParse(CHANGES).success).toBe(true);
  });

  it('refuses an end at the start and a passage of 601 s', () => {
    const atStart = { ...CHANGES, startSeconds: 64, endSeconds: 64 };
    const tooLong = { ...CHANGES, startSeconds: 0, endSeconds: 601 };
    expect(inspirationCreateSchema.safeParse({ id: randomUUID(), ...atStart }).success).toBe(false);
    expect(inspirationCreateSchema.safeParse({ id: randomUUID(), ...tooLong }).success).toBe(false);
    expect(inspirationUpdateSchema.safeParse(atStart).success).toBe(false);
    expect(inspirationUpdateSchema.safeParse(tooLong).success).toBe(false);
  });

  it('refuses a malformed video id, a blank title, a fractional second and an overlong note', () => {
    expect(inspirationUpdateSchema.safeParse({ ...CHANGES, youtubeVideoId: 'abc' }).success).toBe(
      false,
    );
    expect(inspirationUpdateSchema.safeParse({ ...CHANGES, title: '  ' }).success).toBe(false);
    expect(inspirationUpdateSchema.safeParse({ ...CHANGES, startSeconds: 1.5 }).success).toBe(
      false,
    );
    expect(
      inspirationUpdateSchema.safeParse({
        ...CHANGES,
        note: 'x'.repeat(INSPIRATION_NOTE_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it('refuses a field the inspiration does not have, such as its author', () => {
    expect(inspirationUpdateSchema.safeParse({ ...CHANGES, authorMemberId: null }).success).toBe(
      false,
    );
  });

  it('names the inspiration table and its columns', () => {
    const config = getTableConfig(inspirationTable);
    expect(config.name).toBe('inspiration');
    expect(config.columns.map((column) => column.name)).toContain('youtube_video_id');
  });
});
