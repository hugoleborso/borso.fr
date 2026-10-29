import { readCalendarFeed } from './calendar-feed.adapter';
import type { DatabaseExecutor } from '../database/client';
import {
  deleteCalendarFeed,
  deleteCalendarFeedsOfMember,
  listCalendarFeedsOfMember,
  listStoredCalendarFeeds,
  upsertCalendarFeed,
} from './calendar-feeds.repository';
import type {
  BusyInterval,
  CalendarFeedSummary,
  FeedFailure,
  StoredCalendarFeed,
} from './calendar-feeds.types';
import { judgeFeedAddress } from './feed-address.core';
import { readBusyIntervals, readCalendarName } from './ics.core';

export type SaveCalendarFeedOutcome =
  | { readonly kind: 'saved'; readonly calendarFeeds: readonly CalendarFeedSummary[] }
  | { readonly kind: 'invalid-address' }
  | { readonly kind: 'too-many' };

export type FeedBusyTime =
  | {
      readonly memberId: string;
      readonly kind: 'read';
      readonly intervals: readonly BusyInterval[];
    }
  | {
      readonly memberId: string;
      readonly kind: FeedFailure;
      readonly calendarName: string | null;
    };

interface ReadRange {
  readonly start: Date;
  readonly end: Date;
}

type CalendarNameReader = (address: string) => Promise<string | null>;

async function readNameOfFeed(address: string): Promise<string | null> {
  const feed = await readCalendarFeed(address);
  const body = feed.kind === 'ok' ? feed.body : '';
  return readCalendarName(body);
}

// @FollowsBlueprint service-orchestration
export async function saveCalendarFeed(
  memberId: string,
  rawAddress: string,
  now: Date,
  readName: CalendarNameReader = readNameOfFeed,
): Promise<SaveCalendarFeedOutcome> {
  const verdict = judgeFeedAddress(rawAddress);
  if (verdict.kind === 'rejected') return { kind: 'invalid-address' };
  const name = await readName(verdict.address);
  const outcome = await upsertCalendarFeed({ memberId, address: verdict.address, name, now });
  if (outcome === 'too-many') return { kind: 'too-many' };
  return { kind: 'saved', calendarFeeds: await listCalendarFeedsOfMember(memberId) };
}

export async function removeCalendarFeed(
  memberId: string,
  feedId: string,
): Promise<CalendarFeedSummary[]> {
  await deleteCalendarFeed(memberId, feedId);
  return await listCalendarFeedsOfMember(memberId);
}

export async function listCalendarFeeds(memberId: string): Promise<CalendarFeedSummary[]> {
  return await listCalendarFeedsOfMember(memberId);
}

const FAILURE_EVENT_BY_KIND: Readonly<Record<FeedFailure, string>> = {
  'needs-reconnecting': 'CalendarFeedNeedsReconnecting',
  unavailable: 'CalendarFeedUnavailable',
};

function reportFeedFailure(
  feed: StoredCalendarFeed,
  kind: FeedFailure,
  status: number | null,
): FeedBusyTime {
  console.warn(
    JSON.stringify({ event: FAILURE_EVENT_BY_KIND[kind], memberId: feed.memberId, status }),
  );
  return { memberId: feed.memberId, kind, calendarName: feed.name };
}

async function readBusyTimeOfOneFeed(
  feed: StoredCalendarFeed,
  range: ReadRange,
): Promise<FeedBusyTime> {
  const read = await readCalendarFeed(feed.address);
  if (read.kind !== 'ok') return reportFeedFailure(feed, read.kind, read.status);
  const busyIntervals = readBusyIntervals(read.body, range);
  if (busyIntervals.kind === 'unavailable') return reportFeedFailure(feed, 'unavailable', null);
  return { memberId: feed.memberId, kind: 'read', intervals: busyIntervals.intervals };
}

export async function readBusyTimeOfEveryFeed(range: ReadRange): Promise<FeedBusyTime[]> {
  const feeds = await listStoredCalendarFeeds();
  return await Promise.all(feeds.map((feed) => readBusyTimeOfOneFeed(feed, range)));
}

export async function deleteCalendarFeedOfMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deleteCalendarFeedsOfMember(memberId, executor);
}
