import { boolean, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { JOIN_CODE_LENGTH, normalizeJoinCode } from '@domain/join-code.core';
import { pirateAvatarSchema } from '@domain/pirate-avatar.core';
import { PLAYER_COLORS, PLAYER_ICONS, PLAYER_NAME_MAX_LENGTH } from '@domain/player-mark.core';
import { MAXIMUM_PLAYERS, MINIMUM_PLAYERS, ROUND_COUNT, ROUND_PHASES } from '@domain/round.core';
import { BID_ADJUSTMENTS, MAXIMUM_BONUS_COUNT, RASCAL_BETS } from '@domain/scoring.core';

const FIRST_ROUND = 1;
const NO_TRICK = 0;
const DIGITS = /^\d+$/u;

// @FollowsBlueprint schema-identity-free-of-database-constraints
export const gameTable = pgTable('game', {
  id: uuid('id').primaryKey(),
  joinCode: text('join_code').notNull(),
  phase: text('phase', { enum: ROUND_PHASES }).notNull(),
  currentRound: integer('current_round').notNull(),
  rematchJoinCode: text('rematch_join_code'),
  revision: integer('revision'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const joinCodeClaimTable = pgTable('join_code_claim', {
  joinCode: text('join_code').primaryKey(),
  gameId: uuid('game_id').notNull(),
});

export const playerTable = pgTable('player', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull(),
  seat: integer('seat').notNull(),
  name: text('name').notNull(),
  icon: text('icon', { enum: PLAYER_ICONS }).notNull(),
  color: text('color', { enum: PLAYER_COLORS }).notNull(),
  accountId: uuid('account_id'),
  avatar: text('avatar'),
});

export const roundTable = pgTable(
  'round',
  {
    gameId: uuid('game_id').notNull(),
    roundNumber: integer('round_number').notNull(),
    isKrakenPlayed: boolean('is_kraken_played').notNull(),
    isWhiteWhaleDiscard: boolean('is_white_whale_discard'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.roundNumber] })],
);

export const roundEntryTable = pgTable(
  'round_entry',
  {
    gameId: uuid('game_id').notNull(),
    roundNumber: integer('round_number').notNull(),
    playerId: uuid('player_id').notNull(),
    bid: integer('bid'),
    bidAdjustment: integer('bid_adjustment'),
    rascalBet: integer('rascal_bet'),
    isMissed: boolean('is_missed'),
    tricks: integer('tricks'),
    standardFourteen: integer('standard_fourteen').notNull(),
    blackFourteen: integer('black_fourteen').notNull(),
    mermaidByPirate: integer('mermaid_by_pirate').notNull(),
    pirateBySkullKing: integer('pirate_by_skull_king').notNull(),
    skullKingByMermaid: integer('skull_king_by_mermaid').notNull(),
    loot: integer('loot').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.roundNumber, table.playerId] })],
);

export const accountGameTable = pgTable(
  'account_game',
  {
    accountId: uuid('account_id').notNull(),
    gameId: uuid('game_id').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.gameId] })],
);

const nameSchema = z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH);
const iconSchema = z.enum(PLAYER_ICONS);
const colorSchema = z.enum(PLAYER_COLORS);

const MOST_SEATS_PER_ACCOUNT = 1;

const seatToCreateSchema = z
  .object({
    name: nameSchema,
    icon: iconSchema,
    color: colorSchema,
    avatar: pirateAvatarSchema.optional(),
    isMe: z.boolean().optional(),
  })
  .strict();

export const createGameSchema = z
  .object({
    players: z
      .array(seatToCreateSchema)
      .min(MINIMUM_PLAYERS)
      .max(MAXIMUM_PLAYERS)
      .refine(
        (players) =>
          players.filter((player) => player.isMe === true).length <= MOST_SEATS_PER_ACCOUNT,
      ),
  })
  .strict();

export const updatePlayerSchema = z
  .object({
    name: nameSchema.optional(),
    icon: iconSchema.optional(),
    color: colorSchema.optional(),
    avatar: pirateAvatarSchema.optional(),
  })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);

const trickCountSchema = z.number().int().min(NO_TRICK).max(ROUND_COUNT);

const bonusCountSchema = (maximum: number) => z.number().int().min(0).max(maximum).optional();

const bonusesSchema = z
  .object({
    standardFourteen: bonusCountSchema(MAXIMUM_BONUS_COUNT.standardFourteen),
    blackFourteen: bonusCountSchema(MAXIMUM_BONUS_COUNT.blackFourteen),
    mermaidByPirate: bonusCountSchema(MAXIMUM_BONUS_COUNT.mermaidByPirate),
    pirateBySkullKing: bonusCountSchema(MAXIMUM_BONUS_COUNT.pirateBySkullKing),
    skullKingByMermaid: bonusCountSchema(MAXIMUM_BONUS_COUNT.skullKingByMermaid),
    loot: bonusCountSchema(MAXIMUM_BONUS_COUNT.loot),
  })
  .strict();

export const writeEntrySchema = z
  .object({
    bid: trickCountSchema.nullable().optional(),
    bidAdjustment: z.literal(BID_ADJUSTMENTS).nullable().optional(),
    rascalBet: z.literal(RASCAL_BETS).nullable().optional(),
    isMissed: z.boolean().optional(),
    tricks: trickCountSchema.nullable().optional(),
    bonuses: bonusesSchema.nullable().optional(),
  })
  .strict();

export const writeRoundSchema = z
  .object({ isKrakenPlayed: z.boolean().optional(), isWhiteWhaleDiscard: z.boolean().optional() })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);

export const movePhaseSchema = z
  .object({
    round: z.number().int().min(FIRST_ROUND).max(ROUND_COUNT),
    phase: z.enum(ROUND_PHASES),
  })
  .strict()
  .refine((target) => target.phase !== 'finished' || target.round === ROUND_COUNT);

const joinCodeSchema = z.string().trim().length(JOIN_CODE_LENGTH).transform(normalizeJoinCode);

const roundNumberSchema = z
  .string()
  .regex(DIGITS)
  .transform(Number)
  .pipe(z.number().int().min(FIRST_ROUND).max(ROUND_COUNT));

export const joinCodeParamSchema = z.object({ code: joinCodeSchema });

export const roundParamSchema = z.object({ code: joinCodeSchema, round: roundNumberSchema });

export const entryParamSchema = z.object({
  code: joinCodeSchema,
  round: roundNumberSchema,
  playerId: z.guid(),
});

export const playerParamSchema = z.object({ code: joinCodeSchema, playerId: z.guid() });

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type WriteEntryInput = z.infer<typeof writeEntrySchema>;
export type WriteRoundInput = z.infer<typeof writeRoundSchema>;
export type MovePhaseInput = z.infer<typeof movePhaseSchema>;
