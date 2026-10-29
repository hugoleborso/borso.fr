import type { FeedFailure } from '../calendar-feeds/calendar-feeds.types';

export interface TimeInterval {
  readonly start: Date;
  readonly end: Date;
}

export type ExclusionReason = 'no-calendar' | FeedFailure;

export interface ExcludedMember {
  readonly memberId: string;
  readonly reason: ExclusionReason;
  readonly calendarName: string | null;
  readonly calendarPosition: number | null;
}

export interface FreeSlotsResult {
  readonly slots: readonly TimeInterval[];
  readonly excludedMembers: readonly ExcludedMember[];
}
