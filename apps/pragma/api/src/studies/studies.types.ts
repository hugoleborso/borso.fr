import type { MemberStreak } from './band-streaks.core';
import type { CalendarDay } from './paris-day.core';
import type { StudyQueueItem } from './study-queue.core';
import type { Streak } from './streak.core';

export interface StudyRow {
  readonly memberId: string;
  readonly songId: string;
  readonly instrumentId: string;
  readonly studiedOn: CalendarDay;
}

export interface BandMemberStreak extends MemberStreak {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
}

export interface ReadinessSong {
  readonly songId: string;
  readonly title: string;
  readonly isReady: boolean;
}

export interface ConcertReadiness {
  readonly concertId: string;
  readonly date: string;
  readonly venue: string | null;
  readonly songs: readonly ReadinessSong[];
}

export interface StudiesOverview {
  readonly today: CalendarDay;
  readonly myStreak: Streak;
  readonly queue: readonly StudyQueueItem[];
  readonly band: readonly BandMemberStreak[];
  readonly readiness: ConcertReadiness | null;
}

export type StudyWriteOutcome =
  | { readonly kind: 'ok'; readonly study: StudyRow; readonly myLine: MemberStreak }
  | { readonly kind: 'song-not-found' }
  | { readonly kind: 'instrument-not-found' }
  | { readonly kind: 'study-not-in-lineup' };

export type StudyUndoOutcome =
  { readonly kind: 'ok'; readonly myLine: MemberStreak } | { readonly kind: 'study-not-found' };
