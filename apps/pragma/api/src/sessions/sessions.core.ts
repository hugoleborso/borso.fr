import type { z } from 'zod';
import type { sessionCreateSchema, sessionTable } from './sessions.schema';

type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
type SessionInsertEncoded = typeof sessionTable.$inferInsert;

export interface ConcertInsertShape {
  kind: 'concert';
  date: Date;
  venue: string;
  capacity: number;
  gear: string;
  friendsCountPerMember: Record<string, number>;
}

export interface PracticeInsertShape {
  kind: 'practice';
  date: Date;
  preparedConcertId: string | null;
}

export type SessionInsertShape = ConcertInsertShape | PracticeInsertShape;

// @FollowsBlueprint core-projection
export function buildSessionInsertShape(input: SessionCreateInput): SessionInsertShape {
  if (input.kind === 'concert') {
    return {
      kind: 'concert',
      date: new Date(input.date),
      venue: input.venue,
      capacity: input.capacity,
      gear: input.gear,
      friendsCountPerMember: input.friendsCountPerMember,
    };
  }
  return {
    kind: 'practice',
    date: new Date(input.date),
    preparedConcertId: input.preparedConcertId,
  };
}

export function encodeSessionInsert(values: SessionInsertShape): SessionInsertEncoded {
  if (values.kind === 'concert') {
    return {
      kind: 'concert',
      date: values.date,
      venue: values.venue,
      capacity: values.capacity,
      gear: values.gear,
      friendsCountPerMember: JSON.stringify(values.friendsCountPerMember),
    };
  }
  return {
    kind: 'practice',
    date: values.date,
    preparedConcertId: values.preparedConcertId,
  };
}
