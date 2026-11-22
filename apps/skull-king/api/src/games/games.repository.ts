import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { RoundPhase } from '@domain/round.core';
import { NO_BONUS } from '@domain/scoring.core';
import { type DatabaseExecutor, getDatabase } from '../database/client';
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

const INITIAL_REVISION = 0;

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

// @FollowsBlueprint repository-owned-transaction
export async function runInOneTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

// @FollowsBlueprint repository-query
export async function findGameByJoinCode(
  executor: DatabaseExecutor,
  joinCode: string,
): Promise<GameRow | null> {
  const rows = await executor
    .select({ game: gameTable })
    .from(joinCodeClaimTable)
    .innerJoin(gameTable, eq(gameTable.id, joinCodeClaimTable.gameId))
    .where(eq(joinCodeClaimTable.joinCode, joinCode))
    .limit(1);
  return rows[0]?.game ?? null;
}

export async function bumpGameRevision(
  executor: DatabaseExecutor,
  gameId: string,
  now: Date,
): Promise<GameRow | null> {
  const [row] = await executor
    .update(gameTable)
    .set({ revision: sql`coalesce(${gameTable.revision}, 0) + 1`, updatedAt: now })
    .where(eq(gameTable.id, gameId))
    .returning();
  return row ?? null;
}

export async function listPlayers(
  executor: DatabaseExecutor,
  gameId: string,
): Promise<PlayerRow[]> {
  return await executor
    .select()
    .from(playerTable)
    .where(eq(playerTable.gameId, gameId))
    .orderBy(asc(playerTable.seat));
}

export async function listRounds(executor: DatabaseExecutor, gameId: string): Promise<RoundRow[]> {
  return await executor.select().from(roundTable).where(eq(roundTable.gameId, gameId));
}

export async function listRoundEntries(
  executor: DatabaseExecutor,
  gameId: string,
): Promise<RoundEntryRow[]> {
  return await executor.select().from(roundEntryTable).where(eq(roundEntryTable.gameId, gameId));
}

// @FollowsBlueprint repository-owned-transaction-losing-a-race-quietly
export async function insertGameUnlessCodeTaken(
  executor: DatabaseExecutor,
  input: GameToCreate,
): Promise<GameRow | null> {
  const gameId = randomUUID();
  const claimed = await executor
    .insert(joinCodeClaimTable)
    .values({ joinCode: input.joinCode, gameId })
    .onConflictDoNothing()
    .returning({ joinCode: joinCodeClaimTable.joinCode });
  if (claimed.length === 0) return null;
  const [game] = await executor
    .insert(gameTable)
    .values({
      id: gameId,
      joinCode: input.joinCode,
      phase: input.phase,
      currentRound: input.currentRound,
      rematchJoinCode: null,
      revision: INITIAL_REVISION,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  if (game === undefined) throw new Error('insert returned no game row');
  await executor.insert(playerTable).values(input.players.map((player) => ({ ...player, gameId })));
  return game;
}

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertRoundEntry(
  executor: DatabaseExecutor,
  key: EntryKey,
  changes: EntryChanges,
  now: Date,
): Promise<void> {
  await executor
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
  executor: DatabaseExecutor,
  gameId: string,
  roundNumber: number,
  changes: RoundChanges,
  now: Date,
): Promise<void> {
  await executor
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
  executor: DatabaseExecutor,
  gameId: string,
  phase: RoundPhase,
  currentRound: number,
  now: Date,
): Promise<GameRow | null> {
  const [row] = await executor
    .update(gameTable)
    .set({ phase, currentRound, updatedAt: now })
    .where(eq(gameTable.id, gameId))
    .returning();
  return row ?? null;
}

export async function updatePlayer(
  executor: DatabaseExecutor,
  gameId: string,
  playerId: string,
  changes: Partial<PlayerToSeat>,
): Promise<PlayerRow | null> {
  const [row] = await executor
    .update(playerTable)
    .set(changes)
    .where(and(eq(playerTable.gameId, gameId), eq(playerTable.id, playerId)))
    .returning();
  return row ?? null;
}

export async function recordRematch(
  executor: DatabaseExecutor,
  gameId: string,
  rematchJoinCode: string,
  now: Date,
): Promise<void> {
  await executor
    .update(gameTable)
    .set({ rematchJoinCode, updatedAt: now })
    .where(eq(gameTable.id, gameId));
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

export async function linkSeat(
  executor: DatabaseExecutor,
  gameId: string,
  playerId: string,
  accountId: string,
): Promise<void> {
  await executor
    .update(playerTable)
    .set({ accountId })
    .where(and(eq(playerTable.gameId, gameId), eq(playerTable.id, playerId)));
}
