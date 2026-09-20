import { STARTING_STASH_BANANAS } from '@domain/game-setup.core';
import { describe, expect, it } from 'vitest';
import { buildRematchSeats, refuseRematch, selectSeatForAvatar } from './rematch.core';

const seated = [
  { nickname: 'Hugo', avatar: 'chimp', seatOrder: 0, isHost: true },
  { nickname: 'Zoe', avatar: 'lemur', seatOrder: 1, isHost: false },
];

// @FollowsBlueprint test-pure-unit
describe('refuseRematch', () => {
  it('lets the host of a finished game ask for one', () => {
    expect(refuseRematch('finished', true)).toBeNull();
  });

  it('refuses a game still waiting in the lobby', () => {
    expect(refuseRematch('lobby', true)).toBe('not-finished');
  });

  it('refuses a game still being played', () => {
    expect(refuseRematch('playing', true)).toBe('not-finished');
  });

  it('refuses a player who is not the host', () => {
    expect(refuseRematch('finished', false)).toBe('not-host');
  });

  it('names the state before it names the asker', () => {
    expect(refuseRematch('playing', false)).toBe('not-finished');
  });
});

describe('buildRematchSeats', () => {
  it('seats everybody again with their name, their monkey and their place', () => {
    expect(buildRematchSeats(seated)).toEqual([
      {
        nickname: 'Hugo',
        avatar: 'chimp',
        seatOrder: 0,
        isHost: true,
        stashBananas: STARTING_STASH_BANANAS,
      },
      {
        nickname: 'Zoe',
        avatar: 'lemur',
        seatOrder: 1,
        isHost: false,
        stashBananas: STARTING_STASH_BANANAS,
      },
    ]);
  });

  it('gives every seat the opening stash rather than the score it finished on', () => {
    const seats = buildRematchSeats(seated);
    expect(seats.map((seat) => seat.stashBananas)).toEqual([
      STARTING_STASH_BANANAS,
      STARTING_STASH_BANANAS,
    ]);
  });

  it('seats nobody at an empty table', () => {
    expect(buildRematchSeats([])).toEqual([]);
  });
});

describe('selectSeatForAvatar', () => {
  const seats = [
    { id: 'new-1', avatar: 'chimp' },
    { id: 'new-2', avatar: 'lemur' },
  ];

  it('finds the seat carrying the same monkey', () => {
    expect(selectSeatForAvatar(seats, 'lemur')).toBe('new-2');
  });

  it('finds the first seat when it is the one asked for', () => {
    expect(selectSeatForAvatar(seats, 'chimp')).toBe('new-1');
  });

  it('answers nothing for a monkey nobody is sitting behind', () => {
    expect(selectSeatForAvatar(seats, 'mandrill')).toBeNull();
  });

  it('answers nothing at an empty table', () => {
    expect(selectSeatForAvatar([], 'chimp')).toBeNull();
  });
});
