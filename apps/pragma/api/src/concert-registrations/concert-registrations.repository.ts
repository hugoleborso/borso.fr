import { and, asc, count, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { sessionTable } from '../sessions/sessions.schema';
import { concertRegistrationTable } from './concert-registrations.schema';

const CONCERT_SESSION_KIND = 'concert';

export type ConcertRegistrationRow = typeof concertRegistrationTable.$inferSelect;

export type RegistrationInsertShape = Omit<ConcertRegistrationRow, 'id'>;

export type RegistrationAnswerShape = Partial<
  Pick<ConcertRegistrationRow, 'comingForMemberId' | 'wishedSongId'>
>;

export interface ConcertAnnouncementRow {
  readonly id: string;
  readonly kind: string;
  readonly date: Date;
  readonly venue: string | null;
  readonly publicMessage: string | null;
  readonly posterS3Key: string | null;
}

export type AnnouncementUpdateShape = Partial<
  Pick<ConcertAnnouncementRow, 'publicMessage' | 'posterS3Key'>
>;

// @FollowsBlueprint repository-projection
const ANNOUNCEMENT_PROJECTION = {
  id: sessionTable.id,
  kind: sessionTable.kind,
  date: sessionTable.date,
  venue: sessionTable.venue,
  publicMessage: sessionTable.publicMessage,
  posterS3Key: sessionTable.posterS3Key,
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

// @FollowsBlueprint repository-query
export async function listConcertsFrom(from: Date): Promise<ConcertAnnouncementRow[]> {
  return await getDatabase()
    .select(ANNOUNCEMENT_PROJECTION)
    .from(sessionTable)
    .where(and(eq(sessionTable.kind, CONCERT_SESSION_KIND), gte(sessionTable.date, from)))
    .orderBy(asc(sessionTable.date));
}

export async function findConcertAnnouncement(
  sessionId: string,
): Promise<ConcertAnnouncementRow | null> {
  const rows = await getDatabase()
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

export interface RegistrationCount {
  readonly sessionId: string;
  readonly registrationCount: number;
}

export async function countRegistrationsOfConcerts(
  sessionIds: readonly string[],
): Promise<RegistrationCount[]> {
  return await getDatabase()
    .select({
      sessionId: concertRegistrationTable.sessionId,
      registrationCount: count(),
    })
    .from(concertRegistrationTable)
    .where(inArray(concertRegistrationTable.sessionId, [...sessionIds]))
    .groupBy(concertRegistrationTable.sessionId);
}

export async function insertRegistration(
  values: RegistrationInsertShape,
): Promise<ConcertRegistrationRow | null> {
  const [row] = await getDatabase()
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

export async function updateRegistrationAnswers(
  registrationId: string,
  values: RegistrationAnswerShape,
): Promise<ConcertRegistrationRow | null> {
  const [row] = await getDatabase()
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

export async function deleteRegistrationsOfSession(
  transaction: DatabaseExecutor,
  sessionId: string,
): Promise<void> {
  await transaction
    .delete(concertRegistrationTable)
    .where(eq(concertRegistrationTable.sessionId, sessionId));
}
