import { NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import {
  type GameView,
  isLastPendingWrite,
  isWithoutPendingWrite,
  parseBroadcast,
  selectNewerGame,
} from './game-view.core';

const EARLIER = '2026-11-22T10:00:00.000Z';
const LATER = '2026-11-22T10:00:01.000Z';

function aGame(readAt: string, currentRound = 1): GameView {
  return {
    joinCode: 'BRIG',
    phase: 'bidding',
    currentRound,
    players: [{ id: 'p1', seat: 0, name: 'Hugo', icon: 'skull', color: 'gold' }],
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
            tricks: null,
            bonuses: NO_BONUS,
          },
        ],
      },
    ],
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

describe('selectNewerGame', () => {
  it('takes the incoming view when the cache holds nothing', () => {
    const incoming = aGame(EARLIER);
    expect(selectNewerGame(undefined, incoming)).toBe(incoming);
  });

  it('takes the incoming view when it was read later', () => {
    const incoming = aGame(LATER, 2);
    expect(selectNewerGame(aGame(EARLIER), incoming)).toBe(incoming);
  });

  it('keeps the cached view when the incoming one was read earlier', () => {
    const cached = aGame(LATER, 2);
    expect(selectNewerGame(cached, aGame(EARLIER))).toBe(cached);
  });

  it('takes the incoming view when both were read at the same instant', () => {
    const incoming = aGame(EARLIER, 2);
    expect(selectNewerGame(aGame(EARLIER), incoming)).toBe(incoming);
  });
});

describe('isLastPendingWrite', () => {
  it('lets the answer of the only write still pending settle the cache', () => {
    expect(isLastPendingWrite(1)).toBe(true);
  });

  it('holds the answer back while a later write from this phone is pending', () => {
    expect(isLastPendingWrite(2)).toBe(false);
  });
});

describe('isWithoutPendingWrite', () => {
  it('lets a broadcast in only when this phone has no write pending', () => {
    expect(isWithoutPendingWrite(0)).toBe(true);
    expect(isWithoutPendingWrite(1)).toBe(false);
  });
});
