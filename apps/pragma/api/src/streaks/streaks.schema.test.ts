import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { presenceTable } from './streaks.schema';

// @FollowsBlueprint test-pure-unit
describe('streaks.schema', () => {
  it('keys a presence on member and day, so a second opening the same day adds no row', () => {
    const [primaryKey] = getTableConfig(presenceTable).primaryKeys;
    expect(primaryKey?.columns.map((column) => column.name)).toEqual(['member_id', 'present_on']);
  });
});
