import type { RoundPhase } from '@domain/round.core';
import { GameError } from '../helpers/errors/game-error.types';
import { broadcastGame } from '../realtime/broadcast.service';
import { buildGameView } from './game-view.core';
import {
  refuseEntryWrite,
  refusePhaseMove,
  refuseRoundWrite,
  selectAbilityHolders,
  selectSeatHolding,
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
  didClaimSeat,
  didRecordRematch,
  findGameByJoinCode,
  type GameRow,
  insertGameUnlessCodeTaken,
  listGamesOpenedBy,
  listPlayers,
  listPlayersOfGames,
  listRoundEntriesOfGames,
  listRoundEntries,
  listRounds,
  type PlayerToSeat,
  updateGamePhase,
  updatePlayer,
  upsertAccountGame,
  upsertRound,
  upsertRoundEntry,
} from './games.repository';
import type { GameView } from './games.types';
import { buildMyGames, type MyGameView } from './my-games.core';
import { buildJoinCode } from './join-code.utils';

export { refuseInvalidInput } from '../helpers/errors/invalid-input.core';

const FIRST_ROUND = 1;
const OPENING_PHASE: RoundPhase = 'bidding';
const JOIN_CODE_ATTEMPTS = 8;
const FIRST_REMATCH_ATTEMPT = 1;
const REMATCH_RECORD_ATTEMPTS = 2;
const FIRST_SEAT_CLAIM_ATTEMPT = 1;
const SEAT_CLAIM_ATTEMPTS = 2;

export interface Visit {
  readonly accountId: string | null;
  readonly now: Date;
}

export interface EntryAddress {
  readonly joinCode: string;
  readonly roundNumber: number;
  readonly playerId: string;
}

async function loadGameOrRefuse(joinCode: string): Promise<GameRow> {
  const game = await findGameByJoinCode(joinCode);
  if (game === null) throw new GameError('game-not-found');
  return game;
}

async function recordVisit(gameId: string, visit: Visit): Promise<void> {
  if (visit.accountId === null) return;
  await upsertAccountGame(visit.accountId, gameId, visit.now);
}

async function openGameOrRefuse(joinCode: string, visit: Visit): Promise<GameRow> {
  const game = await loadGameOrRefuse(joinCode);
  await recordVisit(game.id, visit);
  return game;
}

async function describeGame(game: GameRow, now: Date): Promise<GameView> {
  const [players, rounds, entries] = await Promise.all([
    listPlayers(game.id),
    listRounds(game.id),
    listRoundEntries(game.id),
  ]);
  return buildGameView({ game, players, rounds, entries, readAt: now });
}

async function publishGame(game: GameRow, now: Date): Promise<GameView> {
  const view = await describeGame(game, now);
  await broadcastGame(game.id, view);
  return view;
}

