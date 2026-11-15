import type { CalendarDay } from '@domain/paris-day.core';
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
