import { describe, expect, it } from 'vitest';
import {
  isMoveAvailable,
  refuseStart,
  selectViewerMoves,
  type TableForViewer,
} from './game-lifecycle.core';

const HOST_ID = 'host';
const GUEST_ID = 'guest';

const lobbyOfTwo: TableForViewer = {
  status: 'lobby',
  players: [
    { id: HOST_ID, isHost: true },
    { id: GUEST_ID, isHost: false },
  ],
  viewerId: HOST_ID,
  viewerBid: null,
  freeSeats: 2,
  rematchJoinCode: null,
};

// @FollowsBlueprint test-pure-unit
describe('refuseStart', () => {
  it('allows a lobby holding enough players', () => {
    expect(refuseStart('lobby', 2)).toBeNull();
  });

  it('refuses a game that is already running', () => {
    expect(refuseStart('playing', 4)).toBe('not-in-lobby');
  });

  it('refuses a lobby holding one player', () => {
    expect(refuseStart('lobby', 1)).toBe('not-enough-players');
  });
});

describe('selectViewerMoves', () => {
  it('lets the host start a lobby that has enough players', () => {
    expect(selectViewerMoves(lobbyOfTwo)).toEqual(['start']);
  });

  it('gives the host nothing to do while alone in the lobby', () => {
    const alone = { ...lobbyOfTwo, players: [{ id: HOST_ID, isHost: true }] };
    expect(selectViewerMoves(alone)).toEqual([]);
  });

  it('gives a seated guest nothing to do in the lobby', () => {
    expect(selectViewerMoves({ ...lobbyOfTwo, viewerId: GUEST_ID })).toEqual([]);
  });

  it('offers a seat to somebody who only has the code', () => {
    expect(selectViewerMoves({ ...lobbyOfTwo, viewerId: null })).toEqual(['join']);
  });

  it('offers no seat at a full table', () => {
    expect(selectViewerMoves({ ...lobbyOfTwo, viewerId: null, freeSeats: 0 })).toEqual([]);
  });

  it('offers no seat once the game has started', () => {
    expect(selectViewerMoves({ ...lobbyOfTwo, status: 'playing', viewerId: null })).toEqual([]);
  });

  it('asks a seated player for a bid while the round is open', () => {
    const playing = { ...lobbyOfTwo, status: 'playing' as const, viewerId: GUEST_ID };
    expect(selectViewerMoves(playing)).toEqual(['bid']);
  });

  it('asks for nothing more once the bid is in', () => {
    const answered = { ...lobbyOfTwo, status: 'playing' as const, viewerBid: 5 };
    expect(selectViewerMoves(answered)).toEqual([]);
  });

  it('lets the host ask for a rematch once the game is over', () => {
    expect(selectViewerMoves({ ...lobbyOfTwo, status: 'finished' })).toEqual(['rematch']);
  });

  it('does not let a guest ask for the rematch', () => {
    const finished = { ...lobbyOfTwo, status: 'finished' as const, viewerId: GUEST_ID };
    expect(selectViewerMoves(finished)).toEqual([]);
  });

  it('does not offer a second rematch once one is announced', () => {
    const announced = { ...lobbyOfTwo, status: 'finished' as const, rematchJoinCode: 'WXYZ' };
    expect(selectViewerMoves(announced)).toEqual([]);
  });
});

describe('isMoveAvailable', () => {
  it('answers yes for a move the viewer may make', () => {
    expect(isMoveAvailable(lobbyOfTwo, 'start')).toBe(true);
  });

  it('answers no for a move the viewer may not make', () => {
    expect(isMoveAvailable(lobbyOfTwo, 'join')).toBe(false);
  });
});
