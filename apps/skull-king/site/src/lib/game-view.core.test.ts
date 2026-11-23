import { suggestAvatar } from '@domain/pirate-avatar.core';
import { NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import { type GameView, parseBroadcast } from './game-view.core';

const EARLIER = '2026-11-22T10:00:00.000Z';

function aGame(readAt: string): GameView {
  return {
    joinCode: 'BRIG',
    phase: 'bidding',
    currentRound: 1,
    players: [
      { id: 'p1', seat: 0, name: 'Hugo', icon: 'skull', color: 'gold', avatar: suggestAvatar(0) },
    ],
    rounds: [
      {
        number: 1,
        cardCount: 1,
        isKrakenPlayed: false,
        isWhiteWhaleDiscard: false,
        entries: [
          {
            playerId: 'p1',
            bid: null,
            bidAdjustment: 0,
            rascalBet: 0,
            isMissed: false,
            tricks: null,
            bonuses: NO_BONUS,
          },
        ],
      },
    ],
    revision: 1,
    readAt,
  };
}

// @FollowsBlueprint test-pure-unit
describe('parseBroadcast', () => {
  it('reads the game out of a well formed broadcast', () => {
    const game = aGame(EARLIER);
    expect(parseBroadcast(JSON.stringify({ kind: 'game', game }))).toEqual(game);
  });

  it('answers null for a message of another kind', () => {
    expect(parseBroadcast(JSON.stringify({ kind: 'ping', game: aGame(EARLIER) }))).toBeNull();
  });

  it('answers null for a game whose phase the site does not know', () => {
    const game = { ...aGame(EARLIER), phase: 'lobby' };
    expect(parseBroadcast(JSON.stringify({ kind: 'game', game }))).toBeNull();
  });

  it('answers null for text that is not JSON', () => {
    expect(parseBroadcast('not json')).toBeNull();
  });
});
