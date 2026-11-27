import { and, asc, eq, gte, isNotNull } from 'drizzle-orm';
import { CONCERT_KIND } from '@domain/upcoming-concerts.core';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { sessionTable } from '../sessions/sessions.schema';
import { concertRegistrationTable } from './concert-registrations.schema';

export type ConcertRegistrationRow = typeof concertRegistrationTable.$inferSelect;

export type RegistrationInsertShape = Omit<ConcertRegistrationRow, 'id'>;

export type RegistrationAnswerShape = Partial<
  Pick<ConcertRegistrationRow, 'comingForMemberId' | 'wishedSongId'>
>;

export type ConcertAnnouncementRow = Pick<
  typeof sessionTable.$inferSelect,
  'id' | 'kind' | 'date' | 'venue' | 'publicMessage' | 'posterS3Key' | 'prizeLabel' | 'prizeIcon'
>;

export type AnnouncementUpdateShape = Partial<
  Pick<ConcertAnnouncementRow, 'publicMessage' | 'posterS3Key' | 'prizeLabel' | 'prizeIcon'>
>;

// @FollowsBlueprint repository-projection
const ANNOUNCEMENT_PROJECTION = {
  id: sessionTable.id,
  kind: sessionTable.kind,
  date: sessionTable.date,
  venue: sessionTable.venue,
  publicMessage: sessionTable.publicMessage,
  posterS3Key: sessionTable.posterS3Key,
  prizeLabel: sessionTable.prizeLabel,
  prizeIcon: sessionTable.prizeIcon,
} as const;

// @FollowsBlueprint repository-projection
const REGISTRATION_PROJECTION = {
  id: concertRegistrationTable.id,
  sessionId: concertRegistrationTable.sessionId,
  firstName: concertRegistrationTable.firstName,
  email: concertRegistrationTable.email,
  canonicalEmail: concertRegistrationTable.canonicalEmail,
  editTokenHash: concertRegistrationTable.editTokenHash,
  comingForMemberId: concertRegistrationTable.comingForMemberId,
  wishedSongId: concertRegistrationTable.wishedSongId,
  registeredAt: concertRegistrationTable.registeredAt,
} as const;

export async function runInOneRegistrationTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

// @FollowsBlueprint repository-query
export async function listConcertsFrom(from: Date): Promise<ConcertAnnouncementRow[]> {
  return await getDatabase()
    .select(ANNOUNCEMENT_PROJECTION)
    .from(sessionTable)
    .where(and(eq(sessionTable.kind, CONCERT_KIND), gte(sessionTable.date, from)))
    .orderBy(asc(sessionTable.date));
}

export async function findConcertAnnouncement(
  sessionId: string,
): Promise<ConcertAnnouncementRow | null> {
  return await findConcertAnnouncementWithin(getDatabase(), sessionId);
}

export async function findConcertAnnouncementWithin(
  executor: DatabaseExecutor,
  sessionId: string,
): Promise<ConcertAnnouncementRow | null> {
  const rows = await executor
    .select(ANNOUNCEMENT_PROJECTION)
    .from(sessionTable)
    .where(eq(sessionTable.id, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateConcertAnnouncement(
  sessionId: string,
  values: AnnouncementUpdateShape,
): Promise<ConcertAnnouncementRow | null> {
  const [row] = await getDatabase()
    .update(sessionTable)
    .set(values)
    .where(eq(sessionTable.id, sessionId))
    .returning(ANNOUNCEMENT_PROJECTION);
  return row ?? null;
}

export async function insertRegistrationWithin(
  executor: DatabaseExecutor,
  values: RegistrationInsertShape,
): Promise<ConcertRegistrationRow | null> {
  const [row] = await executor
    .insert(concertRegistrationTable)
    .values(values)
    .onConflictDoNothing()
    .returning(REGISTRATION_PROJECTION);
  return row ?? null;
}

export async function findRegistrationHoldingToken(
  registrationId: string,
  editTokenHash: string,
): Promise<ConcertRegistrationRow | null> {
  const rows = await getDatabase()
    .select(REGISTRATION_PROJECTION)
    .from(concertRegistrationTable)
    .where(
      and(
        eq(concertRegistrationTable.id, registrationId),
        eq(concertRegistrationTable.editTokenHash, editTokenHash),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findRegistrationById(
  registrationId: string,
): Promise<ConcertRegistrationRow | null> {
  const rows = await getDatabase()
    .select(REGISTRATION_PROJECTION)
    .from(concertRegistrationTable)
    .where(eq(concertRegistrationTable.id, registrationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function didDeleteRegistrationOfConcert(
  sessionId: string,
  registrationId: string,
): Promise<boolean> {
  const deleted = await getDatabase()
    .delete(concertRegistrationTable)
    .where(
      and(
        eq(concertRegistrationTable.id, registrationId),
        eq(concertRegistrationTable.sessionId, sessionId),
      ),
    )
    .returning({ id: concertRegistrationTable.id });
  return deleted.length > 0;
}

export async function findRegistrationOfMailbox(
  sessionId: string,
  canonicalEmail: string,
): Promise<ConcertRegistrationRow | null> {
  const rows = await getDatabase()
    .select(REGISTRATION_PROJECTION)
    .from(concertRegistrationTable)
    .where(
      and(
        eq(concertRegistrationTable.sessionId, sessionId),
        eq(concertRegistrationTable.canonicalEmail, canonicalEmail),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateRegistrationAnswersWithin(
  executor: DatabaseExecutor,
  registrationId: string,
  values: RegistrationAnswerShape,
): Promise<ConcertRegistrationRow | null> {
  const [row] = await executor
    .update(concertRegistrationTable)
    .set(values)
    .where(eq(concertRegistrationTable.id, registrationId))
    .returning(REGISTRATION_PROJECTION);
  return row ?? null;
}

export async function listRegistrationsOfConcert(
  sessionId: string,
): Promise<ConcertRegistrationRow[]> {
  return await getDatabase()
    .select(REGISTRATION_PROJECTION)
    .from(concertRegistrationTable)
    .where(eq(concertRegistrationTable.sessionId, sessionId))
    .orderBy(asc(concertRegistrationTable.registeredAt));
}

export async function listDistinctWishedSongIds(): Promise<string[]> {
  const rows = await getDatabase()
    .selectDistinct({ wishedSongId: concertRegistrationTable.wishedSongId })
    .from(concertRegistrationTable)
    .where(isNotNull(concertRegistrationTable.wishedSongId));
  return rows.flatMap((row) => (row.wishedSongId === null ? [] : [row.wishedSongId]));
}
