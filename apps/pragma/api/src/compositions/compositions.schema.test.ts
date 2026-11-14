import { SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  compositionCreateSchema,
  compositionRenameSchema,
  compositionTable,
} from './compositions.schema';

const COMPOSITION_ID = '6f1c0d9e-4b7a-4c1e-9a55-0c2f3d4e5f60';

// @FollowsBlueprint test-pure-unit
describe('composition input schemas', () => {
  it('trims the title of a new composition and keeps its id', () => {
    expect(compositionCreateSchema.parse({ id: COMPOSITION_ID, title: '  New 7 ' })).toEqual({
      id: COMPOSITION_ID,
      title: 'New 7',
    });
  });

  it('refuses a blank title, a title longer than a song title, and a field it does not own', () => {
    expect(compositionCreateSchema.safeParse({ id: COMPOSITION_ID, title: '  ' }).success).toBe(
      false,
    );
    expect(
      compositionRenameSchema.safeParse({ title: 'a'.repeat(SONG_TEXT_FIELD_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(
      compositionRenameSchema.safeParse({ title: 'a'.repeat(SONG_TEXT_FIELD_MAX_LENGTH) }).success,
    ).toBe(true);
    expect(
      compositionCreateSchema.safeParse({ id: COMPOSITION_ID, title: 'New 7', songId: null })
        .success,
    ).toBe(false);
  });

  it('indexes compositions by the song they became, so a song delete finds its link', () => {
    expect(getTableConfig(compositionTable).indexes.map((index) => index.config.name)).toEqual([
      'composition_song_idx',
    ]);
  });
});
