/**
 * A session is a concert or a practice, and the discriminated union is the
 * rule: a concert needs a venue, a practice does not have one, and neither
 * accepts a field the other owns.
 */

import { describe, expect, it } from 'vitest';
import {
  concertCreateSchema,
  friendsCountSchema,
  practiceCreateSchema,
  sessionCreateSchema,
  sessionIdParamSchema,
  sessionPersistedUpdateSchema,
  sessionUpdateSchema,
} from './sessions.schema';

const CAPACITY_CEILING = 100_000;
const FRIENDS_CEILING = 1_000;
const date = '2026-09-19T20:00:00.000Z';
const memberId = crypto.randomUUID();

function concert(overrides: Record<string, unknown> = {}): unknown {
  return { kind: 'concert', date, venue: 'Le Trabendo', capacity: 700, ...overrides };
}

describe('friendsCountSchema', () => {
  it('counts guests per member, floor included', () => {
    expect(friendsCountSchema.safeParse({ [memberId]: 0 }).success).toBe(true);
    expect(friendsCountSchema.safeParse({ [memberId]: FRIENDS_CEILING }).success).toBe(true);
  });

  it('refuses a negative or fractional count, and one past the ceiling', () => {
    for (const count of [-1, 2.5, FRIENDS_CEILING + 1]) {
      expect(friendsCountSchema.safeParse({ [memberId]: count }).success).toBe(false);
    }
  });

  it('refuses a key that is not a member id', () => {
    expect(friendsCountSchema.safeParse({ ada: 2 }).success).toBe(false);
  });
});

describe('concertCreateSchema', () => {
  it('fills in the gear list and the guest counts', () => {
    expect(concertCreateSchema.parse(concert())).toMatchObject({
      gear: '',
      friendsCountPerMember: {},
    });
  });

  it('needs a venue that is really a venue', () => {
    expect(concertCreateSchema.safeParse(concert({ venue: '   ' })).success).toBe(false);
  });

  it('refuses a capacity outside what a room can hold', () => {
    expect(concertCreateSchema.safeParse(concert({ capacity: -1 })).success).toBe(false);
    expect(concertCreateSchema.safeParse(concert({ capacity: CAPACITY_CEILING + 1 })).success).toBe(
      false,
    );
  });

  it('refuses a field it does not own, rather than dropping it silently', () => {
    expect(concertCreateSchema.safeParse(concert({ preparedConcertId: null })).success).toBe(false);
  });

  it('refuses a date that is not a timestamp', () => {
    expect(concertCreateSchema.safeParse(concert({ date: '2026-09-19' })).success).toBe(false);
  });
});

describe('practiceCreateSchema', () => {
  it('prepares no concert unless one is named', () => {
    const parseOutcome = practiceCreateSchema.safeParse({ kind: 'practice', date });
    expect(parseOutcome.success && parseOutcome.data.preparedConcertId).toBeNull();
  });

  it('refuses a venue, which belongs to the other kind', () => {
    expect(
      practiceCreateSchema.safeParse({ kind: 'practice', date, venue: 'Le Trabendo' }).success,
    ).toBe(false);
  });
});

describe('sessionCreateSchema', () => {
  it('routes on the kind', () => {
    expect(sessionCreateSchema.safeParse(concert()).success).toBe(true);
    expect(sessionCreateSchema.safeParse({ kind: 'practice', date }).success).toBe(true);
  });

  it('refuses a kind that is neither', () => {
    expect(sessionCreateSchema.safeParse({ kind: 'rehearsal', date }).success).toBe(false);
  });
});

describe('sessionUpdateSchema', () => {
  it('accepts a patch that names only what it changes', () => {
    expect(sessionUpdateSchema.safeParse({ venue: 'La Maroquinerie' }).success).toBe(true);
    expect(sessionUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('still refuses a value the create schema would have refused', () => {
    expect(sessionUpdateSchema.safeParse({ capacity: -1 }).success).toBe(false);
  });
});

describe('sessionPersistedUpdateSchema', () => {
  it('takes a real Date, because the service has already parsed it', () => {
    expect(sessionPersistedUpdateSchema.safeParse({ date: new Date(date) }).success).toBe(true);
    expect(sessionPersistedUpdateSchema.safeParse({ date }).success).toBe(false);
  });

  it('refuses the Invalid Date a malformed string would have produced', () => {
    expect(sessionPersistedUpdateSchema.safeParse({ date: new Date('nope') }).success).toBe(false);
  });
});

describe('sessionIdParamSchema', () => {
  it('accepts a uuid and refuses anything else', () => {
    expect(sessionIdParamSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(sessionIdParamSchema.safeParse({ id: 'session-1' }).success).toBe(false);
  });
});
