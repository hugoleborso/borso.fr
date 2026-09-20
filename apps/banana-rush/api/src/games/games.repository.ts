import { and, asc, desc, eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { bidTable, gameTable, outcomesSchema, playerTable, roundResultTable } from './games.schema';
import type { RoundResolution } from './round.core';

export type GameRow = typeof gameTable.$inferSelect;
export type PlayerRow = typeof playerTable.$inferSelect;

export interface StoredRoundResult {
  readonly roundNumber: number;
  readonly crateBefore: number;
  readonly crateAfter: number;
  readonly outcomes: ReturnType<typeof outcomesSchema.parse>;
}

// @FollowsBlueprint repository-query
export async function findGameByJoinCode(joinCode: string): Promise<GameRow | null> {
  const database = getDatabase();
  const rows = await database
    .select()
    .from(gameTable)
    .where(eq(gameTable.joinCode, joinCode))
    .orderBy(desc(gameTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPlayers(gameId: string): Promise<PlayerRow[]> {
  const database = getDatabase();
  return await database
    .select()
    .from(playerTable)
    .where(eq(playerTable.gameId, gameId))
    .orderBy(asc(playerTable.seatOrder));
}

export async function findPlayerByTokenHash(
  gameId: string,
  tokenHash: string,
): Promise<PlayerRow | null> {
  const database = getDatabase();
  const rows = await database
    .select()
    .from(playerTable)
    .where(and(eq(playerTable.gameId, gameId), eq(playerTable.tokenHash, tokenHash)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertGame(values: typeof gameTable.$inferInsert): Promise<GameRow> {
  const database = getDatabase();
  const [row] = await database.insert(gameTable).values(values).returning();
  if (row === undefined) throw new Error('insert returned no game row');
  return row;
}

export async function insertPlayer(values: typeof playerTable.$inferInsert): Promise<PlayerRow> {
  const database = getDatabase();
  const [row] = await database.insert(playerTable).values(values).returning();
  if (row === undefined) throw new Error('insert returned no player row');
  return row;
}

export async function insertPlayers(
  values: readonly (typeof playerTable.$inferInsert)[],
): Promise<void> {
  if (values.length === 0) return;
  const database = getDatabase();
  await database.insert(playerTable).values([...values]);
}

export async function updatePlayerToken(
  playerId: string,
  tokenHash: string,
): Promise<PlayerRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(playerTable)
    .set({ tokenHash })
    .where(eq(playerTable.id, playerId))
    .returning();
  return row ?? null;
}

export async function updateGame(
  gameId: string,
  changes: Partial<typeof gameTable.$inferInsert>,
): Promise<GameRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(gameTable)
    .set(changes)
    .where(eq(gameTable.id, gameId))
    .returning();
  return row ?? null;
}

function readStoredRound(row: typeof roundResultTable.$inferSelect): StoredRoundResult {
  const storedOutcomes: unknown = JSON.parse(row.outcomes);
  return {
    roundNumber: row.roundNumber,
    crateBefore: row.crateBefore,
    crateAfter: row.crateAfter,
    outcomes: outcomesSchema.parse(storedOutcomes),
  };
}

// @FollowsBlueprint repository-json-column
export async function findLatestRoundResult(gameId: string): Promise<StoredRoundResult | null> {
  const database = getDatabase();
  const rows = await database
    .select()
    .from(roundResultTable)
    .where(eq(roundResultTable.gameId, gameId))
    .orderBy(desc(roundResultTable.roundNumber))
    .limit(1);
  const row = rows[0];
  if (row === undefined) return null;
  return readStoredRound(row);
}

export async function listRoundResults(gameId: string): Promise<StoredRoundResult[]> {
  const database = getDatabase();
  const rows = await database
    .select()
    .from(roundResultTable)
    .where(eq(roundResultTable.gameId, gameId))
    .orderBy(asc(roundResultTable.roundNumber));
  return rows.map(readStoredRound);
}

export interface BidToWrite {
  readonly gameId: string;
  readonly playerId: string;
  readonly roundNumber: number;
  readonly amount: number;
  readonly placedAt: Date;
}

export interface CommitRoundInput {
  readonly gameId: string;
  readonly roundNumber: number;
  readonly resolution: RoundResolution;
  readonly winnerIds: readonly string[];
  readonly now: Date;
}

export async function listBidsForRound(
  gameId: string,
  roundNumber: number,
): Promise<(typeof bidTable.$inferSelect)[]> {
  const database = getDatabase();
  return await database
    .select()
    .from(bidTable)
    .where(and(eq(bidTable.gameId, gameId), eq(bidTable.roundNumber, roundNumber)));
}

/**
 * @Blueprint repository-write-refused-by-the-primary-key
 * @BlueprintName Repository Write Refused By The Primary Key
 * @BlueprintUsage Use where two concurrent requests may try to write the same logical row and exactly one of them must win.
 * @BlueprintDescription Answers whether this caller wrote the row rather than throwing, because losing the race is an ordinary outcome here and not a failure. The primary key is the whole mechanism: it refuses the second write from the first moment, which a unique index on Aurora DSQL would not, since non primary indexes there are built asynchronously and refuse nothing while the build runs. The caller reads the winning row back afterwards instead of recomputing, so both callers end up describing the same thing to their readers.
 */
export async function didClaimBid(values: BidToWrite): Promise<boolean> {
  const database = getDatabase();
  const written = await database
    .insert(bidTable)
    .values(values)
    .onConflictDoNothing()
    .returning({ playerId: bidTable.playerId });
  return written.length > 0;
}

export async function insertBidsForMissingPlayers(values: readonly BidToWrite[]): Promise<void> {
  if (values.length === 0) return;
  const database = getDatabase();
  await database
    .insert(bidTable)
    .values([...values])
    .onConflictDoNothing();
}

/**
 * @Blueprint repository-owned-transaction-losing-a-race-quietly
 * @BlueprintName Repository Transaction That Loses A Race Quietly
 * @BlueprintUsage Use where several callers may compute the same state change at the same moment and only the first one may apply it.
 * @BlueprintDescription Opens the transaction with the insert that can be refused, so the primary key decides the winner before any other row is touched. A caller that loses writes nothing at all and is told so by the return value rather than by an exception, because arriving second is ordinary here. Every other write in the same transaction is therefore reached only by the winner, which is what makes applying the new balances and advancing the round safe without the advisory lock Aurora DSQL does not offer.
 */
export async function didCommitRound(input: CommitRoundInput): Promise<boolean> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    const claimed = await transaction
      .insert(roundResultTable)
      .values({
        gameId: input.gameId,
        roundNumber: input.roundNumber,
        crateBefore: input.resolution.crateBefore,
        crateAfter: input.resolution.crateAfter,
        outcomes: JSON.stringify(input.resolution.outcomes),
        resolvedAt: input.now,
      })
      .onConflictDoNothing()
      .returning({ roundNumber: roundResultTable.roundNumber });

    if (claimed.length === 0) return false;

    for (const outcome of input.resolution.outcomes) {
      await transaction
        .update(playerTable)
        .set({ stashBananas: outcome.stashAfter })
        .where(eq(playerTable.id, outcome.playerId));
    }

    const isGameOver = input.winnerIds.length > 0;
    await transaction
      .update(gameTable)
      .set({
        crateBananas: input.resolution.crateAfter,
        currentRound: input.roundNumber + 1,
        roundOpenedAt: isGameOver ? null : input.now,
        status: isGameOver ? 'finished' : 'playing',
        finishedAt: isGameOver ? input.now : null,
      })
      .where(eq(gameTable.id, input.gameId));

    return true;
  });
}
