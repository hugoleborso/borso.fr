import type { Lineup } from '@domain/lineup.core';
import { type DefaultMap, effective, type OverrideMap } from '../mastery/mastery.core';
import { instrumentsHeldInAnyLineup } from './study-eligibility.core';

export interface StudyCandidateSong {
  readonly songId: string;
  readonly title: string;
  readonly lineups: readonly Lineup[];
  readonly isReady: boolean | null;
}

export interface StudyQueueItem {
  readonly songId: string;
  readonly title: string;
  readonly instrumentId: string;
  readonly score: number | null;
  readonly isReady: boolean | null;
  readonly isStudiedToday: boolean;
}

export interface StudyQueueInput {
  readonly memberId: string;
  readonly songs: readonly StudyCandidateSong[];
  readonly defaults: DefaultMap;
  readonly overrides: OverrideMap;
  readonly keysStudiedToday: ReadonlySet<string>;
}

const UNKNOWN_SCORE_RANK = -1;

export function studyKey(songId: string, instrumentId: string): string {
  return `${songId}:${instrumentId}`;
}

function readinessRank(isReady: boolean | null): number {
  return isReady === true ? 1 : 0;
}

function compareQueueItems(first: StudyQueueItem, second: StudyQueueItem): number {
  const byReadiness = readinessRank(first.isReady) - readinessRank(second.isReady);
  if (byReadiness !== 0) return byReadiness;
  const byScore = (first.score ?? UNKNOWN_SCORE_RANK) - (second.score ?? UNKNOWN_SCORE_RANK);
  if (byScore !== 0) return byScore;
  const byTitle = first.title.localeCompare(second.title);
  if (byTitle !== 0) return byTitle;
  return first.instrumentId.localeCompare(second.instrumentId);
}

// @FollowsBlueprint core-projection
export function buildStudyQueue(input: StudyQueueInput): StudyQueueItem[] {
  const queueRows: StudyQueueItem[] = [];
  for (const song of input.songs) {
    for (const instrumentId of instrumentsHeldInAnyLineup(song.lineups, input.memberId)) {
      queueRows.push({
        songId: song.songId,
        title: song.title,
        instrumentId,
        score: effective(input.defaults, input.overrides, {
          memberId: input.memberId,
          instrumentId,
          songId: song.songId,
        }),
        isReady: song.isReady,
        isStudiedToday: input.keysStudiedToday.has(studyKey(song.songId, instrumentId)),
      });
    }
  }
  return queueRows.sort(compareQueueItems);
}
