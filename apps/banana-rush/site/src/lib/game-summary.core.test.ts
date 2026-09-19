import { describe, expect, it } from 'vitest';
import type { BroadcastGame } from './game-broadcast.core';
import {
  buildRoundStories,
  hasPaidATariff,
  hasReceivedATariff,
  haveAllPlayersBid,
  selectStoryTone,
  sortByStashDescending,
} from './game-summary.core';

function outcome(playerId: string, overrides: Record<string, number | boolean> = {}) {
  return {
    playerId,
    bid: 10,
    stashBefore: 10,
    stashAfter: 10,
    crateWon: 0,
    tariffPaid: 0,
    tariffReceived: 0,
    busted: false,
    ...overrides,
  };
}

function player(id: string, nickname: string, stashBananas = 10, hasBid = false) {
  return { id, nickname, avatar: 'chimp', stashBananas, isHost: false, hasBid };
}

const game: BroadcastGame = {
  joinCode: 'ABCD',
  status: 'playing',
  maxPlayers: 4,
  freeSeats: 2,
  winningScore: 200,
  roundTimerSeconds: null,
  crateBananas: 10,
  currentRound: 2,
  roundOpenedAt: null,
  players: [player('p1', 'Hugo'), player('p2', 'Zoe')],
  lastRound: {
    roundNumber: 1,
    crateBefore: 10,
    crateAfter: 15,
    outcomes: [outcome('p1', { crateWon: 10, tariffPaid: 5, stashAfter: 15 }), outcome('p2')],
  },
  winnerIds: [],
  viewerId: null,
  viewerBid: null,
};

// @FollowsBlueprint test-pure-unit
describe('buildRoundStories', () => {
  it('tells one story per player in the round', () => {
    expect(buildRoundStories(game).map((story) => story.nickname)).toEqual(['Hugo', 'Zoe']);
  });

  it('marks the player who took the crate', () => {
    expect(buildRoundStories(game).map((story) => story.wonTheCrate)).toEqual([true, false]);
  });

  it('tells no story while no round has resolved', () => {
    expect(buildRoundStories({ ...game, lastRound: null })).toEqual([]);
  });

  it('leaves out a result whose player is not at the table', () => {
    const orphaned = {
      ...game,
      lastRound: { roundNumber: 1, crateBefore: 10, crateAfter: 15, outcomes: [outcome('ghost')] },
    };
    expect(buildRoundStories(orphaned)).toEqual([]);
  });
});

describe('sortByStashDescending', () => {
  it('puts the largest stash first', () => {
    const ranked = sortByStashDescending([player('p1', 'Hugo', 5), player('p2', 'Zoe', 40)]);
    expect(ranked.map((entry) => entry.nickname)).toEqual(['Zoe', 'Hugo']);
  });
});

describe('haveAllPlayersBid', () => {
  it('is true once every player has answered', () => {
    const answered = [player('p1', 'Hugo', 10, true), player('p2', 'Zoe', 10, true)];
    expect(haveAllPlayersBid({ ...game, players: answered })).toBe(true);
  });

  it('is false while one player has not answered', () => {
    const half = [player('p1', 'Hugo', 10, true), player('p2', 'Zoe', 10, false)];
    expect(haveAllPlayersBid({ ...game, players: half })).toBe(false);
  });

  it('is false at an empty table', () => {
    expect(haveAllPlayersBid({ ...game, players: [] })).toBe(false);
  });
});

describe('the tariff predicates and the row tone', () => {
  const stories = buildRoundStories(game);
  const story = stories[0] ?? {
    playerId: 'p1',
    nickname: 'Hugo',
    avatar: 'chimp',
    bid: 30,
    stashBefore: 10,
    stashAfter: 15,
    crateWon: 10,
    tariffPaid: 5,
    tariffReceived: 0,
    busted: false,
    wonTheCrate: true,
  };

  it('knows a player who paid a tariff', () => {
    expect(hasPaidATariff(story)).toBe(true);
  });

  it('knows a player who received nothing', () => {
    expect(hasReceivedATariff({ ...story, tariffReceived: 0 })).toBe(false);
  });

  it('knows a player who received something', () => {
    expect(hasReceivedATariff({ ...story, tariffReceived: 5 })).toBe(true);
  });

  it('knows a player who paid nothing', () => {
    expect(hasPaidATariff({ ...story, tariffPaid: 0 })).toBe(false);
  });

  it('colours a busted row with the alarm tone, whoever it belongs to', () => {
    expect(selectStoryTone(true, false)).toBe('bg-coral-soft');
    expect(selectStoryTone(true, true)).toBe('bg-coral-soft');
  });

  it('colours your own surviving row with the highlight tone', () => {
    expect(selectStoryTone(false, true)).toBe('bg-peel-soft');
  });

  it('colours everybody else with the plain tone', () => {
    expect(selectStoryTone(false, false)).toBe('bg-cream');
  });
});
