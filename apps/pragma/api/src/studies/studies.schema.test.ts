import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { studyLogSchema, studyPathSchema, studyTable } from './studies.schema';

const songId = crypto.randomUUID();
const instrumentId = crypto.randomUUID();

// @FollowsBlueprint test-pure-unit
describe('studies.schema', () => {
  it('accepts a song and an instrument', () => {
    expect(studyLogSchema.safeParse({ songId, instrumentId }).success).toBe(true);
  });

  it('refuses a body carrying a day, so a study cannot be back-dated', () => {
    expect(
      studyLogSchema.safeParse({ songId, instrumentId, studiedOn: '2020-01-01' }).success,
    ).toBe(false);
  });

  it('refuses an identifier that is not a uuid', () => {
    expect(studyPathSchema.safeParse({ songId: 'song', instrumentId }).success).toBe(false);
  });

  it('keys a study on member, song, instrument and day', () => {
    const [primaryKey] = getTableConfig(studyTable).primaryKeys;
    expect(primaryKey?.columns.map((column) => column.name)).toEqual([
      'member_id',
      'song_id',
      'instrument_id',
      'studied_on',
    ]);
  });
});
