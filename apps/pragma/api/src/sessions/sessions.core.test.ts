import { describe, expect, it } from 'vitest';
import {
  buildSessionInsertShape,
  encodeSessionInsert,
  type SessionInsertShape,
} from './sessions.core';

// @FollowsBlueprint test-pure-unit
describe('buildSessionInsertShape', () => {
  it('keeps the concert columns and parses the ISO date', () => {
    expect(
      buildSessionInsertShape({
        kind: 'concert',
        date: '2026-05-01T20:00:00.000Z',
        venue: 'Le Sonic',
        capacity: 180,
        gear: 'full backline',
        friendsCountPerMember: { '11111111-1111-1111-1111-111111111111': 3 },
      }),
    ).toStrictEqual({
      kind: 'concert',
      date: new Date('2026-05-01T20:00:00.000Z'),
      venue: 'Le Sonic',
      capacity: 180,
      gear: 'full backline',
      friendsCountPerMember: { '11111111-1111-1111-1111-111111111111': 3 },
    });
  });

  it('keeps only the prepared concert for a practice', () => {
    expect(
      buildSessionInsertShape({
        kind: 'practice',
        date: '2026-04-20T18:00:00.000Z',
        preparedConcertId: '22222222-2222-2222-2222-222222222222',
      }),
    ).toStrictEqual({
      kind: 'practice',
      date: new Date('2026-04-20T18:00:00.000Z'),
      preparedConcertId: '22222222-2222-2222-2222-222222222222',
    });
  });
});

describe('encodeSessionInsert', () => {
  it('serialises the friend count of a concert to JSON text', () => {
    expect(
      encodeSessionInsert({
        kind: 'concert',
        date: new Date('2026-05-01T20:00:00.000Z'),
        venue: 'Le Sonic',
        capacity: 180,
        gear: 'full backline',
        friendsCountPerMember: { '11111111-1111-1111-1111-111111111111': 3 },
      }),
    ).toStrictEqual({
      kind: 'concert',
      date: new Date('2026-05-01T20:00:00.000Z'),
      venue: 'Le Sonic',
      capacity: 180,
      gear: 'full backline',
      friendsCountPerMember: '{"11111111-1111-1111-1111-111111111111":3}',
    });
  });

  it('writes an empty JSON object when nobody brings a friend', () => {
    const withoutFriends: SessionInsertShape = {
      kind: 'concert',
      date: new Date('2026-05-01T20:00:00.000Z'),
      venue: 'Le Sonic',
      capacity: 180,
      gear: '',
      friendsCountPerMember: {},
    };

    expect(encodeSessionInsert(withoutFriends).friendsCountPerMember).toBe('{}');
  });

  it('writes no concert column for a practice', () => {
    expect(
      encodeSessionInsert({
        kind: 'practice',
        date: new Date('2026-04-20T18:00:00.000Z'),
        preparedConcertId: null,
      }),
    ).toStrictEqual({
      kind: 'practice',
      date: new Date('2026-04-20T18:00:00.000Z'),
      preparedConcertId: null,
    });
  });
});
