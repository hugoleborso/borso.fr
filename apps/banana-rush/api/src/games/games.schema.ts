import { boolean, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { MAXIMUM_BID_BANANAS, MINIMUM_BID_BANANAS } from '@domain/bid.core';
import {
  MAXIMUM_SEATS,
  MINIMUM_SEATS,
  ROUND_TIMER_CHOICES_SECONDS,
  WINNING_SCORE_CHOICES,
} from '@domain/game-setup.core';
import { MONKEY_AVATARS, NICKNAME_MAX_LENGTH } from '@domain/monkey.core';

export const GAME_STATUSES = ['lobby', 'playing', 'finished'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const JOIN_CODE_LENGTH = 4;

/**
 * @Blueprint schema-identity-free-of-database-constraints
 * @BlueprintName Schema Whose Identity Carries Its Own Uniqueness
 * @BlueprintUsage Use for a table on Aurora DSQL whose rows must be written at most once, when a unique index would be the obvious Postgres answer.
 * @BlueprintDescription Makes the natural key the primary key rather than adding a surrogate id and a unique index beside it. Aurora DSQL builds every non primary index asynchronously, so a unique index does not refuse a duplicate the moment it is written, which is exactly when a duplicate has to be refused here. A primary key is enforced from the first write, so two players whose last bids arrive together cannot both resolve the same round: one transaction writes the row and the other is refused, and the loser reads back what the winner wrote. The engine gaps this design avoids are listed in docs/knowledge/dsql-postgres-compat-gaps.md.
 */
export const gameTable = pgTable('game', {
  id: uuid('id').primaryKey().defaultRandom(),
  joinCode: text('join_code').notNull(),
  status: text('status').notNull(),
  maxPlayers: integer('max_players').notNull(),
  roundTimerSeconds: integer('round_timer_seconds'),
  winningScore: integer('winning_score').notNull(),
  crateBananas: integer('crate_bananas').notNull(),
  currentRound: integer('current_round').notNull(),
  roundOpenedAt: timestamp('round_opened_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
});

export const playerTable = pgTable('player', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  nickname: text('nickname').notNull(),
  avatar: text('avatar').notNull(),
  stashBananas: integer('stash_bananas').notNull(),
  seatOrder: integer('seat_order').notNull(),
  isHost: boolean('is_host').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const roundResultTable = pgTable(
  'round_result',
  {
    gameId: uuid('game_id').notNull(),
    roundNumber: integer('round_number').notNull(),
    crateBefore: integer('crate_before').notNull(),
    crateAfter: integer('crate_after').notNull(),
    outcomes: text('outcomes').notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.roundNumber] })],
);

const nicknameSchema = z.string().trim().min(1).max(NICKNAME_MAX_LENGTH);
const avatarSchema = z.enum(MONKEY_AVATARS);

export const createGameSchema = z
  .object({
    nickname: nicknameSchema,
    avatar: avatarSchema,
    maxPlayers: z.number().int().min(MINIMUM_SEATS).max(MAXIMUM_SEATS),
    winningScore: z.union([
      z.literal(WINNING_SCORE_CHOICES[0]),
      z.literal(WINNING_SCORE_CHOICES[1]),
      z.literal(WINNING_SCORE_CHOICES[2]),
    ]),
    roundTimerSeconds: z
      .union([
        z.literal(ROUND_TIMER_CHOICES_SECONDS[0]),
        z.literal(ROUND_TIMER_CHOICES_SECONDS[1]),
        z.null(),
      ])
      .default(null),
  })
  .strict();

export const joinGameSchema = z.object({ nickname: nicknameSchema, avatar: avatarSchema }).strict();

export const joinCodeParamSchema = z.object({
  code: z.string().trim().length(JOIN_CODE_LENGTH),
});

export const outcomesSchema = z.array(
  z.object({
    playerId: z.string().uuid(),
    bid: z.number().int(),
    stashBefore: z.number().int(),
    stashAfter: z.number().int(),
    crateWon: z.number().int(),
    tariffPaid: z.number().int(),
    tariffReceived: z.number().int(),
    busted: z.boolean(),
  }),
);

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;

// @FollowsBlueprint schema-identity-free-of-database-constraints
export const bidTable = pgTable(
  'bid',
  {
    gameId: uuid('game_id').notNull(),
    playerId: uuid('player_id').notNull(),
    roundNumber: integer('round_number').notNull(),
    amount: integer('amount').notNull(),
    placedAt: timestamp('placed_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.playerId, table.roundNumber] })],
);

export const placeBidSchema = z
  .object({
    amount: z.number().int().min(MINIMUM_BID_BANANAS).max(MAXIMUM_BID_BANANAS),
  })
  .strict();
