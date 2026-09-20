import { describe, expect, it } from 'vitest';
import { type BroadcastGame, mergeBroadcast, parseBroadcast } from './game-broadcast.core';

const game: BroadcastGame = {
  joinCode: 'ABCD',
  status: 'playing',
  maxPlayers: 4,
  freeSeats: 2,
  winningScore: 200,
  roundTimerSeconds: null,
  crateBananas: 10,
  currentRound: 1,
  roundOpenedAt: null,
  players: [],
  lastRound: null,
  rematchJoinCode: null,
  winnerIds: [],
  viewerId: null,
  viewerBid: null,
};

// @FollowsBlueprint test-pure-unit
describe('parseBroadcast', () => {
  it('reads a message the API sent', () => {
    expect(parseBroadcast(JSON.stringify({ kind: 'game', game }))).toEqual(game);
  });

  it('reads the rematch code a finished game announces', () => {
    const announced = { ...game, rematchJoinCode: 'WXYZ' };
    expect(parseBroadcast(JSON.stringify({ kind: 'game', game: announced }))?.rematchJoinCode).toBe(
      'WXYZ',
    );
  });

  it('ignores a message that is not text', () => {
    expect(parseBroadcast(new ArrayBuffer(4))).toBeNull();
  });

  it('ignores text that is not JSON', () => {
    expect(parseBroadcast('not json')).toBeNull();
  });

  it('ignores JSON of another shape', () => {
    expect(parseBroadcast(JSON.stringify({ kind: 'pong' }))).toBeNull();
  });
});

describe('mergeBroadcast', () => {
  it('takes the message whole when the reader holds nothing yet', () => {
    expect(mergeBroadcast(undefined, game)).toEqual(game);
  });

  it('keeps the reader own identity, which the broadcast never carries', () => {
    const held = { ...game, viewerId: 'p1', viewerBid: 30 };
    expect(mergeBroadcast(held, game).viewerId).toBe('p1');
  });

  it('keeps the reader own bid while the round is the same', () => {
    const held = { ...game, viewerId: 'p1', viewerBid: 30 };
    expect(mergeBroadcast(held, game).viewerBid).toBe(30);
  });

  it('forgets the reader own bid once the round has moved on', () => {
    const held = { ...game, viewerId: 'p1', viewerBid: 30 };
    const nextRound = { ...game, currentRound: 2 };
    expect(mergeBroadcast(held, nextRound).viewerBid).toBeNull();
  });

  it('takes every shared field from the message', () => {
    const held = { ...game, crateBananas: 10, viewerId: 'p1' };
    expect(mergeBroadcast(held, { ...game, crateBananas: 18 }).crateBananas).toBe(18);
  });

  it('takes the rematch code from the message rather than from what the reader held', () => {
    const held = { ...game, viewerId: 'p1' };
    const announced = { ...game, rematchJoinCode: 'WXYZ' };
    expect(mergeBroadcast(held, announced).rematchJoinCode).toBe('WXYZ');
  });
});
