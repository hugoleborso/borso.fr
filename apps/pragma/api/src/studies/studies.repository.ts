import { and, eq, gte } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import type { CalendarDay } from '@domain/paris-day.core';
import { studyTable } from './studies.schema';
import type { StudyRow } from './studies.types';

// @FollowsBlueprint repository-projection
const STUDY_PROJECTION = {
  memberId: studyTable.memberId,
  songId: studyTable.songId,
  instrumentId: studyTable.instrumentId,
  studiedOn: studyTable.studiedOn,
} as const;

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
