import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import type { RoundPhase } from '@domain/round.core';
import { NO_BONUS } from '@domain/scoring.core';
import { getDatabase } from '../database/client';
import { isConflictAbort } from '../helpers/persistence/conflict-abort.core';
import type { EntryChanges } from './game-write.core';
import {
  accountGameTable,
  gameTable,
  joinCodeClaimTable,
  playerTable,
  roundEntryTable,
  roundTable,
} from './games.schema';

export type GameRow = typeof gameTable.$inferSelect;
export type PlayerRow = typeof playerTable.$inferSelect;
export type RoundRow = typeof roundTable.$inferSelect;
export type RoundEntryRow = typeof roundEntryTable.$inferSelect;

export type PlayerToSeat = Omit<typeof playerTable.$inferInsert, 'id' | 'gameId'>;

export interface GameToCreate {
  readonly joinCode: string;
  readonly phase: RoundPhase;
  readonly currentRound: number;
  readonly players: readonly PlayerToSeat[];
  readonly now: Date;
}

export interface EntryKey {
  readonly gameId: string;
  readonly roundNumber: number;
  readonly playerId: string;
}

// @FollowsBlueprint repository-query
export async function findGameByJoinCode(joinCode: string): Promise<GameRow | null> {
  const database = getDatabase();
  const rows = await database
    .select({ game: gameTable })
    .from(joinCodeClaimTable)
    .innerJoin(gameTable, eq(gameTable.id, joinCodeClaimTable.gameId))
    .where(eq(joinCodeClaimTable.joinCode, joinCode))
    .limit(1);
  return rows[0]?.game ?? null;
}

export async function listPlayers(gameId: string): Promise<PlayerRow[]> {
  const database = getDatabase();
  return await database
    .select()
    .from(playerTable)
    .where(eq(playerTable.gameId, gameId))
    .orderBy(asc(playerTable.seat));
}

export async function listRounds(gameId: string): Promise<RoundRow[]> {
  const database = getDatabase();
  return await database.select().from(roundTable).where(eq(roundTable.gameId, gameId));
}

export async function listRoundEntries(gameId: string): Promise<RoundEntryRow[]> {
  const database = getDatabase();
  return await database.select().from(roundEntryTable).where(eq(roundEntryTable.gameId, gameId));
}

// @FollowsBlueprint repository-owned-transaction-losing-a-race-quietly
export async function insertGameUnlessCodeTaken(input: GameToCreate): Promise<GameRow | null> {
  const database = getDatabase();
  const gameId = randomUUID();
  return await database.transaction(async (transaction) => {
    const claimed = await transaction
      .insert(joinCodeClaimTable)
      .values({ joinCode: input.joinCode, gameId })
      .onConflictDoNothing()
      .returning({ joinCode: joinCodeClaimTable.joinCode });
    if (claimed.length === 0) return null;
    const [game] = await transaction
      .insert(gameTable)
      .values({
        id: gameId,
        joinCode: input.joinCode,
        phase: input.phase,
        currentRound: input.currentRound,
        rematchJoinCode: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    if (game === undefined) throw new Error('insert returned no game row');
    await transaction
      .insert(playerTable)
      .values(input.players.map((player) => ({ ...player, gameId })));
    return game;
  });
}

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertRoundEntry(
  key: EntryKey,
  changes: EntryChanges,
  now: Date,
): Promise<void> {
  const database = getDatabase();
  await database
    .insert(roundEntryTable)
    .values({
      ...key,
      bid: null,
      bidAdjustment: 0,
      rascalBet: 0,
      tricks: null,
      ...NO_BONUS,
      ...changes,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [roundEntryTable.gameId, roundEntryTable.roundNumber, roundEntryTable.playerId],
      set: { ...changes, updatedAt: now },
    });
}

export interface RoundChanges {
  readonly isKrakenPlayed?: boolean | undefined;
  readonly isWhiteWhaleDiscard?: boolean | undefined;
}

export async function upsertRound(
  gameId: string,
  roundNumber: number,
  changes: RoundChanges,
  now: Date,
): Promise<void> {
  const database = getDatabase();
  await database
    .insert(roundTable)
    .values({
      gameId,
      roundNumber,
      isKrakenPlayed: false,
      isWhiteWhaleDiscard: false,
      ...changes,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [roundTable.gameId, roundTable.roundNumber],
      set: { ...changes, updatedAt: now },
    });
}

export async function updateGamePhase(
  gameId: string,
  phase: RoundPhase,
  currentRound: number,
  now: Date,
): Promise<GameRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(gameTable)
    .set({ phase, currentRound, updatedAt: now })
    .where(eq(gameTable.id, gameId))
    .returning();
  return row ?? null;
}

export async function updatePlayer(
  gameId: string,
  playerId: string,
  changes: Partial<PlayerToSeat>,
): Promise<PlayerRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(playerTable)
    .set(changes)
    .where(and(eq(playerTable.gameId, gameId), eq(playerTable.id, playerId)))
    .returning();
  return row ?? null;
}

