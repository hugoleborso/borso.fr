import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { realtimeConnectionTable } from './realtime.schema';

// @FollowsBlueprint test-pure-unit
describe('the table the open sockets land in', () => {
  it('keys a connection on the identifier API Gateway gave it', () => {
    const config = getTableConfig(realtimeConnectionTable);
    expect(config.name).toBe('realtime_connection');
    expect(config.columns.filter((column) => column.primary).map((column) => column.name)).toEqual([
      'connection_id',
    ]);
  });

  it('remembers the member who opened it and the tab it was opened in', () => {
    const columns = getTableConfig(realtimeConnectionTable).columns;
    expect(columns.map((column) => [column.name, column.notNull, column.hasDefault])).toStrictEqual(
      [
        ['connection_id', true, false],
        ['member_id', true, false],
        ['client_id', true, false],
        ['connected_at', true, true],
      ],
    );
  });
});
