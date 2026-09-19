import { randomUUID } from 'node:crypto';
import { STARTING_CRATE_BANANAS, STARTING_STASH_BANANAS } from '@domain/game-setup.core';
import { GameError } from '../helpers/errors/game-error.types';
import { broadcastGame } from '../realtime/realtime.service';
import { buildGameView } from './game-view.core';
import {
  assembleBidTable,
  AUTOMATIC_BID_BANANAS,
  hasRoundTimerExpired,
  narrowGameStatus,
  refuseJoin,
  refuseStart,
  selectGameWinners,
  selectMissingBidders,
  selectWinnersWhenFinished,
} from './game.core';
import type { CreateGameInput, JoinGameInput } from './games.schema';
import {
  type BidToWrite,
  didClaimBid,
  didCommitRound,
  findGameByJoinCode,
  findLatestRoundResult,
  findPlayerByTokenHash,
  type GameRow,
  insertBidsForMissingPlayers,
  insertGame,
  insertPlayer,
  listBidsForRound,
  listPlayers,
  type PlayerRow,
  updateGame,
} from './games.repository';
import type { GameView, SeatedPlayer } from './games.types';
import { buildJoinCode } from './join-code.utils';
import { hashPlayerToken } from './player-token.utils';
import { resolveRound } from './round.core';

const FIRST_ROUND = 1;
const FIRST_SEAT = 0;
const JOIN_CODE_ATTEMPTS = 8;

async function loadGameOrRefuse(joinCode: string): Promise<GameRow> {
  const game = await findGameByJoinCode(joinCode);
  if (game === null) throw new GameError('game-not-found');
  return game;
}

async function loadPlayerOrRefuse(gameId: string, token: string): Promise<PlayerRow> {
  const player = await findPlayerByTokenHash(gameId, hashPlayerToken(token));
  if (player === null) throw new GameError('not-a-player');
  return player;
}

async function describeGame(game: GameRow, viewerId: string | null): Promise<GameView> {
  const [players, bidsThisRound, lastRound] = await Promise.all([
    listPlayers(game.id),
    listBidsForRound(game.id, game.currentRound),
    findLatestRoundResult(game.id),
  ]);
  const status = narrowGameStatus(game.status);
  const standings = players.map((player) => ({
    playerId: player.id,
    stash: player.stashBananas,
  }));
  const winnerIds = selectWinnersWhenFinished(status, standings, game.winningScore);

  return buildGameView({
    game: {
      joinCode: game.joinCode,
      status,
      maxPlayers: game.maxPlayers,
      winningScore: game.winningScore,
      roundTimerSeconds: game.roundTimerSeconds,
      crateBananas: game.crateBananas,
      currentRound: game.currentRound,
      roundOpenedAt: game.roundOpenedAt,
    },
    players,
    bidsThisRound,
    lastRound,
    winnerIds,
    viewerId,
  });
}

async function publishGame(game: GameRow): Promise<void> {
  await broadcastGame(game.id, await describeGame(game, null));
}

async function reserveJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt += 1) {
    const candidate = buildJoinCode(() => Math.random());
    const existing = await findGameByJoinCode(candidate);
    if (existing === null) return candidate;
    if (narrowGameStatus(existing.status) === 'finished') return candidate;
  }
  throw new Error('could not find a free join code');
}

// @FollowsBlueprint service-orchestration
export async function createGame(input: CreateGameInput, now: Date): Promise<SeatedPlayer> {
  const joinCode = await reserveJoinCode();
  const game = await insertGame({
    joinCode,
    status: 'lobby',
    maxPlayers: input.maxPlayers,
    roundTimerSeconds: input.roundTimerSeconds,
    winningScore: input.winningScore,
    crateBananas: STARTING_CRATE_BANANAS,
    currentRound: FIRST_ROUND,
    roundOpenedAt: null,
    createdAt: now,
    finishedAt: null,
  });

  const playerToken = randomUUID();
  const player = await insertPlayer({
    gameId: game.id,
    tokenHash: hashPlayerToken(playerToken),
    nickname: input.nickname,
    avatar: input.avatar,
    stashBananas: STARTING_STASH_BANANAS,
    seatOrder: FIRST_SEAT,
    isHost: true,
    joinedAt: now,
  });

  return { game: await describeGame(game, player.id), playerId: player.id, playerToken };
}

export async function joinGame(
  joinCode: string,
  input: JoinGameInput,
  now: Date,
): Promise<SeatedPlayer> {
  const game = await loadGameOrRefuse(joinCode);
  const players = await listPlayers(game.id);
  const refusal = refuseJoin(
    narrowGameStatus(game.status),
    players.length,
    game.maxPlayers,
    players.map((player) => player.avatar),
    input.avatar,
  );
  if (refusal !== null) throw new GameError(refusal);

  const playerToken = randomUUID();
  const player = await insertPlayer({
    gameId: game.id,
    tokenHash: hashPlayerToken(playerToken),
    nickname: input.nickname,
    avatar: input.avatar,
    stashBananas: STARTING_STASH_BANANAS,
    seatOrder: players.length,
    isHost: false,
    joinedAt: now,
  });

  await publishGame(game);
  return { game: await describeGame(game, player.id), playerId: player.id, playerToken };
}

