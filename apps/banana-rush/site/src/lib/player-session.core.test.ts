import { describe, expect, it } from 'vitest';
import { readSeats, selectSeat, withSeat } from './player-session.core';

const seat = { playerId: 'p1', playerToken: 't1' };

// @FollowsBlueprint test-pure-unit
describe('readSeats', () => {
  it('reads back what was written', () => {
    expect(readSeats(JSON.stringify({ ABCD: seat }))).toEqual({ ABCD: seat });
  });

  it('answers an empty slice when nothing was stored', () => {
    expect(readSeats(null)).toEqual({});
  });

  it('answers an empty slice for text that is not JSON', () => {
    expect(readSeats('{not json')).toEqual({});
  });

  it('answers an empty slice for JSON of another shape', () => {
    expect(readSeats(JSON.stringify({ ABCD: { playerId: 42 } }))).toEqual({});
  });
});

describe('withSeat', () => {
  it('adds a seat without touching the others', () => {
    const next = withSeat({ ABCD: seat }, 'EFGH', { playerId: 'p2', playerToken: 't2' });
    expect(Object.keys(next)).toEqual(['ABCD', 'EFGH']);
  });

  it('replaces the seat held for a code already known', () => {
    const next = withSeat({ ABCD: seat }, 'ABCD', { playerId: 'p9', playerToken: 't9' });
    expect(next.ABCD?.playerId).toBe('p9');
  });
});

describe('selectSeat', () => {
  it('finds the seat held for a code', () => {
    expect(selectSeat({ ABCD: seat }, 'ABCD')).toEqual(seat);
  });

  it('answers nothing for a code never seen', () => {
    expect(selectSeat({ ABCD: seat }, 'ZZZZ')).toBeNull();
  });
});
