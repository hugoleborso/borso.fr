/**
 * Service layer for sessions.
 */

import type { Database } from '../database/client';
import {
  type SessionInsertShape,
  type SessionRow,
  deleteSessionWithCascade,
  findSessionById,
  insertSession,
  listSessions,
  updateSession,
} from './sessions.repository';
import type { sessionCreateSchema, sessionUpdateSchema } from './sessions.schema';
import type { z } from 'zod';

type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;

function valuesFromCreate(input: SessionCreateInput): SessionInsertShape {
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

function valuesFromUpdate(input: SessionUpdateInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (input.date !== undefined) updates.date = new Date(input.date);
  if ('venue' in input && input.venue !== undefined) updates.venue = input.venue;
  if ('capacity' in input && input.capacity !== undefined) updates.capacity = input.capacity;
  if ('gear' in input && input.gear !== undefined) updates.gear = input.gear;
  if ('friendsCountPerMember' in input && input.friendsCountPerMember !== undefined) {
    updates.friendsCountPerMember = input.friendsCountPerMember;
  }
  if ('preparedConcertId' in input && input.preparedConcertId !== undefined) {
    updates.preparedConcertId = input.preparedConcertId;
  }
  return updates;
}

export async function getSessions(database: Database): Promise<SessionRow[]> {
  return await listSessions(database);
}

export async function getSessionById(database: Database, id: string): Promise<SessionRow | null> {
  return await findSessionById(database, id);
}

export async function createSession(
  database: Database,
  input: SessionCreateInput,
): Promise<SessionRow> {
  return await insertSession(database, valuesFromCreate(input));
}

export async function patchSession(
  database: Database,
  id: string,
  input: SessionUpdateInput,
): Promise<{ kind: 'ok'; session: SessionRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const session = await updateSession(database, id, updates);
  if (session === null) return { kind: 'not-found' };
  return { kind: 'ok', session };
}

export async function removeSession(database: Database, id: string): Promise<boolean> {
  return await deleteSessionWithCascade(database, id);
}

export interface OfflineManifestPayload {
  catalogListUrl: string;
  songDetailUrls: string[];
  nextSessionUrl: string | null;
  nextSetlistUrl: string | null;
}

/**
 * Composes the offline-manifest payload from session + song lists.
 * The "next session" rule lives in `sw/manifest.utils.ts` (front-end
 * pure utility) and is mirrored here in unit-friendly shape so the
 * back-e2e test can assert the wire contract.
 */
export function buildNextSessionOfflineManifest(
  sessions: readonly SessionRow[],
  songs: readonly { id: string }[],
  now: Date,
): OfflineManifestPayload {
  const futureSessions = sessions
    .filter((session) => session.date.getTime() > now.getTime())
    .toSorted((left, right) => {
      const deltaMs = left.date.getTime() - right.date.getTime();
      if (deltaMs !== 0) return deltaMs;
      return left.id.localeCompare(right.id);
    });
  const next = futureSessions[0];
  return {
    catalogListUrl: '/api/songs',
    songDetailUrls: songs.map((song) => `/api/songs/${song.id}`),
    nextSessionUrl: next === undefined ? null : `/api/sessions/${next.id}`,
    nextSetlistUrl: next === undefined ? null : `/api/setlists/by-session/${next.id}`,
  };
}