export async function startGame(joinCode: string, token: string, now: Date): Promise<GameView> {
  const game = await loadGameOrRefuse(joinCode);
  const player = await loadPlayerOrRefuse(game.id, token);
  if (!player.isHost) throw new GameError('not-host');

  const players = await listPlayers(game.id);
  const refusal = refuseStart(narrowGameStatus(game.status), players.length);
  if (refusal !== null) throw new GameError(refusal);

  const started = await updateGame(game.id, { status: 'playing', roundOpenedAt: now });
  if (started === null) throw new GameError('game-not-found');

  await publishGame(started);
  return await describeGame(started, player.id);
}

export async function readGame(joinCode: string, token: string | null): Promise<GameView> {
  const game = await loadGameOrRefuse(joinCode);
  if (token === null) return await describeGame(game, null);
  const player = await findPlayerByTokenHash(game.id, hashPlayerToken(token));
  return await describeGame(game, player?.id ?? null);
}

export async function findSocketSubject(
  joinCode: string,
  token: string | null,
): Promise<{ readonly gameId: string; readonly playerId: string | null } | null> {
  const game = await findGameByJoinCode(joinCode);
  if (game === null) return null;
  if (token === null) return { gameId: game.id, playerId: null };
  const player = await findPlayerByTokenHash(game.id, hashPlayerToken(token));
  return { gameId: game.id, playerId: player?.id ?? null };
}

async function resolveWhenEverybodyHasAnswered(game: GameRow, now: Date): Promise<void> {
  const players = await listPlayers(game.id);
  const bids = await listBidsForRound(game.id, game.currentRound);
  const amountByPlayerId = new Map(bids.map((bid) => [bid.playerId, bid.amount]));
  const table = assembleBidTable(players, amountByPlayerId);
  if (table === null) return;

  const resolution = resolveRound({ bids: table, crateBefore: game.crateBananas });
  const standings = resolution.outcomes.map((outcome) => ({
    playerId: outcome.playerId,
    stash: outcome.stashAfter,
  }));
  const winnerIds = selectGameWinners(standings, game.winningScore);

  await didCommitRound({
    gameId: game.id,
    roundNumber: game.currentRound,
    resolution,
    winnerIds,
    now,
  });
}

export async function placeBid(
  joinCode: string,
  token: string,
  amount: number,
  now: Date,
): Promise<GameView> {
  const game = await loadGameOrRefuse(joinCode);
  if (narrowGameStatus(game.status) !== 'playing') throw new GameError('not-playing');
  const player = await loadPlayerOrRefuse(game.id, token);

  const wasAccepted = await didClaimBid({
    gameId: game.id,
    playerId: player.id,
    roundNumber: game.currentRound,
    amount,
    placedAt: now,
  });
  if (!wasAccepted) throw new GameError('already-bid');

  await resolveWhenEverybodyHasAnswered(game, now);

  const refreshed = await loadGameOrRefuse(joinCode);
  await publishGame(refreshed);
  return await describeGame(refreshed, player.id);
}

export async function resolveExpiredRound(
  joinCode: string,
  token: string | null,
  now: Date,
): Promise<GameView> {
  const game = await loadGameOrRefuse(joinCode);
  if (narrowGameStatus(game.status) !== 'playing') throw new GameError('not-playing');
  if (!hasRoundTimerExpired(game.roundOpenedAt, game.roundTimerSeconds, now)) {
    throw new GameError('round-still-open');
  }

  const players = await listPlayers(game.id);
  const bids = await listBidsForRound(game.id, game.currentRound);
  const amountByPlayerId = new Map(bids.map((bid) => [bid.playerId, bid.amount]));
  const automatic: readonly BidToWrite[] = selectMissingBidders(players, amountByPlayerId).map(
    (player) => ({
      gameId: game.id,
      playerId: player.id,
      roundNumber: game.currentRound,
      amount: AUTOMATIC_BID_BANANAS,
      placedAt: now,
    }),
  );
  await insertBidsForMissingPlayers(automatic);
  await resolveWhenEverybodyHasAnswered(game, now);

  const refreshed = await loadGameOrRefuse(joinCode);
  await publishGame(refreshed);
  const viewer =
    token === null ? null : await findPlayerByTokenHash(refreshed.id, hashPlayerToken(token));
  return await describeGame(refreshed, viewer?.id ?? null);
}