async function insertGameWithFreeCode(
  players: readonly PlayerToSeat[],
  now: Date,
): Promise<GameRow> {
  for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt += 1) {
    const game = await insertGameUnlessCodeTaken({
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

// @FollowsBlueprint service-orchestration
export async function createGame(input: CreateGameInput, visit: Visit): Promise<GameView> {
  const players = input.players.map((player, seat) => ({ ...player, seat }));
  const game = await insertGameWithFreeCode(players, visit.now);
  await recordVisit(game.id, visit);
  return await publishGame(game, visit.now);
}

export async function readGame(joinCode: string, visit: Visit): Promise<GameView> {
  return await describeGame(await openGameOrRefuse(joinCode, visit), visit.now);
}

export async function findGameIdForSocket(joinCode: string): Promise<string | null> {
  const game = await findGameByJoinCode(joinCode);
  return game?.id ?? null;
}

export async function writeEntry(
  address: EntryAddress,
  input: WriteEntryInput,
  visit: Visit,
): Promise<GameView> {
  const game = await openGameOrRefuse(address.joinCode, visit);
  const [players, entries] = await Promise.all([listPlayers(game.id), listRoundEntries(game.id)]);
  const refusal = refuseEntryWrite({
    roundNumber: address.roundNumber,
    currentRound: game.currentRound,
    seatedPlayerIds: players.map((player) => player.id),
    playerId: address.playerId,
    bid: input.bid,
    bidAdjustment: input.bidAdjustment,
    rascalBet: input.rascalBet,
    tricks: input.tricks,
    holders: selectAbilityHolders(entries, address.roundNumber),
  });
  if (refusal !== null) throw new GameError(refusal);
  await upsertRoundEntry(
    { gameId: game.id, roundNumber: address.roundNumber, playerId: address.playerId },
    selectEntryChanges(input),
    visit.now,
  );
  return await publishGame(game, visit.now);
}

export async function writeRound(
  joinCode: string,
  roundNumber: number,
  changes: WriteRoundInput,
  visit: Visit,
): Promise<GameView> {
  const game = await openGameOrRefuse(joinCode, visit);
  const refusal = refuseRoundWrite(roundNumber, game.currentRound);
  if (refusal !== null) throw new GameError(refusal);
  await upsertRound(game.id, roundNumber, changes, visit.now);
  return await publishGame(game, visit.now);
}

export async function movePhase(
  joinCode: string,
  target: MovePhaseInput,
  visit: Visit,
): Promise<GameView> {
  const game = await openGameOrRefuse(joinCode, visit);
  const before = await describeGame(game, visit.now);
  const refusal = refusePhaseMove({
    current: { round: before.currentRound, phase: before.phase },
    target,
    rounds: before.rounds,
  });
  if (refusal !== null) throw new GameError(refusal);
  const moved = await updateGamePhase(game.id, target.phase, target.round, visit.now);
  if (moved === null) throw new GameError('game-not-found');
  return await publishGame(moved, visit.now);
}

export async function changePlayer(
  joinCode: string,
  playerId: string,
  changes: UpdatePlayerInput,
  visit: Visit,
): Promise<GameView> {
  const game = await openGameOrRefuse(joinCode, visit);
  const player = await updatePlayer(game.id, playerId, changes);
  if (player === null) throw new GameError('player-not-found');
  return await publishGame(game, visit.now);
}

async function takeSeat(
  gameId: string,
  playerId: string,
  accountId: string,
  attempt: number,
): Promise<void> {
  if (await didClaimSeat(gameId, playerId, accountId)) return;
  const holding = selectSeatHolding(await listPlayers(gameId), playerId, accountId);
  if (holding === 'mine') return;
  if (holding !== 'free') throw new GameError(holding);
  if (attempt >= SEAT_CLAIM_ATTEMPTS) throw new Error('could not claim the seat');
  await takeSeat(gameId, playerId, accountId, attempt + 1);
}

export async function claimSeat(
  joinCode: string,
  playerId: string,
  visit: Visit,
): Promise<GameView> {
  if (visit.accountId === null) throw new GameError('session-required');
  const game = await openGameOrRefuse(joinCode, visit);
  await takeSeat(game.id, playerId, visit.accountId, FIRST_SEAT_CLAIM_ATTEMPT);
  return await publishGame(game, visit.now);
}

async function announceRematch(
  game: GameRow,
  rematchJoinCode: string,
  visit: Visit,
): Promise<GameView> {
  await publishGame(game, visit.now);
  return await readGame(rematchJoinCode, visit);
}

async function recordRematch(
  joinCode: string,
  rematchJoinCode: string,
  visit: Visit,
  attempt: number,
): Promise<GameView> {
  const game = await loadGameOrRefuse(joinCode);
  if (game.rematchJoinCode !== null) {
    return await announceRematch(game, game.rematchJoinCode, visit);
  }
  if (attempt > REMATCH_RECORD_ATTEMPTS) throw new Error('could not record the rematch');
  if (await didRecordRematch(game.id, rematchJoinCode, visit.now)) {
    return await announceRematch({ ...game, rematchJoinCode }, rematchJoinCode, visit);
  }
  return await recordRematch(joinCode, rematchJoinCode, visit, attempt + 1);
}

export async function startRematch(joinCode: string, visit: Visit): Promise<GameView> {
  const game = await openGameOrRefuse(joinCode, visit);
  if (game.rematchJoinCode !== null) {
    return await announceRematch(game, game.rematchJoinCode, visit);
  }
  const players = await listPlayers(game.id);
  const rematch = await insertGameWithFreeCode(
    players.map(({ seat, name, icon, color, accountId }) => ({
      seat,
      name,
      icon,
      color,
      accountId,
    })),
    visit.now,
  );
  return await recordRematch(joinCode, rematch.joinCode, visit, FIRST_REMATCH_ATTEMPT);
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
