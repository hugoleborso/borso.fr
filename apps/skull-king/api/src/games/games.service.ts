import { MAXIMUM_PLAYERS, type RoundPhase } from '@domain/round.core';
import type { DatabaseExecutor } from '../database/client';
import { GameError } from '../helpers/errors/game-error.types';
import { retryOnConflictAbort } from '../helpers/persistence/conflict-abort.core';
import { broadcastGame } from '../realtime/broadcast.service';
import { buildGameView } from './game-view.core';
import {
  refuseEntryWrite,
  refusePhaseMove,
  refuseRoundWrite,
  decideSeatClaim,
  seatTable,
  selectEntryChanges,
} from './game-write.core';
import type {
  CreateGameInput,
  MovePhaseInput,
  UpdatePlayerInput,
  WriteEntryInput,
  WriteRoundInput,
} from './games.schema';
import {
  bumpGameRevision,
  findGameByJoinCode,
  type GameRow,
  insertGameUnlessCodeTaken,
  linkSeat,
  listGamesOpenedBy,
  listPlayers,
  listPlayersOfGames,
  listRoundEntries,
  listRoundEntriesOfGames,
  listRounds,
  type PlayerToSeat,
  recordRematch,
  runInOneTransaction,
  updateGamePhase,
  updatePlayer,
  upsertAccountGame,
  upsertRound,
  upsertRoundEntry,
} from './games.repository';
import type { GameView } from './games.types';
import { buildJoinCode } from './join-code.utils';
import { buildMyGames, type MyGameView } from './my-games.core';

export { refuseInvalidInput } from '../helpers/errors/invalid-input.core';

const FIRST_ROUND = 1;
const OPENING_PHASE: RoundPhase = 'bidding';
const JOIN_CODE_ATTEMPTS = 8;
const CONFLICT_RETRIES = MAXIMUM_PLAYERS - 1;

export interface Visit {
  readonly accountId: string | null;
  readonly now: Date;
}

export interface EntryAddress {
  readonly joinCode: string;
  readonly roundNumber: number;
  readonly playerId: string;
}

type GameWrite = (executor: DatabaseExecutor, game: GameRow) => Promise<GameRow>;

async function recordVisit(gameId: string, visit: Visit): Promise<void> {
  if (visit.accountId === null) return;
  await upsertAccountGame(visit.accountId, gameId, visit.now);
}

async function describeGame(
  executor: DatabaseExecutor,
  game: GameRow,
  now: Date,
): Promise<GameView> {
  const [players, rounds, entries] = await Promise.all([
    listPlayers(executor, game.id),
    listRounds(executor, game.id),
    listRoundEntries(executor, game.id),
  ]);
  return buildGameView({ game, players, rounds, entries, readAt: now });
}

async function getGameOrRefuse(executor: DatabaseExecutor, joinCode: string): Promise<GameRow> {
  const game = await findGameByJoinCode(executor, joinCode);
  if (game === null) throw new GameError('game-not-found');
  return game;
}

async function takeGameTurn(
  executor: DatabaseExecutor,
  joinCode: string,
  now: Date,
): Promise<GameRow> {
  const found = await getGameOrRefuse(executor, joinCode);
  const game = await bumpGameRevision(executor, found.id, now);
  if (game === null) throw new GameError('game-not-found');
  return game;
}

interface WrittenGame {
  readonly gameId: string;
  readonly view: GameView;
}

// @FollowsBlueprint service-orchestration
async function writeGame(joinCode: string, visit: Visit, write: GameWrite): Promise<GameView> {
  const written = await retryOnConflictAbort(
    async () =>
      await runInOneTransaction(async (executor): Promise<WrittenGame> => {
        const game = await takeGameTurn(executor, joinCode, visit.now);
        const after = await write(executor, game);
        return { gameId: game.id, view: await describeGame(executor, after, visit.now) };
      }),
    CONFLICT_RETRIES,
  );
  await recordVisit(written.gameId, visit);
  await broadcastGame(written.gameId, written.view);
  return written.view;
}

async function insertGameWithFreeCode(
  executor: DatabaseExecutor,
  players: readonly PlayerToSeat[],
  now: Date,
): Promise<GameRow> {
  for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt += 1) {
    const game = await insertGameUnlessCodeTaken(executor, {
      joinCode: buildJoinCode(() => Math.random()),
      phase: OPENING_PHASE,
      currentRound: FIRST_ROUND,
      players,
      now,
    });
    if (game !== null) return game;
  }
  throw new Error('could not find a free join code');
}

export async function createGame(input: CreateGameInput, visit: Visit): Promise<GameView> {
  const players = seatTable(input.players, visit.accountId);
  const written = await retryOnConflictAbort(
    async () =>
      await runInOneTransaction(async (executor): Promise<WrittenGame> => {
        const game = await insertGameWithFreeCode(executor, players, visit.now);
        return { gameId: game.id, view: await describeGame(executor, game, visit.now) };
      }),
    CONFLICT_RETRIES,
  );
  await recordVisit(written.gameId, visit);
  await broadcastGame(written.gameId, written.view);
  return written.view;
}

