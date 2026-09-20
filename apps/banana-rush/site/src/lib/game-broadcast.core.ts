import { z } from 'zod';

const playerSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  avatar: z.string(),
  stashBananas: z.number(),
  isHost: z.boolean(),
  hasBid: z.boolean(),
});

const outcomeSchema = z.object({
  playerId: z.string(),
  bid: z.number(),
  stashBefore: z.number(),
  stashAfter: z.number(),
  crateWon: z.number(),
  tariffPaid: z.number(),
  tariffReceived: z.number(),
  busted: z.boolean(),
});

export const broadcastGameSchema = z.object({
  joinCode: z.string(),
  status: z.enum(['lobby', 'playing', 'finished']),
  maxPlayers: z.number(),
  freeSeats: z.number(),
  winningScore: z.number(),
  roundTimerSeconds: z.number().nullable(),
  crateBananas: z.number(),
  currentRound: z.number(),
  roundOpenedAt: z.string().nullable(),
  players: z.array(playerSchema),
  lastRound: z
    .object({
      roundNumber: z.number(),
      crateBefore: z.number(),
      crateAfter: z.number(),
      outcomes: z.array(outcomeSchema),
    })
    .nullable(),
  rematchJoinCode: z.string().nullable(),
  winnerIds: z.array(z.string()),
  viewerId: z.string().nullable(),
  viewerBid: z.number().nullable(),
});

const broadcastSchema = z.object({ kind: z.literal('game'), game: broadcastGameSchema });

export interface BroadcastPlayer {
  readonly id: string;
  readonly nickname: string;
  readonly avatar: string;
  readonly stashBananas: number;
  readonly isHost: boolean;
  readonly hasBid: boolean;
}

export interface BroadcastOutcome {
  readonly playerId: string;
  readonly bid: number;
  readonly stashBefore: number;
  readonly stashAfter: number;
  readonly crateWon: number;
  readonly tariffPaid: number;
  readonly tariffReceived: number;
  readonly busted: boolean;
}

export interface BroadcastRound {
  readonly roundNumber: number;
  readonly crateBefore: number;
  readonly crateAfter: number;
  readonly outcomes: readonly BroadcastOutcome[];
}

/**
 * @Blueprint types-front-end-owns-the-shape-it-reads
 * @BlueprintName Types The Front End Owns Rather Than Imports
 * @BlueprintUsage Use for the record a front end reads everywhere, where importing the back end's own type would be the quick answer.
 * @BlueprintDescription Declares the shape here rather than importing it from the API, because the one thing a front end takes from the back end's types is the router, and reaching past that couples every screen to the internals of a slice. The schema in this same file validates exactly this shape at runtime for anything arriving over the socket, and the back end end to end suite carries the matching envelope, so the two descriptions are checked against the real payload from both ends rather than being made identical by an import that hides the coupling. The arrays are readonly, which is what lets the API's own readonly response be assigned to it without a copy.
 */
export interface BroadcastGame {
  readonly joinCode: string;
  readonly status: 'lobby' | 'playing' | 'finished';
  readonly maxPlayers: number;
  readonly freeSeats: number;
  readonly winningScore: number;
  readonly roundTimerSeconds: number | null;
  readonly crateBananas: number;
  readonly currentRound: number;
  readonly roundOpenedAt: string | null;
  readonly players: readonly BroadcastPlayer[];
  readonly lastRound: BroadcastRound | null;
  readonly rematchJoinCode: string | null;
  readonly winnerIds: readonly string[];
  readonly viewerId: string | null;
  readonly viewerBid: number | null;
}

export function parseBroadcast(rawMessage: unknown): BroadcastGame | null {
  try {
    const messageBody: unknown = JSON.parse(String(rawMessage));
    const broadcast = broadcastSchema.safeParse(messageBody);
    return broadcast.success ? broadcast.data.game : null;
  } catch {
    return null;
  }
}

/**
 * @Blueprint core-merging-a-broadcast-with-what-only-this-reader-knows
 * @BlueprintName Core Merging A Broadcast With What Only This Reader Knows
 * @BlueprintUsage Use where one message goes to every reader and each reader holds a private part of the same record.
 * @BlueprintDescription Re attaches the private part to the shared message rather than asking the server for a reader specific copy, which is what lets one broadcast serve every connection and keeps the secret out of a payload that many people receive. The private part is dropped when the round number moves, because a secret belongs to the round it was written in and carrying it forward would show a player last round's answer as though it were this one's. A reader that has nothing yet simply takes the message as it stands.
 */
export function mergeBroadcast(
  previous: BroadcastGame | undefined,
  incoming: BroadcastGame,
): BroadcastGame {
  if (previous === undefined) return incoming;
  const isSameRound = previous.currentRound === incoming.currentRound;
  return {
    ...incoming,
    viewerId: previous.viewerId,
    viewerBid: isSameRound ? previous.viewerBid : null,
  };
}
