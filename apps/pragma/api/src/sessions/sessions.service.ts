import { orderSessionsForListing } from '@domain/session-schedule.core';
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
  findSessionById,
  insertSession,
  listSessions,
  type SessionRow,
  updateSession,
} from './sessions.repository';
export { didClaimSessionWithin, findSessionById } from './sessions.repository';
export {
  confirmUpdate,
  defineDeletion,
  defineTool,
  pageItems,
  parseToolFields,
} from '../mcp/mcp.service';
import { refuseUnresolvedReference } from '../mcp/mcp.service';
import { isIdentifierReference } from '../helpers/reference/reference.core';
import { readLineupNames } from '../instruments/instruments.service';
import {
  matchSessionReference,
  projectSessionForTool,
  type SessionSummary,
  type SessionWindow,
  summarizeSessionsInWindow,
} from './session-tool.core';
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

// @FollowsBlueprint service-clock-injected
export async function getSessions(now: Date): Promise<SessionRow[]> {
  return orderSessionsForListing(await listSessions(), now);
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

export async function listSessionsForTool(
  window: SessionWindow,
  kind: string | undefined,
  now: Date,
): Promise<SessionSummary[]> {
  return summarizeSessionsInWindow(await getSessions(now), window, kind, now);
}

export async function resolveSessionId(reference: string, now: Date): Promise<string> {
  const isIdentifier = isIdentifierReference(reference);
  if (isIdentifier) return reference;
  const match = matchSessionReference(await getSessions(now), reference, now);
  if (match.kind === 'found') return match.id;
  return refuseUnresolvedReference('session', reference, match);
}

export type SessionToolView = ReturnType<typeof projectSessionForTool>;

export async function readSessionForTool(id: string): Promise<SessionToolView | null> {
  const [session, names] = await Promise.all([findSessionById(id), readLineupNames()]);
  if (session === null) return null;
  return projectSessionForTool(session, names.members);
}

export async function removeSession(id: string): Promise<DeletionOutcome> {
  return await deleteSessionWithCascade(id);
}

// @FollowsBlueprint service-read-model
export async function getNextSessionOfflineManifest(now: Date): Promise<OfflineManifestPayload> {
  const [sessions, songs] = await Promise.all([getSessions(now), getSongs()]);
  return buildNextSessionOfflineManifest(sessions, songs, now);
}
