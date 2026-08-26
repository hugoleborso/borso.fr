import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// @FollowsBlueprint schema-table-and-input
export const votingRoundTable = pgTable('voting_round', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull(),
  closesAt: timestamp('closes_at', { withTimezone: true, mode: 'date' }).notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true, mode: 'date' }),
  winningSongId: uuid('winning_song_id'),
});

// @FollowsBlueprint schema-dsql-constraints
export const audienceVoteTable = pgTable(
  'audience_vote',
  {
    roundId: uuid('round_id').notNull(),
    ballotToken: text('ballot_token').notNull(),
    songId: uuid('song_id').notNull(),
    castAt: timestamp('cast_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    primaryKey({
      name: 'audience_vote_pk',
      columns: [table.roundId, table.ballotToken, table.songId],
    }),
  ],
);

// @FollowsBlueprint schema-table-and-input
export const audienceSuggestionTable = pgTable('audience_suggestion', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  songId: uuid('song_id').notNull(),
  ballotToken: text('ballot_token').notNull(),
  suggestedAt: timestamp('suggested_at', { withTimezone: true, mode: 'date' }).notNull(),
});

const MUSICBRAINZ_ID_MAX = 256;
const SEARCH_QUERY_MAX = 256;

export const concertParamSchema = z.object({ sessionId: z.string().uuid() });

export const roundParamSchema = z.object({ roundId: z.string().uuid() });

export const roundVoteParamSchema = z.object({
  roundId: z.string().uuid(),
  songId: z.string().uuid(),
});

export const voteCreateSchema = z.object({ songId: z.string().uuid() }).strict();

export const suggestionCreateSchema = z
  .object({ mbid: z.string().trim().min(1).max(MUSICBRAINZ_ID_MAX) })
  .strict();

export const audienceSearchQuerySchema = z.object({
  q: z.string().min(1).max(SEARCH_QUERY_MAX),
});
