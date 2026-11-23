import { describe, expect, it } from 'vitest';
import { type PirateAvatar, suggestAvatar } from '@domain/pirate-avatar.core';
import { NO_BONUS } from '@domain/scoring.core';
import {
  buildGameView,
  type BuildGameViewInput,
  readBidAdjustment,
  isStoredMissed,
  readRascalBet,
} from './game-view.core';

const READ_AT = new Date('2026-11-22T20:00:00.000Z');

const HUGO_PIRATE: PirateAvatar = {
  ...suggestAvatar(5),
  companion: 'parrot',
  headwear: 'tricorne',
};

const HUGO = {
  id: 'hugo',
  seat: 0,
  name: 'Hugo',
  icon: 'skull',
  color: 'gold',
  accountId: '11111111-1111-4111-8111-111111111111',
  avatar: JSON.stringify(HUGO_PIRATE),
} as const;
const LEA = {
  id: 'lea',
  seat: 1,
  name: 'Léa',
  icon: 'bird',
  color: 'ice',
  accountId: null,
  avatar: null,
} as const;

const input = (overrides: Partial<BuildGameViewInput> = {}): BuildGameViewInput => ({
  game: { joinCode: 'BRIG', phase: 'scoring', currentRound: 2, rematchJoinCode: null, revision: 7 },
  players: [LEA, HUGO],
  rounds: [],
  entries: [],
  readAt: READ_AT,
  ...overrides,
});

// @FollowsBlueprint test-pure-unit
describe('buildGameView', () => {
  it('describes the game, its players in seat order and the time it was read', () => {
    const view = buildGameView(input());

    expect(view.joinCode).toBe('BRIG');
    expect(view.phase).toBe('scoring');
    expect(view.currentRound).toBe(2);
    expect(view.players).toStrictEqual([
      { ...HUGO, avatar: HUGO_PIRATE },
      { ...LEA, avatar: suggestAvatar(LEA.seat) },
    ]);
    expect(view.readAt).toBe('2026-11-22T20:00:00.000Z');
    expect(view.rematchJoinCode).toBeNull();
  });

  it('carries the revision of the game, and reads a game nobody wrote since its creation as 0', () => {
    const unwritten = { ...input().game, revision: null };

    expect(buildGameView(input()).revision).toBe(7);
    expect(buildGameView(input({ game: unwritten })).revision).toBe(0);
  });

  it('names the rematch once one exists, so every phone can follow it', () => {
    const finished = {
      joinCode: 'BRIG',
      phase: 'finished',
      currentRound: 10,
      rematchJoinCode: 'KRAK',
      revision: 7,
    } as const;

    expect(buildGameView(input({ game: finished })).rematchJoinCode).toBe('KRAK');
  });

  it('lists every played round, oldest first, with the cards dealt', () => {
    const view = buildGameView(input());

    expect(view.rounds.map((round) => [round.number, round.cardCount])).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it('fills a round nobody wrote with no kraken and one default entry per player', () => {
    const [first] = buildGameView(input()).rounds;

    expect(first?.isKrakenPlayed).toBe(false);
    expect(first?.isWhiteWhaleDiscard).toBe(false);
    expect(first?.entries).toStrictEqual([
      {
        playerId: 'hugo',
        bid: 0,
        bidAdjustment: 0,
        rascalBet: 0,
        isMissed: false,
        tricks: null,
        bonuses: NO_BONUS,
      },
      {
        playerId: 'lea',
        bid: 0,
        bidAdjustment: 0,
        rascalBet: 0,
        isMissed: false,
        tricks: null,
        bonuses: NO_BONUS,
      },
    ]);
  });

  it('places each written entry and round in its own cell', () => {
    const view = buildGameView(
      input({
        rounds: [
          { roundNumber: 1, isKrakenPlayed: false, isWhiteWhaleDiscard: null },
          { roundNumber: 2, isKrakenPlayed: true, isWhiteWhaleDiscard: true },
        ],
        entries: [
          {
            roundNumber: 2,
            playerId: 'lea',
            bid: 1,
            bidAdjustment: -1,
            rascalBet: 20,
            isMissed: true,
            tricks: 0,
            ...NO_BONUS,
            loot: 1,
          },
        ],
      }),
    );

    expect(view.rounds[0]?.isKrakenPlayed).toBe(false);
    expect(view.rounds[0]?.isWhiteWhaleDiscard).toBe(false);
    expect(view.rounds[1]?.isKrakenPlayed).toBe(true);
    expect(view.rounds[1]?.isWhiteWhaleDiscard).toBe(true);
    expect(view.rounds[1]?.entries).toStrictEqual([
      {
        playerId: 'hugo',
        bid: 0,
        bidAdjustment: 0,
        rascalBet: 0,
        isMissed: false,
        tricks: null,
        bonuses: NO_BONUS,
      },
      {
        playerId: 'lea',
        bid: 1,
        bidAdjustment: -1,
        rascalBet: 20,
        isMissed: true,
        tricks: 0,
        bonuses: { ...NO_BONUS, loot: 1 },
      },
    ]);
  });

  it('leaves out a row written for a round the game has moved back from', () => {
    const view = buildGameView(
      input({
        entries: [
          {
            roundNumber: 3,
            playerId: 'hugo',
            bid: 2,
            bidAdjustment: null,
            rascalBet: null,
            isMissed: null,
            tricks: null,
            ...NO_BONUS,
          },
        ],
      }),
    );

    expect(view.rounds).toHaveLength(2);
  });
});

describe('readBidAdjustment', () => {
  it('reads a stored adjustment, and anything else as none', () => {
    expect(readBidAdjustment(1)).toBe(1);
    expect(readBidAdjustment(-1)).toBe(-1);
    expect(readBidAdjustment(null)).toBe(0);
    expect(readBidAdjustment(2)).toBe(0);
  });
});

describe('isStoredMissed', () => {
  it('reads a stored mark, and a row written before the column existed as made', () => {
    expect(isStoredMissed(true)).toBe(true);
    expect(isStoredMissed(false)).toBe(false);
    expect(isStoredMissed(null)).toBe(false);
  });
});

describe('readRascalBet', () => {
  it('reads a stored bet, and anything else as none', () => {
    expect(readRascalBet(10)).toBe(10);
    expect(readRascalBet(20)).toBe(20);
    expect(readRascalBet(null)).toBe(0);
    expect(readRascalBet(15)).toBe(0);
  });
});
