import { date, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

// @FollowsBlueprint schema-dsql-constraints
export const studyTable = pgTable(
  'study',
  {
    memberId: uuid('member_id').notNull(),
    songId: uuid('song_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    studiedOn: date('studied_on', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    primaryKey({
      name: 'study_pk',
      columns: [table.memberId, table.songId, table.instrumentId, table.studiedOn],
    }),
  ],
);
