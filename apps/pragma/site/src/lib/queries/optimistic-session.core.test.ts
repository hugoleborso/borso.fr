import { describe, expect, it } from 'vitest';
import { buildOptimisticSession } from './optimistic-session.core';

const CONCERT_DATE = '2026-05-01T20:00:00.000Z';
const PRACTICE_DATE = '2026-04-28T18:30:00.000Z';
const MEMBER_ID = '3f1d8a2c-0b4e-4f7a-9c1d-5e6f7a8b9c0d';
const CONCERT_ID = '7c2e4b6a-1d3f-4a5b-8c9d-0e1f2a3b4c5d';

describe('buildOptimisticSession', () => {
  it('keeps the concert columns and blanks the practice one', () => {
    expect(
      buildOptimisticSession('optimistic-id', {
        kind: 'concert',
        date: CONCERT_DATE,
        venue: 'Le Klub',
        capacity: 120,
        gear: 'two amps',
        friendsCountPerMember: { [MEMBER_ID]: 3 },
      }),
    ).toStrictEqual({
      id: 'optimistic-id',
      kind: 'concert',
      date: CONCERT_DATE,
      preparedConcertId: null,
      venue: 'Le Klub',
      capacity: 120,
      gear: 'two amps',
      friendsCountPerMember: { [MEMBER_ID]: 3 },
    });
  });

  it('falls back to the defaults the API applies for an omitted gear and friend count', () => {
    expect(
      buildOptimisticSession('optimistic-id', {
        kind: 'concert',
        date: CONCERT_DATE,
        venue: 'La Cave',
        capacity: 40,
      }),
    ).toStrictEqual({
      id: 'optimistic-id',
      kind: 'concert',
      date: CONCERT_DATE,
      preparedConcertId: null,
      venue: 'La Cave',
      capacity: 40,
      gear: null,
      friendsCountPerMember: {},
    });
  });

  it('keeps the prepared concert and blanks every concert column for a practice', () => {
    expect(
      buildOptimisticSession('optimistic-id', {
        kind: 'practice',
        date: PRACTICE_DATE,
        preparedConcertId: CONCERT_ID,
      }),
    ).toStrictEqual({
      id: 'optimistic-id',
      kind: 'practice',
      date: PRACTICE_DATE,
      preparedConcertId: CONCERT_ID,
      venue: null,
      capacity: null,
      gear: null,
      friendsCountPerMember: null,
    });
  });

  it('reads an omitted prepared concert as none', () => {
    expect(
      buildOptimisticSession('optimistic-id', { kind: 'practice', date: PRACTICE_DATE })
        .preparedConcertId,
    ).toBeNull();
  });
});
