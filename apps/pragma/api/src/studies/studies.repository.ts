import { and, eq, gte } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import type { CalendarDay } from './paris-day.core';
import { studyTable } from './studies.schema';
import type { StudyRow } from './studies.types';

// @FollowsBlueprint repository-projection
const STUDY_PROJECTION = {
  memberId: studyTable.memberId,
  songId: studyTable.songId,
  instrumentId: studyTable.instrumentId,
  studiedOn: studyTable.studiedOn,
} as const;

// @FollowsBlueprint repository-idempotent-upsert
export async function insertStudyIfAbsent(study: StudyRow, createdAt: Date): Promise<void> {
  await getDatabase()
    .insert(studyTable)
    .values({ ...study, createdAt })
    .onConflictDoNothing();
}

export async function deleteStudy(study: StudyRow): Promise<number> {
  const deleted = await getDatabase()
    .delete(studyTable)
    .where(
      and(
        eq(studyTable.memberId, study.memberId),
        eq(studyTable.songId, study.songId),
        eq(studyTable.instrumentId, study.instrumentId),
        eq(studyTable.studiedOn, study.studiedOn),
      ),
    )
    .returning({ memberId: studyTable.memberId });
  return deleted.length;
}

export async function listStudiesSince(firstDay: CalendarDay): Promise<StudyRow[]> {
  return await getDatabase()
    .select(STUDY_PROJECTION)
    .from(studyTable)
    .where(gte(studyTable.studiedOn, firstDay));
}

export async function listStudiesOfMemberSince(
  memberId: string,
  firstDay: CalendarDay,
): Promise<StudyRow[]> {
  return await getDatabase()
    .select(STUDY_PROJECTION)
    .from(studyTable)
    .where(and(eq(studyTable.memberId, memberId), gte(studyTable.studiedOn, firstDay)));
}

export async function deleteStudiesOfMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await executor.delete(studyTable).where(eq(studyTable.memberId, memberId));
}

export async function deleteStudiesOfSong(
  executor: DatabaseExecutor,
  songId: string,
): Promise<void> {
  await executor.delete(studyTable).where(eq(studyTable.songId, songId));
}
