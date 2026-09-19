import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { socketConnectionTable } from './realtime.schema';

// @FollowsBlueprint test-pure-unit
describe('the table the open sockets land in', () => {
  it('keys a connection on the identifier API Gateway gave it', () => {
    const config = getTableConfig(socketConnectionTable);
    expect(config.name).toBe('socket_connection');
    expect(config.columns.filter((column) => column.primary).map((column) => column.name)).toEqual([
      'connection_id',
    ]);
  });

  it('remembers which game a connection is watching', () => {
    const names = getTableConfig(socketConnectionTable).columns.map((column) => column.name);
    expect(names).toContain('game_id');
    expect(names).toContain('player_id');
  });
});
