import { describe, expect, it } from 'vitest';
import type { GameView } from './game-view.core';
import {
  canClaimSeat,
  formatGameDate,
  isGameFinished,
  isMySeat,
  selectWinners,
  type MyGame,
  sortNewestFirst,
} from './my-games.core';

const MY_ACCOUNT = 'account-mine';

function aGame(): GameView {
  return {
    joinCode: 'BRIG',
    phase: 'bidding',
    currentRound: 1,
    players: [
      { id: 'p1', seat: 0, name: 'Hugo', icon: 'skull', color: 'gold', accountId: null },
      { id: 'p2', seat: 1, name: 'Léa', icon: 'bird', color: 'lagoon', accountId: MY_ACCOUNT },
      { id: 'p3', seat: 2, name: 'Max', icon: 'anchor', color: 'coral' },
    ],
    rounds: [],
    revision: 1,
    readAt: '2026-11-22T10:00:00.000Z',
  };
}

function aListedGame(joinCode: string, openedAt: string): MyGame {
  return {
    joinCode,
    phase: 'bidding',
    currentRound: 1,
    openedAt,
    players: [],
    myRank: null,
    winnerSeats: [],
  };
}

// @FollowsBlueprint test-pure-unit
describe('sortNewestFirst', () => {
  it('lists the newest opened game first', () => {
    const sorted = sortNewestFirst([
      aListedGame('OLDS', '2026-11-01T20:00:00.000Z'),
      aListedGame('NEWS', '2026-11-21T20:00:00.000Z'),
    ]);
    expect(sorted.map((game) => game.joinCode)).toEqual(['NEWS', 'OLDS']);
  });
});

describe('formatGameDate', () => {
  it('writes the day and the short month in the language asked for', () => {
    expect(formatGameDate('2026-11-21T12:00:00.000Z', 'en')).toBe('Nov 21');
    expect(formatGameDate('2026-11-21T12:00:00.000Z', 'fr')).toBe('21 nov.');
  });
});

describe('canClaimSeat', () => {
  it('lets a signed-in player claim a seat in a game where none is theirs', () => {
    expect(canClaimSeat(aGame(), 'account-other')).toBe(true);
  });

  it('refuses once a seat already carries the account, and for a guest', () => {
    expect(canClaimSeat(aGame(), MY_ACCOUNT)).toBe(false);
    expect(canClaimSeat(aGame(), null)).toBe(false);
    const everySeatClaimed = {
      ...aGame(),
      players: aGame().players.map((player) => ({ ...player, accountId: `account-${player.id}` })),
    };
    expect(canClaimSeat(everySeatClaimed, null)).toBe(false);
  });
});

describe('isMySeat', () => {
  const [unclaimed, mine, other] = aGame().players;

  it('recognises the seat carrying my account', () => {
    expect(mine === undefined ? null : isMySeat(mine, MY_ACCOUNT)).toBe(true);
  });

  it('recognises no seat for a guest or another account', () => {
    expect(mine === undefined ? null : isMySeat(mine, null)).toBe(false);
    expect(other === undefined ? null : isMySeat(other, MY_ACCOUNT)).toBe(false);
    expect(unclaimed === undefined ? null : isMySeat(unclaimed, null)).toBe(false);
  });
});

describe('isGameFinished', () => {
  it('reads the finished phase alone as finished', () => {
    expect(
      isGameFinished({ ...aListedGame('DONE', '2026-11-01T20:00:00.000Z'), phase: 'finished' }),
    ).toBe(true);
    expect(isGameFinished(aListedGame('PLAY', '2026-11-01T20:00:00.000Z'))).toBe(false);
  });
});

describe('selectWinners', () => {
  it('picks the players sitting in the winning seats', () => {
    const players = [
      { seat: 0, icon: 'skull', color: 'gold', accountId: null },
      { seat: 1, icon: 'bird', color: 'lagoon', accountId: null },
      { seat: 2, icon: 'anchor', color: 'coral', accountId: null },
    ] as const;
    const game = {
      ...aListedGame('DONE', '2026-11-01T20:00:00.000Z'),
      players,
      winnerSeats: [0, 2],
    };
    expect(selectWinners(game).map((player) => player.seat)).toEqual([0, 2]);
  });
});
