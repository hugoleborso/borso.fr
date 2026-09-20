import { randomUUID } from 'node:crypto';
import { STARTING_CRATE_BANANAS } from '@domain/game-setup.core';
import { GameError } from '../helpers/errors/game-error.types';
import { narrowGameStatus } from './game.core';
import {
  describeGame,
  FIRST_ROUND,
  loadGameOrRefuse,
  loadPlayerOrRefuse,
  publishGame,
  reserveJoinCode,
} from './games.service';
import {
  insertGame,
  insertPlayers,
  listPlayers,
  updateGame,
  updatePlayerToken,
} from './games.repository';
import type { GameView, SeatedPlayer } from './games.types';
import { hashPlayerToken } from './player-token.utils';
import { buildRematchSeats, refuseRematch, selectSeatForAvatar } from './rematch.core';

// @FollowsBlueprint service-orchestration
export async function startRematch(joinCode: string, token: string, now: Date): Promise<GameView> {
  const game = await loadGameOrRefuse(joinCode);
  const player = await loadPlayerOrRefuse(game.id, token);
  const refusal = refuseRematch(narrowGameStatus(game.status), player.isHost);
  if (refusal !== null) throw new GameError(refusal);
  if (game.rematchJoinCode !== null) return await describeGame(game, player.id);

  const players = await listPlayers(game.id);
  const rematchJoinCode = await reserveJoinCode();
  const rematch = await insertGame({
    joinCode: rematchJoinCode,
    status: 'lobby',
    maxPlayers: game.maxPlayers,
    roundTimerSeconds: game.roundTimerSeconds,
    winningScore: game.winningScore,
    crateBananas: STARTING_CRATE_BANANAS,
    currentRound: FIRST_ROUND,
    roundOpenedAt: null,
    createdAt: now,
    finishedAt: null,
    rematchJoinCode: null,
  });

  await insertPlayers(
    buildRematchSeats(players).map((seat) => ({
      gameId: rematch.id,
      tokenHash: hashPlayerToken(randomUUID()),
      nickname: seat.nickname,
      avatar: seat.avatar,
      stashBananas: seat.stashBananas,
      seatOrder: seat.seatOrder,
      isHost: seat.isHost,
      joinedAt: now,
    })),
  );

  const announced = await updateGame(game.id, { rematchJoinCode });
  if (announced === null) throw new GameError('game-not-found');

  await publishGame(announced);
  return await describeGame(announced, player.id);
}

export async function claimRematchSeat(joinCode: string, token: string): Promise<SeatedPlayer> {
  const game = await loadGameOrRefuse(joinCode);
  if (game.rematchJoinCode === null) throw new GameError('no-rematch');
  const player = await loadPlayerOrRefuse(game.id, token);

  const rematch = await loadGameOrRefuse(game.rematchJoinCode);
  const seats = await listPlayers(rematch.id);
  const seatId = selectSeatForAvatar(seats, player.avatar);
  if (seatId === null) throw new GameError('not-a-player');

  const playerToken = randomUUID();
  const claimed = await updatePlayerToken(seatId, hashPlayerToken(playerToken));
  if (claimed === null) throw new GameError('not-a-player');

  return { game: await describeGame(rematch, claimed.id), playerId: claimed.id, playerToken };
}
