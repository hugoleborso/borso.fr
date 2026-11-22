import {
  PLAYER_COLORS,
  PLAYER_ICONS,
  type PlayerColor,
  type PlayerIcon,
} from '@domain/player-mark.core';
import { ROUND_PHASES, type RoundPhase } from '@domain/round.core';
import {
  BID_ADJUSTMENTS,
  type BidAdjustment,
  type BonusCounts,
  RASCAL_BETS,
  type RascalBet,
} from '@domain/scoring.core';
import { z } from 'zod';

const bonusCountsSchema = z.object({
  standardFourteen: z.number(),
  blackFourteen: z.number(),
  mermaidByPirate: z.number(),
  pirateBySkullKing: z.number(),
  skullKingByMermaid: z.number(),
  loot: z.number(),
});

const gameViewSchema = z.object({
  joinCode: z.string(),
  phase: z.enum(ROUND_PHASES),
  currentRound: z.number(),
  players: z.array(
    z.object({
      id: z.string(),
      seat: z.number(),
      name: z.string(),
      icon: z.enum(PLAYER_ICONS),
      color: z.enum(PLAYER_COLORS),
      accountId: z.string().nullish(),
    }),
  ),
  rounds: z.array(
    z.object({
      number: z.number(),
      cardCount: z.number(),
      isKrakenPlayed: z.boolean(),
      isWhiteWhaleDiscard: z.boolean(),
      entries: z.array(
        z.object({
          playerId: z.string(),
          bid: z.number().nullable(),
          bidAdjustment: z.literal([...BID_ADJUSTMENTS]),
          rascalBet: z.literal([...RASCAL_BETS]),
          tricks: z.number().nullable(),
          bonuses: bonusCountsSchema,
        }),
      ),
    }),
  ),
  revision: z.number(),
  readAt: z.string(),
  rematchJoinCode: z.string().nullish(),
});

const broadcastSchema = z.object({ kind: z.literal('game'), game: gameViewSchema });

export interface GamePlayer {
  readonly id: string;
  readonly seat: number;
  readonly name: string;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly accountId?: string | null;
}

export interface GameEntry {
  readonly playerId: string;
  readonly bid: number | null;
  readonly bidAdjustment: BidAdjustment;
  readonly rascalBet: RascalBet;
  readonly tricks: number | null;
  readonly bonuses: BonusCounts;
}

export interface GameRound {
  readonly number: number;
  readonly cardCount: number;
  readonly isKrakenPlayed: boolean;
  readonly isWhiteWhaleDiscard: boolean;
  readonly entries: readonly GameEntry[];
}

// @FollowsBlueprint types-front-end-owns-the-shape-it-reads
export interface GameView {
  readonly joinCode: string;
  readonly phase: RoundPhase;
  readonly currentRound: number;
  readonly players: readonly GamePlayer[];
  readonly rounds: readonly GameRound[];
  readonly revision: number;
  readonly readAt: string;
  readonly rematchJoinCode?: string | null;
}

export function parseBroadcast(rawMessage: unknown): GameView | null {
  try {
    const messageBody: unknown = JSON.parse(String(rawMessage));
    const broadcast = broadcastSchema.safeParse(messageBody);
    return broadcast.success ? broadcast.data.game : null;
  } catch {
    return null;
  }
}
