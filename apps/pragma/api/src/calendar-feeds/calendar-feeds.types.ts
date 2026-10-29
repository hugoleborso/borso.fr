export type FeedFailure = 'needs-reconnecting' | 'unavailable';

export interface BusyInterval {
  readonly start: Date;
  readonly end: Date;
}

import type { CalendarFeedRow } from './calendar-feeds.schema';

export type CalendarFeedSummary = Readonly<Pick<CalendarFeedRow, 'id' | 'name'>>;

export type StoredCalendarFeed = Readonly<Pick<CalendarFeedRow, 'memberId' | 'address' | 'name'>>;