export async function readGame(joinCode: string, visit: Visit): Promise<GameView> {
  const written = await runInOneTransaction(async (executor): Promise<WrittenGame> => {
    const game = await getGameOrRefuse(executor, joinCode);
    return { gameId: game.id, view: await describeGame(executor, game, visit.now) };
  });
  await recordVisit(written.gameId, visit);
  return written.view;
}

export async function findGameIdForSocket(joinCode: string): Promise<string | null> {
  const game = await runInOneTransaction(
    async (executor) => await findGameByJoinCode(executor, joinCode),
  );
  return game?.id ?? null;
}

export async function writeEntry(
  address: EntryAddress,
  input: WriteEntryInput,
  visit: Visit,
): Promise<GameView> {
  const changes = selectEntryChanges(input);
  return await writeGame(address.joinCode, visit, async (executor, game) => {
    const before = await describeGame(executor, game, visit.now);
    const refusal = refuseEntryWrite({
      roundNumber: address.roundNumber,
      currentRound: game.currentRound,
      seatedPlayerIds: before.players.map((player) => player.id),
      playerId: address.playerId,
      changes,
      roundEntries:
        before.rounds.find((round) => round.number === address.roundNumber)?.entries ?? [],
    });
    if (refusal !== null) throw new GameError(refusal);
    await upsertRoundEntry(
      executor,
      { gameId: game.id, roundNumber: address.roundNumber, playerId: address.playerId },
      changes,
      visit.now,
    );
    return game;
  });
}

export async function writeRound(
  joinCode: string,
  roundNumber: number,
  changes: WriteRoundInput,
  visit: Visit,
): Promise<GameView> {
  return await writeGame(joinCode, visit, async (executor, game) => {
    const refusal = refuseRoundWrite(roundNumber, game.currentRound);
    if (refusal !== null) throw new GameError(refusal);
    await upsertRound(executor, game.id, roundNumber, changes, visit.now);
    return game;
  });
}

export async function movePhase(
  joinCode: string,
  target: MovePhaseInput,
  visit: Visit,
): Promise<GameView> {
  return await writeGame(joinCode, visit, async (executor, game) => {
    const before = await describeGame(executor, game, visit.now);
    const refusal = refusePhaseMove({
      current: { round: before.currentRound, phase: before.phase },
      target,
      rounds: before.rounds,
    });
    if (refusal !== null) throw new GameError(refusal);
    const moved = await updateGamePhase(executor, game.id, target.phase, target.round, visit.now);
    if (moved === null) throw new GameError('game-not-found');
    return moved;
  });
}

export async function changePlayer(
  joinCode: string,
  playerId: string,
  changes: UpdatePlayerInput,
  visit: Visit,
): Promise<GameView> {
  return await writeGame(joinCode, visit, async (executor, game) => {
    const player = await updatePlayer(executor, game.id, playerId, changes);
    if (player === null) throw new GameError('player-not-found');
    return game;
  });
}

export async function claimSeat(
  joinCode: string,
  playerId: string,
  visit: Visit,
): Promise<GameView> {
  const { accountId } = visit;
  if (accountId === null) throw new GameError('session-required');
  return await writeGame(joinCode, visit, async (executor, game) => {
    const claim = decideSeatClaim(await listPlayers(executor, game.id), playerId, accountId);
    if (claim.refusal !== null) throw new GameError(claim.refusal);
    if (claim.isLinking) await linkSeat(executor, game.id, playerId, accountId);
    return game;
  });
}

async function seatRematch(executor: DatabaseExecutor, game: GameRow, now: Date): Promise<GameRow> {
  if (game.rematchJoinCode !== null) return game;
  const players = await listPlayers(executor, game.id);
  const rematch = await insertGameWithFreeCode(
    executor,
    players.map(({ seat, name, icon, color, accountId }) => ({
      seat,
      name,
      icon,
      color,
      accountId,
    })),
    now,
  );
  await recordRematch(executor, game.id, rematch.joinCode, now);
  return { ...game, rematchJoinCode: rematch.joinCode };
}

export async function startRematch(joinCode: string, visit: Visit): Promise<GameView> {
  const finished = await writeGame(
    joinCode,
    visit,
    async (executor, game) => await seatRematch(executor, game, visit.now),
  );
  if (finished.rematchJoinCode === null) throw new Error('the rematch was not recorded');
  return await readGame(finished.rematchJoinCode, visit);
}

export async function listMyGames(accountId: string): Promise<MyGameView[]> {
  const opened = await listGamesOpenedBy(accountId);
  const gameIds = opened.map((row) => row.game.id);
  const [players, entries] = await Promise.all([
    listPlayersOfGames(gameIds),
    listRoundEntriesOfGames(gameIds),
  ]);
  return buildMyGames(
    opened.map(({ game, openedAt }) => ({
      joinCode: game.joinCode,
      phase: game.phase,
      currentRound: game.currentRound,
      openedAt,
      players: players.filter((player) => player.gameId === game.id),
      entries: entries.filter((entry) => entry.gameId === game.id),
    })),
    accountId,
  );
}
