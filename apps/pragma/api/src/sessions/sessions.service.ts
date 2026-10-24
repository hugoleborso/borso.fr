import type { z } from 'zod';
import { getSongs } from '../songs/songs.service';
import { buildSessionInsertShape } from './sessions.core';
import {
  buildNextSessionOfflineManifest,
  type OfflineManifestPayload,
} from './offline-manifest.core';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { notifyBand, type WriteActor } from '../notifications/notifications.service';
import {
  deleteSessionWithCascade,
  insertSession,
  listSessions,
  type SessionRow,
  updateSession,
} from './sessions.repository';
export { claimSessionWithin, findSessionById } from './sessions.repository';
import {
  type SessionPersistedUpdate,
  type sessionCreateSchema,
  sessionPersistedUpdateSchema,
  type sessionUpdateSchema,
} from './sessions.schema';

type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;

function valuesFromUpdate(input: SessionUpdateInput): SessionPersistedUpdate {
  const updates: SessionPersistedUpdate = {};
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
  return sessionPersistedUpdateSchema.parse(updates);
}

export async function getSessions(): Promise<SessionRow[]> {
  return await listSessions();
}

async function notifySessionWritten(
  kind: 'session-created' | 'session-changed',
  session: SessionRow,
  actor: WriteActor,
): Promise<void> {
  await notifyBand(
    {
      kind,
      actorMemberId: actor.memberId,
      sessionId: session.id,
      sessionDate: session.date.toISOString(),
    },
    actor.now,
  );
}

export async function createSession(
  input: SessionCreateInput,
  actor: WriteActor,
): Promise<SessionRow> {
  const session = await insertSession(buildSessionInsertShape(input));
  await notifySessionWritten('session-created', session, actor);
  return session;
}

// @FollowsBlueprint service-crud-update
export async function patchSession(
  id: string,
  input: SessionUpdateInput,
  actor: WriteActor,
): Promise<{ kind: 'ok'; session: SessionRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  const updates = valuesFromUpdate(input);
  if (Object.keys(updates).length === 0) return { kind: 'empty' };
  const session = await updateSession(id, updates);
  if (session === null) return { kind: 'not-found' };
  await notifySessionWritten('session-changed', session, actor);
  return { kind: 'ok', session };
}

export async function removeSession(id: string): Promise<DeletionOutcome> {
  return await deleteSessionWithCascade(id);
}

// @FollowsBlueprint service-read-model
export async function getNextSessionOfflineManifest(now: Date): Promise<OfflineManifestPayload> {
  const [sessions, songs] = await Promise.all([getSessions(), getSongs()]);
  return buildNextSessionOfflineManifest(sessions, songs, now);
}
