import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { studyTable } from './studies.schema';

// @FollowsBlueprint test-pure-unit
describe('studies.schema', () => {
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
