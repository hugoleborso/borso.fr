/**
 * The row the sessions list shows while a create request is in flight.
 *
 * Practices and concerts share one table, so half the columns belong to the
 * other kind and read as `null`. Which half is the decision this file holds,
 * and it mirrors `buildSessionInsertShape` on the API side, which does the
 * same thing to the same body on its way into the database.
 */

import type { InferResponseType } from 'hono/client';
import type { api } from '../api.client';

type SessionsListShape = InferResponseType<typeof api.api.sessions.$get>;
type SessionRow = SessionsListShape['sessions'][number];
type SessionCreateVariables = Parameters<typeof api.api.sessions.$post>[0]['json'];

const NO_FRIENDS_COUNTS = {};

// @FollowsBlueprint dto-mapper
export function buildOptimisticSession(id: string, variables: SessionCreateVariables): SessionRow {
  if (variables.kind === 'concert') {
    return {
      id,
      kind: variables.kind,
      date: variables.date,
      preparedConcertId: null,
      venue: variables.venue,
      capacity: variables.capacity,
      gear: variables.gear ?? null,
      friendsCountPerMember: variables.friendsCountPerMember ?? NO_FRIENDS_COUNTS,
    };
  }
  return {
    id,
    kind: variables.kind,
    date: variables.date,
    preparedConcertId: variables.preparedConcertId ?? null,
    venue: null,
    capacity: null,
    gear: null,
    friendsCountPerMember: null,
  };
}
