export type FeedFailure = 'needs-reconnecting' | 'unavailable';

export interface BusyInterval {
  readonly start: Date;
  readonly end: Date;
}

export interface CalendarFeedSummary {
  readonly id: string;
  readonly name: string | null;
}

export interface StoredCalendarFeed {
  readonly memberId: string;
  readonly address: string;
  readonly name: string | null;
}
