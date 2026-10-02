import { readCalendarFeed } from './calendar-feed.adapter';
import type { DatabaseExecutor } from '../database/client';
import {
  deleteCalendarFeed,
  hasCalendarFeed,
  listStoredCalendarFeeds,
  upsertCalendarFeed,
} from './calendar-feeds.repository';
import type { BusyInterval, CalendarFeedState, FeedFailure } from './calendar-feeds.types';
import { judgeFeedAddress } from './feed-address.core';
import { readBusyIntervals } from './ics.core';

export type SaveCalendarFeedOutcome =
  | { readonly kind: 'saved'; readonly calendarFeed: CalendarFeedState }
  | { readonly kind: 'invalid-address' };

export type MemberBusyTime =
  | {
      readonly memberId: string;
      readonly kind: 'read';
      readonly intervals: readonly BusyInterval[];
    }
  | { readonly memberId: string; readonly kind: FeedFailure };

interface ReadRange {
  readonly start: Date;
  readonly end: Date;
}

const CONNECTED: CalendarFeedState = 'connected';
const ABSENT: CalendarFeedState = 'absent';

// @FollowsBlueprint service-orchestration
export async function saveCalendarFeed(
  memberId: string,
  rawAddress: string,
  now: Date,
): Promise<SaveCalendarFeedOutcome> {
  const verdict = judgeFeedAddress(rawAddress);
  if (verdict.kind === 'rejected') return { kind: 'invalid-address' };
  await upsertCalendarFeed(memberId, verdict.address, now);
  return { kind: 'saved', calendarFeed: CONNECTED };
}

export async function removeCalendarFeed(memberId: string): Promise<CalendarFeedState> {
  await deleteCalendarFeed(memberId);
  return ABSENT;
}

export async function readCalendarFeedState(memberId: string): Promise<CalendarFeedState> {
  return (await hasCalendarFeed(memberId)) ? CONNECTED : ABSENT;
}

const FAILURE_EVENT_BY_KIND: Readonly<Record<FeedFailure, string>> = {
  'needs-reconnecting': 'calendar_feed_needs_reconnecting',
  unavailable: 'calendar_feed_unavailable',
};

function reportFeedFailure(memberId: string, kind: FeedFailure): MemberBusyTime {
  console.warn(JSON.stringify({ event: FAILURE_EVENT_BY_KIND[kind], memberId }));
  return { memberId, kind };
}

async function readBusyTimeOfOneFeed(
  memberId: string,
  address: string,
  range: ReadRange,
): Promise<MemberBusyTime> {
  const feed = await readCalendarFeed(address);
  if (feed.kind !== 'ok') return reportFeedFailure(memberId, feed.kind);
  const busyIntervals = readBusyIntervals(feed.body, range);
  if (busyIntervals.kind === 'unavailable') return reportFeedFailure(memberId, 'unavailable');
  return { memberId, kind: 'read', intervals: busyIntervals.intervals };
}

export async function readBusyTimeOfEveryFeed(range: ReadRange): Promise<MemberBusyTime[]> {
  const feeds = await listStoredCalendarFeeds();
  return await Promise.all(
    feeds.map((feed) => readBusyTimeOfOneFeed(feed.memberId, feed.address, range)),
  );
}

export async function deleteCalendarFeedOfMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deleteCalendarFeed(memberId, executor);
}
