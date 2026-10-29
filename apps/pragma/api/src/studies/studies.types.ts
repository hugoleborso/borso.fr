import type { CalendarDay } from '@domain/paris-day.core';
import type { StreaksView } from '../streaks/streaks.types';
import type { StudyQueueItem } from './study-queue.core';

export interface StudyRow {
  readonly memberId: string;
  readonly songId: string;
  readonly instrumentId: string;
  readonly studiedOn: CalendarDay;
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
  readonly queue: readonly StudyQueueItem[];
  readonly readiness: ConcertReadiness | null;
}

export type StudyWriteOutcome =
  | { readonly kind: 'ok'; readonly study: StudyRow }
  | { readonly kind: 'song-not-found' }
  | { readonly kind: 'instrument-not-found' }
  | { readonly kind: 'study-not-in-lineup' };

export type StudyUndoOutcome = { readonly kind: 'ok' } | { readonly kind: 'study-not-found' };

export type StudyWriteWithStreaks =
  | (Extract<StudyWriteOutcome, { kind: 'ok' }> & { readonly streaks: StreaksView })
  | Exclude<StudyWriteOutcome, { kind: 'ok' }>;

export type StudyUndoWithStreaks =
  | { readonly kind: 'ok'; readonly streaks: StreaksView }
  | Exclude<StudyUndoOutcome, { kind: 'ok' }>;