// @FollowsBlueprint repository-conditional-claim
export async function didRecordRematch(
  gameId: string,
  rematchJoinCode: string,
  now: Date,
): Promise<boolean> {
  const database = getDatabase();
  try {
    const written = await database
      .update(gameTable)
      .set({ rematchJoinCode, updatedAt: now })
      .where(and(eq(gameTable.id, gameId), isNull(gameTable.rematchJoinCode)))
      .returning({ id: gameTable.id });
    return written.length > 0;
  } catch (error) {
    if (isConflictAbort(error)) return false;
    throw error;
  }
}

export async function upsertAccountGame(
  accountId: string,
  gameId: string,
  now: Date,
): Promise<void> {
  const database = getDatabase();
  await database
    .insert(accountGameTable)
    .values({ accountId, gameId, openedAt: now })
    .onConflictDoUpdate({
      target: [accountGameTable.accountId, accountGameTable.gameId],
      set: { openedAt: now },
    });
}

export interface OpenedGameRow {
  readonly game: GameRow;
  readonly openedAt: Date;
}

export async function listGamesOpenedBy(accountId: string): Promise<OpenedGameRow[]> {
  const database = getDatabase();
  return await database
    .select({ game: gameTable, openedAt: accountGameTable.openedAt })
    .from(accountGameTable)
    .innerJoin(gameTable, eq(gameTable.id, accountGameTable.gameId))
    .where(eq(accountGameTable.accountId, accountId))
    .orderBy(desc(accountGameTable.openedAt));
}

export async function listPlayersOfGames(gameIds: readonly string[]): Promise<PlayerRow[]> {
  if (gameIds.length === 0) return [];
  const database = getDatabase();
  return await database
    .select()
    .from(playerTable)
    .where(inArray(playerTable.gameId, [...gameIds]));
}

export async function listRoundEntriesOfGames(
  gameIds: readonly string[],
): Promise<RoundEntryRow[]> {
  if (gameIds.length === 0) return [];
  const database = getDatabase();
  return await database
    .select()
    .from(roundEntryTable)
    .where(inArray(roundEntryTable.gameId, [...gameIds]));
}

export async function didClaimSeat(
  gameId: string,
  playerId: string,
  accountId: string,
): Promise<boolean> {
  const database = getDatabase();
  try {
    const written = await database
      .update(playerTable)
      .set({ accountId })
      .where(
        and(
          eq(playerTable.gameId, gameId),
          eq(playerTable.id, playerId),
          or(isNull(playerTable.accountId), eq(playerTable.accountId, accountId)),
        ),
      )
      .returning({ id: playerTable.id });
    return written.length > 0;
  } catch (error) {
    if (isConflictAbort(error)) return false;
    throw error;
  }
}
