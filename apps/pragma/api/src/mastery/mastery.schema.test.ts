import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  masteryDefaultTable,
  masteryOverrideTable,
  masteryDefaultPathSchema,
  masteryDefaultRowSchema,
  masteryOverridePathSchema,
  masteryOverrideRowSchema,
  masterySongIdParamSchema,
} from './mastery.schema';

const SCORE_FLOOR = 0;
const SCORE_CEILING = 10;
const memberId = crypto.randomUUID();
const instrumentId = crypto.randomUUID();
const songId = crypto.randomUUID();

describe('masteryDefaultRowSchema', () => {
  it('accepts a score at each end of the scale', () => {
    for (const score of [SCORE_FLOOR, SCORE_CEILING]) {
      expect(masteryDefaultRowSchema.safeParse({ memberId, instrumentId, score }).success).toBe(
        true,
      );
    }
  });

  it('refuses a score outside the scale', () => {
    for (const score of [SCORE_FLOOR - 1, SCORE_CEILING + 1]) {
      expect(masteryDefaultRowSchema.safeParse({ memberId, instrumentId, score }).success).toBe(
        false,
      );
    }
  });

  it('refuses a fractional score, since the scale has no half steps', () => {
    expect(masteryDefaultRowSchema.safeParse({ memberId, instrumentId, score: 7.5 }).success).toBe(
      false,
    );
  });

  it('refuses a member or instrument that is not a uuid', () => {
    expect(
      masteryDefaultRowSchema.safeParse({ memberId: 'member-1', instrumentId, score: 5 }).success,
    ).toBe(false);
    expect(
      masteryDefaultRowSchema.safeParse({ memberId, instrumentId: 'guitar', score: 5 }).success,
    ).toBe(false);
  });
});

describe('masteryOverrideRowSchema', () => {
  it('carries the song the override applies to', () => {
    expect(
      masteryOverrideRowSchema.safeParse({ memberId, instrumentId, songId, score: 5 }).success,
    ).toBe(true);
    expect(masteryOverrideRowSchema.safeParse({ memberId, instrumentId, score: 5 }).success).toBe(
      false,
    );
  });
});

describe('the path schemas', () => {
  it('names a default by member and instrument', () => {
    expect(masteryDefaultPathSchema.safeParse({ memberId, instrumentId }).success).toBe(true);
    expect(masteryDefaultPathSchema.safeParse({ memberId }).success).toBe(false);
  });

  it('names an override by adding the song to that pair', () => {
    expect(masteryOverridePathSchema.safeParse({ memberId, instrumentId, songId }).success).toBe(
      true,
    );
    expect(masteryOverridePathSchema.safeParse({ memberId, instrumentId }).success).toBe(false);
  });

  it('names a song on its own for the per-song listing', () => {
    expect(masterySongIdParamSchema.safeParse({ songId }).success).toBe(true);
    expect(masterySongIdParamSchema.safeParse({ songId: 'song-1' }).success).toBe(false);
  });
});

describe('the composite keys', () => {
  it('identifies a default by member and instrument', () => {
    const [primary] = getTableConfig(masteryDefaultTable).primaryKeys;
    expect(primary?.columns.map((column) => column.name)).toEqual(['member_id', 'instrument_id']);
  });

  it('identifies an override by that pair plus the song', () => {
    const [primary] = getTableConfig(masteryOverrideTable).primaryKeys;
    expect(primary?.columns.map((column) => column.name)).toEqual([
      'member_id',
      'instrument_id',
      'song_id',
    ]);
  });
});
