import { describe, expect, it } from 'vitest';
import { buildGameView, type BuildGameViewInput } from './game-view.core';

const baseInput: BuildGameViewInput = {
  game: {
    joinCode: 'ABCD',
    status: 'playing',
    maxPlayers: 4,
    winningScore: 200,
    roundTimerSeconds: 60,
    crateBananas: 10,
    currentRound: 1,
    roundOpenedAt: new Date('2026-09-19T12:00:00.000Z'),
  },
  players: [
    { id: 'p1', nickname: 'Hugo', avatar: 'chimp', stashBananas: 10, isHost: true },
    { id: 'p2', nickname: 'Zoe', avatar: 'lemur', stashBananas: 10, isHost: false },
  ],
  bidsThisRound: [{ playerId: 'p1', amount: 30 }],
  lastRound: null,
  winnerIds: [],
  viewerId: null,
};

// @FollowsBlueprint test-pure-unit
describe('buildGameView', () => {
  it('says who has answered without ever saying what they wrote', () => {
    const view = buildGameView(baseInput);

    expect(view.players.map((player) => player.hasBid)).toEqual([true, false]);
    expect(view.players.every((player) => !Object.hasOwn(player, 'bid'))).toBe(true);
    expect(view.viewerBid).toBeNull();
    expect(view.viewerId).toBeNull();
  });

  it('shows a player their own bid', () => {
    const view = buildGameView({ ...baseInput, viewerId: 'p1' });

    expect(view.viewerBid).toBe(30);
    expect(view.viewerId).toBe('p1');
  });

  it('shows no bid to a player who has not answered yet', () => {
    expect(buildGameView({ ...baseInput, viewerId: 'p2' }).viewerBid).toBeNull();
  });

  it('shows no bid to a reader who is not at this table', () => {
    const view = buildGameView({ ...baseInput, viewerId: 'a-stranger' });
    expect(view.viewerBid).toBeNull();
    expect(view.viewerId).toBe('a-stranger');
  });

  it('counts the seats still free', () => {
    expect(buildGameView(baseInput).freeSeats).toBe(2);
  });

  it('writes the round opening time as a plain string', () => {
    expect(buildGameView(baseInput).roundOpenedAt).toBe('2026-09-19T12:00:00.000Z');
  });

  it('reports no opening time while the game waits in the lobby', () => {
    const waiting = { ...baseInput.game, status: 'lobby', roundOpenedAt: null } as const;
    expect(buildGameView({ ...baseInput, game: waiting }).roundOpenedAt).toBeNull();
  });

  it('carries the resolved round and the winners through unchanged', () => {
    const lastRound = { roundNumber: 1, crateBefore: 10, crateAfter: 18, outcomes: [] };
    const view = buildGameView({ ...baseInput, lastRound, winnerIds: ['p1'] });

    expect(view.lastRound).toBe(lastRound);
    expect(view.winnerIds).toEqual(['p1']);
  });
});
