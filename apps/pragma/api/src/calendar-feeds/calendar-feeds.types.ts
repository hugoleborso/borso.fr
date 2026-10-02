export type FeedFailure = 'needs-reconnecting' | 'unavailable';

export type CalendarFeedState = 'connected' | 'absent';

export interface BusyInterval {
  readonly start: Date;
  readonly end: Date;
}

export interface StoredCalendarFeed {
  readonly memberId: string;
  readonly address: string;
}
