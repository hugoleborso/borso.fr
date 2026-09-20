import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const socketConnectionTable = pgTable('socket_connection', {
  connectionId: text('connection_id').primaryKey(),
  gameId: uuid('game_id').notNull(),
  playerId: uuid('player_id'),
  connectedAt: timestamp('connected_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});
